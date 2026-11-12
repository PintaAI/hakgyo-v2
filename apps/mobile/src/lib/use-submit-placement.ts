import { useEffect, useRef, useState } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useSyncIndex } from "../sync/hooks";
import {
  clearPendingPlacementStage,
  getPendingPlacementStage,
} from "./placement-result";
import { api } from "./trpc";

/**
 * Sends the onboarding placement result once the learner is signed in: its
 * XP, and from stage 2 the Hangeul Mastery badge, which hides the course. A
 * failed send (offline, maintenance) keeps the result for the next launch.
 */
export function useSubmitPlacement() {
  const { activeOrganizationId } = useAppTheme();
  const { refetch } = useSyncIndex(activeOrganizationId);
  const { mutate } = api.preferences.passHangeulPlacement.useMutation();
  // Read once: onboarding, the only place that sets it, runs signed out, so
  // it cannot change while this (signed-in) layout is mounted.
  const [stage] = useState(getPendingPlacementStage);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || stage === 0) return;
    started.current = true;
    mutate(
      { stage },
      {
        onSuccess: async () => {
          await clearPendingPlacementStage();
          void refetch();
        },
      },
    );
  }, [stage, mutate, refetch]);
}
