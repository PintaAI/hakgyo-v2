import { TRPCError } from "@trpc/server";

import type { PrismaClient, Prisma } from "../../../generated/prisma/client";
import { autoSubmitEventAttempts } from "~/server/assessment/attempt";
import {
  addAllCohortTargets,
  enrollEventParticipants,
} from "~/server/assessment/event-targets";
import { assertAssessmentComplete } from "~/server/course/readiness-service";
import { withTransactionRetry } from "~/server/db-retry";

/**
 * Event status machine:
 *
 *   DRAFT ──schedule──▶ SCHEDULED ──(opensAt)──▶ OPEN ──(closesAt / close)──▶ CLOSED
 *   DRAFT / SCHEDULED ──open now──▶ OPEN
 *   DRAFT / SCHEDULED / OPEN ──cancel──▶ CANCELLED
 *
 * Scheduled openings and closings are applied by the lifecycle cron and, for openings, also
 * on demand when a learner starts a due event. Attempts left in progress at closing are graded
 * in batches until `attemptsFinalizedAt` is set.
 */

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/** Attempts graded per event in one finalize call. */
const FINALIZE_BATCH_SIZE = 50;

async function lockEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$queryRaw`
    SELECT "id" FROM "AssessmentEvent" WHERE "id" = ${eventId} FOR UPDATE
  `;
}

async function assertEventAssessmentReady(
  db: Db,
  courseItem: { isPublished: boolean; assessmentId: string | null },
) {
  if (!courseItem.isPublished || !courseItem.assessmentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tugas yang dipilih sudah tidak tampil di course.",
    });
  }
  await assertAssessmentComplete(db, courseItem.assessmentId);
}

const lifecycleEventSelect = {
  id: true,
  courseId: true,
  status: true,
  allCohorts: true,
  opensAt: true,
  closesAt: true,
  notifyOnOpen: true,
  createdByMembershipId: true,
  courseItem: { select: { isPublished: true, assessmentId: true } },
  _count: { select: { cohorts: true } },
} satisfies Prisma.AssessmentEventSelect;

/**
 * Opens a DRAFT or SCHEDULED event: stores the classes of an "all classes" event, adds every
 * eligible learner as a participant and moves the event to OPEN.
 *
 * A manual opening requires at least one eligible learner. An automatic opening (cron or a
 * learner starting a due scheduled event) opens regardless, since learners who join a targeted
 * class later still take part; it returns `opened: false` when the event is no longer due.
 */
export async function openAssessmentEvent(
  db: PrismaClient,
  input: {
    eventId: string;
    now: Date;
  } & ({ automatic: false; actorMembershipId: string } | { automatic: true }),
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockEvent(tx, input.eventId);
      const event = await tx.assessmentEvent.findUnique({
        where: { id: input.eventId },
        select: lifecycleEventSelect,
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.automatic) {
        if (
          event.status !== "SCHEDULED" ||
          !event.opensAt ||
          event.opensAt > input.now
        ) {
          return { opened: false as const };
        }
      } else if (event.status !== "DRAFT" && event.status !== "SCHEDULED") {
        throw new TRPCError({ code: "CONFLICT" });
      }
      if (!event.closesAt || event.closesAt <= input.now) {
        if (input.automatic) {
          // The cron ran after the whole window: nobody could have taken it.
          await tx.assessmentEvent.update({
            where: { id: event.id },
            data: {
              status: "CLOSED",
              openedAt: event.closesAt ?? input.now,
              closedAt: event.closesAt ?? input.now,
              attemptsFinalizedAt: input.now,
            },
          });
          return { opened: false as const };
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Waktu tutup harus di masa depan.",
        });
      }
      await assertEventAssessmentReady(tx, event.courseItem);
      if (event.allCohorts) await addAllCohortTargets(tx, event);
      else if (event._count.cohorts === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pilih setidaknya satu kelas.",
        });
      }
      const participantCount = await enrollEventParticipants(
        tx,
        event.id,
        input.now,
      );
      if (participantCount === 0 && !input.automatic) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Belum ada learner aktif di kelas yang dipilih.",
        });
      }
      const updated = await tx.assessmentEvent.updateMany({
        where: { id: event.id, status: { in: ["DRAFT", "SCHEDULED"] } },
        data: { status: "OPEN", openedAt: input.now },
      });
      if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
      await tx.assessmentEventAudit.create({
        data: {
          eventId: event.id,
          actorMembershipId: input.automatic
            ? event.createdByMembershipId
            : input.actorMembershipId,
          action: "OPENED",
          metadata: { participantCount, automatic: input.automatic },
        },
      });
      return {
        opened: true as const,
        participantCount,
        notify: event.notifyOnOpen,
      };
    }),
  );
}

/** DRAFT or SCHEDULED -> SCHEDULED at `opensAt`; "all classes" targets are stored now as well. */
export async function scheduleAssessmentEvent(
  db: PrismaClient,
  input: {
    eventId: string;
    opensAt: Date;
    notify: boolean;
    actorMembershipId: string;
    now: Date;
  },
) {
  return db.$transaction(async (tx) => {
    await lockEvent(tx, input.eventId);
    const event = await tx.assessmentEvent.findUnique({
      where: { id: input.eventId },
      select: lifecycleEventSelect,
    });
    if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    if (event.status !== "DRAFT" && event.status !== "SCHEDULED") {
      throw new TRPCError({ code: "CONFLICT" });
    }
    if (input.opensAt <= input.now) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Waktu buka harus di masa depan.",
      });
    }
    if (!event.closesAt || event.closesAt <= input.opensAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Waktu tutup harus setelah waktu buka.",
      });
    }
    await assertEventAssessmentReady(tx, event.courseItem);
    if (event.allCohorts) await addAllCohortTargets(tx, event);
    else if (event._count.cohorts === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pilih setidaknya satu kelas.",
      });
    }
    await tx.assessmentEvent.update({
      where: { id: event.id },
      data: {
        status: "SCHEDULED",
        opensAt: input.opensAt,
        notifyOnOpen: input.notify,
      },
    });
    await tx.assessmentEventAudit.create({
      data: {
        eventId: event.id,
        actorMembershipId: input.actorMembershipId,
        action: "SCHEDULED",
        metadata: { opensAt: input.opensAt.toISOString() },
      },
    });
    return { scheduled: true };
  });
}

/**
 * OPEN -> CLOSED. A manual close records the actor; the cron closes at `closesAt` with the
 * event creator as the audit actor. Returns false when the event was not open.
 */
export async function closeAssessmentEvent(
  db: PrismaClient,
  input: {
    eventId: string;
    closedAt: Date;
    actorMembershipId?: string;
  },
) {
  return db.$transaction(async (tx) => {
    const event = await tx.assessmentEvent.findUnique({
      where: { id: input.eventId },
      select: { createdByMembershipId: true },
    });
    if (!event) throw new TRPCError({ code: "NOT_FOUND" });
    const updated = await tx.assessmentEvent.updateMany({
      where: { id: input.eventId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: input.closedAt },
    });
    if (updated.count !== 1) return false;
    await tx.assessmentEventAudit.create({
      data: {
        eventId: input.eventId,
        actorMembershipId:
          input.actorMembershipId ?? event.createdByMembershipId,
        action: "CLOSED",
        metadata: { automatic: !input.actorMembershipId },
      },
    });
    return true;
  });
}

/**
 * Grades up to `limit` attempts of a CLOSED event that were left in progress, submitted at the
 * closing time, and marks the event finalized once none remain.
 */
export async function finalizeClosedEvent(
  db: PrismaClient,
  eventId: string,
  limit = FINALIZE_BATCH_SIZE,
) {
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: { status: true, closedAt: true, attemptsFinalizedAt: true },
  });
  if (event?.status !== "CLOSED" || event.attemptsFinalizedAt) {
    return { done: true, graded: 0 };
  }
  const closedAt = event.closedAt ?? new Date();
  const result = await autoSubmitEventAttempts(db, eventId, closedAt, limit);
  if (result.failed > 0 || result.processed === limit) {
    return { done: false, graded: result.graded };
  }
  // `close` waits for in-flight starts (FOR SHARE), so no attempt can appear after closing.
  const remaining = await db.assessmentAttempt.count({
    where: { assessmentEventId: eventId, status: "IN_PROGRESS" },
  });
  if (remaining > 0) return { done: false, graded: result.graded };
  await db.assessmentEvent.updateMany({
    where: { id: eventId, status: "CLOSED", attemptsFinalizedAt: null },
    data: { attemptsFinalizedAt: new Date() },
  });
  return { done: true, graded: result.graded };
}

/**
 * Adds classes to a DRAFT, SCHEDULED or OPEN event. Classes are never removed once added. On an
 * open event the new classes' eligible learners become participants right away. Returns the
 * ids of the classes that were actually added.
 */
export async function addEventCohorts(
  db: PrismaClient,
  input: {
    eventId: string;
    cohortIds: string[];
    actorMembershipId: string;
    now: Date;
  },
) {
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockEvent(tx, input.eventId);
      const event = await tx.assessmentEvent.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          status: true,
          cohorts: { select: { cohortId: true } },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        event.status !== "DRAFT" &&
        event.status !== "SCHEDULED" &&
        event.status !== "OPEN"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Kelas hanya bisa ditambahkan sebelum event ditutup.",
        });
      }
      const existing = new Set(event.cohorts.map((target) => target.cohortId));
      const added = [...new Set(input.cohortIds)].filter(
        (cohortId) => !existing.has(cohortId),
      );
      if (added.length === 0)
        return { added, participantCount: 0, open: false };
      await tx.assessmentEventCohort.createMany({
        data: added.map((cohortId) => ({ eventId: event.id, cohortId })),
        skipDuplicates: true,
      });
      const open = event.status === "OPEN";
      const participantCount = open
        ? await enrollEventParticipants(tx, event.id, input.now, added)
        : 0;
      // Touch the event so mobile sync picks up the new classes.
      await tx.assessmentEvent.update({
        where: { id: event.id },
        data: { updatedAt: input.now },
      });
      await tx.assessmentEventAudit.create({
        data: {
          eventId: event.id,
          actorMembershipId: input.actorMembershipId,
          action: "COHORTS_ADDED",
          metadata: { cohortIds: added, participantCount },
        },
      });
      return { added, participantCount, open };
    }),
  );
}

export type LifecycleRunResult = {
  opened: string[];
  /** Opened events whose learners asked to be notified. */
  notify: string[];
  closed: string[];
  finalized: number;
  pendingFinalization: number;
};

/**
 * One sweep of the lifecycle cron: opens due scheduled events, closes events past `closesAt`
 * and grades attempts of closed events in batches until `deadline`. Each step is idempotent, so
 * overlapping or interrupted runs pick up where the last one stopped.
 */
export async function runAssessmentEventLifecycle(
  db: PrismaClient,
  now: Date,
  deadline: number,
): Promise<LifecycleRunResult> {
  const result: LifecycleRunResult = {
    opened: [],
    notify: [],
    closed: [],
    finalized: 0,
    pendingFinalization: 0,
  };
  const due = await db.assessmentEvent.findMany({
    where: { status: "SCHEDULED", opensAt: { lte: now } },
    orderBy: { opensAt: "asc" },
    select: { id: true },
  });
  for (const { id } of due) {
    try {
      const opened = await openAssessmentEvent(db, {
        eventId: id,
        now,
        automatic: true,
      });
      if (opened.opened) {
        result.opened.push(id);
        if (opened.notify) result.notify.push(id);
      }
    } catch (error) {
      // Typically the assessment was hidden or edited into an incomplete state.
      console.error("Failed to open a scheduled assessment event", {
        eventId: id,
        error,
      });
    }
  }
  const expired = await db.assessmentEvent.findMany({
    where: { status: "OPEN", closesAt: { lte: now } },
    orderBy: { closesAt: "asc" },
    select: { id: true, closesAt: true },
  });
  for (const event of expired) {
    if (
      await closeAssessmentEvent(db, {
        eventId: event.id,
        closedAt: event.closesAt ?? now,
      })
    ) {
      result.closed.push(event.id);
    }
  }
  const closed = await db.assessmentEvent.findMany({
    where: { status: "CLOSED", attemptsFinalizedAt: null },
    orderBy: { closedAt: "asc" },
    select: { id: true },
  });
  for (const { id } of closed) {
    let done = false;
    // Stops on a batch without progress: its failures are retried by the next run.
    let progressed = true;
    while (!done && progressed && Date.now() < deadline) {
      try {
        const step = await finalizeClosedEvent(db, id);
        done = step.done;
        progressed = step.graded > 0;
      } catch (error) {
        console.error("Failed to finalize a closed assessment event", {
          eventId: id,
          error,
        });
        break;
      }
    }
    if (done) result.finalized += 1;
    else result.pendingFinalization += 1;
  }
  return result;
}
