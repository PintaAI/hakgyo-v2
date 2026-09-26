import { describe, expect, test } from "bun:test";

import {
  passesAssessmentRequirement,
  passesRequirementPolicy,
} from "./material-completion";

describe("material completion requirements", () => {
  test("applies ALL and ANY policies", () => {
    expect(passesRequirementPolicy("ALL", [true, false])).toBe(false);
    expect(passesRequirementPolicy("ANY", [true, false])).toBe(true);
    expect(passesRequirementPolicy("ALL", [])).toBe(true);
    expect(passesRequirementPolicy("ANY", [])).toBe(true);
  });

  test("only accepts graded attempts meeting the effective score", () => {
    const attempts = [{ status: "GRADED", score: 7, maxScore: 10 }];
    expect(passesAssessmentRequirement(attempts, 80, 60)).toBe(false);
    expect(passesAssessmentRequirement(attempts, null, 70)).toBe(true);
    expect(
      passesAssessmentRequirement(
        [{ status: "SUBMITTED", score: 10, maxScore: 10 }],
        null,
        null,
      ),
    ).toBe(false);
    expect(passesAssessmentRequirement(attempts, null, null)).toBe(true);
  });
});
