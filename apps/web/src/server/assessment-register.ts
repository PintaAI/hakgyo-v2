import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";

export const assessmentKinds = ["CHAPTER", "QUICK_ASSESSMENT", "TRYOUT"] as const;
export const registerInput = z.object({
  page: z.number().int().min(1).max(100000).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  kind: z.enum(assessmentKinds).optional(),
  status: z.enum(["IN_PROGRESS", "IN_REVIEW", "GRADED"]).optional(),
  courseId: z.string().min(1).optional(),
  cohortId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  search: z.string().trim().max(200).optional(),
});

// Match requireCoursePermission / requireCohortPermission, including SIMPLE admins.
export function reviewScope(member: {
  id: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "TEACHER";
  organization: { permissionMode: "SIMPLE" | "ADVANCED" };
}): Prisma.AssessmentAttemptWhereInput {
  const simple = member.organization.permissionMode === "SIMPLE";
  if (member.role === "OWNER" || (!simple && member.role === "ADMIN")) {
    return { organizationId: member.organizationId };
  }
  return {
    organizationId: member.organizationId,
    OR: [
      ...(simple
        ? member.role === "TEACHER" ? [{ cohortId: null }] : []
        : [{ courseItem: { module: { course: { ownerMembershipId: member.id } } } }]),
      { cohort: { staff: { some: {
        organizationMemberId: member.id,
        ...(simple ? {} : { role: "INSTRUCTOR" as const }),
      } } } },
    ],
  };
}

export function registerWhere(input: z.infer<typeof registerInput>): Prisma.AssessmentAttemptWhereInput {
  return {
    ...(input.kind === "CHAPTER" ? { assessmentEventId: null }
      : input.kind ? { assessmentEvent: { type: input.kind } } : {}),
    ...(input.eventId ? { assessmentEventId: input.eventId } : {}),
    cohortId: input.cohortId,
    courseItem: input.courseId ? { module: { courseId: input.courseId } } : undefined,
    ...(input.search ? { OR: [
      { user: { name: { contains: input.search, mode: "insensitive" } } },
      { user: { email: { contains: input.search, mode: "insensitive" } } },
      { assessment: { title: { contains: input.search, mode: "insensitive" } } },
      { assessmentEvent: { title: { contains: input.search, mode: "insensitive" } } },
    ] } : {}),
  };
}

export const attemptSummarySelect = {
  id: true, userId: true, courseItemId: true, attemptNumber: true,
  status: true, score: true, maxScore: true,
  startedAt: true, submittedAt: true, gradedAt: true,
  user: { select: { id: true, name: true, email: true } },
  assessment: { select: { id: true, title: true, passingScore: true } },
  courseItem: { select: { module: { select: {
    id: true, title: true, courseId: true, course: { select: { id: true, title: true } },
  } } } },
  cohort: { select: { id: true, name: true } },
  assessmentEvent: { select: { id: true, title: true, type: true, scope: true, status: true } },
  _count: { select: { answers: { where: { question: { type: "WRITTEN" } } } } },
} satisfies Prisma.AssessmentAttemptSelect;

export function assessmentContext(attempt: {
  assessment: { title: string };
  courseItem: { module: { title: string; course: { id: string; title: string } } };
  cohort: { id: string; name: string } | null;
  assessmentEvent: { id: string; title: string; type: "QUICK_ASSESSMENT" | "TRYOUT"; scope: "COHORT" | "COURSE" } | null;
}) {
  const event = attempt.assessmentEvent;
  const kind = event?.type ?? "CHAPTER";
  return {
    kind,
    label: kind === "CHAPTER" ? "Asesmen bab" : kind === "TRYOUT" ? "Tryout" : "Asesmen on-demand",
    title: event?.title ?? attempt.assessment.title,
    course: attempt.courseItem.module.course,
    moduleTitle: attempt.courseItem.module.title,
    cohort: attempt.cohort,
    scope: event?.scope ?? "CHAPTER",
    eventId: event?.id ?? null,
  };
}

type Summary = Prisma.AssessmentAttemptGetPayload<{ select: typeof attemptSummarySelect }>;

export function summarizeAttempt(attempt: Summary, invalidated = false) {
  const final = attempt.status === "GRADED" && !invalidated && attempt.assessmentEvent?.status !== "CANCELLED";
  const score = final ? attempt.score : null;
  const maxScore = final ? attempt.maxScore : null;
  return {
    ...attempt,
    context: assessmentContext(attempt),
    invalidated,
    score, maxScore,
    grading: attempt._count.answers > 0 ? "TEACHER" as const : "AUTOMATIC" as const,
    passed: score !== null && maxScore !== null && maxScore > 0
      ? attempt.assessment.passingScore === null || score * 100 / maxScore >= attempt.assessment.passingScore
      : null,
  };
}

export async function listRegisteredAttempts(
  db: Prisma.TransactionClient,
  scope: Prisma.AssessmentAttemptWhereInput,
  input: z.infer<typeof registerInput>,
) {
  const base = { AND: [scope, registerWhere(input)] };
  const where: Prisma.AssessmentAttemptWhereInput = {
    ...base,
    status: input.status === "IN_REVIEW" ? { in: ["IN_REVIEW", "SUBMITTED"] } : input.status,
  };
  const [rows, total, counts] = await Promise.all([
    db.assessmentAttempt.findMany({ where, select: attemptSummarySelect,
      orderBy: input.status === "IN_REVIEW"
        ? [{ submittedAt: "asc" }, { id: "asc" }]
        : [{ startedAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.limit, take: input.limit,
    }),
    db.assessmentAttempt.count({ where }),
    db.assessmentAttempt.groupBy({ by: ["status"], where: base, _count: true }),
  ]);
  const participants = await db.assessmentEventParticipant.findMany({
    where: { invalidatedAt: { not: null }, OR: rows.flatMap(row => row.assessmentEvent
      ? [{ eventId: row.assessmentEvent.id, userId: row.userId }] : []) },
    select: { eventId: true, userId: true },
  });
  const invalidated = new Set(participants.map(p => `${p.eventId}:${p.userId}`));
  const count = (status: string) => counts.find(c => c.status === status)?._count ?? 0;
  return {
    items: rows.map(row => summarizeAttempt(row, invalidated.has(`${row.assessmentEvent?.id}:${row.userId}`))),
    total, page: input.page, pageCount: Math.ceil(total / input.limit),
    counts: { IN_REVIEW: count("IN_REVIEW") + count("SUBMITTED"), GRADED: count("GRADED"), IN_PROGRESS: count("IN_PROGRESS") },
  };
}
