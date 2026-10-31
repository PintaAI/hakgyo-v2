import { describe, expect, test } from "bun:test";

import {
  isValidEditorLink,
  unlinkInvalidMaterialLinks,
} from "./material-links";

const text = (value: string) => ({ type: "text", text: value, styles: {} });
const link = (href: string, value: string) => ({
  type: "link",
  href,
  content: [text(value)],
});

describe("unlinkInvalidMaterialLinks", () => {
  test("turns links to unknown materials into plain text", () => {
    const document = [
      {
        id: "p1",
        type: "paragraph",
        content: [
          text("Lihat "),
          link("hakgyo-material:kept#h1", "pola A"),
          text(" dan "),
          link("hakgyo-material:other-org", "pola B"),
          text(" atau "),
          link("https://example.com", "web"),
        ],
        children: [
          {
            id: "p2",
            type: "paragraph",
            content: [link("hakgyo-material:missing#h2", "pola C")],
            children: [],
          },
        ],
      },
    ];

    expect(
      unlinkInvalidMaterialLinks<unknown>(document, new Set(["kept"])),
    ).toEqual([
      {
        id: "p1",
        type: "paragraph",
        content: [
          text("Lihat "),
          link("hakgyo-material:kept#h1", "pola A"),
          text(" dan "),
          text("pola B"),
          text(" atau "),
          link("https://example.com", "web"),
        ],
        children: [
          {
            id: "p2",
            type: "paragraph",
            content: [text("pola C")],
            children: [],
          },
        ],
      },
    ]);
  });

  test("unlinks inside table cells and keeps string link content", () => {
    const document = [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "link",
                      href: "hakgyo-material:gone",
                      content: "x",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ];

    expect(unlinkInvalidMaterialLinks<unknown>(document, new Set())).toEqual([
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: [{ type: "tableCell", content: [text("x")] }] }],
        },
      },
    ]);
  });

  test("does not modify the input", () => {
    const document = [
      { type: "paragraph", content: [link("hakgyo-material:gone", "a")] },
    ];
    unlinkInvalidMaterialLinks(document, new Set());
    expect(document[0]!.content[0]!.type).toBe("link");
  });
});

describe("isValidEditorLink", () => {
  test("accepts material links and BlockNote's default protocols", () => {
    expect(isValidEditorLink("hakgyo-material:abc#h1")).toBe(true);
    expect(isValidEditorLink("https://example.com")).toBe(true);
    expect(isValidEditorLink("mailto:a@b.c")).toBe(true);
    expect(isValidEditorLink("/learn")).toBe(true);
  });

  test("rejects script and unknown schemes", () => {
    expect(isValidEditorLink("javascript:alert(1)")).toBe(false);
    expect(isValidEditorLink("hakgyo-asset:abc")).toBe(false);
  });
});
