import { describe, expect, test } from "bun:test";

import { unseenNotice, unseenQuestions } from "./assessment-finish";

const seenSet = (...indexes: number[]) => {
  const seen = new Set(indexes);
  return (index: number) => seen.has(index);
};

describe("unseenQuestions", () => {
  test("lists unopened questions after the current one first, then from the start", () => {
    expect(
      unseenQuestions({
        indexes: [0, 1, 2, 3, 4],
        current: 2,
        isSeen: seenSet(0, 2),
      }),
    ).toEqual([3, 4, 1]);
  });

  test("counts the question on screen as opened", () => {
    expect(
      unseenQuestions({ indexes: [0, 1], current: 1, isSeen: seenSet(0) }),
    ).toEqual([]);
  });

  test("keeps to the running section's indexes", () => {
    expect(
      unseenQuestions({ indexes: [5, 6, 7], current: 5, isSeen: seenSet() }),
    ).toEqual([6, 7]);
  });

  test("leaves out questions behind a forward-only section's position", () => {
    expect(
      unseenQuestions({
        indexes: [0, 1, 2, 3],
        current: 2,
        navigation: "FORWARD_ONLY",
        isSeen: seenSet(0, 2),
      }),
    ).toEqual([3]);
  });

  test("has nothing to offer in a paced section", () => {
    expect(
      unseenQuestions({
        indexes: [0, 1, 2],
        current: 0,
        navigation: "PACED",
        isSeen: seenSet(),
      }),
    ).toEqual([]);
  });

  test("checks every question when the current one is not in the list", () => {
    expect(
      unseenQuestions({ indexes: [0, 1], current: 9, isSeen: seenSet(1) }),
    ).toEqual([0]);
  });
});

describe("unseenNotice", () => {
  test("names the count, for the tugas or the section", () => {
    expect(unseenNotice(0)).toBeNull();
    expect(unseenNotice(3)).toBe("3 soal belum kamu buka.");
    expect(unseenNotice(1, true)).toBe("1 soal di bagian ini belum kamu buka.");
  });
});
