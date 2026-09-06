import { describe, expect, test } from "bun:test";
import {
  buildSession,
  choiceOptions,
  memoryFor,
  parseMemory,
  recordRecall,
} from "./vocabulary-practice";
const word = { id: "one", term: "학교", definition: "School" };

describe("daily vocabulary recall", () => {
  test("missed words become due before successful recalls", () => {
    const other = { id: "two", term: "책", definition: "Book" };
    let memory = recordRecall({}, word, true, 1000);
    memory = recordRecall(memory, other, false, 1000);
    expect(buildSession([word, other], memory, 601_000)).toEqual([other]);
    expect(buildSession([word, other], memory, 1001)).toEqual([]);
  });
  test("success grows interval; failure resets it; edits reset memory", () => {
    const once = recordRecall({}, word, true, 0);
    const twice = recordRecall(once, word, true, 86_400_000);
    expect(twice.one?.dueAt).toBe(3 * 86_400_000);
    expect(recordRecall(twice, word, false, 0).one?.correct).toBe(0);
    expect(
      memoryFor({ ...word, definition: "A school" }, twice),
    ).toBeUndefined();
  });
  test("choices never contain duplicate labels, including one-word sets", () => {
    expect(
      choiceOptions(word, [word, { ...word, id: "duplicate" }], false),
    ).toEqual(["School"]);
    expect(choiceOptions(word, [word], true)).toEqual(["학교"]);
  });
  test("corrupt local data is discarded and sessions are bounded", () => {
    expect(parseMemory("broken")).toEqual({});
    expect(parseMemory('{"one":{"correct":-1}}')).toEqual({});
    expect(
      buildSession(
        Array.from({ length: 20 }, (_, i) => ({ ...word, id: String(i) })),
        {},
        0,
      ),
    ).toHaveLength(10);
    expect(buildSession([{ ...word, term: " " }], {}, 0)).toEqual([]);
  });
});
