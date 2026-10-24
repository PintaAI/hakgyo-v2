import { describe, expect, test } from "bun:test";

import { isDefinitionCorrect } from "./today-vocabulary-practice";

describe("vocabulary meaning answers", () => {
  test("normalizes answers but requires a complete meaning", () => {
    const card = { meanings: ["School building"] };
    expect(isDefinitionCorrect(card, "  SCHOOL   BUILDING ")).toBeTrue();
    expect(isDefinitionCorrect(card, "school")).toBeFalse();
  });

  test("accepts any one of several meanings", () => {
    const card = { meanings: ["perut", "kapal", "pir"] };
    expect(isDefinitionCorrect(card, "Kapal")).toBeTrue();
    expect(isDefinitionCorrect(card, "pir")).toBeTrue();
    expect(isDefinitionCorrect(card, "perut; kapal; pir")).toBeTrue();
    expect(isDefinitionCorrect(card, "buku")).toBeFalse();
  });
});
