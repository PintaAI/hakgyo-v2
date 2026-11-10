import { describe, expect, test } from "bun:test";

import { eventAssessment, eventQuestionCount } from "./event-assessment";

describe("eventAssessment", () => {
  test("reads the event's own assessment", () => {
    expect(
      eventAssessment({
        assessment: { id: "library" },
        courseItem: null,
      }),
    ).toEqual({ id: "library" });
  });

  test("falls back to the course item's in copies cached before the field", () => {
    expect(
      eventAssessment({ courseItem: { assessment: { id: "placed" } } }),
    ).toEqual({ id: "placed" });
  });

  test("is null when neither has one", () => {
    expect(eventAssessment({ courseItem: null })).toBeNull();
  });
});

describe("eventQuestionCount", () => {
  test("reads the counted questions", () => {
    expect(eventQuestionCount({ id: "a", _count: { questions: 12 } })).toBe(12);
  });

  test("is null when the payload does not count them", () => {
    expect(eventQuestionCount({ id: "a" })).toBeNull();
    expect(eventQuestionCount(null)).toBeNull();
  });
});
