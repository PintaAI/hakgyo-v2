import type { MobileDashboard } from "./types";

export type DashboardCacheEntry = {
  procedure:
    | "learning.getCourseOutline"
    | "learning.getCourseItem"
    | "learning.getVocabularyPractice"
    | "assessment.getForCourseItem"
    | "assessment.getMyAttempt"
    | "assessmentEvent.getForLearner";
  input:
    | { courseId: string }
    | { courseItemId: string }
    | { attemptId: string }
    | { courseItemId: string; attemptId: string }
    | { eventId: string }
    | { vocabularySetId: string; sourceCourseItemId: string };
  data: unknown;
};

export function dashboardVocabularyPractice(
  dashboard: MobileDashboard,
  input: { vocabularySetId: string; sourceCourseItemId: string },
) {
  const source = dashboard.itemDetails[input.sourceCourseItemId];
  const embeddedVocabularySet = source?.embeddedResources.vocabularySets.find(
    (set) => set.id === input.vocabularySetId,
  );
  const requirement = source?.material?.requiredActivities.find(
    (activity) =>
      activity.type === "VOCABULARY_SET" &&
      activity.resourceId === input.vocabularySetId,
  );
  const requirementVocabularySet = requirement
    ? dashboard.itemDetails[requirement.courseItemId]?.vocabularySet
    : undefined;
  const vocabularySet =
    embeddedVocabularySet ??
    (source?.vocabularySet?.id === input.vocabularySetId
      ? source.vocabularySet
      : undefined) ??
    (requirementVocabularySet?.id === input.vocabularySetId
      ? requirementVocabularySet
      : undefined);
  if (!source || !vocabularySet) return undefined;
  const practiceCourseItemId =
    embeddedVocabularySet?.courseItemId ??
    requirement?.courseItemId ??
    source.id;

  return {
    id: vocabularySet.id,
    title: vocabularySet.title,
    description: vocabularySet.description,
    _count: { entries: vocabularySet.entries.length },
    courseItems: [{ id: practiceCourseItemId }],
    entries: vocabularySet.entries.map((entry) => ({
      id: entry.id,
      term: entry.term,
      definition: entry.definition,
      examples: entry.examples,
      audioAssetId: entry.audioAsset?.id ?? null,
      imageAssetId: entry.imageAsset?.id ?? null,
    })),
    courseId: source.embeddedResources.courseId,
    practiceCourseItemId,
  };
}

export function dashboardCacheEntries(
  dashboard: MobileDashboard,
): DashboardCacheEntry[] {
  const vocabularyPracticeEntries = Object.entries(
    dashboard.itemDetails,
  ).flatMap(([sourceCourseItemId, item]) => {
    const vocabularySetIds = new Set([
      ...(item.embeddedResources?.vocabularySets ?? []).map((set) => set.id),
      ...(item.vocabularySet ? [item.vocabularySet.id] : []),
      ...(item.material?.requiredActivities ?? []).flatMap((activity) =>
        activity.type === "VOCABULARY_SET" ? [activity.resourceId] : [],
      ),
    ]);
    return [...vocabularySetIds].flatMap((vocabularySetId) => {
      const data = dashboardVocabularyPractice(dashboard, {
        vocabularySetId,
        sourceCourseItemId,
      });
      return data
        ? [
            {
              procedure: "learning.getVocabularyPractice" as const,
              input: { vocabularySetId, sourceCourseItemId },
              data,
            },
          ]
        : [];
    });
  });

  return [
    ...Object.entries(dashboard.outlines).map(([courseId, data]) => ({
      procedure: "learning.getCourseOutline" as const,
      input: { courseId },
      data,
    })),
    ...Object.entries(dashboard.itemDetails).map(([courseItemId, data]) => ({
      procedure: "learning.getCourseItem" as const,
      input: { courseItemId },
      data,
    })),
    ...Object.entries(dashboard.assessmentDetails).map(
      ([courseItemId, data]) => ({
        procedure: "assessment.getForCourseItem" as const,
        input: { courseItemId },
        data,
      }),
    ),
    ...Object.entries(dashboard.attemptDetails ?? {}).map(
      ([attemptId, data]) => ({
        procedure: "assessment.getMyAttempt" as const,
        input: { attemptId },
        data,
      }),
    ),
    ...Object.entries(dashboard.assessmentAttemptDetails ?? {}).flatMap(
      ([attemptId, data]) => {
        const attempt = dashboard.attemptDetails?.[attemptId];
        return attempt
          ? [
              {
                procedure: "assessment.getForCourseItem" as const,
                input: { courseItemId: attempt.courseItemId, attemptId },
                data,
              },
            ]
          : [];
      },
    ),
    ...(dashboard.events ?? []).map((event) => ({
      procedure: "assessmentEvent.getForLearner" as const,
      input: { eventId: event.id },
      data: event,
    })),
    ...vocabularyPracticeEntries,
  ];
}
