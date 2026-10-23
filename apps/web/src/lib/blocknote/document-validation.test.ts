import { describe, expect, test } from "bun:test";

import {
  conversationBlockDefaults,
  cultureBlockDefaults,
  grammarBlockDefaults,
  hangeulContrastBlockDefaults,
  hangeulGameBlockDefaults,
  hangeulLettersBlockDefaults,
  hangeulSyllableGridBlockDefaults,
  lessonPageDefaults,
} from "./block-catalog";
import { findBlockNoteDocumentIssues } from "./document-validation";

describe("BlockNote document validation", () => {
  test("accepts built-in blocks and custom blocks with valid props", () => {
    expect(
      findBlockNoteDocumentIssues([
        { type: "heading", props: { level: 2 }, content: "Pelajaran 1" },
        { type: "divider" },
        {
          type: "toggleListItem",
          content: "Lihat",
          children: [{ type: "paragraph", content: "Isi" }],
        },
        { type: "callout", props: { tone: "tip" }, content: "Catatan" },
        { type: "conversation", props: conversationBlockDefaults },
        { type: "culture", props: cultureBlockDefaults },
        { type: "grammar", props: grammarBlockDefaults },
        {
          type: "lessonPage",
          props: { theme: "ocean", ...lessonPageDefaults },
        },
        { type: "pdfPages", props: { bookId: "b", startPage: 2, endPage: 4 } },
        { type: "grammar" },
      ]),
    ).toEqual([]);
  });

  test("accepts the Hangeul blocks and rejects bad game keys and lists", () => {
    expect(
      findBlockNoteDocumentIssues([
        { type: "hangeulLetters", props: hangeulLettersBlockDefaults },
        { type: "hangeulContrast", props: hangeulContrastBlockDefaults },
        {
          type: "hangeulSyllableGrid",
          props: hangeulSyllableGridBlockDefaults,
        },
        { type: "hangeulGame", props: hangeulGameBlockDefaults },
        {
          type: "hangeulGame",
          props: { gameKey: "word-builder", stage: "batchim" },
        },
      ]),
    ).toEqual([]);

    expect(
      findBlockNoteDocumentIssues([
        { type: "hangeulGame", props: { gameKey: "tetris" } },
        { type: "hangeulGame", props: { stage: "level-99" } },
        { type: "hangeulLetters", props: { letters: [{ character: "ㅏ" }] } },
        {
          type: "hangeulSyllableGrid",
          props: { vowels: "ㅏ ㅓ", showRomanization: "yes" },
        },
      ]).map((issue) => issue.path),
    ).toEqual([
      [0, "props", "gameKey"],
      [1, "props", "stage"],
      [2, "props", "letters"],
      [3, "props", "vowels"],
      [3, "props", "showRomanization"],
    ]);
  });

  test("rejects unknown block types, including nested ones", () => {
    expect(
      findBlockNoteDocumentIssues([
        { type: "flashcard" },
        { type: "paragraph", children: [{ type: "quiz" }] },
      ]).map((issue) => issue.path),
    ).toEqual([
      [0, "type"],
      [1, "children", 0, "type"],
    ]);
  });

  test("rejects custom props with the wrong type, enum value or JSON encoding", () => {
    const issues = findBlockNoteDocumentIssues([
      {
        type: "conversation",
        props: {
          theme: "purple",
          showTip: "yes",
          lines: [{ speaker: "가", korean: "안녕", translation: "Halo" }],
          questions: "not json",
        },
      },
      { type: "pdfPages", props: { startPage: "1" } },
    ]);

    expect(issues.map((issue) => issue.path)).toEqual([
      [0, "props", "theme"],
      [0, "props", "showTip"],
      [0, "props", "lines"],
      [0, "props", "questions"],
      [1, "props", "startPage"],
    ]);
    expect(issues[0]?.message).toContain('"violet"');
  });

  test("leaves unknown props to BlockNote", () => {
    expect(
      findBlockNoteDocumentIssues([
        { type: "callout", props: { tone: "info", legacy: 1 } },
      ]),
    ).toEqual([]);
  });
});
