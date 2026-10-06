import { describe, expect, test } from "bun:test";

import { remapIds } from "./remap-ids";

const ids = new Map([
  ["asset-old", "asset-new"],
  ["quiz-old", "quiz-new"],
]);

describe("remapIds", () => {
  test("replaces bare ids, asset urls, and ids inside nested JSON strings", () => {
    const content = [
      {
        type: "assetImage",
        props: { assetId: "asset-old", caption: "keep asset-older" },
        children: [
          { type: "image", props: { url: "hakgyo-asset:asset-old" } },
          {
            type: "culture",
            props: {
              sections: JSON.stringify([
                { type: "media", images: [{ assetId: "asset-old" }] },
              ]),
            },
          },
        ],
      },
      { type: "assessmentReference", props: { assessmentId: "quiz-old" } },
    ];

    expect(remapIds(content, ids)).toEqual([
      {
        type: "assetImage",
        props: { assetId: "asset-new", caption: "keep asset-older" },
        children: [
          { type: "image", props: { url: "hakgyo-asset:asset-new" } },
          {
            type: "culture",
            props: {
              sections: JSON.stringify([
                { type: "media", images: [{ assetId: "asset-new" }] },
              ]),
            },
          },
        ],
      },
      { type: "assessmentReference", props: { assessmentId: "quiz-new" } },
    ]);
  });

  test("leaves numbers, nulls and unrelated strings untouched", () => {
    const value = { points: 2, note: null, text: "Halo dunia" };
    expect(remapIds(value, ids)).toEqual(value);
  });

  test("does not rewrite ids that only appear inside other text", () => {
    const value = {
      text: "Lihat asset-old di halaman 3",
      list: "[not json",
      sections: JSON.stringify([{ caption: "asset-old saja" }]),
    };
    expect(remapIds(value, ids)).toEqual(value);
  });

  test("does not modify the input", () => {
    const value = { assetId: "asset-old" };
    remapIds(value, ids);
    expect(value.assetId).toBe("asset-old");
  });
});
