import { useLocalSearchParams } from "expo-router";

import { AssessmentAttemptScreen } from "../../../../../../src/components/assessment-attempt-screen";
import { firstParam } from "../../../../../../src/lib/route-params";

export default function CourseItemAttemptScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
    attemptId: string | string[];
  }>();
  return (
    <AssessmentAttemptScreen
      courseId={firstParam(params.courseId)}
      courseItemId={firstParam(params.courseItemId)}
      attemptId={firstParam(params.attemptId)}
    />
  );
}
