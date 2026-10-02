"use client";

import { useCallback } from "react";

import { api } from "~/trpc/react";
import { applyVocabularyReward, localDateKey } from "./gamification";
import { deviceTimeZone } from "./practice";

export type VocabularyAttempt = {
  entryId: string;
  vocabularySetId: string;
  sourceCourseItemId: string;
  evidence?: "RECOGNITION" | "RECALL" | "APPLICATION";
  result: "CORRECT" | "INCORRECT" | "REVEALED";
};

/**
 * Records vocabulary attempts for one practice session. A correct answer moves
 * the cached streak and XP straight away; `finish` replaces that estimate with
 * the server's numbers.
 */
export function useVocabularyAttempts({
  gameKey,
  sessionId,
}: {
  gameKey: string;
  sessionId: string;
}) {
  const utils = api.useUtils();
  const record = api.learning.recordVocabularyAttempts.useMutation();
  const { mutateAsync } = record;

  const report = useCallback(
    async (attempt: VocabularyAttempt, index: number) => {
      const timeZone = deviceTimeZone();
      const { evidence = "RECALL", result, ...scope } = attempt;
      await mutateAsync({
        sessionId,
        gameKey,
        timeZone,
        attempts: [
          {
            attemptId: `${sessionId}:${index}:${scope.entryId}${result === "REVEALED" ? ":revealed" : ""}`,
            evidence,
            result,
            ...scope,
          },
        ],
      });
      if (result === "CORRECT") {
        utils.gamification.getMySummary.setData(undefined, (current) =>
          current
            ? applyVocabularyReward(current, localDateKey(new Date(), timeZone))
            : current,
        );
      }
    },
    [gameKey, mutateAsync, sessionId, utils],
  );

  const finish = useCallback(
    () => utils.gamification.getMySummary.invalidate(),
    [utils],
  );

  return { report, finish, isPending: record.isPending };
}
