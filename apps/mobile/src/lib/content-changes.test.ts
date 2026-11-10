import { describe, expect, test } from "bun:test";

import type { SyncNotice } from "../sync/notices";
import { courseContentChanges } from "./content-changes";

const outline = {
  modules: [
    { id: "m1", items: [{ id: "a" }, { id: "b" }] },
    { id: "m2", items: [{ id: "c" }] },
  ],
};

function content(
  createdAt: number,
  change: {
    courseId?: string;
    modulesAdded?: string[];
    itemsAdded?: string[];
    itemsUpdated?: string[];
  },
  readAt: number | null = null,
): SyncNotice {
  const item = (id: string) => ({ id, title: id, moduleId: "m1" });
  return {
    id: `content@${createdAt}`,
    group: "content",
    organizationId: null,
    createdAt,
    readAt,
    kind: "COURSE_CONTENT",
    courseId: change.courseId ?? "course",
    courseTitle: "Course",
    revision: String(createdAt),
    modulesAdded: (change.modulesAdded ?? []).map((id) => ({ id, title: id })),
    itemsAdded: (change.itemsAdded ?? []).map(item),
    itemsUpdated: (change.itemsUpdated ?? []).map(item),
  };
}

describe("courseContentChanges", () => {
  test("marks updated and new activities and their chapters", () => {
    const changes = courseContentChanges(
      [content(100, { itemsUpdated: ["a"], itemsAdded: ["c"] })],
      "course",
      outline,
      {},
    );
    expect([...changes.items]).toEqual([
      ["a", "UPDATED"],
      ["c", "NEW"],
    ]);
    expect([...changes.modules]).toEqual([
      ["m1", "UPDATED"],
      ["m2", "UPDATED"],
    ]);
  });

  test("an activity in a new chapter is new, and so is the chapter", () => {
    const changes = courseContentChanges(
      [content(100, { modulesAdded: ["m2"] })],
      "course",
      outline,
      {},
    );
    expect([...changes.items]).toEqual([["c", "NEW"]]);
    expect([...changes.modules]).toEqual([["m2", "NEW"]]);
  });

  test("opening the activity after the change clears it; a later change brings it back", () => {
    const notices = [content(100, { itemsUpdated: ["a", "b"] })];
    const opened = courseContentChanges(notices, "course", outline, {
      a: { seenAt: 150 },
      b: { seenAt: 50 },
    });
    expect([...opened.items.keys()]).toEqual(["b"]);

    const later = courseContentChanges(
      [...notices, content(200, { itemsUpdated: ["a"] })],
      "course",
      outline,
      { a: { seenAt: 150 }, b: { seenAt: 150 } },
    );
    expect([...later.items.keys()]).toEqual(["a"]);
  });

  test("reading the notice does not clear a mark", () => {
    const changes = courseContentChanges(
      [content(100, { itemsUpdated: ["a"] }, 120)],
      "course",
      outline,
      {},
    );
    expect(changes.items.get("a")).toBe("UPDATED");
  });

  test("ignores other courses and activities no longer in the outline", () => {
    const changes = courseContentChanges(
      [
        content(100, { courseId: "other", itemsUpdated: ["a"] }),
        content(100, { itemsUpdated: ["gone"] }),
      ],
      "course",
      outline,
      {},
    );
    expect(changes.items.size).toBe(0);
    expect(changes.modules.size).toBe(0);
  });
});
