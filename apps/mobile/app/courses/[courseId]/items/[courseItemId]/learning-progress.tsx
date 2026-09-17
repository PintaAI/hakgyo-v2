import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import {
  CourseLearningFooter,
  type LearningRequirementAction,
} from "../../../../../src/components/learn/course-learning-footer";
import { api } from "../../../../../src/lib/trpc";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function LearningProgressSheet() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
    completionMode?: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  const completionMode =
    firstParam(params.completionMode) === "assessment"
      ? "assessment"
      : "manual";
  const item = api.learning.getCourseItem.useQuery(
    { courseItemId },
    { enabled: Boolean(courseItemId), retry: false },
  );
  const vocabularySet = item.data?.vocabularySet;
  const materialRequirementActions: LearningRequirementAction[] =
    item.data?.material?.requiredActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      onPress: () => {
        if (activity.type === "VOCABULARY_SET") {
          router.replace({
            pathname: "/vocabulary/[vocabularySetId]",
            params: {
              vocabularySetId: activity.resourceId,
              sourceCourseItemId: courseItemId,
              courseId,
            },
          });
          return;
        }
        router.replace({
          pathname: "/courses/[courseId]/items/[courseItemId]",
          params: { courseId, courseItemId: activity.courseItemId },
        });
      },
    })) ?? [];
  const vocabularyRequirementActions: LearningRequirementAction[] =
    vocabularySet
      ? [
          {
            id: vocabularySet.id,
            type: "VOCABULARY_SET",
            title: vocabularySet.title,
            onPress: () =>
              router.replace({
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
  const requirementActions = [
    ...materialRequirementActions,
    ...vocabularyRequirementActions,
  ];

  return (
    <View className="gap-4 px-5 pb-6 pt-6">
      <CourseLearningFooter
        courseId={courseId}
        courseItemId={courseItemId}
        completionMode={completionMode}
        requirementActions={requirementActions}
      />
    </View>
  );
}
