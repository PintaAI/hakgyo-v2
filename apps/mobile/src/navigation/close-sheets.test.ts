import { describe, expect, test } from "bun:test";

import { closeOpenSheets } from "./close-sheets";

function navigation(routes: string[]) {
  const actions: unknown[] = [];
  return {
    actions,
    getRootState: () => ({
      key: "root",
      type: "stack",
      routes: routes.map((name) => ({ name })),
    }),
    dispatch: (action: unknown) => actions.push(action),
  };
}

describe("closeOpenSheets", () => {
  test("pops the first open sheet and everything pushed over it", () => {
    const nav = navigation(["(home)", "profile", "events/[eventId]"]);
    closeOpenSheets(nav);
    expect(nav.actions).toEqual([
      { type: "POP", payload: { count: 2 }, target: "root" },
    ]);
  });

  test("leaves full screens alone when no sheet is open", () => {
    const nav = navigation([
      "(home)",
      "courses/[courseId]/items/[courseItemId]",
    ]);
    closeOpenSheets(nav);
    expect(nav.actions).toEqual([]);
  });
});
