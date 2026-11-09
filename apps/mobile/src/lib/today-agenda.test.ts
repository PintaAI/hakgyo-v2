import { describe, expect, test } from "bun:test";

import { buildTodayAgenda } from "./today-agenda";

const NOW = new Date("2026-11-09T09:00:00.000Z").getTime();
const HOUR = 3_600_000;

function meeting(id: string, startsInHours: number, status = "SCHEDULED") {
  return {
    id,
    startsAt: new Date(NOW + startsInHours * HOUR),
    durationMinutes: 60,
    status,
  };
}

function event(
  id: string,
  overrides: Partial<{
    status: string;
    opensAt: Date | null;
    closesAt: Date | null;
    attempts: { status: string }[];
  }> = {},
) {
  return {
    id,
    type: "PRACTICE",
    status: "OPEN",
    opensAt: null,
    closesAt: new Date(NOW + 48 * HOUR),
    attempts: [],
    ...overrides,
  };
}

describe("buildTodayAgenda", () => {
  test("live meetings first, then started attempts, then by time", () => {
    const items = buildTodayAgenda({
      cohorts: [
        {
          meetings: [
            meeting("later", 30),
            meeting("live", -0.5),
            meeting("ended", -3),
            meeting("far", 24 * 9),
          ],
        },
      ],
      events: [
        event("open-soon", { closesAt: new Date(NOW + 5 * HOUR) }),
        event("started", { attempts: [{ status: "IN_PROGRESS" }] }),
        event("submitted", { attempts: [{ status: "SUBMITTED" }] }),
        event("closed", { status: "CLOSED" }),
        event("scheduled", {
          status: "SCHEDULED",
          opensAt: new Date(NOW + 2 * HOUR),
          closesAt: new Date(NOW + 30 * HOUR),
        }),
      ],
      now: NOW,
    });
    expect(items.map((item) => item.key)).toEqual([
      "meeting:live",
      "event:started",
      "event:scheduled",
      "event:open-soon",
      "meeting:later",
    ]);
  });

  test("nothing coming up gives an empty agenda", () => {
    expect(
      buildTodayAgenda({
        cohorts: [{ meetings: [meeting("ended", -3)] }],
        events: [event("past", { closesAt: new Date(NOW - HOUR) })],
        now: NOW,
      }),
    ).toEqual([]);
  });
});
