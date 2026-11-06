import { describe, expect, test } from "bun:test";

import {
  sortByWordStatus,
  vocabularySetProgress,
  vocabularyWordStatus,
} from "./vocabulary-word-status";

const progress = (practiced: boolean, learned: boolean, mastered: boolean) => ({
  practiced,
  learned,
  mastered,
  due: false,
});

describe("vocabularyWordStatus", () => {
  test("follows the practice evidence", () => {
    expect(vocabularyWordStatus(undefined)).toBe("NEW");
    expect(vocabularyWordStatus(progress(false, false, false))).toBe("NEW");
    expect(vocabularyWordStatus(progress(true, false, false))).toBe("MEMORIZE");
    expect(vocabularyWordStatus(progress(true, true, false))).toBe("LEARNED");
    expect(vocabularyWordStatus(progress(true, true, true))).toBe("MASTERED");
  });

  test("counts a mastered word as known when an older server sends no learned flag", () => {
    expect(
      vocabularyWordStatus({ practiced: true, mastered: true, due: false }),
    ).toBe("MASTERED");
  });
});

describe("sortByWordStatus", () => {
  test("puts words to memorise first and keeps the set order within a status", () => {
    const status = {
      a: "LEARNED",
      b: "NEW",
      c: "MEMORIZE",
      d: "MASTERED",
      e: "NEW",
    } as const;
    const words = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    expect(
      sortByWordStatus(words, (word) => status[word.id as keyof typeof status])
        .map((word) => word.id)
        .join(""),
    ).toBe("cbead");
  });
});

describe("vocabularySetProgress", () => {
  test("is complete once every word is learned or mastered", () => {
    expect(vocabularySetProgress(["LEARNED", "MASTERED"])).toEqual({
      total: 2,
      learned: 2,
      mastered: 1,
      complete: true,
    });
    expect(vocabularySetProgress(["LEARNED", "MEMORIZE"]).complete).toBe(false);
    expect(vocabularySetProgress([]).complete).toBe(false);
  });
});
