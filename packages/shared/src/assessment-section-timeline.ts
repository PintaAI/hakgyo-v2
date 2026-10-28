/**
 * Section timing of an attempt (docs/eps-topik-simulation.md section 4.2), shared by web, mobile
 * and the server so all three agree on which section is running and when it ends.
 *
 * Sections run in order. Each starts when the learner taps "Mulai" on its intro screen, or by
 * itself `SECTION_INTRO_SECONDS` after the previous one ended (after the attempt started, for the
 * first), so its clock never waits long. A section ends when its time is up or when the learner
 * finishes it early (if allowed), and it never reopens.
 */

/** How long a section's intro screen may wait before the section starts by itself. */
export const SECTION_INTRO_SECONDS = 60;

export type TimelineSection = {
  id: string;
  /** Null: no timer of its own. */
  timeLimitSeconds: number | null;
  allowEarlyFinish: boolean;
};

export type TimelineEntry = {
  kind: string;
  sectionId?: string | null;
  at: Date;
};

export type SectionWindow = {
  sectionId: string;
  /** Null while the intro screen is still showing. */
  startedAt: Date | null;
  /** When the intro stops waiting and the section starts by itself. */
  autoStartAt: Date;
  /** Exclusive end of answering: own time limit, capped by the attempt deadline. */
  deadlineAt: Date | null;
  endedAt: Date | null;
  endReason: "FINISHED" | "TIME_UP" | null;
};

export type SectionTimeline = {
  windows: SectionWindow[];
  /** Index of the section being introduced or answered; `windows.length` when all ended. */
  currentIndex: number;
};

/**
 * Overall deadline of a sectioned attempt: every section's time plus its intro allowance, so it
 * is an upper bound of when the last section can end. Null when a section has no timer.
 */
export function sectionedAttemptDeadline(
  sections: readonly TimelineSection[],
  startedAt: Date,
) {
  if (
    !sections.length ||
    sections.some((section) => !section.timeLimitSeconds)
  ) {
    return null;
  }
  const seconds = sections.reduce(
    (total, section) =>
      total + (section.timeLimitSeconds ?? 0) + SECTION_INTRO_SECONDS,
    0,
  );
  return new Date(startedAt.getTime() + seconds * 1000);
}

function minDate(...dates: Array<Date | null | undefined>) {
  const times = dates
    .filter((date): date is Date => Boolean(date))
    .map((date) => date.getTime());
  return times.length ? new Date(Math.min(...times)) : null;
}

/**
 * The state of every section at `now`, from the section entries so far (`SECTION_STARTED` /
 * `SECTION_ENDED` with their times; other kinds are ignored, a `SUBMITTED` ends the current
 * section). `attemptDeadline` caps every section (event close, overall limit).
 */
export function sectionTimeline(input: {
  sections: readonly TimelineSection[];
  startedAt: Date;
  attemptDeadline: Date | null;
  entries: readonly TimelineEntry[];
  now: Date;
}): SectionTimeline {
  const entries = [...input.entries].sort(
    (left, right) => left.at.getTime() - right.at.getTime(),
  );
  const windows: SectionWindow[] = [];
  let available = input.startedAt;
  const submittedAt =
    entries.find((entry) => entry.kind === "SUBMITTED")?.at ?? null;
  // Nothing starts once the attempt is over: submitted, or past its overall deadline.
  const overAt = minDate(submittedAt, input.attemptDeadline);
  let over = false;
  for (const section of input.sections) {
    if (overAt && available.getTime() >= overAt.getTime()) {
      over = true;
      break;
    }
    const autoStartAt = new Date(
      available.getTime() + SECTION_INTRO_SECONDS * 1000,
    );
    const explicitStart = entries.find(
      (entry) =>
        entry.kind === "SECTION_STARTED" &&
        entry.sectionId === section.id &&
        entry.at.getTime() >= available.getTime(),
    )?.at;
    // The intro waits until the learner starts or the allowance runs out, whichever is first.
    const reachedAutoStart = input.now.getTime() >= autoStartAt.getTime();
    const startedAt =
      minDate(explicitStart, reachedAutoStart ? autoStartAt : null) ?? null;
    if (startedAt && overAt && startedAt.getTime() >= overAt.getTime()) {
      // The intro would only have ended after the attempt was over: never started.
      over = true;
      break;
    }
    if (!startedAt) {
      windows.push({
        sectionId: section.id,
        startedAt: null,
        autoStartAt,
        deadlineAt: null,
        endedAt: null,
        endReason: null,
      });
      break;
    }
    const deadlineAt = minDate(
      section.timeLimitSeconds
        ? new Date(startedAt.getTime() + section.timeLimitSeconds * 1000)
        : null,
      input.attemptDeadline,
    );
    const finishedAt = entries.find(
      (entry) =>
        (entry.kind === "SECTION_ENDED" && entry.sectionId === section.id) ||
        entry.kind === "SUBMITTED",
    )?.at;
    const finished =
      finishedAt &&
      finishedAt.getTime() >= startedAt.getTime() &&
      (!deadlineAt || finishedAt.getTime() < deadlineAt.getTime())
        ? finishedAt
        : null;
    const timeUp =
      deadlineAt && input.now.getTime() >= deadlineAt.getTime()
        ? deadlineAt
        : null;
    const endedAt = finished ?? timeUp;
    windows.push({
      sectionId: section.id,
      startedAt,
      autoStartAt,
      deadlineAt,
      endedAt,
      endReason: finished ? "FINISHED" : timeUp ? "TIME_UP" : null,
    });
    if (!endedAt) break;
    available = endedAt;
    // A submission ends the attempt: later sections never start.
    if (submittedAt && finished === submittedAt) break;
  }
  const currentIndex = windows.findIndex((window) => !window.endedAt);
  return {
    windows,
    currentIndex:
      !over && currentIndex >= 0
        ? currentIndex
        : !over && windows.length < input.sections.length && !submittedAt
          ? windows.length
          : input.sections.length,
  };
}

/** The section whose answering window contains `at`, if any (intros and gaps belong to none). */
export function sectionAt(timeline: SectionTimeline, at: Date) {
  return (
    timeline.windows.find(
      (window) =>
        window.startedAt &&
        window.startedAt.getTime() <= at.getTime() &&
        (!window.endedAt || at.getTime() < window.endedAt.getTime()) &&
        (!window.deadlineAt || at.getTime() < window.deadlineAt.getTime()),
    ) ?? null
  );
}

export type SectionView =
  | { mode: "intro"; index: number; sectionId: string; autoStartAt: Date }
  | {
      mode: "answering";
      index: number;
      sectionId: string;
      deadlineAt: Date | null;
    }
  | { mode: "done" };

/** What the attempt screen shows now: a section's intro, its questions, or nothing left. */
export function sectionView(timeline: SectionTimeline): SectionView {
  const window = timeline.windows[timeline.currentIndex];
  if (!window) return { mode: "done" };
  return window.startedAt
    ? {
        mode: "answering",
        index: timeline.currentIndex,
        sectionId: window.sectionId,
        deadlineAt: window.deadlineAt,
      }
    : {
        mode: "intro",
        index: timeline.currentIndex,
        sectionId: window.sectionId,
        autoStartAt: window.autoStartAt,
      };
}

/** Whether the learner may end the running section before its time (an untimed one always). */
export function canFinishSection(section: TimelineSection) {
  return section.allowEarlyFinish || !section.timeLimitSeconds;
}

/** Total seconds of sections that all have a timer (intros not included), or null. */
export function timedSectionsSeconds(
  sections: ReadonlyArray<{ timeLimitSeconds: number | null }>,
) {
  if (
    !sections.length ||
    sections.some((section) => !section.timeLimitSeconds)
  ) {
    return null;
  }
  return sections.reduce(
    (total, section) => total + (section.timeLimitSeconds ?? 0),
    0,
  );
}
