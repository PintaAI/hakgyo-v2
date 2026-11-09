import { describe, expect, test } from "bun:test";

import {
  hasPendingWork,
  isArchived,
  isClassFinished,
  isStaleShownOverride,
  outlineProgress,
} from "./cohort-archive";

const NOW = Date.parse("2026-11-09T09:00:00Z");
const HOUR = 3_600_000;

function outline(...modules: boolean[][]) {
  return {
    modules: modules
      .map((items) => items.map((isCompleted) => ({ isCompleted })))
      .map((items) => ({ items })),
  };
}

function event(
  overrides: Partial<Parameters<typeof hasPendingWork>[0]["events"][number]>,
) {
  return {
    status: "OPEN",
    opensAt: null,
    closesAt: null,
    attempts: [],
    ...overrides,
  };
}

describe("outlineProgress", () => {
  test("counts every item and the completed ones", () => {
    expect(outlineProgress(outline([true, false], [true]))).toEqual({
      itemCount: 3,
      completedCount: 2,
    });
    expect(outlineProgress(undefined)).toBeUndefined();
  });
});

describe("hasPendingWork", () => {
  test("a meeting that has not ended is pending", () => {
    const meeting = {
      startsAt: new Date(NOW + HOUR),
      durationMinutes: 60,
      status: "SCHEDULED",
    };
    expect(hasPendingWork({ meetings: [meeting], events: [] }, NOW)).toBe(true);
    expect(
      hasPendingWork(
        { meetings: [{ ...meeting, status: "CANCELLED" }], events: [] },
        NOW,
      ),
    ).toBe(false);
    expect(
      hasPendingWork(
        {
          meetings: [{ ...meeting, startsAt: new Date(NOW - 3 * HOUR) }],
          events: [],
        },
        NOW,
      ),
    ).toBe(false);
  });

  test("an open assessment without a submitted attempt is pending", () => {
    const pending = (e: ReturnType<typeof event>) =>
      hasPendingWork({ meetings: [], events: [e] }, NOW);
    expect(pending(event({}))).toBe(true);
    expect(pending(event({ attempts: [{ status: "IN_PROGRESS" }] }))).toBe(
      true,
    );
    expect(pending(event({ attempts: [{ status: "SUBMITTED" }] }))).toBe(false);
    expect(pending(event({ status: "SCHEDULED" }))).toBe(true);
    expect(pending(event({ status: "CLOSED" }))).toBe(false);
    expect(pending(event({ closesAt: new Date(NOW - HOUR) }))).toBe(false);
  });
});

describe("isClassFinished", () => {
  test("needs every lesson done, nothing pending and the badge claimed", () => {
    const done = { itemCount: 3, completedCount: 3 };
    expect(isClassFinished(done, false, true)).toBe(true);
    expect(isClassFinished(done, false, false)).toBe(false);
    expect(isClassFinished(done, true, true)).toBe(false);
    expect(
      isClassFinished({ itemCount: 3, completedCount: 2 }, false, true),
    ).toBe(false);
    expect(
      isClassFinished({ itemCount: 0, completedCount: 0 }, false, true),
    ).toBe(false);
    expect(isClassFinished(undefined, false, true)).toBe(false);
  });
});

describe("isArchived", () => {
  test("follows the finished state without a choice", () => {
    expect(isArchived(true, undefined, 3)).toBe(true);
    expect(isArchived(false, undefined, 3)).toBe(false);
  });

  test("an archived choice always wins", () => {
    expect(isArchived(false, { state: "archived" }, 3)).toBe(true);
  });

  test("a shown choice holds until the curriculum changes", () => {
    const shown = { state: "shown", itemCount: 3 } as const;
    expect(isArchived(true, shown, 3)).toBe(false);
    expect(isArchived(true, shown, 4)).toBe(true);
    // Latihan and Cari have no outline: the choice holds.
    expect(isArchived(true, shown)).toBe(false);
    expect(isStaleShownOverride(shown, 4)).toBe(true);
    expect(isStaleShownOverride(shown, 3)).toBe(false);
    expect(isStaleShownOverride(shown, undefined)).toBe(false);
  });
});
