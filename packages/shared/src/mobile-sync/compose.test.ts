import { describe, expect, test } from "bun:test";

import {
  composeCourseItem,
  composeCourseOutline,
  composeLearnerAssessment,
  composeVocabularyPractice,
  lessonAssetIds,
  materialRequirementsSatisfied,
  mergeLearnerState,
  nextCourseItemId,
} from "./compose";
import type { CourseBundle, LearnerState } from "./types";

function bundle(
  progressionMode: "OPEN" | "SEQUENTIAL" = "SEQUENTIAL",
): CourseBundle {
  return {
    schema: 1,
    courseId: "course-1",
    organizationId: "org-1",
    revision: "7",
    structure: {
      title: "Korean 101",
      description: null,
      thumbnailUrl: null,
      status: "PUBLISHED",
      progressionMode,
      modules: [
        {
          id: "module-1",
          title: "Module 1",
          description: null,
          position: 1,
          items: [
            {
              id: "item-material",
              type: "MATERIAL",
              position: 1,
              title: "Lesson",
              materialId: "material-1",
              vocabularySetId: null,
              assessmentId: null,
              assessmentPassingScore: null,
            },
            {
              id: "item-vocab",
              type: "VOCABULARY_SET",
              position: 2,
              title: "Words",
              materialId: null,
              vocabularySetId: "set-1",
              assessmentId: null,
              assessmentPassingScore: null,
            },
            {
              id: "item-assessment",
              type: "ASSESSMENT",
              position: 3,
              title: "Quiz",
              materialId: null,
              vocabularySetId: null,
              assessmentId: "assessment-1",
              assessmentPassingScore: 70,
            },
          ],
        },
        {
          id: "module-2",
          title: "Module 2",
          description: null,
          position: 2,
          items: [
            {
              id: "item-material-2",
              type: "MATERIAL",
              position: 1,
              title: "Lesson 2",
              materialId: "material-2",
              vocabularySetId: null,
              assessmentId: null,
              assessmentPassingScore: null,
            },
          ],
        },
      ],
    },
    content: {
      placements: {
        "item-material": {
          embedded: {
            vocabularySetIds: [{ id: "set-1", courseItemId: "item-vocab" }],
            assessmentIds: [
              { id: "assessment-1", courseItemId: "item-assessment" },
            ],
            pdfBookIds: ["book-1"],
          },
          requirements: [
            {
              id: "req-vocab",
              type: "VOCABULARY_SET",
              minimumScore: null,
              resourceId: "set-1",
              title: "Words",
              courseItemId: "item-vocab",
              passingScore: null,
            },
            {
              id: "req-assessment",
              type: "ASSESSMENT",
              minimumScore: 80,
              resourceId: "assessment-1",
              title: "Quiz",
              courseItemId: "item-assessment",
              passingScore: 70,
            },
          ],
        },
      },
      materials: {
        "material-1": {
          id: "material-1",
          title: "Lesson",
          description: null,
          content: [
            { type: "assetImage", props: { assetId: "asset-image" } },
            {
              type: "pdfPages",
              props: { bookId: "book-1", startPage: 2, endPage: 3 },
            },
          ],
          editorSchemaVersion: 1,
          requirementPolicy: "ALL",
          assetIds: ["asset-image"],
        },
        "material-2": {
          id: "material-2",
          title: "Lesson 2",
          description: null,
          content: [],
          editorSchemaVersion: 1,
          requirementPolicy: "ALL",
          assetIds: [],
        },
      },
      vocabularySets: {
        "set-1": {
          id: "set-1",
          title: "Words",
          description: "Basics",
          entries: [
            {
              id: "entry-1",
              term: "안녕",
              definition: "hello",
              examples: ["안녕하세요"],
              metadata: null,
              audioAssetId: "asset-audio",
              imageAssetId: null,
            },
          ],
        },
      },
      assessments: {
        "assessment-1": {
          id: "assessment-1",
          title: "Quiz",
          description: null,
          instructions: null,
          passingScore: 70,
          maxAttempts: 3,
          timeLimitMinutes: 10,
          shuffleQuestions: true,
          shuffleOptions: false,
          status: "PUBLISHED",
          questionCount: 1,
          questions: [
            {
              id: "question-1",
              type: "SINGLE_CHOICE",
              prompt: "Pick",
              points: 1,
              position: 1,
              options: [
                { id: "option-b", content: "B", position: 2 },
                { id: "option-a", content: "A", position: 1 },
              ],
            },
          ],
        },
      },
      pdfBooks: {
        "book-1": {
          id: "book-1",
          title: "Book",
          pageOffset: 0,
          pages: [1, 2, 3, 4].map((pageNumber) => ({
            pageNumber,
            assetId: `page-${pageNumber}`,
            width: 100,
            height: 200,
          })),
        },
      },
      assets: {
        "asset-image": {
          id: "asset-image",
          fileName: "image.png",
          contentType: "image/png",
          size: 10,
        },
        "asset-audio": {
          id: "asset-audio",
          fileName: "audio.mp3",
          contentType: "audio/mpeg",
          size: 20,
        },
      },
    },
  };
}

const emptyState: LearnerState = {
  courseIds: ["course-1"],
  contentProgress: {},
  standaloneAttempts: {},
  passEvidence: {},
  practicedVocabularySetIds: [],
  eligibleCohortsByCourse: {},
};

const passedState: LearnerState = {
  courseIds: ["course-1"],
  contentProgress: {
    "item-material": {
      status: "COMPLETED",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:10:00.000Z",
    },
    "item-vocab": {
      status: "COMPLETED",
      startedAt: "2026-01-01T00:15:00.000Z",
      completedAt: "2026-01-01T00:20:00.000Z",
    },
  },
  standaloneAttempts: {
    "item-assessment": {
      latest: {
        id: "attempt-2",
        status: "GRADED",
        attemptNumber: 2,
        score: 9,
        maxScore: 10,
        startedAt: "2026-01-02T00:00:00.000Z",
        submittedAt: null,
        gradedAt: null,
      },
      count: 2,
    },
  },
  passEvidence: {
    "assessment-1": [{ status: "GRADED", score: 9, maxScore: 10 }],
  },
  practicedVocabularySetIds: ["set-1"],
  eligibleCohortsByCourse: { "course-1": [{ id: "cohort-1", name: "A" }] },
};

describe("composeCourseOutline", () => {
  test("locks later modules until the previous ones are completed", () => {
    const outline = composeCourseOutline(bundle(), emptyState, {
      organization: { name: "Hakgyo" },
    });
    expect(outline.organization).toMatchObject({ id: "org-1", name: "Hakgyo" });
    expect(outline.canManage).toBe(false);
    expect(outline.modules.map((module) => module.access)).toEqual([
      "AVAILABLE",
      "LOCKED",
    ]);
    expect(outline.modules[0]?.items.map((item) => item.isCompleted)).toEqual([
      false,
      false,
      false,
    ]);
    expect(outline.modules[0]?.items[2]?.attempt).toBeNull();
  });

  test("unlocks the next module once every item is completed", () => {
    const outline = composeCourseOutline(bundle(), passedState);
    expect(outline.modules.map((module) => module.access)).toEqual([
      "COMPLETED",
      "AVAILABLE",
    ]);
    expect(outline.modules[0]?.isCompleted).toBe(true);
    expect(outline.modules[0]?.items[2]?.attempt).toEqual({
      id: "attempt-2",
      attemptNumber: 2,
      status: "GRADED",
      score: 9,
      maxScore: 10,
      startedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(nextCourseItemId(outline, "item-assessment")).toBe(
      "item-material-2",
    );
  });

  test("requires the passing score for assessment completion", () => {
    const outline = composeCourseOutline(bundle(), {
      ...passedState,
      passEvidence: {
        "assessment-1": [{ status: "GRADED", score: 5, maxScore: 10 }],
      },
    });
    expect(outline.modules[0]?.items[2]?.isCompleted).toBe(false);
    expect(outline.modules[1]?.access).toBe("LOCKED");
  });

  test("never locks modules of an open course", () => {
    const outline = composeCourseOutline(bundle("OPEN"), emptyState);
    expect(outline.modules.map((module) => module.access)).toEqual([
      "AVAILABLE",
      "AVAILABLE",
    ]);
    expect(nextCourseItemId(outline, "item-assessment")).toBe(
      "item-material-2",
    );
  });
});

describe("composeCourseItem", () => {
  test("lists unmet required activities and embedded resources", () => {
    const item = composeCourseItem(bundle(), emptyState, "item-material");
    expect(item).not.toBeNull();
    expect(item?.module).toEqual({ courseId: "course-1" });
    expect(item?.material?.requiredActivities).toEqual([
      {
        id: "req-vocab",
        type: "VOCABULARY_SET",
        resourceId: "set-1",
        courseItemId: "item-vocab",
        title: "Words",
      },
      {
        id: "req-assessment",
        type: "ASSESSMENT",
        resourceId: "assessment-1",
        courseItemId: "item-assessment",
        title: "Quiz",
      },
    ]);
    expect(item?.material?.assets).toEqual([
      {
        asset: {
          id: "asset-image",
          fileName: "image.png",
          contentType: "image/png",
          size: 10,
        },
      },
    ]);
    expect(item?.progress).toEqual([]);
    expect(item?.embeddedResources.sourceCourseItemId).toBe("item-material");
    expect(item?.embeddedResources.vocabularySets).toEqual([
      {
        id: "set-1",
        title: "Words",
        description: "Basics",
        courseItemId: "item-vocab",
        entries: [
          {
            id: "entry-1",
            term: "안녕",
            definition: "hello",
            examples: ["안녕하세요"],
            audioAsset: { id: "asset-audio", fileName: "audio.mp3" },
            imageAsset: null,
          },
        ],
      },
    ]);
    expect(item?.embeddedResources.assessments).toEqual([
      {
        id: "assessment-1",
        title: "Quiz",
        description: null,
        questionCount: 1,
        courseItemId: "item-assessment",
      },
    ]);
  });

  test("only keeps the PDF pages the material references", () => {
    const item = composeCourseItem(bundle(), emptyState, "item-material");
    expect(item?.embeddedResources.pdfBooks).toEqual([
      {
        id: "book-1",
        title: "Book",
        pageOffset: 0,
        pages: [
          { pageNumber: 2, assetId: "page-2", width: 100, height: 200 },
          { pageNumber: 3, assetId: "page-3", width: 100, height: 200 },
        ],
      },
    ]);
  });

  test("drops satisfied requirements and reports progress", () => {
    const item = composeCourseItem(bundle(), passedState, "item-material");
    expect(item?.material?.requiredActivities).toEqual([]);
    expect(item?.progress).toEqual([
      {
        status: "COMPLETED",
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: new Date("2026-01-01T00:10:00.000Z"),
      },
    ]);
  });

  test("counts requirement evidence (event attempts) separately from pass evidence", () => {
    const state: LearnerState = {
      ...passedState,
      passEvidence: {},
      requirementEvidence: {
        "assessment-1": [{ status: "GRADED", score: 8, maxScore: 10 }],
      },
    };
    const item = composeCourseItem(bundle(), state, "item-material");
    expect(item?.material?.requiredActivities).toEqual([]);
    // Module completion still only counts standalone pass evidence.
    const outline = composeCourseOutline(bundle(), state);
    expect(outline.modules[0]?.items[2]?.isCompleted).toBe(false);
    // An explicit, empty requirement evidence does not fall back.
    const missing = composeCourseItem(
      bundle(),
      { ...passedState, requirementEvidence: {} },
      "item-material",
    );
    expect(
      missing?.material?.requiredActivities.map((activity) => activity.id),
    ).toEqual(["req-assessment"]);
  });

  test("applies the material requirement policy", () => {
    const anyPolicy = bundle();
    anyPolicy.content.materials["material-1"]!.requirementPolicy = "ANY";
    const state: LearnerState = {
      ...emptyState,
      practicedVocabularySetIds: ["set-1"],
    };
    expect(
      materialRequirementsSatisfied(bundle(), state, "item-material"),
    ).toBe(false);
    expect(
      materialRequirementsSatisfied(anyPolicy, state, "item-material"),
    ).toBe(true);
  });

  test("keeps an assessment requirement whose minimum score is not reached", () => {
    const item = composeCourseItem(
      bundle(),
      {
        ...passedState,
        passEvidence: {
          "assessment-1": [{ status: "GRADED", score: 7.5, maxScore: 10 }],
        },
      },
      "item-material",
    );
    expect(
      item?.material?.requiredActivities.map((activity) => activity.id),
    ).toEqual(["req-assessment"]);
  });

  test("shapes vocabulary and assessment items", () => {
    const vocabulary = composeCourseItem(bundle(), emptyState, "item-vocab");
    expect(vocabulary?.vocabularySet?.entries[0]).toMatchObject({
      id: "entry-1",
      metadata: null,
      audioAsset: { id: "asset-audio", contentType: "audio/mpeg", size: 20 },
      imageAsset: null,
    });
    expect(vocabulary?.material).toBeNull();
    const assessment = composeCourseItem(
      bundle(),
      emptyState,
      "item-assessment",
    );
    expect(assessment?.assessment).toEqual({
      id: "assessment-1",
      title: "Quiz",
      description: null,
      status: "PUBLISHED",
      _count: { questions: 1 },
    });
    expect(composeCourseItem(bundle(), emptyState, "missing")).toBeNull();
  });
});

describe("composeLearnerAssessment", () => {
  test("never exposes correct answers or explanations", () => {
    const assessment = composeLearnerAssessment(
      bundle(),
      passedState,
      "item-assessment",
    );
    expect(assessment).toMatchObject({
      id: "assessment-1",
      context: {
        label: "Asesmen bab",
        courseTitle: "Korean 101",
        moduleTitle: "Module 1",
      },
      answersRevealed: false,
      event: null,
      attemptDeadline: null,
      standaloneAttemptCount: 2,
      eligibleCohorts: [{ id: "cohort-1", name: "A" }],
    });
    expect(assessment?.latestStandaloneAttempt?.id).toBe("attempt-2");
    expect(assessment?.questions).toEqual([
      {
        id: "question-1",
        type: "SINGLE_CHOICE",
        prompt: "Pick",
        explanation: null,
        points: 1,
        position: 1,
        options: [
          { id: "option-a", content: "A", position: 1 },
          { id: "option-b", content: "B", position: 2 },
        ],
      },
    ]);
    expect(JSON.stringify(assessment)).not.toContain("isCorrect");
    expect(assessment).not.toHaveProperty("questionCount");
  });

  test("omits unpublished assessments and non-assessment items", () => {
    const draft = bundle();
    draft.content.assessments["assessment-1"]!.status = "DRAFT";
    expect(
      composeLearnerAssessment(draft, emptyState, "item-assessment"),
    ).toBeNull();
    expect(
      composeLearnerAssessment(bundle(), emptyState, "item-material"),
    ).toBeNull();
  });
});

describe("composeVocabularyPractice", () => {
  test("resolves an embedded set through the source item", () => {
    const practice = composeVocabularyPractice(
      bundle(),
      emptyState,
      "set-1",
      "item-material",
    );
    expect(practice).toEqual({
      id: "set-1",
      title: "Words",
      description: "Basics",
      courseItems: [{ id: "item-vocab" }],
      entries: [
        {
          id: "entry-1",
          term: "안녕",
          definition: "hello",
          examples: ["안녕하세요"],
          audioAssetId: "asset-audio",
          imageAssetId: null,
        },
      ],
      _count: { entries: 1 },
      courseId: "course-1",
      practiceCourseItemId: "item-vocab",
    });
  });

  test("resolves the set from its own item and rejects unlinked sets", () => {
    expect(
      composeVocabularyPractice(bundle(), emptyState, "set-1", "item-vocab")
        ?.practiceCourseItemId,
    ).toBe("item-vocab");
    expect(
      composeVocabularyPractice(
        bundle(),
        emptyState,
        "set-1",
        "item-material-2",
      ),
    ).toBeNull();
  });
});

describe("lessonAssetIds", () => {
  test("collects material, referenced pdf page and vocabulary media ids", () => {
    expect(lessonAssetIds(bundle(), "item-material").sort()).toEqual([
      "asset-audio",
      "asset-image",
      "page-2",
      "page-3",
    ]);
    expect(lessonAssetIds(bundle(), "item-vocab")).toEqual(["asset-audio"]);
  });
});

describe("mergeLearnerState", () => {
  test("replaces the state of patched courses and keeps the others", () => {
    const current: LearnerState = {
      courseIds: ["course-1", "course-2"],
      contentProgress: {
        "item-material": {
          status: "COMPLETED",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        },
        "other-item": {
          status: "COMPLETED",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        },
      },
      standaloneAttempts: {},
      passEvidence: {
        "assessment-1": [{ status: "GRADED", score: 1, maxScore: 1 }],
      },
      practicedVocabularySetIds: ["set-1", "other-set"],
      eligibleCohortsByCourse: { "course-2": [{ id: "c", name: "C" }] },
    };
    const merged = mergeLearnerState(
      current,
      {
        courseIds: ["course-1"],
        contentProgress: {},
        standaloneAttempts: {},
        passEvidence: {},
        practicedVocabularySetIds: [],
        eligibleCohortsByCourse: { "course-1": [] },
      },
      { "course-1": bundle() },
    );
    expect(merged.contentProgress).toEqual({
      "other-item": {
        status: "COMPLETED",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
      },
    });
    expect(merged.passEvidence).toEqual({});
    expect(merged.practicedVocabularySetIds).toEqual(["other-set"]);
    expect(merged.eligibleCohortsByCourse).toEqual({
      "course-2": [{ id: "c", name: "C" }],
      "course-1": [],
    });
    expect(merged.courseIds).toEqual(["course-1", "course-2"]);
  });
});
