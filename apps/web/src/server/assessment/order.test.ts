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
