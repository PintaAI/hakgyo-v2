import { describe, expect, test } from "bun:test";

import { materialPosition } from "./material-position";

const outline = {
  modules: [
    { items: [{ id: "intro", type: "MATERIAL" }] },
    {
      items: [
        { id: "a", type: "MATERIAL" },
        { id: "vocab", type: "VOCABULARY_SET" },
        { id: "b", type: "MATERIAL" },
        { id: "quiz", type: "ASSESSMENT" },
      ],
    },
  ],
};

describe("materialPosition", () => {
  test("counts only the chapter's materials", () => {
    expect(materialPosition(outline, "b")).toEqual({
      chapter: 2,
      index: 2,
      total: 2,
    });
    expect(materialPosition(outline, "intro")).toEqual({
      chapter: 1,
      index: 1,
      total: 1,
    });
  });

  test("is null for other items or without an outline", () => {
    expect(materialPosition(outline, "quiz")).toBeNull();
    expect(materialPosition(outline, "missing")).toBeNull();
    expect(materialPosition(undefined, "a")).toBeNull();
  });
});
