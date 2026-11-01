import { useEffect, useRef } from "react";

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
  const index = useSyncIndex(activeOrganizationId);
  const mutation = api.preferences.passHangeulPlacement.useMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !hasPassedHangeulPlacement()) return;
    started.current = true;
    mutation.mutate(undefined, {
      onSuccess: async () => {
        await clearHangeulPlacement();
        void index.refetch();
      },
    });
  }, [index, mutation]);
}
