import { describe, expect, test } from "bun:test";

import { sectionRules } from "./section-rules";

describe("sectionRules", () => {
  test("a free section has no rules", () => {
    expect(sectionRules({ navigation: "FREE", lockAnswers: false })).toEqual(
      [],
    );
  });

  test("forward-only and paced sections say how questions move", () => {
    expect(
      sectionRules({ navigation: "FORWARD_ONLY", lockAnswers: false }),
    ).toEqual([
      "Soal yang sudah dilewati tidak bisa dibuka lagi.",
      "Jawaban bisa diubah selama soal masih tampil.",
    ]);
    expect(sectionRules({ navigation: "PACED", lockAnswers: true })).toEqual([
      "Soal berganti sendiri setelah waktunya habis.",
      "Pilihan pertama kamu langsung dikunci.",
    ]);
  });
});
