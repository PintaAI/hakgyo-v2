import { describe, expect, test } from "bun:test";

import { buildSidebarIndicatorCandidates } from "./sidebar-indicators";

const now = new Date("2026-09-21T12:00:00.000Z");

describe("buildSidebarIndicatorCandidates", () => {
  test("returns only current actionable updates", () => {
    const candidates = buildSidebarIndicatorCandidates({
      now,
      outlines: [
        [
          "course-1",
          {
            progressionMode: "SEQUENTIAL",
            modules: [
              { id: "complete", access: "COMPLETED", isCompleted: true },
              { id: "new", access: "AVAILABLE", isCompleted: false },
              { id: "locked", access: "LOCKED", isCompleted: false },
            ],
          },
        ],
        [
          "open-course",
          {
            progressionMode: "OPEN",
            modules: [
              { id: "always-open", access: "AVAILABLE", isCompleted: false },
            ],
          },
        ],
      ],
      events: [
        {
          id: "assessment-new",
          status: "OPEN",
          openedAt: new Date("2026-09-21T11:00:00.000Z"),
          createdAt: new Date("2026-09-20T11:00:00.000Z"),
          closesAt: new Date("2026-09-22T11:00:00.000Z"),
          course: { id: "course-1" },
          attempts: [],
        },
        {
          id: "assessment-done",
          status: "OPEN",
          openedAt: now,
          createdAt: now,
          closesAt: new Date("2026-09-22T11:00:00.000Z"),
          course: { id: "course-1" },
          attempts: [{ status: "GRADED" }],
        },
      ],
      cohorts: [
        {
          course: { id: "course-1" },
          meetings: [
            {
              id: "meeting-new",
              status: "SCHEDULED",
              startsAt: new Date("2026-09-22T12:00:00.000Z"),
              durationMinutes: 60,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "meeting-ended",
              status: "ENDED",
              startsAt: new Date("2026-09-20T12:00:00.000Z"),
              durationMinutes: 60,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ],
    });

    expect(candidates).toEqual([
      {
        key: "module:new",
        kind: "MODULE",
        entityId: "new",
        courseId: "course-1",
      },
      {
        key: "assessment:assessment-new:2026-09-21T11:00:00.000Z",
        kind: "ASSESSMENT",
        entityId: "assessment-new",
        courseId: "course-1",
      },
      {
        key: "meeting:meeting-new:2026-09-21T12:00:00.000Z",
        kind: "MEETING",
        entityId: "meeting-new",
        courseId: "course-1",
      },
    ]);
  });

  test("changes a meeting key when the meeting is rescheduled", () => {
    const source = {
      now,
      outlines: [],
      events: [],
      cohorts: [
        {
          course: { id: "course-1" },
          meetings: [
            {
              id: "meeting-1",
              status: "SCHEDULED",
              startsAt: new Date("2026-09-22T12:00:00.000Z"),
              durationMinutes: 60,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ],
    };
    const original = buildSidebarIndicatorCandidates(source)[0]?.key;
    source.cohorts[0]!.meetings[0]!.updatedAt = new Date(
      "2026-09-21T13:00:00.000Z",
    );

    expect(buildSidebarIndicatorCandidates(source)[0]?.key).not.toBe(original);
  });
});
