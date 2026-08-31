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

  test("fails closed for malformed JSON props", () => {
    expect(parseJsonArray("not-json", (value) => value)).toEqual([]);
    expect(
      parseJsonArray('[{"label":"one"},null]', (value) => value.label),
    ).toEqual(["one"]);
  });
});
