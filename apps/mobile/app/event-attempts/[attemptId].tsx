import { useLocalSearchParams } from "expo-router";

import { AssessmentAttemptScreen } from "../../src/components/assessment-attempt-screen";
import { firstParam } from "../../src/lib/route-params";

/**
 * An attempt of an assessment event that runs an assessment from the
 * organization's library, which has no course item.
 */
export default function EventAttemptScreen() {
  const params = useLocalSearchParams<{
    attemptId: string | string[];
    eventId: string | string[];
    courseId: string | string[];
  }>();
  return (
    <AssessmentAttemptScreen
      courseId={firstParam(params.courseId)}
      courseItemId={null}
      attemptId={firstParam(params.attemptId)}
      eventId={firstParam(params.eventId) || undefined}
    />
  );
}
