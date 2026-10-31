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

  test("remaps audio clips inside Hangeul block JSON props", () => {
    const rows = (assetId: string) =>
      JSON.stringify([
        {
          id: "r1",
          note: "",
          items: [
            { text: "사다", assetId },
            { text: "싸다", assetId: "" },
          ],
        },
      ]);
    const content = [
      { type: "hangeulContrast", props: { rows: rows("asset-old") } },
      {
        type: "hangeulSyllableGrid",
        props: {
          audio: JSON.stringify([{ syllable: "가", assetId: "asset-old" }]),
        },
      },
    ];

    expect(remapIds(content, ids)).toEqual([
      { type: "hangeulContrast", props: { rows: rows("asset-new") } },
      {
        type: "hangeulSyllableGrid",
        props: {
          audio: JSON.stringify([{ syllable: "가", assetId: "asset-new" }]),
        },
      },
    ]);
  });

  test("remaps material link hrefs and keeps their section anchor", () => {
    const linkIds = new Map([["material-old", "material-new"]]);
    const link = (href: string) => ({
      type: "link",
      href,
      content: [{ type: "text", text: "pola", styles: {} }],
    });
    const content = [
      {
        type: "paragraph",
        content: [
          link("hakgyo-material:material-old"),
          link("hakgyo-material:material-old#heading-1"),
          link("hakgyo-material:material-other#heading-1"),
          link("https://example.com/material-old"),
        ],
      },
    ];

    expect(remapIds(content, linkIds)).toEqual([
      {
        type: "paragraph",
        content: [
          link("hakgyo-material:material-new"),
          link("hakgyo-material:material-new#heading-1"),
          link("hakgyo-material:material-other#heading-1"),
          link("https://example.com/material-old"),
        ],
      },
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
