import { describe, expect, test } from "bun:test";

import {
  blindFlags,
  checkDraft,
  duplicateOptionFlag,
  keyPatternFlag,
  keywordFlag,
  optionLengthFlag,
  similarityFlag,
  mostSimilar,
  trigramSimilarity,
} from "./draft-checks";

const draft = {
  prompt: "기계를 청소할 때는 먼저 전원을 (     ) 장갑을 끼십시오.",
  options: ["끄고", "끄면", "끄려고", "끄느라고"],
  key: 0,
};

describe("draft checks", () => {
  test("a balanced draft has no flags", () => {
    expect(
      checkDraft({
        draft,
        batch: [draft],
        keywords: ["전원"],
        similar: { similarity: 0.2, position: 4 },
        blind: { answer: 0, plausible: [0] },
      }),
    ).toEqual([]);
  });

  test("option lengths", () => {
    expect(optionLengthFlag(["예", "아니요", "모릅니다", "네"])).toBeNull();
    expect(
      optionLengthFlag([
        "네",
        "아니요",
        "안전모를 쓰고 작업장에 들어가야 합니다",
        "몰라요",
      ]),
    ).toMatchObject({ code: "LENGTH" });
  });

  test("duplicate options", () => {
    expect(
      duplicateOptionFlag(["가방", "가방 ", "가봉", "거방"]),
    ).toMatchObject({
      code: "DUPLICATE_OPTION",
    });
  });

  test("key pattern needs three drafts with the same key", () => {
    expect(keyPatternFlag([draft, draft])).toBeNull();
    expect(keyPatternFlag([draft, draft, draft])).toMatchObject({
      code: "KEY_PATTERN",
    });
    expect(keyPatternFlag([draft, draft, { ...draft, key: 2 }])).toBeNull();
  });

  test("keywords", () => {
    expect(keywordFlag([], draft)).toBeNull();
    expect(keywordFlag(["안전모"], draft)).toMatchObject({ code: "KEYWORDS" });
  });

  test("similarity to the bank", () => {
    expect(similarityFlag(null)).toBeNull();
    expect(similarityFlag({ similarity: 0.72, position: 11 })).toEqual({
      code: "SIMILAR",
      message: "Mirip soal bank no. 12 (72%).",
    });
  });

  test("blind answers", () => {
    expect(blindFlags(0, null)).toEqual([]);
    expect(
      blindFlags(0, { answer: 2, plausible: [0, 2] }).map((flag) => flag.code),
    ).toEqual(["BLIND_MISMATCH", "AMBIGUOUS"]);
  });
});

describe("trigramSimilarity", () => {
  test("identical text is 1, unrelated text is near 0", () => {
    expect(trigramSimilarity("안전모를 쓰십시오", "안전모를 쓰십시오")).toBe(1);
    expect(
      trigramSimilarity("안전모를 쓰십시오", "점심을 먹었어요"),
    ).toBeLessThan(0.1);
  });

  test("a light paraphrase stays high", () => {
    expect(
      trigramSimilarity(
        "기계를 청소할 때는 먼저 전원을 끄십시오",
        "기계를 청소할 때 먼저 전원을 끄십시오",
      ),
    ).toBeGreaterThan(0.6);
  });

  test("mostSimilar picks the closest question", () => {
    expect(
      mostSimilar("전원을 끄십시오", [
        { text: "점심을 먹었어요", position: 0 },
        { text: "전원을 끄십시오", position: 3 },
      ]),
    ).toEqual({ similarity: 1, position: 3 });
  });
});
