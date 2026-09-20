import { describe, expect, test } from "bun:test";

import { isDefinitionCorrect } from "./today-vocabulary-practice";

describe("vocabulary definition answers", () => {
  test("normalizes answers but requires the complete definition", () => {
    const card = { definition: "School building" };
    expect(isDefinitionCorrect(card, "  SCHOOL   BUILDING ")).toBeTrue();
    expect(isDefinitionCorrect(card, "school")).toBeFalse();
  });
});
