import { describe, expect, test } from "bun:test";

import {
  groupRanges,
  isImageOnlyContent,
  questionUnits,
  stimulusPlaysWith,
  usesPictureGrid,
} from "./assessment-groups";

const image = { type: "assetImage", props: { assetId: "a" }, children: [] };
const empty = { type: "paragraph", content: [], children: [] };

describe("isImageOnlyContent", () => {
  test("accepts pictures with empty paragraphs around them", () => {
    expect(isImageOnlyContent([image, empty])).toBe(true);
    expect(isImageOnlyContent([{ type: "image", props: { url: "x" } }])).toBe(
      true,
    );
  });

  test("rejects text, empty content and plain strings", () => {
    expect(
      isImageOnlyContent([
        image,
        { type: "paragraph", content: [{ type: "text", text: "가방" }] },
      ]),
    ).toBe(false);
    expect(isImageOnlyContent([empty])).toBe(false);
    expect(isImageOnlyContent("가방")).toBe(false);
  });

  test("a grid needs two to four picture options", () => {
    const picture = { content: [image] };
    expect(usesPictureGrid([picture, picture, picture, picture])).toBe(true);
    expect(usesPictureGrid([picture])).toBe(false);
    expect(usesPictureGrid([picture, { content: "가방" }])).toBe(false);
  });
});

describe("groups", () => {
  const questions = [
    { id: "q1", groupId: "g1" },
    { id: "q2", groupId: "g1" },
    { id: "q3", groupId: null },
    { id: "q4", groupId: "g2" },
  ];

  test("units keep a group's questions together", () => {
    expect(
      questionUnits(questions).map((unit) => unit.map(({ id }) => id)),
    ).toEqual([["q1", "q2"], ["q3"], ["q4"]]);
  });

  test("ranges give each group's first and last position", () => {
    expect(groupRanges(questions)).toEqual(
      new Map([
        ["g1", { first: 0, last: 1 }],
        ["g2", { first: 3, last: 3 }],
      ]),
    );
  });

  test("only a group's first question plays its stimulus", () => {
    const groups = [{ id: "g1" }, { id: "g2" }];
    expect(stimulusPlaysWith(questions, 0, groups)).toEqual({ id: "g1" });
    expect(stimulusPlaysWith(questions, 1, groups)).toBeUndefined();
    expect(stimulusPlaysWith(questions, 2, groups)).toBeUndefined();
    expect(stimulusPlaysWith(questions, 3, groups)).toEqual({ id: "g2" });
  });
});
