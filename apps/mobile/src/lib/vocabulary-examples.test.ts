import { describe, expect, test } from "bun:test";

import { exampleLines, splitExample } from "./vocabulary-examples";

describe("vocabulary examples", () => {
  test("splits the Korean sentence from its translation", () => {
    expect(splitExample("알면서 왜 물어봐? = Udah tahu kok nanya?")).toEqual({
      sentence: "알면서 왜 물어봐?",
      translation: "Udah tahu kok nanya?",
    });
    expect(splitExample("“두 시간이나 기다렸는데.”")).toEqual({
      sentence: "두 시간이나 기다렸는데.",
      translation: null,
    });
  });

  test("reads a list or one line per example", () => {
    expect(exampleLines(["a", " ", 3, "b"])).toEqual(["a", "b"]);
    expect(exampleLines("a\n\nb")).toEqual(["a", "b"]);
    expect(exampleLines(null)).toEqual([]);
  });
});
