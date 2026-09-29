import { describe, expect, test } from "bun:test";

import { getNotificationTarget } from "./notification-target";

describe("getNotificationTarget", () => {
  test("opens server routes", () => {
    expect(
      getNotificationTarget({ notificationId: "n1", mobilePath: "/events/e1" }),
    ).toEqual({ kind: "route", notificationId: "n1", path: "/events/e1" });
  });

  test("focuses the cohort for meeting paths", () => {
    expect(
      getNotificationTarget({ mobilePath: "/learn?cohortId=c%201" }),
    ).toEqual({ kind: "cohort", notificationId: undefined, cohortId: "c 1" });
  });

  test("ignores missing, root, and external paths", () => {
    expect(getNotificationTarget(undefined).kind).toBe("none");
    expect(getNotificationTarget({ notificationId: "n1" })).toEqual({
      kind: "none",
      notificationId: "n1",
    });
    expect(getNotificationTarget({ mobilePath: "/" }).kind).toBe("none");
    expect(getNotificationTarget({ mobilePath: "//evil.test" }).kind).toBe(
      "none",
    );
    expect(
      getNotificationTarget({ mobilePath: "https://evil.test" }).kind,
    ).toBe("none");
  });
});
