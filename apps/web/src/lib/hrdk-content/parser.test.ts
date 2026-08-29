import { describe, expect, test } from "bun:test";

import { parseHrdkPages, validateHrdkManifest } from "./parser";
import { hrdkManifestSchema } from "./schema";

const lessonPages = [
  {
    pageNumber: 11,
    lines: [
      "C H A P T E R",
      "자기소개",
      "0 1",
      "Self Introduction",
      "학습 목표",
      "자기소개를 할 수 있습니다.",
      "어휘 VOCABULARY 사람 People",
      "사람\t이름\t나라\t회사",
      "person\tname\tcountry\tcompany",
      "➊ 학생 student\t➋ 선생님 teacher",
      "그림을 보고 [보기]와 같이 대화를 완성하세요.",
      "Look at the pictures and complete the dialogue.",
      "문법 1",
      "저는 투안입니다.",
    ],
  },
  {
    pageNumber: 12,
    lines: ["대화 1", "안녕하세요?", "안녕하세요."],
  },
];

describe("HRDK textbook parser", () => {
  test("detects lessons, sections, vocabulary, and safe quiz questions", () => {
    const result = parseHrdkPages(lessonPages);

    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0]?.number).toBe(1);
    expect(result.lessons[0]?.sections.map(({ kind }) => kind)).toContain(
      "grammar",
    );
    expect(result.lessons[0]?.vocabulary).toHaveLength(6);
    expect(result.lessons[0]?.assessment).toHaveLength(6);
    expect(result.lessons[0]?.vocabulary[0]).toMatchObject({
      term: "사람",
      definition: "person",
    });
    expect(
      result.lessons[0]?.assessment.every(
        (question) =>
          question.options.filter(({ isCorrect }) => isCorrect).length === 1,
      ),
    ).toBe(true);
  });

  test("falls back to fixed-size page groups when headings are unavailable", () => {
    const result = parseHrdkPages(
      Array.from({ length: 3 }, (_, index) => ({
        pageNumber: index + 1,
        lines: [`Isi halaman ${index + 1} yang cukup panjang untuk dibaca.`],
      })),
      { pagesPerLesson: 2 },
    );

    expect(result.lessons).toHaveLength(2);
    expect(
      result.issues.some(({ code }) => code === "LESSON_BOUNDARY_FALLBACK"),
    ).toBe(true);
  });

  test("recognizes spaced English CHAPTER headings produced by OCR", () => {
    const result = parseHrdkPages([
      {
        pageNumber: 100,
        lines: [
          "C H A P T E R 21",
          "병원 Hospital",
          "학습 목표",
          "어휘 1",
          "병원\thospital",
          "약\tmedicine",
          "의사\tdoctor",
          "간호사\tnurse",
        ],
      },
    ]);

    expect(result.lessons[0]?.number).toBe(21);
    expect(result.lessons[0]?.title).toBe("병원 Hospital");
  });

  test("reports duplicate lesson numbers as an import-blocking error", () => {
    const lesson = parseHrdkPages(lessonPages).lessons[0]!;
    const manifest = hrdkManifestSchema.parse({
      schemaVersion: 1,
      source: {
        fileName: "book.pdf",
        sha256: "a".repeat(64),
        pageCount: 12,
        extractedAt: "2026-08-29T00:00:00.000Z",
      },
      course: {
        slug: "eps-topik",
        title: "EPS-TOPIK",
        description: "Test",
        status: "DRAFT",
      },
      lessons: [lesson, lesson],
    });

    const report = validateHrdkManifest(manifest);
    expect(report.valid).toBe(false);
    expect(report.issues[0]?.code).toBe("DUPLICATE_LESSON_NUMBER");
  });
});
