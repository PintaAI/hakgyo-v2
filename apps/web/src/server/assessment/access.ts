import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireContentAuthor,
  requireCourseItemAccess,
  requireCoursePermission,
} from "~/server/authorization";
import { assertAssessmentNotLive } from "~/server/assessment/live-status";
import { accessGrantingCohortWhere } from "~/server/enrollment/cohort-access";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export async function requireAssessmentManagement(
  db: DatabaseClient,
  assessmentId: string,
  userId: string,
  action: "edit" | "delete" = "edit",
) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, organizationId: true, createdByMembershipId: true },
  });
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
  await requireContentAuthor({
    organizationId: assessment.organizationId,
    userId,
    createdByMembershipId: assessment.createdByMembershipId,
    action,
  });
  return assessment;
}

/**
 * Management access plus the live lock: an assessment learners can currently take (a visible
 * item in a published course, or an OPEN event) cannot be changed.
 */
export async function requireEditableAssessment(
  db: DatabaseClient,
  assessmentId: string,
  userId: string,
  action: "edit" | "delete" = "edit",
) {
  const assessment = await requireAssessmentManagement(
    db,
    assessmentId,
    userId,
    action,
  );
  await assertAssessmentNotLive(db, assessmentId);
  return assessment;
}

/**
 * Access check for writes to an attempt the user already owns and has in progress.
 *
 * The attempt could only be started after the full `requireCourseItemAccess` check (including
 * outline/module locks), so autosaves only need to confirm access has not been revoked since:
 * the item and course are still published and the learner still has a live course or cohort
 * enrollment. That is a single indexed lookup instead of rebuilding the course outline on every
 * autosave. Anyone who does not match (staff previews, managers, revoked learners) falls back to
 * the full check, so revocation still blocks saving.
 */
export async function requireInProgressAttemptAccess(
  db: DatabaseClient,
  courseItemId: string,
  userId: string,
) {
  const now = new Date();
  const enrolled = await db.courseItem.findFirst({
    where: {
      id: courseItemId,
      isPublished: true,
      module: {
        course: {
          status: "PUBLISHED",
          OR: [
            {
              enrollments: {
                some: {
                  userId,
                  status: { in: [...activeEnrollmentStatuses] },
                  source: { not: "COHORT" },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
            {
              cohorts: {
                some: {
                  ...accessGrantingCohortWhere(now),
                  enrollments: {
                    some: {
                      userId,
                      status: { in: [...activeEnrollmentStatuses] },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    select: { id: true },
  });
  if (!enrolled) await requireCourseItemAccess({ courseItemId, userId });
}

/** Select for `requireOpenEventParticipation`, scoped to the acting learner. */
export function eventParticipationSelect(userId: string) {
  return {
    select: {
      status: true,
      participants: {
        where: { userId },
        select: { invalidatedAt: true },
      },
    },
  } satisfies Prisma.AssessmentEventDefaultArgs;
}

/** Event attempts can only change while the event is OPEN and the learner's participation is valid. */
export function requireOpenEventParticipation(event: {
  status: string;
  participants: Array<{ invalidatedAt: Date | null }>;
}) {
  if (
    event.status !== "OPEN" ||
    !event.participants[0] ||
    event.participants[0].invalidatedAt
  ) {
    throw new TRPCError({ code: "PRECONDITION_FAILED" });
  }
}

export const reviewAccessSelect = {
  id: true,
  organizationId: true,
  cohortId: true,
  userId: true,
  courseItem: { select: { module: { select: { courseId: true } } } },
} satisfies Prisma.AssessmentAttemptSelect;

/** Reviewers need cohort review rights (or course management for cohort-less attempts). */
export async function authorizeReview(
  db: DatabaseClient,
  attempt: Prisma.AssessmentAttemptGetPayload<{
    select: typeof reviewAccessSelect;
  }>,
  userId: string,
) {
  const [, membership] = await Promise.all([
    attempt.cohortId
      ? requireCohortPermission({
          cohortId: attempt.cohortId,
          permission: "assessment.review",
          userId,
        })
      : requireCoursePermission({
          courseId: attempt.courseItem.module.courseId,
          permission: "course.manage",
          userId,
        }),
    db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: attempt.organizationId,
          userId,
        },
      },
      select: { id: true },
    }),
  ]);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  return membership;
}

export async function requireReviewAccess(
  db: DatabaseClient,
  attemptId: string,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: reviewAccessSelect,
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  const membership = await authorizeReview(db, attempt, userId);
  return { attempt, membership };
}
