import { describe, expect, test } from "bun:test";

import {
  prioritizeQuestions,
  prioritizeVocabulary,
  type QuestionCandidate,
  type VocabularyCandidate,
} from "./priorities";

const now = new Date("2026-11-12T08:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000);

function word(
  id: string,
  overrides: Partial<VocabularyCandidate> = {},
): VocabularyCandidate {
  return {
    id,
    progress: null,
    recentlyMissed: false,
    setCompleted: false,
    setOrder: 0,
    entryOrder: 0,
    ...overrides,
  };
}

const practised = (
  progress: Partial<NonNullable<VocabularyCandidate["progress"]>>,
) => ({
  progress: {
    practicedAt: daysAgo(3),
    masteredAt: null,
    nextReviewAt: null,
    ...progress,
  },
});

const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();

describe("prioritizeVocabulary", () => {
  test("fills the day in order of need", () => {
    const candidates = [
      word("later", practised({ nextReviewAt: inDays(2) })),
      word("mastered", practised({ masteredAt: daysAgo(10) })),
      word("new-1", { entryOrder: 1 }),
      word("due", practised({ nextReviewAt: daysAgo(1) })),
      word("missed", {
        ...practised({ nextReviewAt: inDays(1) }),
        recentlyMissed: true,
      }),
    ];
    // Room for three: due, missed, then the first new word.
    expect(
      ids(prioritizeVocabulary(candidates, { now, limit: 3, seed: "s" })),
    ).toEqual(["due", "missed", "new-1"]);
    // Room for all: mastered words fill before not-yet-due ones.
    expect(
      ids(prioritizeVocabulary(candidates, { now, limit: 4, seed: "s" })),
    ).toEqual(["due", "mastered", "missed", "new-1"]);
  });

  test("introduces at most the daily number of new words", () => {
    const candidates = Array.from({ length: 30 }, (_, index) =>
      word(`new-${index}`, { entryOrder: index }),
    );
    const chosen = prioritizeVocabulary(candidates, {
      now,
      limit: 24,
      seed: "s",
      newLimit: 10,
    });
    expect(chosen).toHaveLength(10);
    // In course order: the first ten.
    expect(ids(chosen)).toEqual(ids(candidates.slice(0, 10)));
  });

  test("takes new words from unfinished sets first", () => {
    const chosen = prioritizeVocabulary(
      [
        word("finished-set", { setCompleted: true, setOrder: 0 }),
        word("current-set", { setOrder: 5 }),
      ],
      { now, limit: 1, seed: "s" },
    );
    expect(ids(chosen)).toEqual(["current-set"]);
  });

  test("puts the most overdue review and the least recent mastered word first", () => {
    const chosen = prioritizeVocabulary(
      [
        word("due-recent", practised({ nextReviewAt: daysAgo(1) })),
        word("due-old", practised({ nextReviewAt: daysAgo(9) })),
      ],
      { now, limit: 1, seed: "s" },
    );
    expect(ids(chosen)).toEqual(["due-old"]);
    const filler = prioritizeVocabulary(
      [
        word(
          "mastered-recent",
          practised({ masteredAt: daysAgo(30), practicedAt: daysAgo(1) }),
        ),
        word(
          "mastered-old",
          practised({ masteredAt: daysAgo(30), practicedAt: daysAgo(20) }),
        ),
      ],
      { now, limit: 1, seed: "s" },
    );
    expect(ids(filler)).toEqual(["mastered-old"]);
  });

  test("the same seed gives the same day, another seed a new order", () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      word(`w-${index}`, practised({ nextReviewAt: daysAgo(index + 1) })),
    );
    const day = prioritizeVocabulary(candidates, { now, limit: 12, seed: "a" });
    expect(
      prioritizeVocabulary(candidates, { now, limit: 12, seed: "a" }),
    ).toEqual(day);
    expect(
      prioritizeVocabulary(candidates, { now, limit: 12, seed: "b" }).map(
        (item) => item.id,
      ),
    ).not.toEqual(day.map((item) => item.id));
  });
});

function question(
  id: string,
  overrides: Partial<QuestionCandidate> = {},
): QuestionCandidate {
  return { id, answeredWrong: false, assessmentPassed: false, ...overrides };
}

describe("prioritizeQuestions", () => {
  test("wrong answers first, then open quizzes, then a few passed ones", () => {
    const candidates = [
      ...Array.from({ length: 6 }, (_, index) =>
        question(`passed-${index}`, { assessmentPassed: true }),
      ),
      question("wrong", { answeredWrong: true, assessmentPassed: true }),
      question("open-1"),
      question("open-2"),
    ];
    const chosen = prioritizeQuestions(candidates, { limit: 10, seed: "s" });
    const chosenIds = chosen.map((item) => item.id);
    expect(chosenIds).toContain("wrong");
    expect(chosenIds).toContain("open-1");
    expect(chosenIds).toContain("open-2");
    // Only two open questions: passed quizzes fill the rest of the day.
    expect(chosenIds.filter((id) => id.startsWith("passed"))).toHaveLength(6);
  });

  test("keeps passed quizzes to the cap while other questions fill the day", () => {
    const candidates = [
      ...Array.from({ length: 6 }, (_, index) =>
        question(`passed-${index}`, { assessmentPassed: true }),
      ),
      ...Array.from({ length: 12 }, (_, index) => question(`open-${index}`)),
    ];
    const chosen = prioritizeQuestions(candidates, { limit: 10, seed: "s" });
    expect(chosen).toHaveLength(10);
    expect(chosen.filter((item) => item.id.startsWith("passed"))).toHaveLength(
      3,
    );
  });

  test("fills with passed quizzes when nothing else is left", () => {
    const candidates = Array.from({ length: 8 }, (_, index) =>
      question(`passed-${index}`, { assessmentPassed: true }),
    );
    expect(
      prioritizeQuestions(candidates, { limit: 5, seed: "s" }),
    ).toHaveLength(5);
  });
});
