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

  test("ignores malformed documents", () => {
    expect(collectMaterialAssetIds("text").size).toBe(0);
    expect(
      collectMaterialAssetIds([null, { type: "culture", props: {} }]).size,
    ).toBe(0);
  });
});
