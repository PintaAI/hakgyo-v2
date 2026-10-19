import { describe, expect, test } from "bun:test";

import type { SearchDocument } from "./documents";
import { buildSnippet, prepareDocument, searchDocuments } from "./match";
import {
  choseong,
  extractTextSegments,
  normalizeSearchText,
  vocabularyExamples,
} from "./text";

function document(
  key: string,
  overrides: Partial<SearchDocument> = {},
): SearchDocument {
  return {
    key,
    kind: "material",
    title: key,
    context: null,
    organizationId: null,
    fields: [{ text: overrides.title ?? key, weight: 1 }],
    body: [],
    target: { type: "course", courseId: "course" },
    ...overrides,
  };
}

function search(documents: SearchDocument[], query: string) {
  return searchDocuments(documents.map(prepareDocument), query).results.map(
    (result) => result.document.key,
  );
}

describe("normalizeSearchText", () => {
  test("folds case, accents and punctuation", () => {
    expect(normalizeSearchText("  Café-Bab 1!  ")).toBe("cafe bab 1");
  });

  test("keeps Hangul syllables and compatibility jamo", () => {
    expect(normalizeSearchText("학교, ㅎㄱ")).toBe("학교 ㅎㄱ");
  });
});

describe("choseong", () => {
  test("returns the initial consonants", () => {
    expect(choseong("학교 가요")).toBe("ㅎㄱ ㄱㅇ");
  });
});

describe("searchDocuments", () => {
  const school = document("school", {
    kind: "vocabularyEntry",
    title: "학교",
    fields: [
      { text: "학교", weight: 1 },
      { text: "sekolah", weight: 0.9 },
    ],
    body: ["저는 학교에 가요."],
  });
  const greeting = document("greeting", { title: "Salam perkenalan" });

  test("matches the Korean word while its last syllable is composing", () => {
    expect(search([school, greeting], "ㅎ")).toEqual(["school"]);
    expect(search([school], "하")).toEqual(["school"]);
    expect(search([school], "학")).toEqual(["school"]);
    expect(search([school], "학ㄱ")).toEqual(["school"]);
  });

  test("matches initial consonants", () => {
    expect(search([school, greeting], "ㅎㄱ")).toEqual(["school"]);
  });

  test("tolerates a typo in Latin words", () => {
    expect(search([school, greeting], "sekolha")).toEqual(["school"]);
    expect(search([school, greeting], "perknalan")).toEqual(["greeting"]);
  });

  test("requires every word to match", () => {
    expect(search([greeting], "salam perkenalan")).toEqual(["greeting"]);
    expect(search([greeting], "salam bab")).toEqual([]);
  });

  test("ranks title matches above body matches", () => {
    const body = document("body", {
      title: "Bab 3",
      body: ["Kita belajar tentang salam di Korea."],
    });
    expect(search([body, greeting], "salam")).toEqual(["greeting", "body"]);
  });

  test("returns a snippet for body matches only", () => {
    const material = document("material", {
      title: "Bab 3",
      body: ["Pada bab ini kita belajar cara memperkenalkan diri."],
    });
    const [result] = searchDocuments(
      [prepareDocument(material)],
      "perkenalkan",
    ).results;
    expect(result?.snippet?.text).toContain("memperkenalkan");
    expect(result?.snippet?.highlight).not.toBeNull();
    const [titleOnly] = searchDocuments(
      [prepareDocument(greeting)],
      "salam",
    ).results;
    expect(titleOnly?.snippet).toBeNull();
  });

  test("counts every kind but filters the results", () => {
    const course = document("course", { kind: "course", title: "Salam" });
    const outcome = searchDocuments(
      [course, greeting].map(prepareDocument),
      "salam",
      { kinds: new Set(["course"]) },
    );
    expect(outcome.results.map((result) => result.document.key)).toEqual([
      "course",
    ]);
    expect(outcome.counts).toEqual({ course: 1, material: 1 });
    expect(outcome.total).toBe(2);
  });
});

describe("buildSnippet", () => {
  test("centers on the match and highlights it", () => {
    const text = `${"kata ".repeat(20)}annyeong ${"lagi ".repeat(40)}`;
    const snippet = buildSnippet(text, ["annyeong"]);
    expect(snippet.text.startsWith("…")).toBe(true);
    expect(snippet.text.endsWith("…")).toBe(true);
    const { start, end } = snippet.highlight!;
    expect(snippet.text.slice(start, end)).toBe("annyeong");
  });
});

describe("extractTextSegments", () => {
  test("reads BlockNote paragraphs and custom block props", () => {
    const content = [
      {
        id: "a",
        type: "paragraph",
        props: { textAlignment: "left" },
        content: [
          { type: "text", text: "Halo ", styles: {} },
          { type: "text", text: "dunia", styles: { bold: true } },
        ],
        children: [],
      },
      {
        id: "b",
        type: "grammarCard",
        props: {
          theme: "amber",
          title: "Partikel 은/는",
          assetId: "asset_1",
          examples: JSON.stringify([{ ko: "저는 학생이에요", id: "x" }]),
        },
        content: [],
        children: [],
      },
    ];
    expect(extractTextSegments(content)).toEqual([
      "Halo dunia",
      "Partikel 은/는",
      "저는 학생이에요",
    ]);
  });
});

describe("vocabularyExamples", () => {
  test("accepts arrays and newline-separated text", () => {
    expect(vocabularyExamples(["a", " ", "b"])).toEqual(["a", "b"]);
    expect(vocabularyExamples("a\n\nb ")).toEqual(["a", "b"]);
    expect(vocabularyExamples(null)).toEqual([]);
  });
});
