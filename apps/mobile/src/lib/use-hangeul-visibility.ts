import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useSyncIndex, type LearnerIndex } from "../sync/hooks";
import type { LocalIndexRecord } from "../sync/local-data";
import {
  isHangeulHidden,
  isHangeulMastered,
  withHangeulPreference,
} from "./hangeul-visibility";
import { api } from "./trpc";

/**
 * Hangeul visibility for the active organization's index, and the
 * server-backed "Tampilkan Hangeul Mastery" switch (online only).
 */
export function useHangeulVisibility() {
  const { activeOrganizationId } = useAppTheme();
  const queryClient = useQueryClient();
  const index = useSyncIndex(activeOrganizationId);
  const mutation = api.preferences.setShowHangeulAfterMastery.useMutation();
  const mastered = isHangeulMastered(index.data);
  const hidden = isHangeulHidden(index.data);

  const setShowAfterMastery = useCallback(
    (show: boolean) => {
      // One change at a time: a rollback must not undo a later change.
      if (mutation.isPending) return;
      // Optimistic update on every cached index scope (the preference is
      // per user); the next synced index (new token) confirms it.
      const apply = (value: boolean) =>
        queryClient.setQueriesData<LocalIndexRecord<LearnerIndex> | null>(
          { queryKey: ["mobileSync", "index"] },
          (current) =>
            current
              ? {
                  ...current,
                  index: withHangeulPreference(current.index, value),
                }
              : current,
        );
      apply(show);
      mutation.mutate(
        { show },
        {
          onSuccess: () => {
            void index.refetch();
          },
          onError: () => {
            apply(!show);
            Alert.alert(
              "Pengaturan belum tersimpan",
              "Periksa koneksi internet lalu coba lagi.",
            );
          },
        },
      );
    },
    [index, mutation, queryClient],
  );

  return {
    mastered,
    hidden,
    /** Shown again after mastery. */
    showAfterMastery: mastered && !hidden,
    isSaving: mutation.isPending,
    setShowAfterMastery,
  };
}
