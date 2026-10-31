import { describe, expect, test } from "bun:test";

import {
  findMaterialLink,
  itemMaterialLinks,
  materialLinkPreview,
  type MaterialLink,
} from "./material-links";

const link = (overrides: Partial<MaterialLink> = {}): MaterialLink => ({
  materialId: "material-2",
  courseId: "course-1",
  courseItemId: "item-2",
  title: "Partikel",
  description: "Topik dan subjek",
  sections: { "heading-1": { title: "은/는", excerpt: "Menandai topik." } },
  ...overrides,
});

describe("itemMaterialLinks", () => {
  test("reads valid links and skips malformed ones", () => {
    expect(
      itemMaterialLinks({
        materialLinks: [
          link(),
          { materialId: "material-3" },
          null,
          {
            ...link({ materialId: "material-4" }),
            description: 3,
            sections: { bad: { title: 1 } },
          },
        ],
      }),
    ).toEqual([
      link(),
      {
        materialId: "material-4",
        courseId: "course-1",
        courseItemId: "item-2",
        title: "Partikel",
        description: null,
        sections: {},
      },
    ]);
  });

  test("returns nothing for details without links", () => {
    expect(itemMaterialLinks(undefined)).toEqual([]);
    expect(itemMaterialLinks({ material: null })).toEqual([]);
  });
});

describe("findMaterialLink", () => {
  test("prefers the current course, then any match", () => {
    const other = link({ courseId: "course-2", courseItemId: "item-9" });
    const current = link();
    expect(findMaterialLink([other, current], "material-2", "course-1")).toBe(
      current,
    );
    expect(findMaterialLink([other], "material-2", "course-1")).toBe(other);
    expect(findMaterialLink([other], "material-x", "course-1")).toBeNull();
  });
});

describe("materialLinkPreview", () => {
  test("shows the linked section under the material title", () => {
    expect(materialLinkPreview(link(), "heading-1")).toEqual({
      title: "은/는",
      materialTitle: "Partikel",
      excerpt: "Menandai topik.",
    });
  });

  test("falls back to the whole material for a missing or no section", () => {
    const whole = {
      title: "Partikel",
      materialTitle: null,
      excerpt: "Topik dan subjek",
    };
    expect(materialLinkPreview(link(), "gone")).toEqual(whole);
    expect(materialLinkPreview(link(), null)).toEqual(whole);
    expect(materialLinkPreview(link({ description: " " }), null)).toMatchObject(
      { excerpt: null },
    );
  });
});
