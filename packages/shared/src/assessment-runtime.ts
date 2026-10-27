import { z } from "zod";

/**
 * Attempt progress log shared by web, mobile and the server (docs/eps-topik-simulation.md sections
 * 4.2 and 5). Clients append entries as the learner works and send them; the server re-checks
 * every entry with the same rules before storing it, so an offline attempt is judged by when the
 * learner acted, within bounds, not by when the device synced.
 *
 * This first version only enforces time. Section, navigation, lock and audio rules extend the
 * same entries later; `RUNTIME_VERSION` says which rules a client knows.
 */
export const RUNTIME_VERSION = 1;

export const attemptLogKinds = [
  "QUESTION_SHOWN",
  "ANSWERED",
  "SUBMITTED",
] as const;
export type AttemptLogKind = (typeof attemptLogKinds)[number];
export type AttemptLogSource = "WEB" | "MOBILE";

export const MAX_LOG_ENTRIES_PER_WRITE = 1000;

export const attemptLogEntrySchema = z.object({
  /** Per attempt, assigned by the client in order; also the idempotency key. */
  seq: z.number().int().positive().max(1_000_000),
  kind: z.enum(attemptLogKinds),
  questionId: z.string().min(1).max(200).optional(),
  optionIds: z.array(z.string().min(1).max(200)).max(100).optional(),
  /** Written answers: the text, like `answers[].content` of the sync operation. */
  content: z.string().max(20_000).optional(),
  /** Device time of the action, already corrected with the offset measured at start. */
  clientAt: z.iso.datetime({ offset: true }),
});

export type AttemptLogEntry = z.infer<typeof attemptLogEntrySchema>;

/** A web autosave can wait up to 30 s; anything older or in the future is stamped on arrival. */
export const WEB_MAX_LAG_MS = 45_000;
export const WEB_MAX_AHEAD_MS = 5_000;
/** A device clock may run this far ahead of the server before its entries are refused. */
export const DEVICE_MAX_AHEAD_MS = 60_000;
/** Small backwards steps (clock corrections) are clamped; larger ones are refused. */
export const CLOCK_BACKSTEP_TOLERANCE_MS = 120_000;
/** Entries that reach the server this much later than they happened mark an offline attempt. */
export const OFFLINE_SYNC_THRESHOLD_MS = 5 * 60_000;
/** Offline answers of an event are accepted this long after it closes. */
export const OFFLINE_SUBMISSION_GRACE_MS = 24 * 60 * 60_000;

export type LogRejection = "UNKNOWN_QUESTION" | "LATE" | "CLOCK" | "INVALID";

export type AcceptedLogEntry = AttemptLogEntry & {
  /** When the action counts as having happened. */
  at: Date;
  /** True when it arrived much later than it happened (an offline device). */
  offline: boolean;
};

export type AcceptLogResult = {
  accepted: AcceptedLogEntry[];
  rejected: Array<{ seq: number; reason: LogRejection }>;
  /** Highest sequence number processed (accepted or rejected); later writes skip up to here. */
  lastSeq: number;
};

/**
 * Checks new entries in sequence order against the attempt's time bounds. Entries at or below
 * `lastSeq` were processed before and are skipped silently, so a resent batch is harmless.
 */
export function acceptLogEntries(input: {
  entries: readonly AttemptLogEntry[];
  lastSeq: number;
  /** Time of the last accepted entry, if any. */
  lastAt: Date | null;
  startedAt: Date;
  /** Exclusive: an action at the deadline is late. Null when untimed. */
  deadlineAt: Date | null;
  receivedAt: Date;
  source: AttemptLogSource;
  questionIds: ReadonlySet<string>;
}): AcceptLogResult {
  const accepted: AcceptedLogEntry[] = [];
  const rejected: AcceptLogResult["rejected"] = [];
  let lastSeq = input.lastSeq;
  let lastAt = input.lastAt?.getTime() ?? input.startedAt.getTime();
  const received = input.receivedAt.getTime();
  const sorted = [...input.entries]
    .filter((entry) => entry.seq > input.lastSeq)
    .sort((left, right) => left.seq - right.seq);
  for (const entry of sorted) {
    if (entry.seq <= lastSeq) continue; // duplicate seq within the batch
    lastSeq = entry.seq;
    const reject = (reason: LogRejection) =>
      rejected.push({ seq: entry.seq, reason });
    if (
      entry.kind !== "SUBMITTED" &&
      (!entry.questionId || !input.questionIds.has(entry.questionId))
    ) {
      reject("UNKNOWN_QUESTION");
      continue;
    }
    let at = Date.parse(entry.clientAt);
    if (!Number.isFinite(at)) {
      reject("INVALID");
      continue;
    }
    if (input.source === "WEB") {
      if (received - at > WEB_MAX_LAG_MS || at - received > WEB_MAX_AHEAD_MS)
        at = received;
    } else if (at - received > DEVICE_MAX_AHEAD_MS) {
      reject("CLOCK");
      continue;
    }
    if (at < lastAt) {
      if (lastAt - at > CLOCK_BACKSTEP_TOLERANCE_MS) {
        reject("CLOCK");
        continue;
      }
      at = lastAt;
    }
    if (input.deadlineAt && at >= input.deadlineAt.getTime()) {
      reject("LATE");
      continue;
    }
    lastAt = at;
    accepted.push({
      ...entry,
      at: new Date(at),
      offline: received - at > OFFLINE_SYNC_THRESHOLD_MS,
    });
  }
  return { accepted, rejected, lastSeq };
}

/** The last answer per question among accepted entries, with the time it was given. */
export function latestAnswers(entries: readonly AcceptedLogEntry[]) {
  const answers = new Map<
    string,
    { questionId: string; optionIds: string[]; content?: string; at: Date }
  >();
  for (const entry of entries) {
    if (entry.kind !== "ANSWERED" || !entry.questionId) continue;
    answers.set(entry.questionId, {
      questionId: entry.questionId,
      optionIds: entry.optionIds ?? [],
      content: entry.content,
      at: entry.at,
    });
  }
  return [...answers.values()];
}

/**
 * Time spent per question: from each `QUESTION_SHOWN` to the next shown question or the
 * submission (or `endAt`). Gaps longer than `maxGapMs` (an app left open) count as `maxGapMs`.
 */
export function timePerQuestion(
  entries: ReadonlyArray<{
    kind: string;
    questionId?: string | null;
    at: Date;
  }>,
  endAt: Date | null,
  maxGapMs = 10 * 60_000,
) {
  const sorted = [...entries].sort(
    (left, right) => left.at.getTime() - right.at.getTime(),
  );
  const times = new Map<string, number>();
  let current: { questionId: string; since: number } | null = null;
  const close = (until: number) => {
    if (!current) return;
    const spent = Math.min(Math.max(0, until - current.since), maxGapMs);
    times.set(current.questionId, (times.get(current.questionId) ?? 0) + spent);
    current = null;
  };
  for (const entry of sorted) {
    if (entry.kind === "QUESTION_SHOWN" && entry.questionId) {
      close(entry.at.getTime());
      current = { questionId: entry.questionId, since: entry.at.getTime() };
    } else if (entry.kind === "SUBMITTED") {
      close(entry.at.getTime());
    }
  }
  if (endAt) close(endAt.getTime());
  return times;
}

/** Builds the next entry; clients keep `nextSeq` with the attempt so a reload continues it. */
export function createLogEntry(
  seq: number,
  kind: AttemptLogKind,
  fields: Omit<AttemptLogEntry, "seq" | "kind" | "clientAt">,
  now: Date,
): AttemptLogEntry {
  return { seq, kind, ...fields, clientAt: now.toISOString() };
}
