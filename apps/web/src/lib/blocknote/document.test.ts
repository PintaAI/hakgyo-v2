import { describe, expect, test } from "bun:test";

import { hasBlockNoteContent, toBlockNoteDocument } from "./document";

describe("assessment BlockNote document compatibility", () => {
  test("normalizes legacy string JSON into a paragraph", () => {
    expect(toBlockNoteDocument("Pilih jawaban yang benar")).toEqual([
      { type: "paragraph", content: "Pilih jawaban yang benar" },
    ]);
  });

  test("preserves an existing BlockNote document", () => {
    const document = [{ type: "heading" as const, content: "Pertanyaan" }];
    expect(toBlockNoteDocument(document)).toBe(document);
  });

  test("treats an attached media block as content", () => {
    expect(
      hasBlockNoteContent([
        { type: "assetAudio", props: { assetId: "asset-1" } },
      ]),
    ).toBe(true);
    expect(hasBlockNoteContent([{ type: "paragraph", content: "" }])).toBe(
      false,
    );
  });
});
