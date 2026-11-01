import { describe, expect, test } from "bun:test";

import {
  entryMeanings,
  joinMeanings,
  matchesMeaning,
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
    expect(matchesMeaning("sdr / sdr.i", meanings)).toBe(true);
  });

  test("keeps a comma inside one meaning", () => {
    const meanings = ["begitu …, langsung"];
    expect(matchesMeaning("begitu", meanings)).toBe(false);
    expect(matchesMeaning("begitu …, langsung", meanings)).toBe(true);
  });
});
