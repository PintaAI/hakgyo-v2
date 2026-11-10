import { useLocalSearchParams } from "expo-router";

import {
  AttemptResultSheet,
  questionParam,
} from "../../../src/components/attempt-result-sheet";
import { firstParam } from "../../../src/lib/route-params";

/** A latihan or tryout's finished attempt in full, over the event screen. */
export default function EventAttemptResultSheet() {
  const params = useLocalSearchParams<{
    attemptId: string | string[];
    /** Absent for an event that runs a library assessment. */
    courseItemId?: string | string[];
    question?: string | string[];
  }>();
  const attemptId = firstParam(params.attemptId);
  if (!attemptId) return null;
  return (
    <AttemptResultSheet
      attemptId={attemptId}
      courseItemId={firstParam(params.courseItemId) || null}
      initialQuestion={questionParam(firstParam(params.question))}
    />
  );
}
