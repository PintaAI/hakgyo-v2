import { describe, expect, test } from "bun:test";

import {
  orderAssessmentQuestions,
  shuffleForAttempt,
  shufflesQuestions,
} from "./order";

const questions = [
  {
    id: "question-1",
    options: [{ id: "option-1" }, { id: "option-2" }, { id: "option-3" }],
  },
  {
    id: "question-2",
    options: [{ id: "option-4" }, { id: "option-5" }, { id: "option-6" }],
  },
  {
    id: "question-3",
    options: [{ id: "option-7" }, { id: "option-8" }, { id: "option-9" }],
  },
];

describe("per-attempt assessment order", () => {
  test("is stable for the same seed", () => {
    const first = orderAssessmentQuestions(questions, "seed-a", true, true);
    const second = orderAssessmentQuestions(questions, "seed-a", true, true);
    expect(second).toEqual(first);
  });

  test("can produce a different order for another attempt seed", () => {
    const first = orderAssessmentQuestions(questions, "seed-a", true, true);
    const second = orderAssessmentQuestions(questions, "seed-b", true, true);
    expect(second).not.toEqual(first);
    expect(new Set(second.map((question) => question.id))).toEqual(
      new Set(questions.map((question) => question.id)),
    );
  });

  test("keeps positional order when shuffling is disabled", () => {
    expect(orderAssessmentQuestions(questions, "seed-a", false, false)).toEqual(
      questions,
    );
    expect(shuffleForAttempt(questions, "seed-a", false, "questions")).toEqual(
      questions,
    );
  });
});

describe("shufflesQuestions", () => {
  test("an event without its own setting follows the assessment", () => {
    expect(shufflesQuestions(false, null)).toBe(false);
    expect(shufflesQuestions(false, undefined)).toBe(false);
    expect(shufflesQuestions(true, null)).toBe(true);
  });

  test("an event setting overrides the assessment", () => {
    expect(shufflesQuestions(false, true)).toBe(true);
    expect(shufflesQuestions(true, false)).toBe(false);
  });

  test("a fixed-order event keeps the authored order", () => {
    const ordered = orderAssessmentQuestions(
      questions,
      "seed",
      shufflesQuestions(false, null),
      false,
    );
    expect(ordered.map((question) => question.id)).toEqual(
      questions.map((question) => question.id),
    );
  });
});

describe("sections", () => {
  const sectioned = [
    { id: "r1", sectionId: "reading", options: [] },
    { id: "l1", sectionId: "listening", options: [] },
    { id: "r2", sectionId: "reading", options: [] },
    { id: "l2", sectionId: "listening", options: [] },
    { id: "r3", sectionId: "reading", options: [] },
  ];
  const sections = [
    { id: "listening", position: 1, shuffleQuestions: true },
    { id: "reading", position: 0, shuffleQuestions: false },
  ];

  test("keeps sections in order and their questions in authored order", () => {
    expect(
      orderAssessmentQuestions(sectioned, undefined, true, false, {
        sections,
      }).map(({ id }) => id),
    ).toEqual(["r1", "r2", "r3", "l1", "l2"]);
  });

  test("never shuffles across sections", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      const ids = orderAssessmentQuestions(sectioned, seed, true, false, {
        sections,
      }).map(({ id }) => id);
      expect(ids.slice(0, 3)).toEqual(["r1", "r2", "r3"]);
      expect([...ids.slice(3)].sort()).toEqual(["l1", "l2"]);
    }
  });

  test("an event override applies inside every section", () => {
    const ids = orderAssessmentQuestions(sectioned, "seed", true, false, {
      sections,
      eventShuffleQuestions: false,
    }).map(({ id }) => id);
    expect(ids).toEqual(["r1", "r2", "r3", "l1", "l2"]);
  });
});
