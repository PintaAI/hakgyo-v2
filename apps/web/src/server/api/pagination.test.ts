import { describe, expect, test } from "bun:test";

import { pageResult } from "./pagination";

describe("bounded management pages", () => {
  test("returns a cursor only when another page exists", () => {
    expect(
      pageResult([{ id: "one" }, { id: "two" }, { id: "three" }], 2, 3),
    ).toEqual({
      items: [{ id: "one" }, { id: "two" }],
      nextCursor: "two",
      total: 3,
    });
    expect(pageResult([{ id: "one" }], 2)).toEqual({
      items: [{ id: "one" }],
      nextCursor: null,
    });
  });
});
