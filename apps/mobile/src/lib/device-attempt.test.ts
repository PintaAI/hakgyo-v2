import { describe, expect, test } from "bun:test";
import { orderAssessmentQuestions } from "@hakgyo/shared";

import type { CourseItemAssessment } from "../sync/hooks";
import { canStartOnDevice, startAttemptOnDevice } from "./device-attempt";
import { randomUuid } from "./random-uuid";

function question(id: string, position: number) {
  return {
    id,
    position,
    options: ["a", "b", "c", "d"].map((option, index) => ({
      id: `${id}-${option}`,
      position: index,
    })),
  };
}

function assessment(
  overrides: Partial<Record<string, unknown>> = {},
): CourseItemAssessment {
  return {
    title: "Kuis modul 1",
    timeLimitMinutes: null,
    maxAttempts: null,
    sections: [],
    event: null,
    eligibleCohorts: [{ id: "cohort", name: "Kelas Mandiri" }],
    shuffleQuestions: true,
    shuffleOptions: true,
    standaloneAttemptCount: 1,
    latestStandaloneAttempt: null,
    attemptDeadline: null,
    context: {
      label: "Tugas bab",
      title: "Kuis modul 1",
      courseTitle: "Hangeul Mastery",
      moduleTitle: "Perkenalan dan vokal dasar",
    },
    questions: [question("q1", 0), question("q2", 1), question("q3", 2)],
    ...overrides,
  } as unknown as CourseItemAssessment;
}

describe("canStartOnDevice", () => {
  test("only untimed, unlimited tugas without sections, events or a class choice", () => {
    expect(canStartOnDevice(assessment())).toBeTrue();
    expect(canStartOnDevice(assessment({ timeLimitMinutes: 20 }))).toBeFalse();
    expect(canStartOnDevice(assessment({ maxAttempts: 3 }))).toBeFalse();
    expect(
      canStartOnDevice(assessment({ sections: [{ id: "s" }] })),
    ).toBeFalse();
    expect(canStartOnDevice(assessment({ event: { id: "e" } }))).toBeFalse();
    expect(
      canStartOnDevice(
        assessment({
          eligibleCohorts: [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
          ],
        }),
      ),
    ).toBeFalse();
  });
});

describe("startAttemptOnDevice", () => {
  test("orders questions and options like the server does for the same seed", () => {
    const source = assessment();
    const started = startAttemptOnDevice(source, {
      attemptId: "attempt",
      shuffleSeed: "seed-123456",
      courseId: "course",
      courseItemId: "item",
      startedAt: new Date("2026-11-10T03:00:00Z"),
    });
    const server = orderAssessmentQuestions(
      source.questions,
      "seed-123456",
      true,
      true,
      { sections: [] },
    );
    expect(started.assessmentDetail.questions.map((q) => q.id)).toEqual(
      server.map((q) => q.id),
    );
    expect(
      started.assessmentDetail.questions.map((q) => q.options.map((o) => o.id)),
    ).toEqual(server.map((q) => q.options.map((o) => o.id)));
  });

  test("makes the next in-progress attempt with the only class", () => {
    const started = startAttemptOnDevice(assessment(), {
      attemptId: "attempt",
      shuffleSeed: "seed-123456",
      courseId: "course",
      courseItemId: "item",
      startedAt: new Date("2026-11-10T03:00:00Z"),
    });
    expect(started.attempt.status).toBe("IN_PROGRESS");
    expect(started.attempt.attemptNumber).toBe(2);
    expect(started.attempt.cohort?.id).toBe("cohort");
    expect(started.attempt.answers).toEqual([]);
    expect(started.assessmentDetail.latestStandaloneAttempt?.id).toBe(
      "attempt",
    );
    expect(started.assessmentDetail.standaloneAttemptCount).toBe(2);
    expect(started.standalone).toMatchObject({
      count: 2,
      latest: { id: "attempt", status: "IN_PROGRESS", attemptNumber: 2 },
    });
  });
});

describe("randomUuid", () => {
  test("is a version 4 UUID and differs each time", () => {
    const first = randomUuid();
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(randomUuid()).not.toBe(first);
  });
});
