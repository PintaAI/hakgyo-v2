import { describe, expect, test } from "bun:test";

import {
  normalizeContent,
  normalizeInlineContent,
  parseJsonArray,
} from "./normalize";

describe("native content normalization", () => {
  test("keeps valid blocks and recursively drops malformed children", () => {
    expect(
      normalizeContent([
        {
          id: "root",
          type: "heading",
          props: { level: 2 },
          content: "Lesson",
          children: [
            { type: "paragraph", content: "Body" },
            null,
            { content: "Missing type" },
          ],
        },
        null,
      ]),
    ).toEqual([
      {
        id: "root",
        type: "heading",
        props: { level: 2 },
        content: "Lesson",
        children: [
          {
            type: "paragraph",
            props: {},
            content: "Body",
            children: [],
          },
        ],
      },
    ]);
  });

  test("normalizes styled text and links without trusting unknown fields", () => {
    expect(
      normalizeInlineContent([
        { type: "text", text: "Bold", styles: { bold: true, bad: 1 } },
        {
          type: "link",
          href: "https://hakgyo.app",
          content: [{ type: "text", text: " link", styles: {} }],
        },
      ]),
    ).toEqual([
      { type: "text", text: "Bold", styles: { bold: true } },
      {
        type: "link",
        href: "https://hakgyo.app",
        content: [{ type: "text", text: " link", styles: {} }],
      },
    ]);
  });

  test("marks links to other materials with their target", () => {
    expect(
      normalizeInlineContent([
        {
          type: "link",
          href: "hakgyo-material:material-2#heading-1",
          content: [{ type: "text", text: "Partikel", styles: {} }],
        },
        {
          type: "link",
          href: "hakgyo-material:",
          content: [{ type: "text", text: "Rusak", styles: {} }],
        },
        { type: "link", href: 42, content: [] },
      ]),
    ).toEqual([
      {
        type: "link",
        href: "hakgyo-material:material-2#heading-1",
        material: { materialId: "material-2", anchor: "heading-1" },
        content: [{ type: "text", text: "Partikel", styles: {} }],
      },
      {
        type: "link",
        href: "hakgyo-material:",
        content: [{ type: "text", text: "Rusak", styles: {} }],
      },
      { type: "link", href: "", content: [] },
    ]);
  });

  test("fails closed for malformed JSON props", () => {
    expect(parseJsonArray("not-json", (value) => value)).toEqual([]);
    expect(
      parseJsonArray('[{"label":"one"},null]', (value) => value.label),
    ).toEqual(["one"]);
  });
});
