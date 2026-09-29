import { describe, expect, test } from "bun:test";

import {
  getNotificationTarget,
  getPushedEntity,
  matchingIndicatorKeys,
  matchingNoticeIds,
} from "./notification-target";

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

describe("Pembaruan matching", () => {
  const notices = [
    { id: "e", kind: "EVENT_OPENED", eventId: "ev1" },
    { id: "m", kind: "MEETING_SCHEDULED", meetingId: "me1", cohortId: "c1" },
    { id: "a", kind: "ATTEMPT_GRADED", attemptId: "at1" },
    { id: "c", kind: "COHORT_ADDED", cohortId: "c1" },
    { id: "k", kind: "COURSE_ADDED", courseId: "co1" },
    { id: "x", kind: "COURSE_CONTENT", courseId: "co1" },
  ];

  test("matches the pushed event, meeting or attempt only", () => {
    expect(
      matchingNoticeIds(notices, getPushedEntity({ eventId: "ev1" })),
    ).toEqual(["e"]);
    expect(
      matchingNoticeIds(
        notices,
        getPushedEntity({ meetingId: "me1", cohortId: "c1" }),
      ),
    ).toEqual(["m"]);
    expect(matchingNoticeIds(notices, { attemptId: "at1" })).toEqual(["a"]);
  });

  test("enrollment pushes clear cohort and course added notices", () => {
    expect(
      matchingNoticeIds(notices, { cohortId: "c1", courseId: "co1" }),
    ).toEqual(["c", "k"]);
  });

  test("indicator keys follow unread events and meetings", () => {
    const items = [
      { key: "1", kind: "ASSESSMENT", entityId: "ev1", unread: true },
      { key: "2", kind: "ASSESSMENT", entityId: "ev1", unread: false },
      { key: "3", kind: "MEETING", entityId: "me1", unread: true },
      { key: "4", kind: "MODULE", entityId: "ev1", unread: true },
    ];
    expect(matchingIndicatorKeys(items, { eventId: "ev1" })).toEqual(["1"]);
    expect(matchingIndicatorKeys(items, { meetingId: "me1" })).toEqual(["3"]);
  });
});
