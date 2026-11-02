import { router } from "expo-router";

import type { CourseItemDetail } from "../../sync/hooks";
import type { LearningRequirementAction } from "./course-learning-footer";

/**
 * The activities a course item requires before it counts as done (a
 * material's required vocabulary sets or tasks, a vocabulary item's set),
 * as buttons that open them. `replace` swaps out the current screen, for a
 * sheet that should not stay behind the activity.
 */
export function requirementActionsFor(
  item: CourseItemDetail | undefined,
  { courseId, courseItemId }: { courseId: string; courseItemId: string },
  mode: "push" | "replace",
): LearningRequirementAction[] {
  const go = mode === "replace" ? router.replace : router.push;
  const materialActions: LearningRequirementAction[] =
    item?.material?.requiredActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      onPress: () => {
        if (activity.type === "VOCABULARY_SET") {
          go({
            pathname: "/vocabulary/[vocabularySetId]",
            params: {
              vocabularySetId: activity.resourceId,
              sourceCourseItemId: courseItemId,
              courseId,
            },
          });
          return;
        }
        go({
          pathname: "/courses/[courseId]/items/[courseItemId]",
          params: { courseId, courseItemId: activity.courseItemId },
        });
      },
    })) ?? [];
  const vocabularySet = item?.vocabularySet;
  const vocabularyActions: LearningRequirementAction[] = vocabularySet
    ? [
        {
          id: vocabularySet.id,
          type: "VOCABULARY_SET",
          title: vocabularySet.title,
          onPress: () =>
            go({
              pathname: "/vocabulary/[vocabularySetId]",
              params: {
                vocabularySetId: vocabularySet.id,
                sourceCourseItemId: courseItemId,
                courseId,
              },
            }),
        },
      ]
    : [];
  return [...materialActions, ...vocabularyActions];
}
