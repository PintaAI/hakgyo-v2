import { describe, expect, test } from "bun:test";

import { handleBlockNotePaste, shouldPasteBlockNoteAsPlainText } from "./paste";

describe("shouldPasteBlockNoteAsPlainText", () => {
  test("treats a PDF-style one-cell HTML table as text", () => {
    expect(
      shouldPasteBlockNoteAsPlainText(
        "<table><tbody><tr><td>다음 글을 읽으십시오.</td></tr></tbody></table>",
        "다음 글을 읽으십시오.",
      ),
    ).toBe(true);
  });

  test("preserves a genuine multi-column table", () => {
    expect(
      shouldPasteBlockNoteAsPlainText(
        "<table><tbody><tr><td>한국어</td><td>English</td></tr></tbody></table>",
        "한국어\tEnglish",
      ),
    ).toBe(false);
  });

  test("preserves a genuine multi-row table", () => {
    expect(
      shouldPasteBlockNoteAsPlainText(
        "<table><tbody><tr><td>하나</td></tr><tr><td>둘</td></tr></tbody></table>",
        "하나\n둘",
      ),
    ).toBe(false);
  });

  test("does not interfere with ordinary rich-text HTML", () => {
    expect(
      shouldPasteBlockNoteAsPlainText(
        "<p><strong>중요한</strong> 문장입니다.</p>",
        "중요한 문장입니다.",
      ),
    ).toBe(false);
  });
});

describe("handleBlockNotePaste", () => {
  test("sends PDF-style table markup through BlockNote's plain-text paste", () => {
    const passage = "한국 사람들은 허리를 굽혀 인사합니다.";
    let pastedText = "";
    let usedDefaultHandler = false;

    const handled = handleBlockNotePaste({
      event: {
        clipboardData: {
          getData: (type) =>
            type === "text/html"
              ? `<table><tbody><tr><td>${passage}</td></tr></tbody></table>`
              : passage,
        },
      },
      editor: {
        pasteText: (text) => {
          pastedText = text;
          return true;
        },
      },
      defaultPasteHandler: () => {
        usedDefaultHandler = true;
        return true;
      },
    });

    expect(handled).toBe(true);
    expect(pastedText).toBe(passage);
    expect(usedDefaultHandler).toBe(false);
  });
});
