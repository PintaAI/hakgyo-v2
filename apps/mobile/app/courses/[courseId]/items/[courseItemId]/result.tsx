import { useLocalSearchParams } from "expo-router";

import {
  AttemptResultSheet,
  questionParam,
} from "../../../../../src/components/attempt-result-sheet";
import { firstParam } from "../../../../../src/lib/route-params";

/** A course tugas's finished attempt in full, over the tugas screen. */
export default function CourseAttemptResultSheet() {
  const params = useLocalSearchParams<{
    courseItemId: string | string[];
    attemptId: string | string[];
    question?: string | string[];
  }>();
  const courseItemId = firstParam(params.courseItemId);
  const attemptId = firstParam(params.attemptId);
  if (!attemptId || !courseItemId) return null;
  return (
    <AttemptResultSheet
      attemptId={attemptId}
      courseItemId={courseItemId}
      initialQuestion={questionParam(firstParam(params.question))}
    />
  );
}
