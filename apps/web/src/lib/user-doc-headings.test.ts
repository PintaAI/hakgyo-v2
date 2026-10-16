import { describe, expect, test } from "bun:test";

import {
  getDocHeadings,
  headingText,
  slugifyHeading,
} from "./user-doc-headings";

describe("user doc headings", () => {
  test("collects level 2 and 3 headings with their source lines", () => {
    const headings = getDocHeadings(
      [
        "# Judul",
        "",
        "## Sebelum mulai",
        "Teks",
        "### Langkah 1",
        "#### Kecil",
      ].join("\n"),
    );

    expect(headings).toEqual([
      { id: "sebelum-mulai", text: "Sebelum mulai", level: 2, line: 3 },
      { id: "langkah-1", text: "Langkah 1", level: 3, line: 5 },
    ]);
  });

  test("ignores headings inside fenced code blocks", () => {
    const headings = getDocHeadings(
      [
        "```text",
        "## Bukan heading",
        "```",
        "~~~",
        "## Juga bukan",
        "~~~",
        "## Heading",
      ].join("\n"),
    );

    expect(headings.map((heading) => heading.text)).toEqual(["Heading"]);
  });

  test("gives repeated headings unique ids", () => {
    const headings = getDocHeadings("## Contoh\n## Contoh\n## Contoh");

    expect(headings.map((heading) => heading.id)).toEqual([
      "contoh",
      "contoh-1",
      "contoh-2",
    ]);
  });

  test("strips inline Markdown from heading text", () => {
    expect(headingText("Buka **Pengaturan** lalu `MCP` dan [tautan](/x)")).toBe(
      "Buka Pengaturan lalu MCP dan tautan",
    );
    expect(slugifyHeading("Siapa boleh apa?")).toBe("siapa-boleh-apa");
    expect(slugifyHeading("Latihan & Tryout")).toBe("latihan-tryout");
  });
});
