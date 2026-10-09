import { TRPCError } from "@trpc/server";

import { after } from "next/server";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
  addEventCohorts,
  closeAssessmentEvent,
  finalizeClosedEvent,
  lockEventTargets,
  openAssessmentEvent,
  scheduleAssessmentEvent,
  type AuthorizeEventChange,
} from "~/server/assessment/event-lifecycle";
import {
  assertTargetableCohorts,
  eventEnrollmentSql,
  requireEventAccess,
  resolveEventAccess,
  targetableCohortWhere,
} from "~/server/assessment/event-targets";
import { requireCoursePermission } from "~/server/authorization";
import { deleteAssessmentEventWithProgress } from "~/server/content/resource-deletion";
import { assertAssessmentComplete } from "~/server/course/readiness-service";
import {
  notifyEventCancelled,
  notifyEventOpened,
  notifyEventOpenedOnce,
  notifyInBackground,
} from "~/server/notifications/triggers";

/**
 * Staff actions on assessment events. Every change is authorized twice: up front for a quick
 * rejection, and again inside the transaction against the targets read under the event row
 * lock, so a class added concurrently by someone else is part of the check.
 */

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Attempts graded right after a manual close; the lifecycle cron grades the rest. */
const CLOSE_FINALIZE_BUDGET = 4;

function forbiddenTargets(allCohorts: boolean) {
  return new TRPCError({
    code: "FORBIDDEN",
    message: allCohorts
      ? "Hanya pengelola course yang bisa mengelola event untuk semua kelas."
      : "Kamu hanya bisa mengelola event untuk kelas yang kamu ajar.",
  });
}

/** Requires manage access over the given targets. */
export function authorizeEventManager(userId: string): AuthorizeEventChange {
  return async (targets) => {
    const access = await resolveEventAccess({ ...targets, userId });
    if (!access?.manage) throw forbiddenTargets(targets.allCohorts);
  };
}

async function requireTargetManagement(
  db: Db,
  input: {
    courseId: string;
    allCohorts: boolean;
    cohortIds: string[];
    userId: string;
  },
) {
  await assertTargetableCohorts(db, input.courseId, input.cohortIds);
  await authorizeEventManager(input.userId)(input);
}

/**
 * Classes an event of the course can target, with their eligible learners and average
 * curriculum progress, and whether the caller may pick them.
 */
export async function listEventTargetCohorts(
  db: Db,
  input: { courseId: string; userId: string },
) {
  await requireCoursePermission({
    courseId: input.courseId,
    permission: "course.view",
    userId: input.userId,
  });
  const now = new Date();
  const cohorts = await db.cohort.findMany({
    where: targetableCohortWhere(input.courseId),
    orderBy: [{ defaultForCourseId: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, status: true, defaultForCourseId: true },
  });
  const [stats, access, courseAccess] = await Promise.all([
    db.$queryRaw<
      Array<{
        cohortId: string;
        learnerCount: number;
        averageCompleted: number | null;
        itemCount: number;
      }>
    >`
      WITH items AS (
        SELECT item."id"
        FROM "CourseItem" AS item
        JOIN "CourseModule" AS module ON module."id" = item."moduleId"
        WHERE module."courseId" = ${input.courseId} AND item."isPublished"
      ),
      learners AS (
        SELECT DISTINCT enrollment."cohortId", enrollment."userId"
        FROM "CohortEnrollment" AS enrollment
        JOIN "Cohort" AS cohort ON cohort."id" = enrollment."cohortId"
        WHERE cohort."courseId" = ${input.courseId}
          AND ${eventEnrollmentSql(now)}
      ),
      completed AS (
        SELECT learners."cohortId", learners."userId", COUNT(progress."id") AS "done"
        FROM learners
        LEFT JOIN "ContentProgress" AS progress
          ON progress."userId" = learners."userId"
          AND progress."status" = 'COMPLETED'
          AND progress."courseItemId" IN (SELECT "id" FROM items)
        GROUP BY learners."cohortId", learners."userId"
      )
      SELECT
        completed."cohortId",
        COUNT(*)::int AS "learnerCount",
        AVG(completed."done")::float AS "averageCompleted",
        (SELECT COUNT(*) FROM items)::int AS "itemCount"
      FROM completed
      GROUP BY completed."cohortId"
    `,
    Promise.all(
      cohorts.map((cohort) =>
        resolveEventAccess({
          courseId: input.courseId,
          allCohorts: false,
          cohortIds: [cohort.id],
          userId: input.userId,
        }),
      ),
    ),
    // Only course managers have access without any class.
    resolveEventAccess({
      courseId: input.courseId,
      allCohorts: true,
      cohortIds: [],
      userId: input.userId,
    }),
  ]);
  const statsByCohort = new Map(stats.map((row) => [row.cohortId, row]));
  return {
    canTargetAll: Boolean(courseAccess?.manage),
    cohorts: cohorts.map((cohort, index) => {
      const row = statsByCohort.get(cohort.id);
      return {
        id: cohort.id,
        name: cohort.name,
        status: cohort.status,
        selfPaced: cohort.defaultForCourseId !== null,
        learnerCount: row?.learnerCount ?? 0,
        averageProgress:
          row && row.itemCount > 0 && row.averageCompleted !== null
            ? Math.round((row.averageCompleted * 100) / row.itemCount)
            : null,
        canTarget: Boolean(access[index]?.manage),
      };
    }),
  };
}

export type CreateAssessmentEventInput = {
  courseId: string;
  courseItemId: string;
  type: "QUICK_ASSESSMENT" | "TRYOUT";
  target: { allCohorts: boolean; cohortIds: string[] };
  title: string;
  durationMinutes: number;
  closesAt: Date;
  start:
    | { mode: "draft" }
    | { mode: "now"; notify: boolean }
    | { mode: "schedule"; opensAt: Date; notify: boolean };
};

/**
 * Creates an event for one or more classes (or every class) of the course and saves it as a
 * draft, schedules it or opens it right away. A failed opening or scheduling removes the draft.
 */
export async function createAssessmentEvent(
  db: PrismaClient,
  input: CreateAssessmentEventInput,
  userId: string,
) {
  const now = new Date();
  const cohortIds = input.target.allCohorts
    ? []
    : [...new Set(input.target.cohortIds)];
  const course = await db.course.findUnique({
    where: { id: input.courseId },
    select: { organizationId: true },
  });
  if (!course) throw new TRPCError({ code: "NOT_FOUND" });
  await requireTargetManagement(db, {
    courseId: input.courseId,
    allCohorts: input.target.allCohorts,
    cohortIds,
    userId,
  });
  if (input.closesAt <= now) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Waktu tutup harus di masa depan.",
    });
  }
  const item = await db.courseItem.findFirst({
    where: {
      id: input.courseItemId,
      type: "ASSESSMENT",
      isPublished: true,
      module: { courseId: input.courseId },
    },
    select: { organizationId: true, assessmentId: true },
  });
  if (item?.organizationId !== course.organizationId || !item.assessmentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pilih tugas yang tampil di course ini.",
    });
  }
  // Events need a complete assessment (questions, options, answer key).
  await assertAssessmentComplete(db, item.assessmentId);
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: course.organizationId, userId },
    },
    select: { id: true },
  });
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  const created = await db.assessmentEvent.create({
    data: {
      organizationId: course.organizationId,
      courseId: input.courseId,
      courseItemId: input.courseItemId,
      createdByMembershipId: membership.id,
      type: input.type,
      allCohorts: input.target.allCohorts,
      title: input.title,
      durationMinutes: input.durationMinutes,
      closesAt: input.closesAt,
      cohorts: { create: cohortIds.map((cohortId) => ({ cohortId })) },
    },
    select: { id: true },
  });
  const discardDraft = () =>
    db.assessmentEvent
      .deleteMany({ where: { id: created.id, status: "DRAFT" } })
      .catch((error: unknown) => {
        console.error("Failed to discard an event draft", error);
      });
  const authorize = authorizeEventManager(userId);
  let participantCount: number | null = null;
  try {
    if (input.start.mode === "now") {
      const opened = await openAssessmentEvent(db, {
        eventId: created.id,
        now,
        automatic: false,
        actorMembershipId: membership.id,
        notify: input.start.notify,
        authorize,
      });
      participantCount = opened.opened ? opened.participantCount : null;
    } else if (input.start.mode === "schedule") {
      await scheduleAssessmentEvent(db, {
        eventId: created.id,
        opensAt: input.start.opensAt,
        notify: input.start.notify,
        actorMembershipId: membership.id,
        now,
        authorize,
      });
    }
  } catch (error) {
    await discardDraft();
    throw error;
  }
  if (input.start.mode === "now") {
    await notifyInBackground("event opened", () =>
      notifyEventOpenedOnce(created.id),
    );
  }
  return { eventId: created.id, participantCount };
}

/** Quick rejection before any work; the change itself re-checks under the row lock. */
async function requireManager(db: Db, eventId: string, userId: string) {
  const { membership } = await requireEventAccess(
    db,
    eventId,
    userId,
    "manage",
  );
  return membership;
}

export async function openEvent(
  db: PrismaClient,
  input: { eventId: string; notify: boolean },
  userId: string,
) {
  const membership = await requireManager(db, input.eventId, userId);
  const result = await openAssessmentEvent(db, {
    eventId: input.eventId,
    now: new Date(),
    automatic: false,
    actorMembershipId: membership.id,
    notify: input.notify,
    authorize: authorizeEventManager(userId),
  });
  await notifyInBackground("event opened", () =>
    notifyEventOpenedOnce(input.eventId),
  );
  return {
    opened: true,
    participantCount: result.opened ? result.participantCount : 0,
  };
}

export async function scheduleEvent(
  db: PrismaClient,
  input: { eventId: string; opensAt: Date; notify: boolean },
  userId: string,
) {
  const membership = await requireManager(db, input.eventId, userId);
  return scheduleAssessmentEvent(db, {
    ...input,
    actorMembershipId: membership.id,
    now: new Date(),
    authorize: authorizeEventManager(userId),
  });
}

/** Grades a few batches right away; the lifecycle cron finishes larger events. */
function finalizeAfterClose(db: PrismaClient, eventId: string) {
  const run = async () => {
    for (let batch = 0; batch < CLOSE_FINALIZE_BUDGET; batch += 1) {
      const step = await finalizeClosedEvent(db, eventId);
      if (step.done || step.graded === 0) return;
    }
  };
  const guarded = () =>
    run().catch((error: unknown) => {
      console.error("Failed to auto-submit attempts of a closed event", {
        eventId,
        error,
      });
    });
  try {
    after(guarded);
    return Promise.resolve();
  } catch {
    // Outside a Next.js request scope (e.g. MCP, tests): grade inline.
    return guarded();
  }
}

/**
 * Closes an open event. Closing an already closed event re-runs the grading, which recovers
 * attempts a failed or interrupted auto-submit left open.
 */
export async function closeEvent(
  db: PrismaClient,
  eventId: string,
  userId: string,
) {
  const membership = await requireManager(db, eventId, userId);
  const closed = await closeAssessmentEvent(db, {
    eventId,
    closedAt: new Date(),
    actorMembershipId: membership.id,
    authorize: authorizeEventManager(userId),
  });
  if (!closed) {
    const event = await db.assessmentEvent.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    if (event?.status !== "CLOSED") throw new TRPCError({ code: "CONFLICT" });
  }
  // Learners can no longer save or submit once the event is closed, so the attempts still in
  // progress are graded as submitted at closing time.
  await finalizeAfterClose(db, eventId);
  return { closed: true };
}

export async function cancelEvent(
  db: PrismaClient,
  input: { eventId: string; reason: string; notify: boolean },
  userId: string,
) {
  const membership = await requireManager(db, input.eventId, userId);
  const authorize = authorizeEventManager(userId);
  const result = await db.$transaction(async (tx) => {
    await authorize(await lockEventTargets(tx, input.eventId));
    const updated = await tx.assessmentEvent.updateMany({
      where: {
        id: input.eventId,
        status: { in: ["DRAFT", "SCHEDULED", "OPEN"] },
      },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
    await tx.assessmentEventAudit.create({
      data: {
        eventId: input.eventId,
        actorMembershipId: membership.id,
        action: "CANCELLED",
        reason: input.reason,
      },
    });
    return { cancelled: true };
  });
  // Only opened events have participants to notify.
  if (input.notify) {
    await notifyInBackground("event cancelled", () =>
      notifyEventCancelled(input.eventId, input.reason),
    );
  }
  return result;
}

export async function deleteEvent(
  db: PrismaClient,
  eventId: string,
  userId: string,
) {
  const membership = await requireManager(db, eventId, userId);
  const authorize = authorizeEventManager(userId);
  const removed = await db.$transaction(async (tx) => {
    await authorize(await lockEventTargets(tx, eventId));
    return deleteAssessmentEventWithProgress(tx, eventId);
  });
  return { deleted: true, actorMembershipId: membership.id, removed };
}

/** Adds classes to an event that has not closed yet; classes are never removed. */
export async function addCohortsToEvent(
  db: PrismaClient,
  input: { eventId: string; cohortIds: string[]; notify: boolean },
  userId: string,
) {
  const membership = await requireManager(db, input.eventId, userId);
  const event = await db.assessmentEvent.findUniqueOrThrow({
    where: { id: input.eventId },
    select: { courseId: true },
  });
  await assertTargetableCohorts(db, event.courseId, input.cohortIds);
  const result = await addEventCohorts(db, {
    eventId: input.eventId,
    cohortIds: input.cohortIds,
    actorMembershipId: membership.id,
    now: new Date(),
    authorize: authorizeEventManager(userId),
  });
  if (result.open && result.addedParticipantIds.length > 0 && input.notify) {
    await notifyInBackground("event classes added", () =>
      notifyEventOpened(input.eventId, result.addedParticipantIds),
    );
  }
  return {
    added: result.added.length,
    participantCount: result.participantCount,
  };
}
