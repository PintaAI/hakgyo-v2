import { describe, expect, test } from "bun:test";

import {
  computeCourseReadiness,
  findBrokenVisibleItems,
  joinTitles,
  summarizeAssessmentReadiness,
  type ReadinessItem,
  type ReadinessMaterial,
  type ReadinessSnapshot,
} from "./readiness";

const paragraph = (text: string) => [
  { type: "paragraph", content: [{ type: "text", text, styles: {} }] },
];

const completeQuestion = {
  type: "SINGLE_CHOICE" as const,
  prompt: paragraph("Q"),
  options: [
    { content: paragraph("A"), isCorrect: true },
    { content: paragraph("B"), isCorrect: false },
  ],
};

function item(
  id: string,
  patch: Partial<ReadinessItem> & Pick<ReadinessItem, "type">,
): ReadinessItem {
  return {
    id,
    moduleId: "module-1",
    position: 0,
    isPublished: true,
    materialId: null,
    assessmentId: null,
    vocabularySetId: null,
    ...patch,
  };
}

function material(
  id: string,
  patch: Partial<Omit<ReadinessMaterial, "id">> = {},
): ReadinessMaterial {
  return {
    id,
    title: `Materi ${id}`,
    requirements: [],
    embeds: { assessmentIds: [], vocabularySetIds: [] },
    ...patch,
  };
}

function snapshot(
  patch: Partial<ReadinessSnapshot> & Pick<ReadinessSnapshot, "items">,
): ReadinessSnapshot {
  return {
    organizationSlug: "org",
    courseId: "course",
    courseStatus: "PUBLISHED",
    modules: [
      { id: "module-1", title: "Bab 1", position: 0 },
      { id: "module-2", title: "Bab 2", position: 1 },
    ],
    materials: new Map(),
    assessments: new Map([
      [
        "quiz",
        summarizeAssessmentReadiness({ id: "quiz", title: "Kuis" }, [
          completeQuestion,
        ]),
      ],
      [
        "empty",
        summarizeAssessmentReadiness({ id: "empty", title: "Kosong" }, []),
      ],
      [
        "broken",
        summarizeAssessmentReadiness({ id: "broken", title: "Rusak" }, [
          {
            ...completeQuestion,
            options: completeQuestion.options.slice(0, 1),
          },
        ]),
      ],
    ]),
    vocabularySets: new Map([["set", { id: "set", title: "Kosakata 1" }]]),
    ...patch,
  };
}

function byId(readiness: ReturnType<typeof computeCourseReadiness>) {
  return new Map(readiness.items.map((entry) => [entry.courseItemId, entry]));
}

describe("computeCourseReadiness", () => {
  test("assessment items need questions that pass validation", () => {
    const result = byId(
      computeCourseReadiness(
        snapshot({
          items: [
            item("ok", { type: "ASSESSMENT", assessmentId: "quiz" }),
            item("empty", {
              type: "ASSESSMENT",
              assessmentId: "empty",
              position: 1,
            }),
            item("broken", {
              type: "ASSESSMENT",
              assessmentId: "broken",
              position: 2,
              isPublished: false,
            }),
          ],
        }),
      ),
    );
    expect(result.get("ok")).toMatchObject({ ready: true, state: "LIVE" });
    expect(result.get("empty")).toMatchObject({
      ready: false,
      state: "NOT_READY",
      reasons: [
        {
          code: "ASSESSMENT_NO_QUESTIONS",
          fixHref:
            "/workspace/org/courses/course/kurikulum/module-1/assessments/empty",
        },
      ],
    });
    expect(result.get("broken")?.reasons[0]?.code).toBe(
      "ASSESSMENT_INCOMPLETE",
    );
    expect(result.get("broken")?.reasons[0]?.message).toContain(
      "Soal 1 harus memiliki setidaknya dua opsi",
    );
  });

  test("vocabulary items are always ready and reflect visibility states", () => {
    const items = [
      item("shown", { type: "VOCABULARY_SET", vocabularySetId: "set" }),
      item("hidden", {
        type: "VOCABULARY_SET",
        vocabularySetId: "set",
        position: 1,
        isPublished: false,
      }),
    ];
    const published = byId(computeCourseReadiness(snapshot({ items })));
    expect(published.get("shown")?.state).toBe("LIVE");
    expect(published.get("hidden")?.state).toBe("HIDDEN");
    const draft = byId(
      computeCourseReadiness(snapshot({ items, courseStatus: "DRAFT" })),
    );
    expect(draft.get("shown")?.state).toBe("HIDDEN_COURSE_UNPUBLISHED");
    expect(draft.get("hidden")?.state).toBe("HIDDEN");
  });

  test("material dependencies must be visible items in the same module", () => {
    const readiness = computeCourseReadiness(
      snapshot({
        items: [
          item("lesson", { type: "MATERIAL", materialId: "m1" }),
          item("set-hidden", {
            type: "VOCABULARY_SET",
            vocabularySetId: "set",
            position: 1,
            isPublished: false,
          }),
          // Same assessment placed visibly, but in another module.
          item("quiz-elsewhere", {
            type: "ASSESSMENT",
            assessmentId: "quiz",
            moduleId: "module-2",
          }),
        ],
        materials: new Map([
          [
            "m1",
            material("m1", {
              requirements: [
                {
                  type: "VOCABULARY_SET",
                  assessmentId: null,
                  vocabularySetId: "set",
                },
              ],
              embeds: { assessmentIds: ["quiz"], vocabularySetIds: [] },
            }),
          ],
        ]),
      }),
    );
    const result = byId(readiness);
    expect(result.get("lesson")).toMatchObject({
      ready: false,
      state: "NOT_READY",
    });
    expect(result.get("lesson")?.reasons).toEqual([
      expect.objectContaining({
        code: "REQUIREMENT_HIDDEN",
        resourceType: "VOCABULARY_SET",
        resourceId: "set",
        blockingCourseItemIds: ["set-hidden"],
      }),
      expect.objectContaining({
        code: "EMBED_NOT_IN_MODULE",
        resourceType: "ASSESSMENT",
        resourceId: "quiz",
      }),
    ]);
    expect(result.get("lesson")?.reasons[1]?.message).toContain(
      'module "Bab 1"',
    );
    expect(result.get("set-hidden")?.dependents).toEqual(["lesson"]);
    expect(result.get("quiz-elsewhere")?.dependents).toEqual([]);
    expect(readiness.summary).toEqual({ live: 1, hidden: 1, notReady: 1 });
  });

  test("an embedded or required assessment must itself be ready", () => {
    const result = byId(
      computeCourseReadiness(
        snapshot({
          items: [
            item("lesson", { type: "MATERIAL", materialId: "m1" }),
            item("empty-quiz", {
              type: "ASSESSMENT",
              assessmentId: "empty",
              position: 1,
            }),
          ],
          materials: new Map([
            [
              "m1",
              material("m1", {
                requirements: [
                  {
                    type: "ASSESSMENT",
                    assessmentId: "empty",
                    vocabularySetId: null,
                  },
                ],
                embeds: { assessmentIds: ["empty"], vocabularySetIds: [] },
              }),
            ],
          ]),
        }),
      ),
    );
    expect(result.get("lesson")?.reasons.map((reason) => reason.code)).toEqual([
      "REQUIREMENT_NOT_READY",
      "EMBED_NOT_READY",
    ]);
    expect(result.get("empty-quiz")?.dependents).toEqual(["lesson"]);
  });

  test("a visible duplicate placement satisfies the dependency", () => {
    const result = byId(
      computeCourseReadiness(
        snapshot({
          items: [
            item("lesson", { type: "MATERIAL", materialId: "m1" }),
            item("set-a", {
              type: "VOCABULARY_SET",
              vocabularySetId: "set",
              position: 1,
              isPublished: false,
            }),
            item("set-b", {
              type: "VOCABULARY_SET",
              vocabularySetId: "set",
              position: 2,
            }),
          ],
          materials: new Map([
            [
              "m1",
              material("m1", {
                embeds: { assessmentIds: [], vocabularySetIds: ["set"] },
              }),
            ],
          ]),
        }),
      ),
    );
    expect(result.get("lesson")?.ready).toBe(true);
    expect(result.get("set-a")?.dependents).toEqual(["lesson"]);
    expect(result.get("set-b")?.dependents).toEqual(["lesson"]);
  });

  test("orders items by module and position", () => {
    const readiness = computeCourseReadiness(
      snapshot({
        items: [
          item("b", {
            type: "VOCABULARY_SET",
            vocabularySetId: "set",
            moduleId: "module-2",
          }),
          item("a2", {
            type: "VOCABULARY_SET",
            vocabularySetId: "set",
            position: 2,
          }),
          item("a1", {
            type: "VOCABULARY_SET",
            vocabularySetId: "set",
            position: 1,
          }),
        ],
      }),
    );
    expect(readiness.items.map((entry) => entry.courseItemId)).toEqual([
      "a1",
      "a2",
      "b",
    ]);
  });
});

describe("findBrokenVisibleItems", () => {
  const base = snapshot({
    items: [
      item("lesson", { type: "MATERIAL", materialId: "m1" }),
      item("set", {
        type: "VOCABULARY_SET",
        vocabularySetId: "set",
        position: 1,
      }),
      item("legacy", {
        type: "ASSESSMENT",
        assessmentId: "empty",
        position: 2,
      }),
    ],
    materials: new Map([
      [
        "m1",
        material("m1", {
          embeds: { assessmentIds: [], vocabularySetIds: ["set"] },
        }),
      ],
    ]),
  });

  test("reports visible lessons that a change breaks", () => {
    const hidden = {
      ...base,
      items: base.items.map((entry) =>
        entry.id === "set" ? { ...entry, isPublished: false } : entry,
      ),
    };
    const broken = findBrokenVisibleItems(
      computeCourseReadiness(base),
      computeCourseReadiness(hidden),
    );
    expect(broken.map((entry) => entry.courseItemId)).toEqual(["lesson"]);
  });

  test("ignores items that were already not ready and hidden lessons", () => {
    const hiddenLesson = {
      ...base,
      items: base.items.map((entry) =>
        entry.id === "lesson" ? { ...entry, isPublished: false } : entry,
      ),
    };
    const withoutSet = {
      ...hiddenLesson,
      items: hiddenLesson.items.filter((entry) => entry.id !== "set"),
    };
    expect(
      findBrokenVisibleItems(
        computeCourseReadiness(hiddenLesson),
        computeCourseReadiness(withoutSet),
      ),
    ).toEqual([]);
  });
});

describe("joinTitles", () => {
  test("joins unique titles in Indonesian", () => {
    expect(joinTitles([])).toBe("");
    expect(joinTitles(['"A"'])).toBe('"A"');
    expect(joinTitles(['"A"', '"B"', '"A"', '"C"'])).toBe('"A", "B" dan "C"');
  });
});
