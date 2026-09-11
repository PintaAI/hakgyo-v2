import { expect, test } from "bun:test";
import {
  advanceMemory,
  emptyMemory,
  gradeRecallAnswer,
  vocabularyContentHash,
} from "./recall-policy";
const now = new Date("2026-09-06T00:00:00Z");

test("three passes require ten minutes then a day; failures reset acquisition and revoke memory", () => {
  const first = advanceMemory(emptyMemory(), true, now);
  expect(first.rememberedAt).toBeNull();
  expect(first.nextReviewAt!.getTime() - now.getTime()).toBe(600_000);
  const second = advanceMemory(first, true, first.nextReviewAt!);
  expect(second.rememberedAt).toBeNull();
  expect(second.nextReviewAt!.getTime() - first.nextReviewAt!.getTime()).toBe(
    86_400_000,
  );
  const third = advanceMemory(second, true, second.nextReviewAt!);
  expect(third.rememberedAt).toEqual(second.nextReviewAt);
  const failed = advanceMemory(third, false, now);
  expect(failed.passStreak).toBe(0);
  expect(failed.rememberedAt).not.toBeNull();
  const forgotten = advanceMemory(failed, false, now);
  expect(forgotten.rememberedAt).toBeNull();
  expect(advanceMemory(forgotten, true, now).rememberedAt).toBeNull();
  expect(advanceMemory(failed, true, now).failStreak).toBe(0);
});

test("normalizes Unicode and whitespace but rejects partial matches and blanks", () => {
  expect(gradeRecallAnswer("  ＡＢＣ  ", "abc")).toBe(true);
  expect(gradeRecallAnswer("학교", "학교")).toBe(true);
  expect(gradeRecallAnswer(" ice  cream ", "ice cream")).toBe(true);
  expect(gradeRecallAnswer("school", "school bus")).toBe(false);
  expect(gradeRecallAnswer("", "")).toBe(false);
  expect(gradeRecallAnswer("학교!", "학교")).toBe(false);
});

test("both term and definition edits invalidate evidence", () => {
  const hash = vocabularyContentHash({ term: "학교", definition: "school" });
  expect(hash).not.toBe(
    vocabularyContentHash({ term: "학교", definition: "academy" }),
  );
  expect(hash).not.toBe(
    vocabularyContentHash({ term: "학생", definition: "school" }),
  );
});
