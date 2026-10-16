import { describe, expect, test } from "bun:test";

import {
  assessmentPassedActivityKey,
  assessmentSubmittedActivityKey,
  contentCompletedActivityKey,
  deletedWorkActivityKeys,
} from "./activity-keys";

describe("activity keys", () => {
  test("key submissions by attempt and passes by learner and course item", () => {
    expect(contentCompletedActivityKey("user-1", "item-1")).toBe(
      "content-completed:user-1:item-1",
    );
    expect(assessmentSubmittedActivityKey("attempt-1")).toBe(
      "assessment-submitted:attempt-1",
    );
    expect(assessmentPassedActivityKey("user-1", "item-1")).toBe(
      "assessment-passed:user-1:item-1",
    );
  });

  test("a retaken assessment shares its pass key but not its submission key", () => {
    expect(assessmentPassedActivityKey("user-1", "item-1")).toBe(
      assessmentPassedActivityKey("user-1", "item-1"),
    );
    expect(assessmentSubmittedActivityKey("attempt-1")).not.toBe(
      assessmentSubmittedActivityKey("attempt-2"),
    );
  });
});

describe("deletedWorkActivityKeys", () => {
  test("names completion and pass keys per progress row and submission keys per attempt", () => {
    expect(
      deletedWorkActivityKeys({
        progress: [
          { courseItemId: "item-1", userId: "user-1" },
          { courseItemId: "item-1", userId: "user-2" },
        ],
        attemptIds: ["attempt-1", "attempt-2"],
      }),
    ).toEqual([
      "content-completed:user-1:item-1",
      "assessment-passed:user-1:item-1",
      "content-completed:user-2:item-1",
      "assessment-passed:user-2:item-1",
      "assessment-submitted:attempt-1",
      "assessment-submitted:attempt-2",
    ]);
  });

  test("returns no keys when nothing was deleted", () => {
    expect(deletedWorkActivityKeys({ progress: [], attemptIds: [] })).toEqual(
      [],
    );
  });
});
