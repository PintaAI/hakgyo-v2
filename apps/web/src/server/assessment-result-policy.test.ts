import { describe, expect, test } from "bun:test";

import { shouldRevealAssessmentAnswers } from "./assessment-result-policy";

describe("learner answer-review policy", () => {
  test("reveals chapter answers after grading", () => {
    expect(
      shouldRevealAssessmentAnswers({
        attemptStatus: "GRADED",
        event: null,
      }),
    ).toBe(true);
  });

  test("reveals on-demand answers only after the event closes", () => {
    expect(
      shouldRevealAssessmentAnswers({
        attemptStatus: "GRADED",
        event: { type: "QUICK_ASSESSMENT", status: "OPEN" },
      }),
    ).toBe(false);
    expect(
      shouldRevealAssessmentAnswers({
        attemptStatus: "GRADED",
        event: { type: "QUICK_ASSESSMENT", status: "CLOSED" },
      }),
    ).toBe(true);
  });

  test("never reveals tryout answers or explanations", () => {
    expect(
      shouldRevealAssessmentAnswers({
        attemptStatus: "GRADED",
        event: { type: "TRYOUT", status: "CLOSED" },
      }),
    ).toBe(false);
  });
});
