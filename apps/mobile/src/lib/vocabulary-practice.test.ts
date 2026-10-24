import { describe, expect, test } from "bun:test";
import {
  buildSession,
  choiceOptions,
  isVocabularyAnswerCorrect,
  memoryFor,
  parseMemory,
  recordRecall,
} from "./vocabulary-practice";
const word = { id: "one", term: "학교", meanings: ["School"] };

describe("daily vocabulary recall", () => {
  test("optimistic grading matches the server normalization rule", () => {
    expect(isVocabularyAnswerCorrect("  학교  ", "학교")).toBe(true);
    expect(isVocabularyAnswerCorrect("ＳＣＨＯＯＬ", "school")).toBe(true);
    expect(isVocabularyAnswerCorrect("학 교", "학교")).toBe(false);
    expect(isVocabularyAnswerCorrect("   ", "")).toBe(false);
  });

  test("missed words become due before successful recalls", () => {
    const other = { id: "two", term: "책", meanings: ["Book"] };
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
      memoryFor({ ...word, meanings: ["A school"] }, twice),
    ).toBeUndefined();
    expect(
      memoryFor({ ...word, meanings: ["School", "Campus"] }, twice),
    ).toBeUndefined();
  });
  test("choices never contain duplicate labels, including one-word sets", () => {
    expect(
      choiceOptions(word, [word, { ...word, id: "duplicate" }], false),
    ).toEqual(["School"]);
    expect(choiceOptions(word, [word], true)).toEqual(["학교"]);
  });
  test("fingerprints stay compatible with the single definition", () => {
    const legacy = {
      one: {
        correct: 1,
        reviews: 1,
        dueAt: 0,
        fingerprint: JSON.stringify(["학교", "School"]),
      },
    };
    expect(memoryFor(word, legacy)).toBeDefined();
  });
  test("choices join meanings and skip words sharing one", () => {
    const bae = { id: "bae", term: "배", meanings: ["perut", "kapal"] };
    const stomach = { id: "stomach", term: "복부", meanings: ["Perut"] };
    const book = { id: "book", term: "책", meanings: ["buku"] };
    const options = choiceOptions(bae, [bae, stomach, book], false);
    expect(options.sort()).toEqual(["buku", "perut; kapal"]);
    expect(choiceOptions(bae, [bae, stomach, book], true).sort()).toEqual([
      "배",
      "책",
    ]);
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
