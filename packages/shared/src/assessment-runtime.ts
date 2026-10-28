import { z } from "zod";

import {
  answerHasContent,
  applyRuleEntry,
  checkRuleEntry,
  ruleStateFrom,
  type RuleEntry,
  type RuleRejection,
  type RuleSection,
} from "./assessment-question-rules";
import {
  sectionAt,
  sectionTimeline,
  type TimelineEntry,
  type TimelineSection,
} from "./assessment-section-timeline";

/**
 * Attempt progress log shared by web, mobile and the server (docs/eps-topik-simulation.md sections
 * 4.2 and 5). Clients append entries as the learner works and send them; the server re-checks
 * every entry with the same rules before storing it, so an offline attempt is judged by when the
 * learner acted, within bounds, not by when the device synced.
 *
 * Version 1 enforced time; version 2 adds sections (`assessment-section-timeline.ts`); version 3
 * adds forward-only and paced navigation, answer locks and audio play limits
 * (`assessment-question-rules.ts`). `RUNTIME_VERSION` says which rules a client knows, and old
 * clients are refused attempts that need newer rules.
 */
export const RUNTIME_VERSION = 3;
/** The first runtime version that understands sections. */
export const SECTIONS_RUNTIME_VERSION = 2;
/** The first runtime version that understands navigation, lock and audio rules. */
export const QUESTION_RULES_RUNTIME_VERSION = 3;

export const attemptLogKinds = [
  "QUESTION_SHOWN",
  "ANSWERED",
  "SUBMITTED",
  "SECTION_STARTED",
  "SECTION_ENDED",
  /** A play of a question's audio started (counts against `audioMaxPlays`). */
  "AUDIO_PLAYED",
] as const;
export type AttemptLogKind = (typeof attemptLogKinds)[number];
export type AttemptLogSource = "WEB" | "MOBILE";

export const MAX_LOG_ENTRIES_PER_WRITE = 1000;

export const attemptLogEntrySchema = z.object({
  /** Per attempt, assigned by the client in order; also the idempotency key. */
  seq: z.number().int().positive().max(1_000_000),
  kind: z.enum(attemptLogKinds),
  questionId: z.string().min(1).max(200).optional(),
  /** `SECTION_STARTED` / `SECTION_ENDED`: the section. */
  sectionId: z.string().min(1).max(200).optional(),
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

export type LogRejection =
  | "UNKNOWN_QUESTION"
  | "LATE"
  | "CLOCK"
  | "INVALID"
  /** Outside the running section: in an intro, an ended section, or a section out of order. */
  | "SECTION"
  | RuleRejection;

/** Sections of an attempt as the rules see them, in order, questions in the attempt's order. */
export type LogPlanSection = TimelineSection &
  RuleSection & {
    questionIds: readonly string[];
  };

/** An entry accepted before: section and submission entries, plus question entries for the rules. */
export type PriorLogEntry = TimelineEntry & RuleEntry;

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
  /**
   * Sectioned attempts: the sections and the section entries accepted before (`SECTION_STARTED`,
   * `SECTION_ENDED`, `SUBMITTED` with their times). Answers must fall in the running section.
   */
  sections?: {
    list: readonly LogPlanSection[];
    priorEntries: readonly PriorLogEntry[];
  };
}): AcceptLogResult {
  const sections = input.sections?.list.length ? input.sections : null;
  const sectionOf = new Map<string, string>();
  for (const section of sections?.list ?? []) {
    for (const questionId of section.questionIds)
      sectionOf.set(questionId, section.id);
  }
  const sectionEntries: TimelineEntry[] = (sections?.priorEntries ?? []).filter(
    (entry) =>
      entry.kind === "SECTION_STARTED" ||
      entry.kind === "SECTION_ENDED" ||
      entry.kind === "SUBMITTED",
  );
  const rules = ruleStateFrom(
    sections?.list ?? [],
    sections?.priorEntries ?? [],
  );
  const timelineAt = (at: number) =>
    sectionTimeline({
      sections: sections?.list ?? [],
      startedAt: input.startedAt,
      attemptDeadline: input.deadlineAt,
      entries: sectionEntries,
      now: new Date(at),
    });
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
    const sectionKind =
      entry.kind === "SECTION_STARTED" || entry.kind === "SECTION_ENDED";
    if (sectionKind) {
      if (
        !sections ||
        !entry.sectionId ||
        !sections.list.some((section) => section.id === entry.sectionId)
      ) {
        reject("SECTION");
        continue;
      }
    } else if (
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
      // A shown question changes no answer, so it may wait for the next autosave without losing
      // its time; answers and submissions must arrive within the autosave window.
      const lagLimit =
        entry.kind === "QUESTION_SHOWN" ? Infinity : WEB_MAX_LAG_MS;
      if (received - at > lagLimit || at - received > WEB_MAX_AHEAD_MS)
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
    if (sections && entry.kind !== "SUBMITTED") {
      const timeline = timelineAt(at);
      const current = timeline.windows[timeline.currentIndex];
      const currentSection = sections.list[timeline.currentIndex];
      if (sectionKind) {
        // Only the section on screen can start (from its intro) or finish early; a section
        // without a timer can always be finished, or it would never end.
        // A paced section ends by itself after its last question.
        const pacedDone =
          currentSection?.navigation === "PACED" &&
          rules.furthest.get(currentSection.id) ===
            currentSection.questionIds.length - 1;
        const valid =
          current !== undefined &&
          current.sectionId === entry.sectionId &&
          (entry.kind === "SECTION_STARTED"
            ? !current.startedAt
            : Boolean(current.startedAt) &&
              Boolean(
                currentSection?.allowEarlyFinish ||
                !currentSection?.timeLimitSeconds ||
                pacedDone,
              ));
        if (!valid) {
          reject("SECTION");
          continue;
        }
      } else {
        const running = sectionAt(timeline, new Date(at));
        if (
          !running ||
          running.sectionId !== sectionOf.get(entry.questionId!)
        ) {
          // Answered after the section's time ran out counts as late, anything else is misplaced.
          const own = timeline.windows.find(
            (window) => window.sectionId === sectionOf.get(entry.questionId!),
          );
          reject(
            own?.deadlineAt && at >= own.deadlineAt.getTime()
              ? "LATE"
              : "SECTION",
          );
          continue;
        }
        const ruleEntry = {
          kind: entry.kind,
          questionId: entry.questionId,
          hasAnswer: answerHasContent(entry),
        };
        const broken = checkRuleEntry(sections.list, rules, ruleEntry);
        if (broken) {
          reject(broken);
          continue;
        }
        applyRuleEntry(sections.list, rules, ruleEntry);
      }
    }
    if (sectionKind || entry.kind === "SUBMITTED") {
      sectionEntries.push({
        kind: entry.kind,
        sectionId: entry.sectionId,
        at: new Date(at),
      });
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
