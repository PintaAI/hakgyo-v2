import { describe, expect, test } from "bun:test";

import {
  requireVocabularyMeanings,
  resolveVocabularyMeanings,
} from "./meanings";

describe("resolveVocabularyMeanings", () => {
  test("writes the meanings and their joined mirror", () => {
    expect(
      resolveVocabularyMeanings({ meanings: [" perut", "kapal", "perut"] }),
    ).toEqual({ meanings: ["perut", "kapal"], definition: "perut; kapal" });
  });

  test("turns a legacy definition into the only meaning", () => {
    expect(resolveVocabularyMeanings({ definition: "sekolah" })).toEqual({
      meanings: ["sekolah"],
      definition: "sekolah",
    });
  });

  test("prefers meanings over a legacy definition", () => {
    expect(
      resolveVocabularyMeanings({ meanings: ["kapal"], definition: "perut" }),
    ).toEqual({ meanings: ["kapal"], definition: "kapal" });
  });

  test("leaves meanings alone when neither is sent", () => {
    expect(resolveVocabularyMeanings({})).toBeUndefined();
    expect(() => requireVocabularyMeanings({})).toThrow();
  });

  test("rejects a list of empty meanings", () => {
    expect(() => resolveVocabularyMeanings({ meanings: ["", " "] })).toThrow();
  });
});
