import { useRef } from "react";

import { api } from "./trpc";

export type VocabularyAttemptEvidence =
  "RECOGNITION" | "RECALL" | "APPLICATION";
export type VocabularyAttemptResult = "CORRECT" | "INCORRECT" | "REVEALED";

export type VocabularyAttempt = {
  entryId: string;
  evidence: VocabularyAttemptEvidence;
  result: VocabularyAttemptResult;
};

export type VocabularyAttemptDelivery = {
  attemptId: string;
  sessionId: string;
};

function createSessionId(gameKey: string) {
  return `${gameKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function useVocabularyProgressReporter({
  gameKey,
  sourceCourseItemId,
  vocabularySetId,
}: {
  gameKey: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
}) {
  const sessionId = useRef(createSessionId(gameKey));
  const attemptNumber = useRef(0);
  const mutation = api.learning.recordVocabularyAttempts.useMutation({
    retry: 3,
  });
  const utils = api.useUtils();

  async function report(
    attempt: VocabularyAttempt,
    delivery?: VocabularyAttemptDelivery,
  ) {
    if (!delivery) attemptNumber.current += 1;
    const reportSessionId = delivery?.sessionId ?? sessionId.current;
    const result = await mutation.mutateAsync({
      gameKey,
      sessionId: reportSessionId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      attempts: [
        {
          attemptId:
            delivery?.attemptId ??
            `${reportSessionId}:${attempt.entryId}:${attemptNumber.current}`,
          sourceCourseItemId,
          vocabularySetId,
          ...attempt,
        },
      ],
    });
    void Promise.allSettled([
      utils.learning.getVocabularyProgress.invalidate({
        sourceCourseItemId,
        vocabularySetId,
      }),
      utils.learning.getCourseItem.invalidate({
        courseItemId: sourceCourseItemId,
      }),
      utils.learning.getCourseOutline.invalidate(),
      utils.learning.listMyCourses.invalidate(),
      utils.gamification.invalidate(),
      utils.practice.invalidate(),
    ]);
    return result;
  }

  function startSession() {
    const nextSessionId = createSessionId(gameKey);
    sessionId.current = nextSessionId;
    attemptNumber.current = 0;
    mutation.reset();
    return nextSessionId;
  }

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    report,
    reset: mutation.reset,
    startSession,
  };
}
