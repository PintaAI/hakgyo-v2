import { describe, expect, test } from "bun:test";

import {
  assessmentContentAssetIds,
  collectContentAssetIds,
} from "./content-assets";

describe("collectContentAssetIds", () => {
  test("finds nested media blocks once, in order", () => {
    expect(
      collectContentAssetIds([
        { type: "paragraph", content: "Dengarkan" },
        { type: "assetAudio", props: { assetId: "audio-1" } },
        {
          type: "culture",
          props: {
            sections: [{ images: [{ assetId: "image-1" }, { assetId: "" }] }],
          },
          children: [{ type: "assetImage", props: { assetId: "audio-1" } }],
        },
      ]),
    ).toEqual(["audio-1", "image-1"]);
  });

  test("ignores non-string ids and plain values", () => {
    expect(collectContentAssetIds(null, "text", 3, { assetId: 7 })).toEqual([]);
  });
});

test("assessmentContentAssetIds covers instructions, prompts and options", () => {
  expect(
    assessmentContentAssetIds({
      instructions: [{ props: { assetId: "intro" } }],
      questions: [
        {
          prompt: [{ props: { assetId: "q1" } }],
          options: [{ content: [{ props: { assetId: "o1" } }] }],
        },
      ],
    }),
  ).toEqual(["intro", "q1", "o1"]);
});
