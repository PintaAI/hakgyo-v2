import { describe, expect, test } from "bun:test";

import {
  getAssessmentOptionLabel,
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "./assessment-options";

describe("assessment option constraints", () => {
  test("uses four visible circled-number labels", () => {
    expect(MAX_ASSESSMENT_OPTIONS).toBe(4);
    expect(
      Array.from({ length: MAX_ASSESSMENT_OPTIONS }, (_, index) =>
        getAssessmentOptionLabel(index),
      ),
    ).toEqual(["①", "②", "③", "④"]);
  });

  test("keeps two as the minimum and provides a safe fallback label", () => {
    expect(MIN_ASSESSMENT_OPTIONS).toBe(2);
    expect(getAssessmentOptionLabel(4)).toBe("Opsi 5");
  });
});
