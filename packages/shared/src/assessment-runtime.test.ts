import { describe, expect, test } from "bun:test";

import {
  acceptLogEntries,
  attemptLogEntrySchema,
  latestAnswers,
  timePerQuestion,
  type AttemptLogEntry,
} from "./assessment-runtime";

const startedAt = new Date("2026-10-27T10:00:00.000Z");
const deadlineAt = new Date("2026-10-27T10:50:00.000Z");
const at = (minutes: number) =>
  new Date(startedAt.getTime() + minutes * 60_000).toISOString();
const answer = (
  seq: number,
  minutes: number,
  optionId = "a",
): AttemptLogEntry => ({
  seq,
  kind: "ANSWERED",
  questionId: "q1",
  optionIds: [optionId],
  clientAt: at(minutes),
});
const base = {
  lastSeq: 0,
  lastAt: null,
  startedAt,
  deadlineAt,
  questionIds: new Set(["q1", "q2"]),
};

describe("acceptLogEntries", () => {
  test("accepts offline answers given in time even when synced after the deadline", () => {
    const result = acceptLogEntries({
      ...base,
      entries: [answer(1, 10), answer(2, 49, "b")],
      receivedAt: new Date("2026-10-27T15:00:00.000Z"),
      source: "MOBILE",
    });
    expect(result.rejected).toEqual([]);
    expect(result.accepted.map((entry) => entry.offline)).toEqual([true, true]);
    expect(latestAnswers(result.accepted)).toMatchObject([
      { questionId: "q1", optionIds: ["b"] },
    ]);
  });

  test("refuses answers at or after the deadline", () => {
    const result = acceptLogEntries({
      ...base,
      entries: [answer(1, 50)],
      receivedAt: new Date("2026-10-27T10:51:00.000Z"),
      source: "MOBILE",
    });
    expect(result.rejected).toEqual([{ seq: 1, reason: "LATE" }]);
    expect(result.lastSeq).toBe(1);
  });

  test("skips processed sequence numbers and unknown questions", () => {
    const result = acceptLogEntries({
      ...base,
      lastSeq: 1,
      entries: [
        answer(1, 1),
        { seq: 2, kind: "ANSWERED", questionId: "zzz", clientAt: at(2) },
        answer(3, 3),
      ],
      receivedAt: new Date(at(4)),
      source: "MOBILE",
    });
    expect(result.accepted.map((entry) => entry.seq)).toEqual([3]);
    expect(result.rejected).toEqual([{ seq: 2, reason: "UNKNOWN_QUESTION" }]);
  });

  test("refuses a device clock far ahead or wound back", () => {
    const ahead = acceptLogEntries({
      ...base,
      entries: [answer(1, 20)],
      receivedAt: new Date(at(10)),
      source: "MOBILE",
    });
    expect(ahead.rejected).toEqual([{ seq: 1, reason: "CLOCK" }]);
    const back = acceptLogEntries({
      ...base,
      lastSeq: 5,
      lastAt: new Date(at(30)),
      entries: [answer(6, 25), answer(7, 29.5)],
      receivedAt: new Date(at(31)),
      source: "MOBILE",
    });
    expect(back.rejected).toEqual([{ seq: 6, reason: "CLOCK" }]);
    // A small step back is clamped to the previous entry.
    expect(back.accepted[0]!.at.toISOString()).toBe(at(30));
  });

  test("stamps stale or future web entries on arrival", () => {
    const result = acceptLogEntries({
      ...base,
      entries: [answer(1, 1)],
      receivedAt: new Date(at(5)),
      source: "WEB",
    });
    expect(result.accepted[0]!.at.toISOString()).toBe(at(5));
    const late = acceptLogEntries({
      ...base,
      entries: [answer(1, 10)],
      receivedAt: new Date(at(51)),
      source: "WEB",
    });
    expect(late.rejected).toEqual([{ seq: 1, reason: "LATE" }]);
    // A shown question keeps its time even when it waited for a later autosave.
    const shown = acceptLogEntries({
      ...base,
      entries: [
        { seq: 1, kind: "QUESTION_SHOWN", questionId: "q2", clientAt: at(1) },
      ],
      receivedAt: new Date(at(5)),
      source: "WEB",
    });
    expect(shown.accepted[0]!.at.toISOString()).toBe(at(1));
  });

  test("validates the wire shape", () => {
    expect(attemptLogEntrySchema.safeParse(answer(1, 1)).success).toBe(true);
    expect(
      attemptLogEntrySchema.safeParse({
        ...answer(1, 1),
        clientAt: "yesterday",
      }).success,
    ).toBe(false);
  });
});

describe("timePerQuestion", () => {
  test("adds the time between shown questions and caps long gaps", () => {
    const times = timePerQuestion(
      [
        { kind: "QUESTION_SHOWN", questionId: "q1", at: new Date(at(0)) },
        { kind: "QUESTION_SHOWN", questionId: "q2", at: new Date(at(1)) },
        { kind: "QUESTION_SHOWN", questionId: "q1", at: new Date(at(31)) },
        { kind: "SUBMITTED", at: new Date(at(32)) },
      ],
      null,
    );
    expect(times.get("q1")).toBe(2 * 60_000);
    expect(times.get("q2")).toBe(10 * 60_000);
  });
});
