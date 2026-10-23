import { describe, expect, test } from "bun:test";

import { gameExitAction, gameLeaveLabel } from "./game-exit";

describe("leaving a game", () => {
  test("Practice launches pop to the Latihan tab", () => {
    expect(gameExitAction(undefined, true)).toEqual({
      type: "dismissTo",
      href: "/(home)/(tabs)/assessments",
    });
    expect(gameLeaveLabel(undefined)).toBe("Kembali ke latihan");
  });

  test("lesson launches return to the lesson", () => {
    const source = { sourceCourseItemId: "item-1", courseId: "course-1" };
    expect(gameExitAction(source, true)).toEqual({ type: "back" });
    expect(gameExitAction(source, false)).toEqual({
      type: "replace",
      href: {
        pathname: "/courses/[courseId]/items/[courseItemId]",
        params: { courseId: "course-1", courseItemId: "item-1" },
      },
    });
    expect(gameExitAction({ sourceCourseItemId: "item-1" }, false)).toEqual({
      type: "dismissTo",
      href: "/(home)/(tabs)/assessments",
    });
    expect(gameLeaveLabel(source)).toBe("Kembali ke pelajaran");
  });
});
