import { expect, test } from "bun:test";
import { restoreAssessmentDraft } from "./assessment-draft";

test("recover local edits without dropping unrelated server answers", () => {
  const server = { one: { optionIds: ["a"] }, two: { optionIds: ["b"] } };
  expect(restoreAssessmentDraft(server, '{"one":{"optionIds":[]}}')).toEqual({
    one: { optionIds: [], content: undefined },
    two: { optionIds: ["b"] },
  });
  expect(
    restoreAssessmentDraft(server, '{"one":{"optionIds":[false]}}'),
  ).toEqual(server);
  expect(restoreAssessmentDraft(server, "[]")).toEqual(server);
  expect(() => restoreAssessmentDraft(server, "broken")).toThrow();
});
