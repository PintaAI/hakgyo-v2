import { createHash, randomBytes } from "node:crypto";

import { TRPCError } from "@trpc/server";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { requireAssessmentManagement } from "~/server/assessment/access";
import { requireOrganizationMembership } from "~/server/authorization";
import { orderAssessmentQuestions } from "~/server/assessment/order";
import { isUniqueConstraintError } from "~/server/db-retry";
import { env } from "~/env";
import {
  SIGNED_URL_TTL_SECONDS,
  signDownloadUrl,
} from "~/server/storage/objects";
import {
  createPublicQuizSlug,
  gradePublicQuiz,
  isPublicQuizAcceptingStarts,
  normalizeDisplayName,
  PUBLIC_QUIZ_ANONYMOUS_NAME,
  publicQuizIssues,
  publicQuizSubmitDeadline,
  sanitizeDisplayName,
  type PublicQuizAnswer,
} from "~/server/public-quiz/logic";

type DatabaseClient = Prisma.TransactionClient | PrismaClient;

/** Attempts one network address may start on one quiz per window. */
const STARTS_PER_ADDRESS = 30;
const START_WINDOW_MS = 60 * 60 * 1000;
const LEADERBOARD_SIZE = 50;

/** Submissions shown on the public leaderboard of a quiz's current round. */
function leaderboardWhere(quiz: { id: string; round: number }) {
  return {
    quizId: quiz.id,
    round: quiz.round,
    submittedAt: { not: null },
    hiddenAt: null,
  } satisfies Prisma.PublicQuizAttemptWhereInput;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Hashes the client address so rate limiting never stores raw IPs. */
export function hashClientAddress(headers: Headers) {
  const address =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip")?.trim();
  if (!address) return null;
  return createHash("sha256")
    .update(`${env.BETTER_AUTH_SECRET ?? "hakgyo"}:${address}`)
    .digest("hex");
}

const gradableQuestionSelect = {
  id: true,
  type: true,
  points: true,
  options: {
    orderBy: { position: "asc" },
    select: { id: true, isCorrect: true },
  },
} satisfies Prisma.AssessmentQuestionSelect;

// ---------------------------------------------------------------------------
// Authoring

const managedQuizSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  closesAt: true,
  openedAt: true,
  round: true,
  viewCount: true,
  ctaClickCount: true,
  createdAt: true,
  _count: { select: { attempts: { where: { submittedAt: { not: null } } } } },
} satisfies Prisma.PublicQuizSelect;

async function requireManagedQuiz(
  db: DatabaseClient,
  quizId: string,
  userId: string,
) {
  const quiz = await db.publicQuiz.findUnique({
    where: { id: quizId },
    select: { id: true, assessmentId: true, organizationId: true },
  });
  if (!quiz) throw new TRPCError({ code: "NOT_FOUND" });
  await requireAssessmentManagement(db, quiz.assessmentId, userId);
  return quiz;
}

/** The public quiz of an assessment (if any) and whether it can run. */
export async function getPublicQuizForAssessment(
  db: PrismaClient,
  assessmentId: string,
  userId: string,
) {
  await requireAssessmentManagement(db, assessmentId, userId);
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    select: {
      title: true,
      timeLimitMinutes: true,
      organization: {
        select: {
          slug: true,
          name: true,
          landingPage: { select: { publishedAt: true } },
        },
      },
      questions: { select: gradableQuestionSelect },
      publicQuiz: { select: managedQuizSelect },
    },
  });
  return {
    assessmentTitle: assessment.title,
    timeLimitMinutes: assessment.timeLimitMinutes,
    questionCount: assessment.questions.length,
    issues: publicQuizIssues(assessment.questions),
    organization: {
      slug: assessment.organization.slug,
      name: assessment.organization.name,
      landingPublished: Boolean(
        assessment.organization.landingPage?.publishedAt,
      ),
    },
    quiz: assessment.publicQuiz,
  };
}

export async function createPublicQuiz(
  db: PrismaClient,
  assessmentId: string,
  userId: string,
) {
  const managed = await requireAssessmentManagement(db, assessmentId, userId);
  const assessment = await db.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    select: { title: true, description: true },
  });
  // A six-character code collides rarely; retry a few times before giving up.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.publicQuiz.create({
        data: {
          organizationId: managed.organizationId,
          assessmentId,
          slug: createPublicQuizSlug((size) => randomBytes(size)),
          title: assessment.title,
          description: normalizeDisplayName(
            assessment.description?.slice(0, 500),
          ),
        },
        select: managedQuizSelect,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await db.publicQuiz.findUnique({
        where: { assessmentId },
        select: managedQuizSelect,
      });
      if (existing) return existing;
    }
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Kode quiz tidak dapat dibuat. Silakan coba lagi.",
  });
}

export async function updatePublicQuiz(
  db: PrismaClient,
  input: {
    quizId: string;
    title?: string;
    description?: string | null;
    closesAt?: Date | null;
  },
  userId: string,
) {
  await requireManagedQuiz(db, input.quizId, userId);
  return db.publicQuiz.update({
    where: { id: input.quizId },
    data: {
      title: input.title,
      description: input.description,
      closesAt: input.closesAt,
    },
    select: managedQuizSelect,
  });
}

export async function setPublicQuizStatus(
  db: PrismaClient,
  input: { quizId: string; status: "OPEN" | "CLOSED" },
  userId: string,
) {
  const quiz = await requireManagedQuiz(db, input.quizId, userId);
  const now = new Date();
  if (input.status === "OPEN") {
    const questions = await db.assessmentQuestion.findMany({
      where: { assessmentId: quiz.assessmentId },
      select: gradableQuestionSelect,
    });
    const issues = publicQuizIssues(questions);
    if (issues.length) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: issues.join(" "),
      });
    }
    const current = await db.publicQuiz.findUniqueOrThrow({
      where: { id: quiz.id },
      select: { closesAt: true, openedAt: true },
    });
    return db.publicQuiz.update({
      where: { id: quiz.id },
      data: {
        status: "OPEN",
        openedAt: current.openedAt ?? now,
        // Reopening after the closing time passed would close again at once.
        closesAt:
          current.closesAt && current.closesAt <= now ? null : current.closesAt,
      },
      select: managedQuizSelect,
    });
  }
  return db.publicQuiz.update({
    where: { id: quiz.id },
    data: { status: "CLOSED" },
    select: managedQuizSelect,
  });
}

export async function deletePublicQuiz(
  db: PrismaClient,
  quizId: string,
  userId: string,
) {
  await requireManagedQuiz(db, quizId, userId);
  await db.publicQuiz.delete({ where: { id: quizId } });
}

/**
 * Submissions for staff, newest round first, ranked within their round like the public
 * leaderboard (hidden entries are listed but not ranked). Contacts only appear with consent.
 */
export async function listPublicQuizResults(
  db: PrismaClient,
  quizId: string,
  userId: string,
) {
  await requireManagedQuiz(db, quizId, userId);
  const attempts = await db.publicQuizAttempt.findMany({
    where: { quizId, submittedAt: { not: null } },
    orderBy: [
      { round: "desc" },
      { score: "desc" },
      { durationSeconds: "asc" },
      { submittedAt: "asc" },
    ],
    take: 2000,
    select: {
      id: true,
      round: true,
      displayName: true,
      contact: true,
      contactConsent: true,
      score: true,
      maxScore: true,
      durationSeconds: true,
      submittedAt: true,
      hiddenAt: true,
    },
  });
  const ranks = new Map<number, number>();
  return attempts.map((attempt) => {
    let rank: number | null = null;
    if (!attempt.hiddenAt) {
      rank = (ranks.get(attempt.round) ?? 0) + 1;
      ranks.set(attempt.round, rank);
    }
    return {
      ...attempt,
      contact: attempt.contactConsent ? attempt.contact : null,
      rank,
    };
  });
}

/** Hides (or shows again) one entry on the public leaderboard. */
export async function setPublicQuizAttemptHidden(
  db: PrismaClient,
  input: { attemptId: string; hidden: boolean },
  userId: string,
) {
  const attempt = await db.publicQuizAttempt.findUnique({
    where: { id: input.attemptId },
    select: { quizId: true },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  await requireManagedQuiz(db, attempt.quizId, userId);
  await db.publicQuizAttempt.update({
    where: { id: input.attemptId },
    data: { hiddenAt: input.hidden ? new Date() : null },
  });
}

/**
 * Starts a new round: the public leaderboard empties and every visitor may play again.
 * Earlier rounds stay in the staff results and export.
 */
export async function resetPublicQuizLeaderboard(
  db: PrismaClient,
  quizId: string,
  userId: string,
) {
  await requireManagedQuiz(db, quizId, userId);
  return db.publicQuiz.update({
    where: { id: quizId },
    data: { round: { increment: 1 } },
    select: managedQuizSelect,
  });
}

/** Funnel counts and how often each question was answered correctly, across all rounds. */
export async function getPublicQuizStats(
  db: PrismaClient,
  quizId: string,
  userId: string,
) {
  const managed = await requireManagedQuiz(db, quizId, userId);
  const [quiz, starts, submissions, leads, questions] = await Promise.all([
    db.publicQuiz.findUniqueOrThrow({
      where: { id: quizId },
      select: { viewCount: true, ctaClickCount: true },
    }),
    db.publicQuizAttempt.count({ where: { quizId } }),
    db.publicQuizAttempt.findMany({
      where: { quizId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 2000,
      select: { answers: true },
    }),
    db.publicQuizAttempt.count({
      where: { quizId, contactConsent: true, contact: { not: null } },
    }),
    db.assessmentQuestion.findMany({
      where: { assessmentId: managed.assessmentId, type: { not: "WRITTEN" } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    }),
  ]);
  const correct = new Map<string, number>();
  for (const { answers } of submissions) {
    if (!Array.isArray(answers)) continue;
    for (const value of answers) {
      const answer = value as {
        questionId?: unknown;
        correct?: unknown;
      } | null;
      if (typeof answer?.questionId === "string" && answer.correct === true) {
        correct.set(
          answer.questionId,
          (correct.get(answer.questionId) ?? 0) + 1,
        );
      }
    }
  }
  return {
    views: quiz.viewCount,
    starts,
    submissions: submissions.length,
    ctaClicks: quiz.ctaClickCount,
    leads,
    questions: questions.map((question, index) => ({
      id: question.id,
      number: index + 1,
      correctRate: submissions.length
        ? (correct.get(question.id) ?? 0) / submissions.length
        : null,
    })),
  };
}

/** Every public quiz of an organization the member may manage, for the workspace overview. */
export async function listOrganizationPublicQuizzes(
  db: PrismaClient,
  organizationId: string,
  userId: string,
) {
  const member = await requireOrganizationMembership({
    organizationId,
    userId,
  });
  const ownOnly =
    member.organization.permissionMode === "ADVANCED" &&
    member.role === "TEACHER";
  const quizzes = await db.publicQuiz.findMany({
    where: {
      organizationId,
      ...(ownOnly ? { assessment: { createdByMembershipId: member.id } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      ...managedQuizSelect,
      assessmentId: true,
      assessment: { select: { title: true } },
    },
  });
  const leads = await db.publicQuizAttempt.groupBy({
    by: ["quizId"],
    where: {
      quizId: { in: quizzes.map((quiz) => quiz.id) },
      contactConsent: true,
      contact: { not: null },
    },
    _count: { _all: true },
  });
  const leadCounts = new Map(leads.map((row) => [row.quizId, row._count._all]));
  return quizzes.map((quiz) => ({
    ...quiz,
    leads: leadCounts.get(quiz.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Public (no account)

const publicQuizSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  closesAt: true,
  round: true,
  assessmentId: true,
  organization: {
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      theme: true,
      themeEnabled: true,
      landingPage: { select: { publishedAt: true } },
    },
  },
  assessment: {
    select: {
      timeLimitMinutes: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      _count: { select: { questions: true } },
    },
  },
} satisfies Prisma.PublicQuizSelect;

type PublicQuizRecord = Prisma.PublicQuizGetPayload<{
  select: typeof publicQuizSelect;
}>;

/** Visitors only ever see quizzes that were opened at least once. */
async function findPublicQuiz(
  db: DatabaseClient,
  organizationSlug: string,
  slug: string,
) {
  const quiz = await db.publicQuiz.findFirst({
    where: {
      slug: slug.toLowerCase(),
      organization: { slug: organizationSlug },
      status: { not: "DRAFT" },
    },
    select: publicQuizSelect,
  });
  if (!quiz) throw new TRPCError({ code: "NOT_FOUND" });
  return quiz;
}

function shapePublicQuiz(quiz: PublicQuizRecord, now: Date) {
  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    isOpen: isPublicQuizAcceptingStarts(quiz, now),
    closesAt: quiz.closesAt,
    questionCount: quiz.assessment._count.questions,
    timeLimitMinutes: quiz.assessment.timeLimitMinutes,
    organization: {
      name: quiz.organization.name,
      slug: quiz.organization.slug,
      logoUrl: quiz.organization.logoUrl,
      theme: quiz.organization.themeEnabled ? quiz.organization.theme : null,
      landingPublished: Boolean(quiz.organization.landingPage?.publishedAt),
    },
  };
}

export async function getPublicQuiz(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const participants = await db.publicQuizAttempt.count({
    where: leaderboardWhere(quiz),
  });
  return { ...shapePublicQuiz(quiz, new Date()), participants };
}

/** Counts a page view of the public quiz. */
export async function recordPublicQuizView(db: PrismaClient, quizId: string) {
  await db.publicQuiz.update({
    where: { id: quizId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Counts a click on the end-of-quiz call to action and returns the organization slug to
 * redirect to, or null for an unknown quiz.
 */
export async function recordPublicQuizCtaClick(
  db: PrismaClient,
  quizId: string,
) {
  const quiz = await db.publicQuiz
    .update({
      where: { id: quizId },
      data: { ctaClickCount: { increment: 1 } },
      select: { organization: { select: { slug: true } } },
    })
    .catch(() => null);
  return quiz?.organization.slug ?? null;
}

/** What the shareable result image shows; null for hidden or unknown attempts. */
export async function getPublicQuizResultCard(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string; attemptId: string },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const attempt = await db.publicQuizAttempt.findFirst({
    where: {
      id: input.attemptId,
      quizId: quiz.id,
      submittedAt: { not: null },
      hiddenAt: null,
    },
    select: visitorAttemptSelect,
  });
  if (!attempt) return null;
  return {
    quizTitle: quiz.title,
    organizationName: quiz.organization.name,
    theme: quiz.organization.themeEnabled ? quiz.organization.theme : null,
    name: attempt.displayName ?? PUBLIC_QUIZ_ANONYMOUS_NAME,
    score: attempt.score ?? 0,
    maxScore: attempt.maxScore ?? 0,
    rank: attempt.round === quiz.round ? await rankOf(db, attempt) : null,
  };
}

async function loadAttemptQuestions(
  db: DatabaseClient,
  quiz: Pick<PublicQuizRecord, "assessmentId" | "assessment">,
  seed: string,
) {
  const questions = await db.assessmentQuestion.findMany({
    where: { assessmentId: quiz.assessmentId, type: { not: "WRITTEN" } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      prompt: true,
      points: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, content: true },
      },
    },
  });
  return orderAssessmentQuestions(
    questions,
    seed,
    quiz.assessment.shuffleQuestions,
    quiz.assessment.shuffleOptions,
  );
}

const visitorAttemptSelect = {
  id: true,
  quizId: true,
  round: true,
  hiddenAt: true,
  displayName: true,
  startedAt: true,
  submittedAt: true,
  score: true,
  maxScore: true,
  durationSeconds: true,
} satisfies Prisma.PublicQuizAttemptSelect;

type VisitorAttempt = Prisma.PublicQuizAttemptGetPayload<{
  select: typeof visitorAttemptSelect;
}>;

async function rankOf(db: DatabaseClient, attempt: VisitorAttempt) {
  if (
    attempt.submittedAt === null ||
    attempt.hiddenAt !== null ||
    attempt.score === null ||
    attempt.durationSeconds === null
  ) {
    return null;
  }
  const ahead = await db.publicQuizAttempt.count({
    where: {
      ...leaderboardWhere({ id: attempt.quizId, round: attempt.round }),
      OR: [
        { score: { gt: attempt.score } },
        {
          score: attempt.score,
          durationSeconds: { lt: attempt.durationSeconds },
        },
        {
          score: attempt.score,
          durationSeconds: attempt.durationSeconds,
          submittedAt: { lt: attempt.submittedAt },
        },
      ],
    },
  });
  return ahead + 1;
}

async function shapeVisitorAttempt(
  db: DatabaseClient,
  quiz: PublicQuizRecord,
  attempt: VisitorAttempt,
) {
  const submitted = attempt.submittedAt !== null;
  return {
    id: attempt.id,
    displayName: attempt.displayName ?? PUBLIC_QUIZ_ANONYMOUS_NAME,
    startedAt: attempt.startedAt,
    deadline: quiz.assessment.timeLimitMinutes
      ? new Date(
          attempt.startedAt.getTime() +
            quiz.assessment.timeLimitMinutes * 60_000,
        )
      : null,
    submitted,
    result: submitted
      ? {
          score: attempt.score ?? 0,
          maxScore: attempt.maxScore ?? 0,
          durationSeconds: attempt.durationSeconds ?? 0,
          rank: await rankOf(db, attempt),
        }
      : null,
    questions: submitted
      ? []
      : await loadAttemptQuestions(db, quiz, attempt.id),
  };
}

async function findVisitorAttempt(
  db: DatabaseClient,
  quiz: PublicQuizRecord,
  token: string,
) {
  const attempt = await db.publicQuizAttempt.findUnique({
    where: { tokenHash: hashToken(token) },
    select: visitorAttemptSelect,
  });
  // Attempts from before a leaderboard reset no longer count: the visitor may play again.
  if (attempt?.quizId !== quiz.id || attempt.round !== quiz.round) return null;
  return attempt;
}

export async function startPublicQuiz(
  db: PrismaClient,
  input: {
    organizationSlug: string;
    slug: string;
    displayName?: string | null;
    contact?: string | null;
    contactConsent?: boolean;
  },
  addressHash: string | null,
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const contact = normalizeDisplayName(input.contact);
  if (contact && !input.contactConsent) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Centang persetujuan agar ${quiz.organization.name} boleh menghubungi kamu, atau kosongkan kontak.`,
    });
  }
  const now = new Date();
  if (!isPublicQuizAcceptingStarts(quiz, now)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Quiz ini sudah ditutup.",
    });
  }
  if (addressHash) {
    const recentStarts = await db.publicQuizAttempt.count({
      where: {
        quizId: quiz.id,
        ipHash: addressHash,
        startedAt: { gt: new Date(now.getTime() - START_WINDOW_MS) },
      },
    });
    if (recentStarts >= STARTS_PER_ADDRESS) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Terlalu banyak percobaan dari jaringan ini. Coba lagi nanti.",
      });
    }
  }
  const token = randomBytes(24).toString("base64url");
  const attempt = await db.publicQuizAttempt.create({
    data: {
      quizId: quiz.id,
      round: quiz.round,
      tokenHash: hashToken(token),
      displayName: sanitizeDisplayName(input.displayName),
      contact,
      contactConsent: Boolean(contact),
      ipHash: addressHash,
    },
    select: visitorAttemptSelect,
  });
  return { token, attempt: await shapeVisitorAttempt(db, quiz, attempt) };
}

/** The visitor's attempt for `token`, or null when it belongs to no attempt of this quiz. */
export async function getPublicQuizAttempt(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string; token: string },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const attempt = await findVisitorAttempt(db, quiz, input.token);
  return attempt ? shapeVisitorAttempt(db, quiz, attempt) : null;
}

export async function submitPublicQuiz(
  db: PrismaClient,
  input: {
    organizationSlug: string;
    slug: string;
    token: string;
    answers: PublicQuizAnswer[];
  },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const attempt = await findVisitorAttempt(db, quiz, input.token);
  if (!attempt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "Leaderboard quiz ini sudah direset. Muat ulang halaman untuk mulai lagi.",
    });
  }
  if (attempt.submittedAt) return shapeVisitorAttempt(db, quiz, attempt);

  const now = new Date();
  // Started attempts may finish after the closing time, but not after the quiz is closed by hand.
  if (quiz.status !== "OPEN") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Quiz ini sudah ditutup.",
    });
  }
  const deadline = publicQuizSubmitDeadline(
    attempt.startedAt,
    quiz.assessment.timeLimitMinutes,
  );
  if (deadline && now > deadline) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Waktu pengerjaan sudah habis.",
    });
  }
  const questions = await db.assessmentQuestion.findMany({
    where: { assessmentId: quiz.assessmentId },
    select: gradableQuestionSelect,
  });
  const graded = gradePublicQuiz(questions, input.answers);
  const durationSeconds = Math.max(
    1,
    Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000),
  );
  const limitSeconds = quiz.assessment.timeLimitMinutes
    ? quiz.assessment.timeLimitMinutes * 60
    : null;
  await db.publicQuizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: {
      answers: graded.answers,
      score: graded.score,
      maxScore: graded.maxScore,
      durationSeconds: limitSeconds
        ? Math.min(durationSeconds, limitSeconds)
        : durationSeconds,
      submittedAt: now,
    },
  });
  const saved = await db.publicQuizAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
    select: visitorAttemptSelect,
  });
  return shapeVisitorAttempt(db, quiz, saved);
}

export async function getPublicQuizLeaderboard(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string; token?: string },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const [entries, total, mine] = await Promise.all([
    db.publicQuizAttempt.findMany({
      where: leaderboardWhere(quiz),
      orderBy: [
        { score: "desc" },
        { durationSeconds: "asc" },
        { submittedAt: "asc" },
      ],
      take: LEADERBOARD_SIZE,
      select: {
        id: true,
        displayName: true,
        score: true,
        maxScore: true,
        durationSeconds: true,
      },
    }),
    db.publicQuizAttempt.count({ where: leaderboardWhere(quiz) }),
    input.token ? findVisitorAttempt(db, quiz, input.token) : null,
  ]);
  const myRank = mine ? await rankOf(db, mine) : null;
  return {
    total,
    entries: entries.map((entry, index) => ({
      rank: index + 1,
      name: entry.displayName ?? PUBLIC_QUIZ_ANONYMOUS_NAME,
      score: entry.score ?? 0,
      maxScore: entry.maxScore ?? 0,
      durationSeconds: entry.durationSeconds ?? 0,
      isMine: entry.id === mine?.id,
    })),
    mine:
      mine && myRank !== null
        ? {
            rank: myRank,
            name: mine.displayName ?? PUBLIC_QUIZ_ANONYMOUS_NAME,
            score: mine.score ?? 0,
            maxScore: mine.maxScore ?? 0,
            durationSeconds: mine.durationSeconds ?? 0,
          }
        : null,
  };
}

/** Correct answers and explanations, only for a visitor who already submitted. */
export async function getPublicQuizReview(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string; token: string },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const attempt = await db.publicQuizAttempt.findUnique({
    where: { tokenHash: hashToken(input.token) },
    select: { id: true, quizId: true, submittedAt: true, answers: true },
  });
  if (attempt?.quizId !== quiz.id || !attempt.submittedAt) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  const answers = new Map(
    (Array.isArray(attempt.answers) ? attempt.answers : []).flatMap((value) => {
      const answer = value as Partial<PublicQuizAnswer> | null;
      return answer?.questionId && Array.isArray(answer.optionIds)
        ? [[answer.questionId, answer.optionIds] as const]
        : [];
    }),
  );
  const questions = await db.assessmentQuestion.findMany({
    where: { assessmentId: quiz.assessmentId, type: { not: "WRITTEN" } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      prompt: true,
      explanation: true,
      points: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, content: true, isCorrect: true },
      },
    },
  });
  return orderAssessmentQuestions(
    questions,
    attempt.id,
    quiz.assessment.shuffleQuestions,
    quiz.assessment.shuffleOptions,
  ).map((question) => {
    const selected = answers.get(question.id) ?? [];
    const expected = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
    return {
      ...question,
      selectedOptionIds: selected,
      correct:
        selected.length === expected.length &&
        expected.every((id) => selected.includes(id)),
    };
  });
}

/** Signed URLs for media embedded in the quiz's questions. */
export async function createPublicQuizAssetUrls(
  db: PrismaClient,
  input: { organizationSlug: string; slug: string; assetIds: string[] },
) {
  const quiz = await findPublicQuiz(db, input.organizationSlug, input.slug);
  const assets = await db.asset.findMany({
    where: {
      id: { in: input.assetIds },
      confirmedAt: { not: null },
      deletedAt: null,
      assessments: { some: { assessmentId: quiz.assessmentId } },
    },
    select: { id: true, objectKey: true },
  });
  return Object.fromEntries(
    await Promise.all(
      assets.map(
        async (asset) =>
          [
            asset.id,
            {
              downloadUrl: await signDownloadUrl(asset.objectKey, "inline"),
              expiresIn: SIGNED_URL_TTL_SECONDS,
            },
          ] as const,
      ),
    ),
  );
}
