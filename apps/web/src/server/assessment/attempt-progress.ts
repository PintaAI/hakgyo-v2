import {
  acceptLogEntries,
  latestAnswers,
  MAX_LOG_ENTRIES_PER_WRITE,
  attemptLogEntrySchema,
  type AcceptLogResult,
  type AttemptLogEntry,
  type AttemptLogSource,
} from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import {
  eventAcceptsLearnerWrites,
  eventParticipationSelect,
  requireEventParticipationForSync,
  requireInProgressAttemptAccess,
} from "~/server/assessment/access";
import {
  gradableAttemptSelect,
  gradeInProgressAttempt,
  lockInProgressAttempt,
  recordAssessmentSubmitted,
} from "~/server/assessment/attempt";
import { writeAnswers } from "~/server/assessment/learner-attempts";
import {
  loadSectionEntries,
  loadSectionPlan,
  storeSectionWindows,
} from "~/server/assessment/attempt-sections";
import {
  attemptDeadline,
  timedSectionsSelect,
} from "~/server/assessment/timing";
import { withTransactionRetry } from "~/server/db-retry";

/**
 * The attempt progress log (docs/eps-topik-simulation.md section 5.2): clients append entries as
 * the learner works, the server checks them with the shared rules in `assessment-runtime.ts`,
 * stores the accepted ones and applies their answers. Offline answers count by when they were
 * given, within the attempt's deadline, so a late sync no longer loses them.
 */

export const recordProgressInput = z.object({
  attemptId: z.string().min(1),
  entries: z.array(attemptLogEntrySchema).min(1).max(MAX_LOG_ENTRIES_PER_WRITE),
});

export type RecordProgressResult =
  | ({ settled: false; serverNow: Date } & Pick<
      AcceptLogResult,
      "lastSeq" | "rejected"
    > & {
        submittedAt: Date | null;
        /** The server's sequence before this write: entries at or below it were skipped. */
        previousSeq: number;
      })
  | { settled: true; serverNow: Date; lastSeq: number };

const progressAttemptSelect = {
  id: true,
  userId: true,
  organizationId: true,
  assessmentId: true,
  status: true,
  startedAt: true,
  lastLogSeq: true,
  offlineSyncedAt: true,
  assessment: {
    select: {
      timeLimitMinutes: true,
      sections: timedSectionsSelect,
      questions: { select: { id: true } },
    },
  },
  assessmentEvent: {
    select: { durationMinutes: true, closesAt: true, closedAt: true },
  },
} satisfies Prisma.AssessmentAttemptSelect;

type ProgressAttempt = Prisma.AssessmentAttemptGetPayload<{
  select: typeof progressAttemptSelect;
}>;

/**
 * Checks and stores entries of a locked attempt and applies their answers. Returns the rule
 * result and the accepted submission time, if the entries hold one.
 */
async function applyEntries(
  tx: Prisma.TransactionClient,
  attempt: ProgressAttempt,
  entries: readonly AttemptLogEntry[],
  source: AttemptLogSource,
  now: Date,
) {
  const sectioned = attempt.assessment.sections.length > 0;
  const [lastLog, plan, priorEntries] = await Promise.all([
    tx.assessmentAttemptLog.findFirst({
      where: { attemptId: attempt.id },
      orderBy: { seq: "desc" },
      select: { at: true },
    }),
    // Unsectioned attempts (most autosaves) skip the section lookups.
    sectioned ? loadSectionPlan(tx, attempt.assessmentId) : [],
    sectioned ? loadSectionEntries(tx, attempt.id) : [],
  ]);
  const deadline = attemptDeadline({
    startedAt: attempt.startedAt,
    timeLimitMinutes: attempt.assessment.timeLimitMinutes,
    event: attempt.assessmentEvent,
    sections: attempt.assessment.sections,
  });
  const result = acceptLogEntries({
    entries,
    lastSeq: attempt.lastLogSeq,
    lastAt: lastLog?.at ?? null,
    startedAt: attempt.startedAt,
    deadlineAt: deadline,
    receivedAt: now,
    source,
    questionIds: new Set(attempt.assessment.questions.map(({ id }) => id)),
    sections: { list: plan, priorEntries },
  });
  if (result.lastSeq === attempt.lastLogSeq) {
    return { result, submittedAt: null };
  }
  if (result.accepted.length) {
    await tx.assessmentAttemptLog.createMany({
      data: result.accepted.map((entry) => ({
        attemptId: attempt.id,
        seq: entry.seq,
        kind: entry.kind,
        questionId: entry.questionId ?? null,
        sectionId: entry.sectionId ?? null,
        optionIds: entry.optionIds ?? [],
        content: entry.content ?? null,
        clientAt: new Date(entry.clientAt),
        at: entry.at,
        receivedAt: now,
        source,
      })),
      skipDuplicates: true,
    });
  }
  const answers = latestAnswers(result.accepted);
  await writeAnswers(tx, {
    attemptId: attempt.id,
    organizationId: attempt.organizationId,
    assessmentId: attempt.assessmentId,
    answers: answers.map(({ questionId, optionIds, content }) => ({
      questionId,
      optionIds,
      ...(content === undefined ? {} : { content }),
    })),
    answeredAt: new Map(answers.map(({ questionId, at }) => [questionId, at])),
  });
  const sectionChanges = result.accepted.some(
    (entry) => entry.kind.startsWith("SECTION") || entry.kind === "SUBMITTED",
  );
  // Windows only move with section entries (or time, which grading stores at the end).
  if (sectionChanges)
    await storeSectionWindows(tx, {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      deadline,
      plan,
      entries: [
        ...priorEntries,
        ...result.accepted
          .filter(
            (entry) =>
              entry.kind.startsWith("SECTION") || entry.kind === "SUBMITTED",
          )
          .map((entry) => ({
            kind: entry.kind,
            sectionId: entry.sectionId ?? null,
            at: entry.at,
          })),
      ],
      now,
    });
  const offline = result.accepted.some((entry) => entry.offline);
  await tx.assessmentAttempt.update({
    where: { id: attempt.id },
    data: {
      lastLogSeq: result.lastSeq,
      ...(offline && !attempt.offlineSyncedAt ? { offlineSyncedAt: now } : {}),
    },
  });
  const submitted = result.accepted.findLast(
    (entry) => entry.kind === "SUBMITTED",
  );
  return { result, submittedAt: submitted?.at ?? null };
}

async function requireLearnerAttempt(
  db: PrismaClient,
  attemptId: string,
  userId: string,
  now: Date,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      userId: true,
      status: true,
      courseItemId: true,
      lastLogSeq: true,
      submittedVia: true,
      assessmentEvent: eventParticipationSelect(userId),
    },
  });
  if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
  if (attempt.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  if (attempt.assessmentEvent) {
    requireEventParticipationForSync(attempt.assessmentEvent, now);
  } else if (attempt.status === "IN_PROGRESS") {
    await requireInProgressAttemptAccess(db, attempt.courseItemId, userId);
  }
  return attempt;
}

/**
 * Stores progress of an in-progress attempt. A finished attempt is `settled` (not an error), so a
 * device can drop progress that its submission already carried.
 */
export async function recordAttemptProgress(
  db: PrismaClient,
  input: z.infer<typeof recordProgressInput>,
  userId: string,
  source: AttemptLogSource,
): Promise<RecordProgressResult> {
  const attempt = await requireLearnerAttempt(
    db,
    input.attemptId,
    userId,
    new Date(),
  );
  if (attempt.status !== "IN_PROGRESS") {
    return {
      settled: true,
      serverNow: new Date(),
      lastSeq: attempt.lastLogSeq,
    };
  }
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      const now = new Date();
      if (!(await lockInProgressAttempt(tx, input.attemptId))) {
        const settled = await tx.assessmentAttempt.findUniqueOrThrow({
          where: { id: input.attemptId },
          select: { lastLogSeq: true },
        });
        return {
          settled: true as const,
          serverNow: now,
          lastSeq: settled.lastLogSeq,
        };
      }
      const locked = await tx.assessmentAttempt.findUniqueOrThrow({
        where: { id: input.attemptId },
        select: {
          ...progressAttemptSelect,
          assessmentEvent: {
            select: {
              ...progressAttemptSelect.assessmentEvent.select,
              status: true,
              type: true,
            },
          },
        },
      });
      if (
        locked.assessmentEvent &&
        !eventAcceptsLearnerWrites(locked.assessmentEvent, now)
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Tugas atau tryout ini sudah ditutup.",
        });
      }
      const { result, submittedAt } = await applyEntries(
        tx,
        locked,
        input.entries,
        source,
        now,
      );
      return {
        settled: false as const,
        serverNow: now,
        lastSeq: result.lastSeq,
        rejected: result.rejected,
        submittedAt,
        previousSeq: locked.lastLogSeq,
      };
    }),
  );
}

/**
 * Applies a submission an offline device synced after its event closed and the close already
 * graded the attempt with the answers the server had (`AUTO_CLOSE`). Within the grace after
 * closing, the device's answers given before the deadline replace them and the attempt is
 * regraded as `DEVICE_LATE`. Returns true when applied (or already applied by an earlier copy),
 * false when the attempt is not eligible: it was submitted another way, a teacher reviewed or
 * corrected it, or the grace has passed.
 */
export async function acceptLateDeviceSubmission(
  db: PrismaClient,
  input: { attemptId: string; entries: readonly AttemptLogEntry[] },
  userId: string,
) {
  const now = new Date();
  const attempt = await requireLearnerAttempt(db, input.attemptId, userId, now);
  if (
    attempt.submittedVia !== "AUTO_CLOSE" ||
    (attempt.status !== "GRADED" && attempt.status !== "IN_REVIEW")
  ) {
    return false;
  }
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "AssessmentAttempt"
        WHERE "id" = ${input.attemptId}
          AND "submittedVia" = 'AUTO_CLOSE'
          AND "status" IN ('GRADED', 'IN_REVIEW')
        FOR UPDATE
      `;
      if (!row) return false;
      const [reviewed, adjusted] = await Promise.all([
        tx.assessmentAnswer.count({
          where: { attemptId: input.attemptId, reviewedAt: { not: null } },
        }),
        tx.assessmentEventAudit.count({
          where: { attemptId: input.attemptId, action: "RESULT_ADJUSTED" },
        }),
      ]);
      if (reviewed || adjusted) return false;
      const locked = await tx.assessmentAttempt.findUniqueOrThrow({
        where: { id: input.attemptId },
        select: progressAttemptSelect,
      });
      const { result, submittedAt } = await applyEntries(
        tx,
        locked,
        input.entries,
        "MOBILE",
        now,
      );
      // A replay of entries applied before (or none in time) leaves the grade as it is.
      if (!result.accepted.length) return true;
      const full = await tx.assessmentAttempt.findUniqueOrThrow({
        where: { id: input.attemptId },
        select: gradableAttemptSelect,
      });
      const lastAt = result.accepted.at(-1)?.at;
      await gradeInProgressAttempt(tx, full, now, {
        via: "DEVICE_LATE",
        submittedAt: submittedAt ?? lastAt,
        fromStatus: ["GRADED", "IN_REVIEW"],
      });
      await recordAssessmentSubmitted(tx, full, now);
      return true;
    }),
  );
}

/**
 * The answers a completion must have stored before it is acknowledged: the last answer per
 * question among the entries the rules accept when replayed from the start (in time, in their
 * section, with a plausible clock). Answers the rules refuse legitimately never count, so they are
 * left out; anything else missing means the server refused answers the device should keep.
 */
export async function inTimeEntryAnswers(
  db: PrismaClient,
  attemptId: string,
  entries: readonly AttemptLogEntry[],
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      startedAt: true,
      assessmentId: true,
      assessment: {
        select: {
          timeLimitMinutes: true,
          sections: timedSectionsSelect,
          questions: { select: { id: true } },
        },
      },
      assessmentEvent: {
        select: { durationMinutes: true, closesAt: true, closedAt: true },
      },
    },
  });
  if (!attempt) return [];
  const [plan, storedSectionEntries] = await Promise.all([
    loadSectionPlan(db, attempt.assessmentId),
    db.assessmentAttemptLog.findMany({
      where: {
        attemptId,
        kind: { in: ["SECTION_STARTED", "SECTION_ENDED", "SUBMITTED"] },
      },
      select: { seq: true, kind: true, sectionId: true, at: true },
    }),
  ]);
  // Section starts and ends this device did not write (another tab or device) still count.
  const ownSeqs = new Set(entries.map((entry) => entry.seq));
  const otherSectionEntries = storedSectionEntries.filter(
    (entry) => !ownSeqs.has(entry.seq),
  );
  const replay = acceptLogEntries({
    entries,
    lastSeq: 0,
    lastAt: null,
    startedAt: attempt.startedAt,
    deadlineAt: attemptDeadline({
      startedAt: attempt.startedAt,
      timeLimitMinutes: attempt.assessment.timeLimitMinutes,
      event: attempt.assessmentEvent,
      sections: attempt.assessment.sections,
    }),
    receivedAt: new Date(),
    source: "MOBILE",
    questionIds: new Set(attempt.assessment.questions.map(({ id }) => id)),
    sections: { list: plan, priorEntries: otherSectionEntries },
  });
  return latestAnswers(replay.accepted).map(
    ({ questionId, optionIds, content }) => ({
      questionId,
      optionIds,
      ...(content === undefined ? {} : { content }),
    }),
  );
}
