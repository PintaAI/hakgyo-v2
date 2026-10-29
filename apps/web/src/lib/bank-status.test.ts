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

  test("a type or group sets could never use is not ready", () => {
    expect(
      bankReadinessProblem({ ...ready, tags: ["eps:L12", "level:sedang"] }),
    ).toBe("tipe L12 belum dipakai di set EPS-TOPIK");
    const l8 = { ...ready, tags: ["eps:L8", "level:sulit"] };
    expect(
      bankReadinessProblem({ ...l8, groupTypes: ["eps:L8", "eps:L9"] }),
    ).toBeNull();
    expect(
      bankReadinessProblem({ ...l8, groupTypes: ["eps:L9", "eps:L8"] }),
    ).toBe("kelompok L9 → L8 tidak muat di nomor ujian mana pun");
    expect(
      bankReadinessProblem({ ...l8, groupTypes: ["eps:L9", "eps:L9"] }),
    ).toBe("kelompok L9 → L9 tidak muat di nomor ujian mana pun");
    // A member without a type reports that itself; the group waits for it.
    expect(
      bankReadinessProblem({ ...l8, groupTypes: ["eps:L8", null] }),
    ).toBeNull();
  });

  test("live questions go back through review, never straight to draft", () => {
    expect(bankTransitions.LIVE).not.toContain("DRAFT");
    expect(bankTransitions.DRAFT).not.toContain("LIVE");
  });
});
