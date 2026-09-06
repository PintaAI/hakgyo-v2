import { describe, expect, test } from "bun:test";

import { defaultCourseItemPublished } from "./course-item-publication";

describe("defaultCourseItemPublished", () => {
  test("publishes newly attached library items by default for a published course", () => {
    expect(defaultCourseItemPublished("PUBLISHED")).toBe(true);
  });

  test("keeps newly attached library items as drafts for non-published courses", () => {
    expect(defaultCourseItemPublished("DRAFT")).toBe(false);
    expect(defaultCourseItemPublished("ARCHIVED")).toBe(false);
  });
});
