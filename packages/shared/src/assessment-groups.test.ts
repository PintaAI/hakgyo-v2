import { describe, expect, test } from "bun:test";

import {
  audioKeysFor,
  groupRanges,
  isImageOnlyContent,
  questionUnits,
  usesPictureGrid,
} from "./assessment-groups";
import { checkRuleEntry, ruleStateFrom } from "./assessment-question-rules";

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

  test("a group with stimulus audio shares one play count", () => {
    const keys = audioKeysFor(questions, [
      {
        id: "g1",
        stimulus: [{ type: "assetAudio", props: { assetId: "dialog" } }],
      },
      { id: "g2", stimulus: [image] },
    ]);
    expect(keys).toEqual({ q1: "g1", q2: "g1", q3: "q3", q4: "q4" });
    const sections = [
      {
        id: "listening",
        audioMaxPlays: 2,
        questionIds: ["q1", "q2", "q3", "q4"],
        audioKeyOf: keys,
      },
    ];
    const state = ruleStateFrom(sections, [
      { kind: "AUDIO_PLAYED", questionId: "q1" },
      { kind: "AUDIO_PLAYED", questionId: "q1" },
    ]);
    expect(
      checkRuleEntry(sections, state, {
        kind: "AUDIO_PLAYED",
        questionId: "q2",
      }),
    ).toBe("AUDIO");
    expect(
      checkRuleEntry(sections, state, {
        kind: "AUDIO_PLAYED",
        questionId: "q3",
      }),
    ).toBeNull();
  });
});
