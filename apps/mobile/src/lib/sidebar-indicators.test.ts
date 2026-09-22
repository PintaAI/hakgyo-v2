import { describe, expect, test } from "bun:test";

import { countUnreadIndicators } from "./sidebar-indicator-count";

describe("countUnreadIndicators", () => {
  const items = [
    { kind: "MODULE" as const, unread: true },
    { kind: "ASSESSMENT" as const, unread: true },
    { kind: "MEETING" as const, unread: false },
  ];

  test("counts every unread update for the Learn bell", () => {
    expect(countUnreadIndicators(items)).toBe(2);
  });

  test("counts only updates rendered in the main sidebar", () => {
    expect(
      countUnreadIndicators(items, new Set(["ASSESSMENT", "MEETING"])),
    ).toBe(1);
  });
});
