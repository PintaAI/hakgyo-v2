import { describe, expect, test } from "bun:test";

import { assessmentAttemptHref, assessmentEventHref } from "./attempt-href";

describe("assessmentAttemptHref", () => {
  test("opens attempts with a course item under the item", () => {
    expect(
      assessmentAttemptHref({
        attemptId: "a1",
        courseId: "c1",
        courseItemId: "i1",
        eventId: "e1",
      }),
    ).toEqual({
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId: "c1", courseItemId: "i1", attemptId: "a1" },
    });
  });

  test("opens library event attempts on the event attempt route", () => {
    expect(
      assessmentAttemptHref({
        attemptId: "a1",
        courseId: "c1",
        courseItemId: null,
        eventId: "e1",
      }),
    ).toEqual({
      pathname: "/event-attempts/[attemptId]",
      params: { attemptId: "a1", eventId: "e1", courseId: "c1" },
    });
  });

  test("leaves the event out when it is not known", () => {
    expect(
      assessmentAttemptHref({
        attemptId: "a1",
        courseId: "c1",
        courseItemId: null,
      }),
    ).toEqual({
      pathname: "/event-attempts/[attemptId]",
      params: { attemptId: "a1", courseId: "c1" },
    });
  });
});

describe("assessmentEventHref", () => {
  const base = {
    id: "e1",
    course: { id: "c1" },
    attempts: [{ id: "a1" }],
  };

  test("opens the event page unless the event goes straight to the attempt", () => {
    expect(
      assessmentEventHref({
        ...base,
        entry: { destination: "EVENT" },
        courseItem: null,
      }),
    ).toEqual({ pathname: "/events/[eventId]", params: { eventId: "e1" } });
  });

  test("opens a placed event's attempt under its course item", () => {
    expect(
      assessmentEventHref({
        ...base,
        entry: { destination: "ATTEMPT" },
        courseItem: { id: "i1" },
      }),
    ).toEqual({
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId: "c1", courseItemId: "i1", attemptId: "a1" },
    });
  });

  test("opens a library event's attempt on the event attempt route", () => {
    expect(
      assessmentEventHref({
        ...base,
        entry: { destination: "ATTEMPT" },
        courseItem: null,
      }),
    ).toEqual({
      pathname: "/event-attempts/[attemptId]",
      params: { attemptId: "a1", eventId: "e1", courseId: "c1" },
    });
  });
});
