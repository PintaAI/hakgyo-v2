import { RUNTIME_VERSION } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
  eventAcceptsLearnerWrites,
  eventParticipationSelect,
  requireEventParticipationForSync,
  requireInProgressAttemptAccess,
  requireOpenEventParticipation,
} from "~/server/assessment/access";
import type { SaveAnswersInput } from "~/server/assessment/inputs";
import {
  eligibleCohortEnrollmentWhere,
  latestStandaloneAttemptSelect,
  learnerAssessmentAttemptSelect,
  learnerAssessmentItemSelect,
  shapeLearnerAssessment,
} from "~/server/assessment/learner-view";
import { buildAssessmentAnswerContentUpdate } from "~/server/assessment/answer-content";
import {
  gradableAttemptSelect,
  gradeInProgressAttempt,
  lockAttemptStart,
  lockInProgressAttempt,
  markCourseItemCompleted,
  recordAssessmentPassed,
  recordAssessmentSubmitted,
} from "~/server/assessment/attempt";
import { assessmentContext } from "~/server/assessment/register";
import {
  attemptDeadline,
  timedSectionsSelect,
} from "~/server/assessment/timing";
import { requireCourseItemAccess } from "~/server/authorization";
import {
  isUniqueConstraintError,
  withTransactionRetry,
} from "~/server/db-retry";

/** The learner's view of a placed assessment, optionally for one of their attempts. */
export async function getLearnerAssessment(
  db: PrismaClient,
  input: { courseItemId: string; attemptId?: string },
  userId: string,
) {
  // Every lookup below is independent, so they run concurrently. The attempt/access check
  // still gates the response: nothing is returned unless it resolves.
  const accessCheck = input.attemptId
    ? db.assessmentAttempt
        .findFirst({
          where: {
            id: input.attemptId,
            courseItemId: input.courseItemId,
            userId,
          },
          select: learnerAssessmentAttemptSelect(userId),
        })
        .then(async (attempt) => {
          if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
          const eventParticipant = attempt.assessmentEvent?.participants[0];
          if (
            attempt.assessmentEvent &&
            (!eventParticipant || eventParticipant.invalidatedAt)
          ) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
          if (!attempt.assessmentEvent) {
            await requireCourseItemAccess({
              courseItemId: input.courseItemId,
              userId,
            });
          }
          return attempt;
        })
    : requireCourseItemAccess({
        courseItemId: input.courseItemId,
        userId,
      }).then(() => null);
  const [
    attempt,
    item,
    [latestStandaloneAttempt, standaloneAttemptCount],
    eligibleCohorts,
  ] = await Promise.all([
    accessCheck,
    db.courseItem.findUnique({
      where: { id: input.courseItemId },
      select: learnerAssessmentItemSelect,
    }),
    input.attemptId
      ? ([null, 0] as const)
      : Promise.all([
          db.assessmentAttempt.findFirst({
            where: {
              courseItemId: input.courseItemId,
              userId,
              assessmentEventId: null,
            },
            orderBy: [{ attemptNumber: "desc" }, { startedAt: "desc" }],
            select: latestStandaloneAttemptSelect,
          }),
          db.assessmentAttempt.count({
            where: {
              courseItemId: input.courseItemId,
              userId,
              assessmentEventId: null,
            },
          }),
        ]),
    db.cohortEnrollment.findMany({
      // Scoped by the item's course without waiting for the item.
      where: eligibleCohortEnrollmentWhere(
        userId,
        { courseItemId: input.courseItemId },
        new Date(),
      ),
      orderBy: { enrolledAt: "desc" },
      select: { cohort: { select: { id: true, name: true } } },
    }),
  ]);
  if (!item?.assessment) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return shapeLearnerAssessment({
    item: { ...item, assessment: item.assessment },
    attemptId: input.attemptId,
    attempt,
    latestStandaloneAttempt,
    standaloneAttemptCount,
    eligibleCohorts: eligibleCohorts.map(({ cohort }) => cohort),
  });
}

/**
 * Resumes the learner's in-progress standalone attempt or starts the next one, attributed to
 * the chosen (or only) eligible study group.
 */
export async function startAttempt(
  db: PrismaClient,
  input: { courseItemId: string; cohortId?: string },
  userId: string,
) {
  await requireCourseItemAccess({
    courseItemId: input.courseItemId,
    userId,
  });
  // READ COMMITTED + a per-learner/item advisory lock instead of serializable isolation. The
  // (courseItemId, userId, attemptNumber) unique constraint stays as a backstop: on P2002 the
  // whole transaction re-runs and returns the in-progress attempt created by the winner.
  return withTransactionRetry(
    () =>
      db.$transaction(async (tx) => {
        await lockAttemptStart(tx, userId, input.courseItemId);
        const item = await tx.courseItem.findUnique({
          where: { id: input.courseItemId },
          select: {
            organizationId: true,
            module: { select: { courseId: true } },
            assessment: { select: { id: true, maxAttempts: true } },
          },
        });
        if (!item?.assessment) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tugas ini tidak tersedia.",
          });
        }
        const eligibleWhere = eligibleCohortEnrollmentWhere(
          userId,
          { courseId: item.module.courseId },
          new Date(),
        );
        const cohortEnrollments = await tx.cohortEnrollment.findMany({
          where: {
            ...eligibleWhere,
            cohort: {
              ...eligibleWhere.cohort,
              ...(input.cohortId ? { id: input.cohortId } : {}),
            },
          },
          orderBy: { enrolledAt: "desc" },
          select: { cohortId: true },
          take: input.cohortId ? 1 : 2,
        });
        if (input.cohortId && cohortEnrollments.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Kamu tidak terdaftar aktif di kelas ini.",
          });
        }
        if (!input.cohortId && cohortEnrollments.length > 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pilih kelas sebelum memulai tugas ini.",
          });
        }
        const cohortId =
          input.cohortId ?? cohortEnrollments[0]?.cohortId ?? null;
        const current = await tx.assessmentAttempt.findFirst({
          where: {
            courseItemId: input.courseItemId,
            userId,
            status: "IN_PROGRESS",
            assessmentEventId: null,
          },
          orderBy: { attemptNumber: "desc" },
        });
        if (current) {
          if (current.cohortId && cohortId && current.cohortId !== cohortId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Pengerjaan ini milik kelas lain.",
            });
          }
          if (!current.cohortId && cohortId) {
            return tx.assessmentAttempt.update({
              where: { id: current.id },
              data: { cohortId },
            });
          }
          return current;
        }
        // One grouped query yields both the standalone attempt count (for maxAttempts) and the
        // highest attempt number across standalone and event attempts of this item.
        const attemptGroups = await tx.assessmentAttempt.groupBy({
          by: ["assessmentEventId"],
          where: { courseItemId: input.courseItemId, userId },
          _count: { _all: true },
          _max: { attemptNumber: true },
        });
        const count =
          attemptGroups.find((group) => group.assessmentEventId === null)
            ?._count._all ?? 0;
        const lastAttemptNumber = attemptGroups.reduce(
          (max, group) => Math.max(max, group._max.attemptNumber ?? 0),
          0,
        );
        if (
          item.assessment.maxAttempts !== null &&
          count >= item.assessment.maxAttempts
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Batas jumlah pengerjaan sudah tercapai.",
          });
        }
        await tx.contentProgress.upsert({
          where: {
            courseItemId_userId: { courseItemId: input.courseItemId, userId },
          },
          create: { courseItemId: input.courseItemId, userId },
          update: {},
        });
        return tx.assessmentAttempt.create({
          data: {
            assessmentId: item.assessment.id,
            courseItemId: input.courseItemId,
            organizationId: item.organizationId,
            cohortId,
            userId,
            attemptNumber: lastAttemptNumber + 1,
            shuffleSeed: crypto.randomUUID(),
            runtimeVersion: RUNTIME_VERSION,
          },
        });
      }),
    { shouldRetry: isUniqueConstraintError },
  );
}

/** Rejects answers for other questions, foreign options, or the wrong shape for the question type. */
function assertAnswersMatchQuestions(
  answers: SaveAnswersInput["answers"],
  questions: Array<{
    id: string;
    type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
    options: Array<{ id: string }>;
  }>,
) {
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Soal tidak valid.",
      });
    }
    const validOptions = new Set(question.options.map(({ id }) => id));
    if (answer.optionIds.some((optionId) => !validOptions.has(optionId))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pilihan jawaban tidak valid.",
      });
    }
    if (
      question.type === "WRITTEN"
        ? answer.optionIds.length > 0
        : answer.content !== undefined
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Format jawaban tidak sesuai dengan soal.",
      });
    }
    if (question.type === "SINGLE_CHOICE" && answer.optionIds.length > 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pilih paling banyak satu jawaban.",
      });
    }
  }
}

/**
 * Replaces the stored answers of the given questions (options, written content, `answeredAt`) after
 * checking them against the assessment. Call it inside the transaction holding the attempt lock.
 * `answeredAt` is one time for all answers, or a time per question (offline answers).
 */
export async function writeAnswers(
  tx: Prisma.TransactionClient,
  input: {
    attemptId: string;
    organizationId: string;
    assessmentId: string;
    answers: SaveAnswersInput["answers"];
    answeredAt: Date | ReadonlyMap<string, Date>;
  },
) {
  if (!input.answers.length) return;
  const questionIds = input.answers.map((answer) => answer.questionId);
  const questions = await tx.assessmentQuestion.findMany({
    where: { assessmentId: input.assessmentId, id: { in: questionIds } },
    select: { id: true, type: true, options: { select: { id: true } } },
  });
  assertAnswersMatchQuestions(input.answers, questions);

  await tx.assessmentAnswer.createMany({
    data: input.answers.map((answer) => ({
      attemptId: input.attemptId,
      organizationId: input.organizationId,
      questionId: answer.questionId,
      ...(answer.content === undefined ? {} : { content: answer.content }),
    })),
    skipDuplicates: true,
  });

  await tx.$executeRaw(
    buildAssessmentAnswerContentUpdate(input.attemptId, input.answers),
  );

  const savedAnswers = await tx.assessmentAnswer.findMany({
    where: { attemptId: input.attemptId, questionId: { in: questionIds } },
    select: { id: true, questionId: true },
  });
  const answerIdsByQuestionId = new Map(
    savedAnswers.map((answer) => [answer.questionId, answer.id]),
  );
  const answeredAt = input.answeredAt;
  if (answeredAt instanceof Date) {
    await tx.assessmentAnswer.updateMany({
      where: { id: { in: savedAnswers.map((answer) => answer.id) } },
      data: { answeredAt },
    });
  } else {
    for (const answer of savedAnswers) {
      const at = answeredAt.get(answer.questionId);
      if (at) {
        await tx.assessmentAnswer.update({
          where: { id: answer.id },
          data: { answeredAt: at },
        });
      }
    }
  }
  await tx.assessmentAnswerSelection.deleteMany({
    where: { answerId: { in: savedAnswers.map((answer) => answer.id) } },
  });
  const selections = input.answers.flatMap((answer) => {
    const answerId = answerIdsByQuestionId.get(answer.questionId);
    return answerId
      ? answer.optionIds.map((optionId) => ({ answerId, optionId }))
      : [];
  });
  if (selections.length) {
    await tx.assessmentAnswerSelection.createMany({
      data: selections,
      skipDuplicates: true,
    });
  }
}

/** Autosave for an in-progress attempt; each answer replaces the stored one for its question. */
export async function saveAnswers(
  db: PrismaClient,
  input: SaveAnswersInput,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: input.attemptId },
    select: {
      userId: true,
      status: true,
      courseItemId: true,
      organizationId: true,
      assessmentEvent: eventParticipationSelect(userId),
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  if (attempt.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  if (attempt.assessmentEvent) {
    requireOpenEventParticipation(attempt.assessmentEvent);
  } else if (attempt.status === "IN_PROGRESS") {
    await requireInProgressAttemptAccess(db, attempt.courseItemId, userId);
  } else {
    await requireCourseItemAccess({
      courseItemId: attempt.courseItemId,
      userId,
    });
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new TRPCError({ code: "CONFLICT" });
  }
  if (
    new Set(input.answers.map((answer) => answer.questionId)).size !==
    input.answers.length
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ada soal yang dijawab lebih dari sekali.",
    });
  }
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // Serializes saves and submission of this attempt; a finished attempt is a conflict.
      if (!(await lockInProgressAttempt(tx, input.attemptId))) {
        throw new TRPCError({ code: "CONFLICT" });
      }
      const currentAttempt = await tx.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          status: true,
          assessmentId: true,
          startedAt: true,
          assessment: {
            select: { timeLimitMinutes: true, sections: timedSectionsSelect },
          },
          assessmentEvent: {
            select: {
              status: true,
              durationMinutes: true,
              closesAt: true,
              closedAt: true,
            },
          },
        },
      });
      if (currentAttempt?.status !== "IN_PROGRESS") {
        throw new TRPCError({ code: "CONFLICT" });
      }
      if (
        currentAttempt.assessmentEvent &&
        currentAttempt.assessmentEvent.status !== "OPEN"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Tugas atau tryout ini sudah ditutup.",
        });
      }
      const deadline = attemptDeadline({
        startedAt: currentAttempt.startedAt,
        timeLimitMinutes: currentAttempt.assessment.timeLimitMinutes,
        event: currentAttempt.assessmentEvent,
        sections: currentAttempt.assessment.sections,
      });
      if (deadline && new Date() >= deadline) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Waktu pengerjaan sudah habis.",
        });
      }

      await writeAnswers(tx, {
        attemptId: input.attemptId,
        organizationId: attempt.organizationId,
        assessmentId: currentAttempt.assessmentId,
        answers: input.answers,
        answeredAt: new Date(),
      });
      return { saved: input.answers.length };
    }),
  );
}

/**
 * Grades the attempt and awards the submission; a passing standalone attempt completes its course
 * item and awards the pass. An offline device passes `submittedAt`, the time the learner submitted;
 * it is kept between the start and the deadline (and never later than now), so completion times on
 * the leaderboard are not stretched by a late sync. Event attempts can be submitted while the event
 * is open and, for offline devices, within the grace after it closed.
 */
export async function submitAttempt(
  db: PrismaClient,
  attemptId: string,
  userId: string,
  options: { submittedAt?: Date } = {},
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      userId: true,
      status: true,
      courseItemId: true,
      assessmentEvent: eventParticipationSelect(userId),
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  if (attempt.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  if (attempt.assessmentEvent) {
    requireEventParticipationForSync(attempt.assessmentEvent, new Date());
  } else {
    await requireCourseItemAccess({
      courseItemId: attempt.courseItemId,
      userId,
    });
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new TRPCError({ code: "CONFLICT" });
  }
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      // Serializes with saves and event auto-submission of this attempt.
      if (!(await lockInProgressAttempt(tx, attemptId))) {
        throw new TRPCError({ code: "CONFLICT" });
      }
      const full = await tx.assessmentAttempt.findUnique({
        where: { id: attemptId },
        select: {
          ...gradableAttemptSelect,
          courseItem: { select: { module: { select: { courseId: true } } } },
        },
      });
      const now = new Date();
      if (
        full?.userId !== userId ||
        full.status !== "IN_PROGRESS" ||
        (full.assessmentEvent &&
          !eventAcceptsLearnerWrites(full.assessmentEvent, now))
      ) {
        throw new TRPCError({ code: "CONFLICT" });
      }
      const deadline = attemptDeadline({
        startedAt: full.startedAt,
        timeLimitMinutes: full.assessment.timeLimitMinutes,
        event: full.assessmentEvent,
        sections: full.assessment.sections,
      });
      const expired = deadline !== null && now >= deadline;
      const latest = Math.min(now.getTime(), deadline?.getTime() ?? Infinity);
      const submittedAt = options.submittedAt
        ? new Date(
            Math.max(
              full.startedAt.getTime(),
              Math.min(options.submittedAt.getTime(), latest),
            ),
          )
        : undefined;
      const graded = await gradeInProgressAttempt(tx, full, now, {
        via: "LEARNER",
        submittedAt,
      });
      await recordAssessmentSubmitted(tx, full, now);
      if (graded.passed && !full.assessmentEvent) {
        await markCourseItemCompleted(
          tx,
          full.courseItemId,
          userId,
          now,
          full.courseItem.module.courseId,
        );
        await recordAssessmentPassed(tx, full, now);
      }
      return {
        status: graded.status,
        score: graded.score,
        maxScore: graded.maxScore,
        expired,
      };
    }),
  );
}

/** The learner's 50 most recent attempts; scores stay hidden until graded. */
export async function listMyAttempts(
  db: PrismaClient,
  userId: string,
  organizationId: string | undefined,
) {
  const attempts = await db.assessmentAttempt.findMany({
    where: { organizationId, userId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      courseItemId: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      assessment: { select: { title: true } },
      courseItem: { select: { module: { select: { courseId: true } } } },
      assessmentEvent: {
        select: {
          id: true,
          participants: {
            where: { userId },
            select: { invalidatedAt: true },
          },
        },
      },
    },
  });
  return attempts.map((attempt) => ({
    ...attempt,
    score: attempt.status === "GRADED" ? attempt.score : null,
    maxScore: attempt.status === "GRADED" ? attempt.maxScore : null,
  }));
}

/**
 * One of the learner's attempts. Scores and feedback are withheld until the attempt is graded,
 * and for invalidated participations or cancelled events.
 */
export async function getMyAttempt(
  db: PrismaClient,
  attemptId: string,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      courseItemId: true,
      attemptNumber: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      gradedAt: true,
      assessment: { select: { title: true } },
      courseItem: {
        select: {
          module: {
            select: {
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      },
      assessmentEvent: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          participants: {
            where: { userId },
            select: { invalidatedAt: true, invalidationReason: true },
          },
        },
      },
      cohort: { select: { id: true, name: true } },
      answers: {
        select: {
          id: true,
          questionId: true,
          content: true,
          autoScore: true,
          manualScore: true,
          feedback: true,
          selectedOptions: { select: { optionId: true } },
        },
      },
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  if (!attempt.assessmentEvent) {
    await requireCourseItemAccess({
      courseItemId: attempt.courseItemId,
      userId,
    });
  }
  const context = assessmentContext(attempt);
  if (
    attempt.status !== "GRADED" ||
    attempt.assessmentEvent?.participants[0]?.invalidatedAt ||
    attempt.assessmentEvent?.status === "CANCELLED"
  ) {
    return {
      ...attempt,
      context,
      score: null,
      maxScore: null,
      gradedAt: null,
      answers: attempt.answers.map(
        ({ autoScore: _a, manualScore: _m, feedback: _f, ...answer }) => answer,
      ),
    };
  }
  return { ...attempt, context };
}
