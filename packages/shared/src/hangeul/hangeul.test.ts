import { describe, expect, test } from "bun:test";

import { collectContentAssetIds } from "../content-assets";
import {
  composeHangeulSyllable,
  getHangeulGameStage,
  HANGEUL_GAME_STAGES,
  hangeulGameDeepLink,
  hangeulGamePath,
  parseHangeulContrastRows,
  parseHangeulLetterCards,
  parseHangeulSyllableAudio,
  parseJamoList,
} from ".";

describe("composeHangeulSyllable", () => {
  test("composes open and closed syllables", () => {
    expect(composeHangeulSyllable("ㅇ", "ㅏ")).toBe("아");
    expect(composeHangeulSyllable("ㄱ", "ㅘ")).toBe("과");
    expect(composeHangeulSyllable("ㅎ", "ㅏ", "ㄴ")).toBe("한");
    expect(composeHangeulSyllable("ㄷ", "ㅏ", "ㄺ")).toBe("닭");
  });

  test("rejects jamo in the wrong position", () => {
    expect(composeHangeulSyllable("ㅏ", "ㅏ")).toBeNull();
    expect(composeHangeulSyllable("ㄱ", "ㄱ")).toBeNull();
    expect(composeHangeulSyllable("ㄸ", "ㅏ", "ㄸ")).toBeNull();
  });
});

describe("block prop parsers", () => {
  test("reads letter cards and skips malformed ones", () => {
    const cards = parseHangeulLetterCards(
      JSON.stringify([
        {
          id: "a",
          character: "ㅏ",
          cue: "seperti a di apa",
          assetId: "asset-a",
          example: { word: "아이", meaning: "anak", assetId: "asset-ai" },
        },
        { id: "empty", character: "" },
        "not a card",
        { character: "ㅗ", example: { word: "" } },
      ]),
    );
    expect(cards.map((card) => card.character)).toEqual(["ㅏ", "ㅗ"]);
    expect(cards[0]?.example?.assetId).toBe("asset-ai");
    expect(cards[1]?.example).toBeNull();
    expect(cards[1]?.id).toBe("letter-2");
  });

  test("tolerates invalid JSON", () => {
    expect(parseHangeulLetterCards("{oops")).toEqual([]);
    expect(parseHangeulContrastRows(undefined)).toEqual([]);
    expect(parseJamoList(42)).toEqual([]);
  });

  test("keeps contrast rows with two or three items", () => {
    const rows = parseHangeulContrastRows(
      JSON.stringify([
        { items: [{ text: "사다" }, { text: "싸다" }] },
        { items: [{ text: "비" }] },
        {
          items: [
            { text: "자다" },
            { text: "차다" },
            { text: "짜다" },
            { text: "extra" },
          ],
        },
      ]),
    );
    expect(rows.map((row) => row.items.map((item) => item.text))).toEqual([
      ["사다", "싸다"],
      ["자다", "차다", "짜다"],
    ]);
  });

  test("maps grid audio by syllable", () => {
    const audio = parseHangeulSyllableAudio(
      JSON.stringify([
        { syllable: "가", assetId: "asset-ga" },
        { syllable: "나", assetId: "" },
      ]),
    );
    expect([...audio]).toEqual([["가", "asset-ga"]]);
  });

  test("audio inside JSON props is found by collectContentAssetIds", () => {
    const block = {
      type: "hangeulLetters",
      props: {
        letters: JSON.stringify([
          {
            character: "ㅏ",
            assetId: "asset-a",
            example: { word: "아이", assetId: "asset-ai" },
          },
        ]),
      },
    };
    expect(collectContentAssetIds([block])).toEqual(["asset-a", "asset-ai"]);
  });
});

describe("game stages", () => {
  test("stage ids are unique and every stage grows the previous one", () => {
    const ids = HANGEUL_GAME_STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let index = 1; index < HANGEUL_GAME_STAGES.length; index++) {
      const previous = new Set(HANGEUL_GAME_STAGES[index - 1]!.letters);
      const current = new Set(HANGEUL_GAME_STAGES[index]!.letters);
      for (const letter of previous) expect(current.has(letter)).toBe(true);
    }
  });

  test("builds in-app paths and deep links", () => {
    expect(hangeulGamePath({ gameKey: "stroke-master" })).toBe(
      "/games/stroke-master",
    );
    expect(
      hangeulGamePath({
        gameKey: "syllable-forge",
        stage: "core-consonants",
        courseItemId: "item-1",
      }),
    ).toBe("/games/syllable-forge?stage=core-consonants&sourceCourseItemId=item-1");
    expect(hangeulGamePath({ gameKey: "word-builder", stage: "nope" })).toBe(
      "/games/word-builder",
    );
    expect(
      hangeulGameDeepLink({ gameKey: "word-builder", stage: "batchim" }),
    ).toBe("hakgyo://games/word-builder?stage=batchim");
    expect(getHangeulGameStage("y-vowels")?.batchim).toBe(false);
  });
});
