import { describe, expect, test } from "bun:test";

import { collectMaterialAssetIds } from "./material-assets";

describe("material asset ids", () => {
  test("collects files from custom blocks, culture images and asset URLs", () => {
    const document = [
      { type: "assetImage", props: { assetId: "image-1" } },
      {
        type: "conversation",
        props: { assetId: "art-1", practiceAssetId: "practice-1" },
      },
      { type: "lessonPage", props: { assetId: "" } },
      {
        type: "culture",
        props: {
          sections: JSON.stringify([
            { id: "s1", type: "text", ko: "", en: "" },
            {
              id: "s2",
              type: "media",
              columns: 2,
              images: [{ assetId: "culture-1" }, { assetId: "" }],
            },
          ]),
        },
      },
      {
        type: "paragraph",
        children: [
          { type: "image", props: { url: "hakgyo-asset:inline-1" } },
          { type: "image", props: { url: "https://example.com/a.png" } },
          { type: "audio", props: { url: "hakgyo-asset:" } },
        ],
      },
    ];

    expect([...collectMaterialAssetIds(document)].toSorted()).toEqual([
      "art-1",
      "culture-1",
      "image-1",
      "inline-1",
      "practice-1",
    ]);
  });

  test("collects the audio clips inside Hangeul block JSON props", () => {
    const document = [
      {
        type: "hangeulLetters",
        props: {
          letters: JSON.stringify([
            {
              id: "a",
              character: "ㅏ",
              assetId: "letter-1",
              example: { word: "아이", assetId: "example-1" },
            },
            { id: "eo", character: "ㅓ", assetId: "", example: null },
          ]),
        },
      },
      {
        type: "hangeulContrast",
        props: {
          rows: JSON.stringify([
            {
              id: "r1",
              items: [
                { text: "사다", assetId: "pair-1" },
                { text: "싸다", assetId: "pair-2" },
              ],
            },
          ]),
        },
      },
      {
        type: "hangeulSyllableGrid",
        props: {
          consonants: JSON.stringify(["ㄱ"]),
          vowels: JSON.stringify(["ㅏ"]),
          audio: JSON.stringify([{ syllable: "가", assetId: "grid-1" }]),
        },
      },
      {
        type: "hangeulGame",
        props: {
          gameKey: "stroke-master",
          stage: "",
          title: "",
          description: "",
        },
      },
      { type: "hangeulLetters", props: { letters: "not json" } },
    ];

    expect([...collectMaterialAssetIds(document)].toSorted()).toEqual([
      "example-1",
      "grid-1",
      "letter-1",
      "pair-1",
      "pair-2",
    ]);
  });

  test("ignores malformed documents", () => {
    expect(collectMaterialAssetIds("text").size).toBe(0);
    expect(
      collectMaterialAssetIds([null, { type: "culture", props: {} }]).size,
    ).toBe(0);
  });
});
