import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { CourseLearningFooter } from "../../../../../src/components/learn/course-learning-footer";
import { requirementActionsFor } from "../../../../../src/components/learn/requirement-actions";
import { useCourseItem } from "../../../../../src/sync/hooks";
import { firstParam } from "../../../../../src/lib/route-params";

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
  const item = useCourseItem(courseId || undefined, courseItemId);
  // Opened over the item: an activity replaces this sheet.
  const requirementActions = requirementActionsFor(
    item.data,
    { courseId, courseItemId },
    "replace",
  );

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
