import { TRPCError } from "@trpc/server";

import { Prisma } from "../../../generated/prisma/client";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import { courseAccessCohortStatuses } from "~/server/enrollment/cohort-access";

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/**
 * Assessment events target one or more classes (cohorts) of their course. Learners take part
 * through an eligible membership in a targeted class: an active or completed, unexpired
 * enrollment in a class that grants course access. Learners who join a targeted class while the
 * event is open become participants when they start.
 */

/** Classes an event may target: the course's classes and self-paced cohort that grant access. */
export function targetableCohortWhere(courseId: string) {
  return {
    courseId,
    status: { in: [...courseAccessCohortStatuses] },
  } satisfies Prisma.CohortWhereInput;
}

/** Memberships through which a learner takes part in an event of the membership's class. */
export function eventEnrollmentWhere(now: Date) {
  return {
    status: { in: [...activeEnrollmentStatuses] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    cohort: { status: { in: [...courseAccessCohortStatuses] } },
  } satisfies Prisma.CohortEnrollmentWhereInput;
}

/** SQL counterpart of `eventEnrollmentWhere` for `enrollment` joined with `cohort`. */
export function eventEnrollmentSql(now: Date) {
  return Prisma.sql`
    enrollment."status"::text IN (${Prisma.join([...activeEnrollmentStatuses])})
    AND (enrollment."expiresAt" IS NULL OR enrollment."expiresAt" > ${now}::timestamp(3))
    AND cohort."status"::text IN (${Prisma.join([...courseAccessCohortStatuses])})
  `;
}

/** Stores every targetable class of the course as a target ("all classes" events). */
export async function addAllCohortTargets(
  tx: Prisma.TransactionClient,
  event: { id: string; courseId: string },
) {
  const cohorts = await tx.cohort.findMany({
    where: targetableCohortWhere(event.courseId),
    select: { id: true },
  });
  if (cohorts.length === 0) return 0;
  const { count } = await tx.assessmentEventCohort.createMany({
    data: cohorts.map((cohort) => ({ eventId: event.id, cohortId: cohort.id })),
    skipDuplicates: true,
  });
  return count;
}

/**
 * Adds every eligible learner of the event's targets (or of `cohortIds` only) as a participant,
 * attributed to their latest eligible class (see `findEligibleEventCohort`). Returns
 * the number of distinct eligible learners and the ids of learners who were not participants yet.
 */
export async function enrollEventParticipants(
  tx: Prisma.TransactionClient,
  eventId: string,
  now: Date,
  cohortIds?: string[],
) {
  const cohortFilter = cohortIds
    ? Prisma.sql`AND target."cohortId" IN (${Prisma.join(cohortIds)})`
    : Prisma.empty;
  const [result] = await tx.$queryRaw<
    Array<{ eligibleCount: number; addedUserIds: string[] }>
  >`
    WITH eligible AS (
      SELECT DISTINCT ON (enrollment."userId")
        enrollment."userId", enrollment."cohortId"
      FROM "AssessmentEventCohort" AS target
      JOIN "Cohort" AS cohort ON cohort."id" = target."cohortId"
      JOIN "CohortEnrollment" AS enrollment ON enrollment."cohortId" = target."cohortId"
      WHERE target."eventId" = ${eventId}
        ${cohortFilter}
        AND ${eventEnrollmentSql(now)}
      ORDER BY
        enrollment."userId",
        (cohort."defaultForCourseId" IS NOT NULL) ASC,
        enrollment."enrolledAt" DESC,
        enrollment."id" DESC
    ),
    inserted AS (
      INSERT INTO "AssessmentEventParticipant" ("eventId", "userId", "cohortId")
      SELECT ${eventId}, eligible."userId", eligible."cohortId" FROM eligible
      ON CONFLICT DO NOTHING
      RETURNING "userId"
    )
    SELECT
      (SELECT COUNT(*) FROM eligible)::int AS "eligibleCount",
      ARRAY(SELECT "userId" FROM inserted) AS "addedUserIds"
  `;
  return {
    eligibleCount: Number(result?.eligibleCount ?? 0),
    addedUserIds: result?.addedUserIds ?? [],
  };
}

/**
 * The learner's eligible targeted class, or null when they cannot take part. A real class comes
 * before the self-paced cohort, then the latest joined: a learner takes one running class of a
 * course at a time, so an older one is a class they already finished.
 */
export async function findEligibleEventCohort(
  db: Db,
  eventId: string,
  userId: string,
  now: Date,
) {
  const enrollmentWhere = eventEnrollmentWhere(now);
  const enrollment = await db.cohortEnrollment.findFirst({
    where: {
      ...enrollmentWhere,
      userId,
      cohort: {
        ...enrollmentWhere.cohort,
        assessmentEvents: { some: { eventId } },
      },
    },
    orderBy: [
      { cohort: { defaultForCourseId: { sort: "asc", nulls: "first" } } },
      { enrolledAt: "desc" },
      { id: "desc" },
    ],
    select: { cohortId: true },
  });
  return enrollment?.cohortId ?? null;
}

/**
 * Events the learner can see: those they take part in (except cancelled ones they never
 * started), plus scheduled and open events of a class they belong to.
 */
export function learnerEventWhere(
  userId: string,
  now: Date,
  options: { includeScheduled: boolean },
): Prisma.AssessmentEventWhereInput {
  const { cohort, ...membership } = eventEnrollmentWhere(now);
  return {
    OR: [
      {
        status: { in: ["OPEN", "CLOSED", "CANCELLED"] },
        participants: { some: { userId } },
      },
      {
        status: {
          in: options.includeScheduled ? ["SCHEDULED", "OPEN"] : ["OPEN"],
        },
        cohorts: {
          some: {
            cohort: {
              ...cohort,
              enrollments: { some: { ...membership, userId } },
            },
          },
        },
      },
    ],
  };
}

export type EventAccess = {
  /** Lifecycle actions (open, schedule, close, cancel, delete, add classes). */
  manage: boolean;
  /** Targeted classes whose participants the user may review; null means every class. */
  reviewCohortIds: string[] | null;
};

async function canManageCourse(courseId: string, userId: string) {
  try {
    await requireCoursePermission({
      courseId,
      permission: "course.manage",
      userId,
    });
    return true;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") return false;
    throw error;
  }
}

/**
 * Course managers manage every event of the course. Class staff with review rights manage
 * events that only target classes they review, and review their own classes' participants on
 * any event. "All classes" events need course management. Returns null without any access.
 */
export async function resolveEventAccess(input: {
  courseId: string;
  allCohorts: boolean;
  cohortIds: string[];
  userId: string;
}): Promise<EventAccess | null> {
  if (await canManageCourse(input.courseId, input.userId)) {
    return { manage: true, reviewCohortIds: null };
  }
  const results = await Promise.allSettled(
    input.cohortIds.map((cohortId) =>
      requireCohortPermission({
        cohortId,
        permission: "assessment.review",
        userId: input.userId,
      }),
    ),
  );
  for (const result of results) {
    // Self-paced cohorts are NOT_FOUND here; anything else is a real failure.
    if (
      result.status === "rejected" &&
      !(
        result.reason instanceof TRPCError &&
        (result.reason.code === "FORBIDDEN" ||
          result.reason.code === "NOT_FOUND")
      )
    ) {
      throw result.reason;
    }
  }
  const reviewCohortIds = input.cohortIds.filter(
    (_, index) => results[index]?.status === "fulfilled",
  );
  if (reviewCohortIds.length === 0) return null;
  return {
    manage:
      !input.allCohorts && reviewCohortIds.length === input.cohortIds.length,
    reviewCohortIds,
  };
}

/** Rejects targets outside the course or classes that grant no access. */
export async function assertTargetableCohorts(
  db: Db,
  courseId: string,
  cohortIds: string[],
) {
  if (cohortIds.length === 0) return;
  const count = await db.cohort.count({
    where: { id: { in: cohortIds }, ...targetableCohortWhere(courseId) },
  });
  if (count !== cohortIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pilih kelas yang aktif dari course ini.",
    });
  }
}

export const eventTargetSelect = {
  id: true,
  organizationId: true,
  courseId: true,
  allCohorts: true,
  status: true,
  cohorts: { select: { cohortId: true } },
} satisfies Prisma.AssessmentEventSelect;

/** Loads the event and the caller's access, or throws NOT_FOUND / FORBIDDEN. */
export async function requireEventAccess(
  db: Db,
  eventId: string,
  userId: string,
  need: "manage" | "review",
) {
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: eventTargetSelect,
  });
  if (!event) throw new TRPCError({ code: "NOT_FOUND" });
  const access = await resolveEventAccess({
    courseId: event.courseId,
    allCohorts: event.allCohorts,
    cohortIds: event.cohorts.map((target) => target.cohortId),
    userId,
  });
  if (!access || (need === "manage" && !access.manage)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: event.organizationId, userId },
    },
    select: { id: true },
  });
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  return { event, access, membership };
}

/** Rejects review actions on a participant of a class the reviewer does not review. */
export function assertCanReviewCohort(
  access: EventAccess,
  cohortId: string | null,
) {
  if (access.reviewCohortIds === null) return;
  if (!cohortId || !access.reviewCohortIds.includes(cohortId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
