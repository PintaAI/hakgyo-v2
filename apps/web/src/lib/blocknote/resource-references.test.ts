import { describe, expect, test } from "bun:test";

import {
  collectMaterialReferenceIds,
  removeInvalidMaterialReferences,
} from "./resource-references";

describe("material resource references", () => {
  const document = [
    {
      type: "vocabularyReference",
      props: { vocabularySetId: "vocab-1" },
      children: [],
    },
    {
      type: "paragraph",
      content: "Keep me",
      children: [
        {
          type: "assessmentReference",
          props: { assessmentId: "assessment-1" },
          children: [],
        },
      ],
    },
    {
      type: "assessmentReference",
      props: { assessmentId: "assessment-1" },
      children: [],
    },
  ];

  test("collects unique references recursively", () => {
    expect(collectMaterialReferenceIds(document)).toEqual({
      assessmentIds: ["assessment-1"],
      vocabularySetIds: ["vocab-1"],
    });
  });

  test("removes missing reference blocks and preserves other content", () => {
    expect(
      removeInvalidMaterialReferences(document, {
        assessmentIds: new Set<string>(),
        vocabularySetIds: new Set(["vocab-1"]),
      }),
    ).toEqual([document[0]!, { ...document[1]!, children: [] }]);
  });
});
