import { describe, expect, test } from "bun:test";

import {
  createCultureSection,
  cultureSectionDefaults,
  getCultureAssetIds,
  parseCultureSections,
} from "./culture-content";

describe("culture content", () => {
  test("creates the supported split layouts with stable media slots", () => {
    const section = createCultureSection("split-stack-left", "section-1");

    expect(section).toMatchObject({
      id: "section-1",
      type: "split",
      mediaSide: "left",
      mediaStack: "column",
    });
    expect(section.type === "split" ? section.images : []).toHaveLength(2);
  });

  test("normalizes malformed section fields", () => {
    const sections = parseCultureSections(
      JSON.stringify([
        {
          id: "media",
          type: "media",
          columns: 1,
          images: [{ assetId: "asset-1", aspect: "invalid", fit: "invalid" }],
        },
      ]),
    );

    expect(sections).toEqual([
      {
        id: "media",
        type: "media",
        columns: 1,
        images: [
          {
            id: "media-image-1",
            assetId: "asset-1",
            fileName: "",
            contentType: "",
            alt: "",
            caption: "",
            aspect: "4:3",
            fit: "cover",
          },
        ],
      },
    ]);
  });

  test("falls back to fresh defaults when JSON is invalid", () => {
    const first = parseCultureSections("not-json");
    const second = parseCultureSections("not-json");

    expect(first).toEqual(cultureSectionDefaults);
    expect(first).not.toBe(second);
  });

  test("collects nested asset ids and ignores empty media", () => {
    expect(
      getCultureAssetIds(
        JSON.stringify([
          {
            id: "images",
            type: "media",
            columns: 2,
            images: [
              { id: "one", assetId: "asset-1" },
              { id: "two", assetId: "" },
            ],
          },
          {
            id: "split",
            type: "split",
            images: [{ id: "three", assetId: "asset-2" }],
          },
        ]),
      ),
    ).toEqual(["asset-1", "asset-2"]);
  });
});
