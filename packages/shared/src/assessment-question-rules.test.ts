import { describe, expect, test } from "bun:test";

import {
  checkRuleEntry,
  emptyRuleState,
  ruleStateFrom,
  type RuleSection,
} from "./assessment-question-rules";
import {
  acceptLogEntries,
  type AttemptLogEntry,
  type LogPlanSection,
  type PriorLogEntry,
} from "./assessment-runtime";
import { sectionedAttemptDeadline } from "./assessment-section-timeline";

const rules: RuleSection[] = [
  {
    id: "listening",
    navigation: "FORWARD_ONLY",
    lockAnswers: true,
    audioMaxPlays: 2,
    questionIds: ["l1", "l2", "l3"],
    lockableQuestionIds: ["l1", "l2"],
  },
  { id: "reading", navigation: "FREE", questionIds: ["r1", "r2"] },
];

describe("checkRuleEntry", () => {
  test("forward-only sections never go back", () => {
    const state = ruleStateFrom(rules, [
      { kind: "QUESTION_SHOWN", questionId: "l2" },
    ]);
    expect(
      checkRuleEntry(rules, state, { kind: "QUESTION_SHOWN", questionId: "l1" }),
    ).toBe("NAVIGATION");
    expect(
      checkRuleEntry(rules, state, {
        kind: "ANSWERED",
        questionId: "l1",
        hasAnswer: true,
      }),
    ).toBe("NAVIGATION");
    expect(
      checkRuleEntry(rules, state, { kind: "QUESTION_SHOWN", questionId: "l3" }),
    ).toBeNull();
  });

  test("free sections go anywhere", () => {
    const state = ruleStateFrom(rules, [
      { kind: "QUESTION_SHOWN", questionId: "r2" },
    ]);
    expect(
      checkRuleEntry(rules, state, { kind: "QUESTION_SHOWN", questionId: "r1" }),
    ).toBeNull();
  });

  test("a locked choice is final, an emptied or written answer is not", () => {
    const state = ruleStateFrom(rules, [
      { kind: "ANSWERED", questionId: "l2", hasAnswer: true },
    ]);
    expect(
      checkRuleEntry(rules, state, {
        kind: "ANSWERED",
        questionId: "l2",
        hasAnswer: true,
      }),
    ).toBe("LOCKED");
    // l3 is a written question: it stays editable.
    const written = ruleStateFrom(rules, [
      { kind: "ANSWERED", questionId: "l3", hasAnswer: true },
    ]);
    expect(
      checkRuleEntry(rules, written, {
        kind: "ANSWERED",
        questionId: "l3",
        hasAnswer: true,
      }),
    ).toBeNull();
    const emptied = ruleStateFrom(rules, [
      { kind: "ANSWERED", questionId: "l2", hasAnswer: false },
    ]);
    expect(
      checkRuleEntry(rules, emptied, {
        kind: "ANSWERED",
        questionId: "l2",
        hasAnswer: true,
      }),
    ).toBeNull();
  });

  test("audio plays up to the limit", () => {
    const played = { kind: "AUDIO_PLAYED", questionId: "l1" };
    expect(checkRuleEntry(rules, emptyRuleState(), played)).toBeNull();
    const state = ruleStateFrom(rules, [played, played]);
    expect(checkRuleEntry(rules, state, played)).toBe("AUDIO");
  });
});

describe("acceptLogEntries with question rules", () => {
  const startedAt = new Date("2026-10-28T10:00:00.000Z");
  const at = (seconds: number) =>
    new Date(startedAt.getTime() + seconds * 1000).toISOString();
  const plan: LogPlanSection[] = [
    {
      id: "listening",
      timeLimitSeconds: 600,
      allowEarlyFinish: false,
      navigation: "PACED",
      lockAnswers: true,
      audioMaxPlays: 1,
      questionIds: ["l1", "l2"],
      lockableQuestionIds: ["l1", "l2"],
    },
    {
      id: "reading",
      timeLimitSeconds: 600,
      allowEarlyFinish: true,
      questionIds: ["r1"],
    },
  ];
  const accept = (
    entries: AttemptLogEntry[],
    priorEntries: PriorLogEntry[] = [],
  ) =>
    acceptLogEntries({
      entries,
      lastSeq: 0,
      lastAt: null,
      startedAt,
      deadlineAt: sectionedAttemptDeadline(plan, startedAt),
      receivedAt: new Date(at(600)),
      source: "MOBILE",
      questionIds: new Set(["l1", "l2", "r1"]),
      sections: { list: plan, priorEntries },
    });
  const start: AttemptLogEntry = {
    seq: 1,
    kind: "SECTION_STARTED",
    sectionId: "listening",
    clientAt: at(5),
  };

  test("rejects going back, a changed choice and an extra play", () => {
    const result = accept([
      start,
      { seq: 2, kind: "QUESTION_SHOWN", questionId: "l1", clientAt: at(6) },
      { seq: 3, kind: "AUDIO_PLAYED", questionId: "l1", clientAt: at(7) },
      { seq: 4, kind: "AUDIO_PLAYED", questionId: "l1", clientAt: at(30) },
      {
        seq: 5,
        kind: "ANSWERED",
        questionId: "l1",
        optionIds: ["a"],
        clientAt: at(31),
      },
      {
        seq: 6,
        kind: "ANSWERED",
        questionId: "l1",
        optionIds: ["b"],
        clientAt: at(32),
      },
      { seq: 7, kind: "QUESTION_SHOWN", questionId: "l2", clientAt: at(40) },
      { seq: 8, kind: "QUESTION_SHOWN", questionId: "l1", clientAt: at(41) },
    ]);
    expect(result.rejected).toEqual([
      { seq: 4, reason: "AUDIO" },
      { seq: 6, reason: "LOCKED" },
      { seq: 8, reason: "NAVIGATION" },
    ]);
  });

  test("rules count entries stored before this write", () => {
    const result = accept(
      [{ seq: 4, kind: "AUDIO_PLAYED", questionId: "l1", clientAt: at(30) }],
      [
        {
          kind: "SECTION_STARTED",
          sectionId: "listening",
          at: new Date(at(5)),
        },
        { kind: "AUDIO_PLAYED", questionId: "l1", at: new Date(at(7)) },
      ],
    );
    expect(result.rejected).toEqual([{ seq: 4, reason: "AUDIO" }]);
  });

  test("a paced section without early finish ends after its last question", () => {
    const tooEarly = accept([
      start,
      {
        seq: 2,
        kind: "SECTION_ENDED",
        sectionId: "listening",
        clientAt: at(6),
      },
    ]);
    expect(tooEarly.rejected).toEqual([{ seq: 2, reason: "SECTION" }]);
    const done = accept([
      start,
      { seq: 2, kind: "QUESTION_SHOWN", questionId: "l1", clientAt: at(6) },
      { seq: 3, kind: "QUESTION_SHOWN", questionId: "l2", clientAt: at(40) },
      {
        seq: 4,
        kind: "SECTION_ENDED",
        sectionId: "listening",
        clientAt: at(80),
      },
    ]);
    expect(done.rejected).toEqual([]);
  });
});
