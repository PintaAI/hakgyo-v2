import { useEffect, useRef, useState } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useSyncIndex } from "../sync/hooks";
import {
  clearHangeulPlacement,
  hasPassedHangeulPlacement,
} from "./hangeul-placement";
import { api } from "./trpc";

/**
 * Sends a Hangeul test passed during onboarding once the learner is signed in,
 * which awards the Hangeul Mastery badge and hides the course. A failed send
 * (offline, maintenance) keeps the result for the next launch.
 */
export function useSubmitHangeulPlacement() {
  const { activeOrganizationId } = useAppTheme();
  const { refetch } = useSyncIndex(activeOrganizationId);
  const { mutate } = api.preferences.passHangeulPlacement.useMutation();
  // Read once: onboarding, the only place that sets it, runs signed out, so
  // it cannot change while this (signed-in) layout is mounted.
  const [passed] = useState(hasPassedHangeulPlacement);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !passed) return;
    started.current = true;
    mutate(undefined, {
      onSuccess: async () => {
        await clearHangeulPlacement();
        void refetch();
      },
    });
  }, [passed, mutate, refetch]);
}
