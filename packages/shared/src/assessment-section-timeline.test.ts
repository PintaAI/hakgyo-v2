import { describe, expect, test } from "bun:test";

import { acceptLogEntries, type AttemptLogEntry } from "./assessment-runtime";
import {
  SECTION_INTRO_SECONDS,
  sectionedAttemptDeadline,
  sectionTimeline,
} from "./assessment-section-timeline";

const startedAt = new Date("2026-10-27T10:00:00.000Z");
const minute = (value: number) =>
  new Date(startedAt.getTime() + value * 60_000);
const sections = [
  { id: "reading", timeLimitSeconds: 25 * 60, allowEarlyFinish: true },
  { id: "listening", timeLimitSeconds: 25 * 60, allowEarlyFinish: false },
];

describe("sectionTimeline", () => {
  test("the overall deadline covers every section and its intro", () => {
    expect(sectionedAttemptDeadline(sections, startedAt)).toEqual(
      minute(50 + (2 * SECTION_INTRO_SECONDS) / 60),
    );
    expect(
      sectionedAttemptDeadline(
        [{ id: "a", timeLimitSeconds: null, allowEarlyFinish: true }],
        startedAt,
      ),
    ).toBeNull();
  });

  test("waits on the intro, then starts by itself", () => {
    const waiting = sectionTimeline({
      sections,
      startedAt,
      attemptDeadline: null,
      entries: [],
      now: minute(0.5),
    });
    expect(waiting.currentIndex).toBe(0);
    expect(waiting.windows[0]!.startedAt).toBeNull();
    const auto = sectionTimeline({
      sections,
      startedAt,
      attemptDeadline: null,
      entries: [],
      now: minute(2),
    });
    expect(auto.windows[0]!.startedAt).toEqual(minute(1));
    expect(auto.windows[0]!.deadlineAt).toEqual(minute(26));
  });

  test("an early finish starts the next intro; time up ends a section", () => {
    const timeline = sectionTimeline({
      sections,
      startedAt,
      attemptDeadline: null,
      entries: [
        { kind: "SECTION_STARTED", sectionId: "reading", at: minute(0.2) },
        { kind: "SECTION_ENDED", sectionId: "reading", at: minute(20) },
        { kind: "SECTION_STARTED", sectionId: "listening", at: minute(20.5) },
      ],
      now: minute(46),
    });
    expect(timeline.windows.map((window) => window.endReason)).toEqual([
      "FINISHED",
      "TIME_UP",
    ]);
    expect(timeline.windows[1]!.endedAt).toEqual(minute(45.5));
    expect(timeline.currentIndex).toBe(2);
  });
});

describe("acceptLogEntries with sections", () => {
  const plan = [
    { ...sections[0]!, questionIds: ["r1", "r2"] },
    { ...sections[1]!, questionIds: ["l1"] },
  ];
  const entry = (
    seq: number,
    kind: AttemptLogEntry["kind"],
    at: Date,
    fields: Partial<AttemptLogEntry> = {},
  ): AttemptLogEntry => ({ seq, kind, clientAt: at.toISOString(), ...fields });
  const accept = (entries: AttemptLogEntry[]) =>
    acceptLogEntries({
      entries,
      lastSeq: 0,
      lastAt: null,
      startedAt,
      deadlineAt: sectionedAttemptDeadline(plan, startedAt),
      receivedAt: minute(60),
      source: "MOBILE",
      questionIds: new Set(["r1", "r2", "l1"]),
      sections: { list: plan, priorEntries: [] },
    });

  test("answers must fall inside their running section", () => {
    const result = accept([
      entry(1, "ANSWERED", minute(0.5), { questionId: "r1", optionIds: ["a"] }),
      entry(2, "SECTION_STARTED", minute(0.6), { sectionId: "reading" }),
      entry(3, "ANSWERED", minute(1), { questionId: "r1", optionIds: ["a"] }),
      entry(4, "ANSWERED", minute(2), { questionId: "l1", optionIds: ["b"] }),
      entry(5, "SECTION_ENDED", minute(3), { sectionId: "reading" }),
      entry(6, "ANSWERED", minute(4), { questionId: "r2", optionIds: ["a"] }),
      entry(7, "SECTION_STARTED", minute(3.5), { sectionId: "listening" }),
      entry(8, "ANSWERED", minute(5), { questionId: "l1", optionIds: ["b"] }),
      entry(9, "SECTION_ENDED", minute(6), { sectionId: "listening" }),
    ]);
    expect(result.accepted.map((accepted) => accepted.seq)).toEqual([
      2, 3, 5, 7, 8,
    ]);
    expect(result.rejected).toEqual([
      // Before the reading section started (still on its intro).
      { seq: 1, reason: "SECTION" },
      // A listening question while reading runs.
      { seq: 4, reason: "SECTION" },
      // Reading has ended and never reopens.
      { seq: 6, reason: "SECTION" },
      // Listening does not allow finishing early.
      { seq: 9, reason: "SECTION" },
    ]);
  });

  test("answers after a section's time are late", () => {
    const result = accept([
      entry(1, "SECTION_STARTED", minute(0), { sectionId: "reading" }),
      entry(2, "ANSWERED", minute(26), { questionId: "r1", optionIds: ["a"] }),
    ]);
    expect(result.rejected).toEqual([{ seq: 2, reason: "LATE" }]);
  });
});
