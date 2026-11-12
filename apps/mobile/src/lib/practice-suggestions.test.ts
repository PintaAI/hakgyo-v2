import { describe, expect, test } from "bun:test";

import {
  dueWords,
  suggestQuizzes,
  suggestVocabularySets,
  type SetSummary,
} from "./practice-suggestions";

const NOW = new Date(2026, 10, 9, 15, 0).getTime();

function set(id: string, moduleId: string, isCompleted = false) {
  return {
    key: `c1:${id}`,
    courseId: "c1",
    id,
    moduleId,
    moduleTitle: `Bab ${moduleId}`,
    isCompleted,
    attempt: null as { id: string; status: string } | null,
  };
}

function summary(overrides: Partial<SetSummary> = {}): SetSummary {
  return {
    total: 10,
    memorize: 0,
    learned: 0,
    mastered: 0,
    due: 0,
    upcomingReviews: [],
    lastPracticedAt: null,
    withExamples: 10,
    ...overrides,
  };
}

const base = {
  currentModuleByCourse: { c1: "m2" },
  gameKey: "word-fall",
  lastPlayed: undefined,
  now: NOW,
};

describe("dueWords", () => {
  test("adds reviews that fell due after the summary", () => {
    expect(
      dueWords(
        summary({
          due: 2,
          upcomingReviews: [
            new Date(NOW - 60_000).toISOString(),
            new Date(NOW + 60_000).toISOString(),
          ],
        }),
        NOW,
      ),
    ).toBe(3);
    expect(dueWords(undefined, NOW)).toBe(0);
  });
});

describe("suggestVocabularySets", () => {
  const items = [
    set("a", "m1", true),
    set("b", "m1"),
    set("c", "m2"),
    set("d", "m3"),
  ];

  test("due words come first, then the current chapter, then the next set", () => {
    const picks = suggestVocabularySets({
      ...base,
      items,
      summaries: { a: summary({ due: 4 }) },
    });
    expect(picks.map((pick) => [pick.item.id, pick.reason])).toEqual([
      ["a", "4 kata perlu diulang"],
      ["c", "Bab yang sedang kamu pelajari"],
      ["b", "Set baru"],
    ]);
  });

  test("continues the last set, then sets with words to memorise", () => {
    const picks = suggestVocabularySets({
      ...base,
      items,
      summaries: { d: summary({ memorize: 3, lastPracticedAt: "2026-11-01" }) },
      lastPlayed: {
        kind: "item",
        courseId: "c1",
        courseItemId: "b",
        at: new Date(NOW - 3 * 86_400_000).toISOString(),
      },
    });
    expect(picks.map((pick) => pick.item.id)).toEqual(["b", "d", "c"]);
    expect(picks[1]!.reason).toBe("3 kata belum hafal");
  });

  test("a set played here today drops to the end unless words are due", () => {
    const playedToday = {
      kind: "item" as const,
      courseId: "c1",
      courseItemId: "c",
      at: new Date(NOW - 3_600_000).toISOString(),
    };
    expect(
      suggestVocabularySets({
        ...base,
        items: [set("c", "m2"), set("d", "m3")],
        summaries: {},
        lastPlayed: playedToday,
      }).map((pick) => pick.item.id),
    ).toEqual(["d", "c"]);
    expect(
      suggestVocabularySets({
        ...base,
        items: [set("c", "m2"), set("d", "m3")],
        summaries: { c: summary({ due: 1 }) },
        lastPlayed: playedToday,
      })[0]!.item.id,
    ).toBe("c");
  });

  test("Susun makna skips sets without example sentences", () => {
    const picks = suggestVocabularySets({
      ...base,
      gameKey: "sentences",
      items: [set("c", "m2"), set("d", "m3")],
      summaries: { c: summary({ withExamples: 0 }) },
    });
    expect(picks.map((pick) => pick.item.id)).toEqual(["d"]);
  });

  test("with everything finished, suggests the set practised longest ago", () => {
    const picks = suggestVocabularySets({
      ...base,
      items: [set("a", "m1", true), set("b", "m1", true)],
      summaries: {
        a: summary({ lastPracticedAt: "2026-11-05T00:00:00.000Z" }),
        b: summary({ lastPracticedAt: "2026-10-01T00:00:00.000Z" }),
      },
    });
    expect(picks.map((pick) => [pick.item.id, pick.label])).toEqual([
      ["b", "Ulangi"],
      ["a", "Ulangi"],
    ]);
  });
});

describe("archived courses", () => {
  const hangeul = {
    ...set("h1", "hm1", true),
    key: "hangeul:h1",
    courseId: "hangeul",
  };

  test("never suggests an archived course's sets, even with words due", () => {
    const picks = suggestVocabularySets({
      ...base,
      items: [hangeul, set("a", "m1", true)],
      summaries: { h1: summary({ due: 8 }), a: summary() },
      archivedCourseIds: new Set(["hangeul"]),
    });
    expect(picks.map((pick) => pick.item.id)).toEqual(["a"]);
  });

  test("suggests nothing when every set is archived", () => {
    expect(
      suggestVocabularySets({
        ...base,
        items: [hangeul],
        summaries: { h1: summary({ due: 8 }) },
        archivedCourseIds: new Set(["hangeul"]),
      }),
    ).toEqual([]);
  });

  test("leaves out an archived course's quizzes but keeps class tugas", () => {
    const picks = suggestQuizzes({
      quizzes: [{ ...hangeul, isCompleted: false }],
      events: [{ id: "e1", closesAt: null, attempts: [] }],
      currentModuleByCourse: { hangeul: "hm1" },
      now: NOW,
      closesLabel: () => "",
      archivedCourseIds: new Set(["hangeul"]),
    });
    expect(picks.map((pick) => pick.item.key)).toEqual(["event:e1"]);
  });
});

describe("suggestQuizzes", () => {
  const closesLabel = () => "ditutup dalam 2 hari";
  const quiz = (
    id: string,
    moduleId: string,
    attempt?: string,
    done = false,
  ) => ({
    ...set(id, moduleId, done),
    attempt: attempt ? { id: `t-${id}`, status: attempt } : null,
  });

  test("open class tugas first, then in progress, retry, current, next", () => {
    const picks = suggestQuizzes({
      quizzes: [
        quiz("q1", "m1", "GRADED"),
        quiz("q2", "m3"),
        quiz("q3", "m2"),
        quiz("q4", "m1", "IN_PROGRESS"),
      ],
      events: [
        {
          id: "e1",
          status: "OPEN",
          closesAt: new Date(NOW + 2 * 86_400_000),
          attempts: [],
        },
        {
          id: "e2",
          status: "SCHEDULED",
          opensAt: new Date(NOW + 86_400_000),
          closesAt: null,
          attempts: [],
        },
      ],
      currentModuleByCourse: { c1: "m2" },
      now: NOW,
      closesLabel,
    });
    expect(picks.map((pick) => pick.item.key)).toEqual([
      "event:e1",
      "c1:q4",
      "c1:q1",
    ]);
    expect(picks[0]!.reason).toBe("Tugas kelas · ditutup dalam 2 hari");
  });

  test("without tugas, the current chapter's quiz comes before later ones", () => {
    const picks = suggestQuizzes({
      quizzes: [
        quiz("q2", "m3"),
        quiz("q3", "m2"),
        quiz("q5", "m1", "SUBMITTED"),
      ],
      events: [],
      currentModuleByCourse: { c1: "m2" },
      now: NOW,
      closesLabel,
    });
    expect(picks.map((pick) => pick.item.key)).toEqual(["c1:q3", "c1:q2"]);
  });
});
