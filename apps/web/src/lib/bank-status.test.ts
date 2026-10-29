import { describe, expect, test } from "bun:test";

import { bankReadinessProblem, bankTransitions } from "./bank-status";

describe("bank status", () => {
  const ready = {
    type: "SINGLE_CHOICE",
    tags: ["eps:R8", "level:sedang"],
    optionCount: 4,
    correctCount: 1,
  };

  test("a complete EPS question is ready", () => {
    expect(bankReadinessProblem(ready)).toBeNull();
  });

  test("names what is missing", () => {
    expect(bankReadinessProblem({ ...ready, optionCount: 3 })).toBe(
      "harus punya 4 pilihan",
    );
    expect(bankReadinessProblem({ ...ready, correctCount: 2 })).toBe(
      "harus punya tepat 1 jawaban benar",
    );
    expect(bankReadinessProblem({ ...ready, tags: ["level:mudah"] })).toBe(
      "tipe soal belum dipilih",
    );
    expect(bankReadinessProblem({ ...ready, tags: ["eps:R8"] })).toBe(
      "tingkat belum dipilih",
    );
    expect(bankReadinessProblem({ ...ready, promptEmpty: true })).toBe(
      "pertanyaan belum diisi",
    );
    expect(bankReadinessProblem({ ...ready, emptyOptions: 2 })).toBe(
      "2 pilihan masih kosong",
    );
  });

  test("live questions go back through review, never straight to draft", () => {
    expect(bankTransitions.LIVE).not.toContain("DRAFT");
    expect(bankTransitions.DRAFT).not.toContain("LIVE");
  });
});
