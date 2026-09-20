import { useCallback, useMemo, useRef, useState } from "react";
import type { RouterOutputs } from "@hakgyo/api";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useMobileSyncActions } from "../providers/MobileSyncProvider";

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

type VocabularySyncResult =
  RouterOutputs["learning"]["recordVocabularyAttempts"] | undefined;

function createSessionId(gameKey: string) {
  return `${gameKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function useVocabularyProgressReporter({
  gameKey,
  reactive = true,
  sourceCourseItemId,
  vocabularySetId,
}: {
  gameKey: string;
  reactive?: boolean;
  sourceCourseItemId: string;
  vocabularySetId: string;
}) {
  const sessionId = useRef(createSessionId(gameKey));
  const attemptNumber = useRef(0);
  const completedSessionId = useRef("");
  const activeFinish = useRef<{
    sessionId: string;
    promise: Promise<VocabularySyncResult>;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { activeOrganizationId } = useAppTheme();
  const { finishVocabularySession, recordVocabularyAttempt } =
    useMobileSyncActions();

  const report = useCallback(
    async (
      attempt: VocabularyAttempt,
      delivery?: VocabularyAttemptDelivery,
    ) => {
      if (!delivery) attemptNumber.current += 1;
      const reportSessionId = delivery?.sessionId ?? sessionId.current;
      if (reactive) {
        setIsPending(true);
        setError(null);
      }
      try {
        await recordVocabularyAttempt({
          gameKey,
          sessionId: reportSessionId,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          attempt: {
            attemptId:
              delivery?.attemptId ??
              `${reportSessionId}:${attempt.entryId}:${attemptNumber.current}`,
            sourceCourseItemId,
            vocabularySetId,
            ...attempt,
          },
        });
      } catch (cause) {
        const nextError =
          cause instanceof Error ? cause : new Error("Could not save locally");
        if (reactive) setError(nextError);
        throw nextError;
      } finally {
        if (reactive) setIsPending(false);
      }
    },
    [
      gameKey,
      reactive,
      recordVocabularyAttempt,
      sourceCourseItemId,
      vocabularySetId,
    ],
  );

  const startSession = useCallback(() => {
    const nextSessionId = createSessionId(gameKey);
    sessionId.current = nextSessionId;
    attemptNumber.current = 0;
    if (reactive) setError(null);
    return nextSessionId;
  }, [gameKey, reactive]);

  const finishSession = useCallback((): Promise<VocabularySyncResult> => {
    const currentSessionId = sessionId.current;
    if (completedSessionId.current === currentSessionId)
      return Promise.resolve(undefined);
    if (activeFinish.current?.sessionId === currentSessionId)
      return activeFinish.current.promise;

    const promise = finishVocabularySession(activeOrganizationId ?? undefined)
      .then((sync) => {
        if (sync.state !== "synced") return undefined;
        const result = sync.result.results.find(
          (item) => item.id === `vocabulary:${currentSessionId}`,
        )?.vocabulary;
        if (
          sync.result.acknowledgedOperationIds.includes(
            `vocabulary:${currentSessionId}`,
          )
        )
          completedSessionId.current = currentSessionId;
        return result;
      })
      .finally(() => {
        if (activeFinish.current?.sessionId === currentSessionId)
          activeFinish.current = null;
      });
    activeFinish.current = { sessionId: currentSessionId, promise };
    return promise;
  }, [activeOrganizationId, finishVocabularySession]);

  const reset = useCallback(() => {
    if (reactive) setError(null);
  }, [reactive]);

  return useMemo(
    () => ({
      error,
      isPending,
      report,
      reset,
      finishSession,
      startSession,
    }),
    [error, finishSession, isPending, report, reset, startSession],
  );
}
