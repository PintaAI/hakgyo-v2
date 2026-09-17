import { describe, expect, test } from "bun:test";
import {
  isQuestionAnswered,
  nextUnansweredQuestion,
} from "./question-progress";

describe("question navigation", () => {
  test("finds skipped questions before the current one by wrapping around", () => {
    expect(
      nextUnansweredQuestion(["unanswered", "answered", "answered"], 2),
    ).toBe(0);
  });
  test("skips reviewed practice answers regardless of correctness", () => {
    expect(
      nextUnansweredQuestion(["correct", "incorrect", "unanswered"], 0),
    ).toBe(2);
    expect(nextUnansweredQuestion(["correct", "incorrect"], 1)).toBe(-1);
  });
  test("offers the current question when it is the only unanswered one", () => {
    expect(
      nextUnansweredQuestion(["answered", "unanswered", "correct"], 1),
    ).toBe(1);
  });
  test("handles empty and completed assessments", () => {
    expect(nextUnansweredQuestion([], 0)).toBe(-1);
    expect(nextUnansweredQuestion(["answered"], 0)).toBe(-1);
  });
  test("counts choice and written responses but not cleared or whitespace answers", () => {
    expect(isQuestionAnswered(undefined)).toBe(false);
    expect(isQuestionAnswered({ optionIds: [] })).toBe(false);
    expect(isQuestionAnswered({ optionIds: [], content: " \n " })).toBe(false);
    expect(isQuestionAnswered({ optionIds: [], content: "안녕하세요" })).toBe(
      true,
    );
    expect(isQuestionAnswered({ optionIds: ["option-1"] })).toBe(true);
  });
});
