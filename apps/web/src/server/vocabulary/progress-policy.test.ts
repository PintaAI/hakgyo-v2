import { describe, expect, test } from "bun:test";

import {
  advanceVocabularyProgress,
  emptyVocabularyProgress,
  vocabularyProgressPolicy,
  vocabularyProgressStatus,
} from "./progress-policy";

const now = new Date("2026-09-19T00:00:00.000Z");

describe("vocabulary progress policy", () => {
  test("a graded recognition practices but cannot master a word", () => {
    const state = advanceVocabularyProgress(
      emptyVocabularyProgress(),
      { evidence: "RECOGNITION", result: "CORRECT" },
      now,
    );

    expect(state.practicedAt).toEqual(now);
    expect(state.correctRecallCount).toBe(0);
    expect(state.masteredAt).toBeNull();
    expect(state.nextReviewAt).toBeNull();
    expect(vocabularyProgressStatus(state)).toBe("LEARNING");
  });

  test("recognition does not postpone an already due recall", () => {
    const due = {
      practicedAt: now,
      masteredAt: null,
      nextReviewAt: now,
      correctRecallCount: 1,
    };
    const state = advanceVocabularyProgress(
      due,
      { evidence: "RECOGNITION", result: "CORRECT" },
      new Date(now.getTime() + 60_000),
    );

    expect(state.nextReviewAt).toEqual(now);
    expect(state.correctRecallCount).toBe(1);
  });

  test("incorrect recognition does not postpone or erase recall progress", () => {
    const due = {
      practicedAt: now,
      masteredAt: null,
      nextReviewAt: now,
      correctRecallCount: 1,
    };
    const state = advanceVocabularyProgress(
      due,
      { evidence: "RECOGNITION", result: "INCORRECT" },
      new Date(now.getTime() + 60_000),
    );

    expect(state.nextReviewAt).toEqual(now);
    expect(state.correctRecallCount).toBe(1);
  });

  test("two due recall sessions master a word", () => {
    const first = advanceVocabularyProgress(
      emptyVocabularyProgress(),
      { evidence: "RECALL", result: "CORRECT" },
      now,
    );
    const early = advanceVocabularyProgress(
      first,
      { evidence: "RECALL", result: "CORRECT" },
      new Date(now.getTime() + 60_000),
    );
    const due = advanceVocabularyProgress(
      early,
      { evidence: "RECALL", result: "CORRECT" },
      first.nextReviewAt!,
    );

    expect(first.correctRecallCount).toBe(1);
    expect(early.correctRecallCount).toBe(1);
    expect(due.correctRecallCount).toBe(2);
    expect(due.masteredAt).toEqual(first.nextReviewAt);
    expect(vocabularyProgressStatus(due)).toBe("MASTERED");
  });

  test("incorrect attempts practice a word and schedule a quick retry", () => {
    const state = advanceVocabularyProgress(
      emptyVocabularyProgress(),
      { evidence: "RECALL", result: "INCORRECT" },
      now,
    );

    expect(state.practicedAt).toEqual(now);
    expect(state.nextReviewAt?.getTime()).toBe(
      now.getTime() + vocabularyProgressPolicy.retryDelayMs,
    );
  });

  test("reveals do not count as practice", () => {
    const state = advanceVocabularyProgress(
      emptyVocabularyProgress(),
      { evidence: "RECALL", result: "REVEALED" },
      now,
    );

    expect(state).toEqual(emptyVocabularyProgress());
    expect(vocabularyProgressStatus(state)).toBe("NEW");
  });

  test("mastery is durable after a later mistake", () => {
    const mastered = {
      practicedAt: now,
      masteredAt: now,
      nextReviewAt: now,
      correctRecallCount: 2,
    };
    const state = advanceVocabularyProgress(
      mastered,
      { evidence: "APPLICATION", result: "INCORRECT" },
      now,
    );

    expect(state.masteredAt).toEqual(now);
    expect(state.correctRecallCount).toBe(2);
    expect(vocabularyProgressStatus(state)).toBe("MASTERED");
  });
});
