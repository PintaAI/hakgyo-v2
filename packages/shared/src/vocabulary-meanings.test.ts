import { describe, expect, test } from "bun:test";

import {
  entryMeanings,
  joinMeanings,
  matchesMeaning,
  matchesTerm,
  normalizeMeanings,
  splitMeanings,
  vocabularyMeaningFields,
} from "./vocabulary-meanings";

describe("vocabulary meanings", () => {
  test("normalizes by trimming and dropping empty and repeated meanings", () => {
    expect(normalizeMeanings([" perut ", "", "Kapal", "kapal", "pir"])).toEqual(
      ["perut", "Kapal", "pir"],
    );
  });

  test("mirrors the meanings into the legacy definition", () => {
    expect(vocabularyMeaningFields(["perut", " kapal "])).toEqual({
      meanings: ["perut", "kapal"],
      definition: "perut; kapal",
    });
    expect(joinMeanings(["sekolah"])).toBe("sekolah");
  });

  test("splits meanings typed into one field", () => {
    expect(splitMeanings("perut;  kapal ; ;pir")).toEqual([
      "perut",
      "kapal",
      "pir",
    ]);
    expect(splitMeanings(joinMeanings(["a", "b"]))).toEqual(["a", "b"]);
  });

  test("falls back to the definition when meanings are missing", () => {
    expect(entryMeanings({ definition: " sekolah " })).toEqual(["sekolah"]);
    expect(entryMeanings({ meanings: [], definition: "buku" })).toEqual([
      "buku",
    ]);
    expect(entryMeanings({ meanings: ["a", "b"], definition: "a; b" })).toEqual(
      ["a", "b"],
    );
    expect(entryMeanings({ definition: "  " })).toEqual([]);
  });

  test("accepts any one meaning or all of them as an answer", () => {
    const meanings = ["perut", "kapal"];
    expect(matchesMeaning(" Kapal ", meanings)).toBe(true);
    expect(matchesMeaning("perut; kapal", meanings)).toBe(true);
    expect(matchesMeaning("pir", meanings)).toBe(false);
    expect(matchesMeaning("  ", meanings)).toBe(false);
  });

  test("accepts a meaning without its notes in brackets", () => {
    const meanings = ["Itu (benda yang jauh dari pembicara)"];
    expect(matchesMeaning("itu", meanings)).toBe(true);
    expect(
      matchesMeaning("Itu (benda yang jauh dari pembicara)", meanings),
    ).toBe(true);
    expect(matchesMeaning("benda", meanings)).toBe(false);
  });

  test("accepts either side of a slash", () => {
    const meanings = ["Sdr / Sdr.i"];
    expect(matchesMeaning("sdr", meanings)).toBe(true);
    expect(matchesMeaning("Sdr.i", meanings)).toBe(true);
    expect(matchesMeaning("sdri", meanings)).toBe(true);
    expect(matchesMeaning("sdr / sdr.i", meanings)).toBe(true);
  });

  test("keeps a comma inside one meaning", () => {
    const meanings = ["begitu …, langsung"];
    expect(matchesMeaning("begitu", meanings)).toBe(false);
    expect(matchesMeaning("begitu …, langsung", meanings)).toBe(true);
  });

  test("ignores punctuation a learner would not type", () => {
    expect(matchesMeaning("oh", ["lima (angka)", "oh!"])).toBe(true);
    expect(matchesMeaning("bagaimana", ["bagaimana?"])).toBe(true);
    expect(matchesMeaning("halo", ["Halo? (Diucapkan di telepon)"])).toBe(true);
    expect(matchesMeaning("1000", ["1.000"])).toBe(true);
    expect(matchesMeaning("1.000", ["1.000"])).toBe(true);
    expect(matchesMeaning("begitu langsung", ["begitu …, langsung"])).toBe(
      true,
    );
    expect(matchesMeaning("!?", ["oh!"])).toBe(false);
  });

  test("reads a hyphen as a space or nothing and & as dan", () => {
    expect(matchesMeaning("kupu kupu", ["kupu-kupu"])).toBe(true);
    expect(matchesMeaning("kupukupu", ["kupu-kupu"])).toBe(true);
    expect(matchesMeaning("Kira-kira", ["Kira-Kira"])).toBe(true);
    expect(matchesMeaning("daging dan ikan", ["Daging & Ikan"])).toBe(true);
    expect(matchesMeaning("daging & ikan", ["Daging & Ikan"])).toBe(true);
    expect(matchesMeaning("daging", ["Daging & Ikan"])).toBe(false);
  });
});

describe("matchesTerm", () => {
  test("still needs the term itself, spacing included", () => {
    expect(matchesTerm("  학교 ", "학교")).toBe(true);
    expect(matchesTerm("학 교", "학교")).toBe(false);
    expect(matchesTerm("책", "학교")).toBe(false);
    expect(matchesTerm(" ", "")).toBe(false);
  });

  test("accepts a term without its notes, punctuation or other side", () => {
    expect(matchesTerm("앞", "(건물) 앞")).toBe(true);
    expect(matchesTerm("건물 앞", "(건물) 앞")).toBe(true);
    expect(matchesTerm("나", "나(남자)")).toBe(true);
    expect(matchesTerm("40분", "40분 (사십 분)")).toBe(true);
    expect(matchesTerm("반", "30분 (삼십 분)=반")).toBe(true);
    expect(matchesTerm("30분", "30분 (삼십 분)=반")).toBe(true);
    expect(matchesTerm("드시다", "잡수시다/드시다")).toBe(true);
    expect(matchesTerm("여보세요", "여보세요?")).toBe(true);
    expect(matchesTerm("k팝", "K-팝")).toBe(true);
    expect(matchesTerm("현금 인출기", "현금 인출기(ATM)")).toBe(true);
    expect(matchesTerm("건물", "(건물) 앞")).toBe(false);
  });
});
