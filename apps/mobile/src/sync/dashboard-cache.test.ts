import { describe, expect, test } from "bun:test";

import { dashboardCacheEntries } from "./dashboard-cache";
import type { MobileDashboard } from "./types";

describe("dashboard cache entries", () => {
  test("includes every offline course-item and assessment-detail key", () => {
    const dashboard = {
      organizationId: "organization-1",
      outlines: { "course-1": { id: "course-1" } },
      itemDetails: { "item-1": { id: "item-1", type: "MATERIAL" } },
      assessmentDetails: { "item-2": { id: "assessment-1" } },
    } as unknown as MobileDashboard;

    expect(dashboardCacheEntries(dashboard)).toEqual(
      expect.arrayContaining([
        {
          procedure: "learning.getCourseOutline",
          input: { courseId: "course-1" },
          data: { id: "course-1" },
        },
        {
          procedure: "learning.getCourseItem",
          input: { courseItemId: "item-1" },
          data: { id: "item-1", type: "MATERIAL" },
        },
        {
          procedure: "assessment.getForCourseItem",
          input: { courseItemId: "item-2" },
          data: { id: "assessment-1" },
        },
      ]),
    );
  });

  test("includes resumable assessment data under the exact attempt keys", () => {
    const dashboard = {
      organizationId: "organization-1",
      outlines: {},
      itemDetails: {},
      assessmentDetails: {},
      attemptDetails: {
        "attempt-1": { id: "attempt-1", courseItemId: "item-1" },
      },
      assessmentAttemptDetails: {
        "attempt-1": { id: "assessment-1", title: "Checkpoint" },
      },
    } as unknown as MobileDashboard;

    expect(dashboardCacheEntries(dashboard)).toEqual(
      expect.arrayContaining([
        {
          procedure: "assessment.getMyAttempt",
          input: { attemptId: "attempt-1" },
          data: { id: "attempt-1", courseItemId: "item-1" },
        },
        {
          procedure: "assessment.getForCourseItem",
          input: { courseItemId: "item-1", attemptId: "attempt-1" },
          data: { id: "assessment-1", title: "Checkpoint" },
        },
      ]),
    );
  });

  test("includes learner event details under their route keys", () => {
    const dashboard = {
      organizationId: "organization-1",
      outlines: {},
      itemDetails: {},
      assessmentDetails: {},
      events: [{ id: "event-1", title: "Weekly check" }],
    } as unknown as MobileDashboard;

    expect(dashboardCacheEntries(dashboard)).toContainEqual({
      procedure: "assessmentEvent.getForLearner",
      input: { eventId: "event-1" },
      data: { id: "event-1", title: "Weekly check" },
    });
  });

  test("includes embedded vocabulary practice under its exact query key", () => {
    const dashboard = {
      organizationId: "organization-1",
      outlines: {},
      assessmentDetails: {},
      itemDetails: {
        "material-1": {
          id: "material-1",
          embeddedResources: {
            courseId: "course-1",
            sourceCourseItemId: "material-1",
            assessments: [],
            vocabularySets: [
              {
                id: "set-1",
                title: "Greetings",
                description: "Useful greetings",
                courseItemId: "vocabulary-item-1",
                entries: [
                  {
                    id: "entry-1",
                    term: "안녕하세요",
                    definition: "Hello",
                    examples: [],
                    imageAsset: { id: "image-1", fileName: "hello.png" },
                    audioAsset: { id: "audio-1", fileName: "hello.mp3" },
                  },
                ],
              },
            ],
          },
        },
      },
    } as unknown as MobileDashboard;

    expect(dashboardCacheEntries(dashboard)).toContainEqual({
      procedure: "learning.getVocabularyPractice",
      input: {
        vocabularySetId: "set-1",
        sourceCourseItemId: "material-1",
      },
      data: {
        id: "set-1",
        title: "Greetings",
        description: "Useful greetings",
        _count: { entries: 1 },
        courseItems: [{ id: "vocabulary-item-1" }],
        entries: [
          {
            id: "entry-1",
            term: "안녕하세요",
            definition: "Hello",
            examples: [],
            audioAssetId: "audio-1",
            imageAssetId: "image-1",
          },
        ],
        courseId: "course-1",
        practiceCourseItemId: "vocabulary-item-1",
      },
    });
  });

  test("includes a vocabulary item's own practice route", () => {
    const dashboard = {
      organizationId: "organization-1",
      outlines: {},
      assessmentDetails: {},
      itemDetails: {
        "vocabulary-item-1": {
          id: "vocabulary-item-1",
          embeddedResources: {
            courseId: "course-1",
            sourceCourseItemId: "vocabulary-item-1",
            assessments: [],
            vocabularySets: [],
          },
          vocabularySet: {
            id: "set-1",
            title: "Greetings",
            description: null,
            entries: [
              {
                id: "entry-1",
                term: "안녕하세요",
                definition: "Hello",
                examples: [],
                imageAsset: null,
                audioAsset: null,
              },
            ],
          },
        },
      },
    } as unknown as MobileDashboard;

    expect(dashboardCacheEntries(dashboard)).toContainEqual({
      procedure: "learning.getVocabularyPractice",
      input: {
        vocabularySetId: "set-1",
        sourceCourseItemId: "vocabulary-item-1",
      },
      data: expect.objectContaining({
        id: "set-1",
        courseId: "course-1",
        practiceCourseItemId: "vocabulary-item-1",
      }),
    });
  });
});
