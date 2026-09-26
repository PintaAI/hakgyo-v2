import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useSyncIndex, type LearnerIndex } from "../sync/hooks";
import type { LocalIndexRecord } from "../sync/local-data";
import { indexScope, syncQueryKeys } from "../sync/query-keys";
import { api } from "./trpc";
import {
  countUnreadIndicators,
  type SidebarIndicatorKind,
} from "./sidebar-indicator-count";

export type { SidebarIndicatorKind } from "./sidebar-indicator-count";

export type SidebarIndicatorItem =
  LearnerIndex["sidebarIndicators"]["items"][number];

export function useSidebarIndicators() {
  const { activeOrganizationId } = useAppTheme();
  const queryClient = useQueryClient();
  const index = useSyncIndex(activeOrganizationId);
  const mutation = api.mobileSyncV2.markSidebarSeen.useMutation();
  // Indicators are only computed for an organization scope.
  const items: SidebarIndicatorItem[] = activeOrganizationId
    ? (index.data?.sidebarIndicators.items ?? [])
    : [];

  const markSeen = useCallback(
    (keys: string[]) => {
      if (!activeOrganizationId || keys.length === 0) return;
      const uniqueKeys = [...new Set(keys)];
      const keySet = new Set(uniqueKeys);
      // Optimistic update on the learner index; the server's next index
      // (new token after the mutation) confirms it.
      queryClient.setQueryData<LocalIndexRecord<LearnerIndex> | null>(
        syncQueryKeys.index(indexScope(activeOrganizationId)),
        (current) => {
          if (!current) return current;
          const nextItems = (current.index.sidebarIndicators?.items ?? []).map(
            (item) =>
              keySet.has(item.key) ? { ...item, unread: false } : item,
          );
          return {
            ...current,
            index: {
              ...current.index,
              sidebarIndicators: {
                items: nextItems,
                unreadCount: nextItems.filter((item) => item.unread).length,
              },
            },
          };
        },
      );
      for (let offset = 0; offset < uniqueKeys.length; offset += 100) {
        mutation.mutate(
          {
            protocol: SYNC_PROTOCOL,
            organizationId: activeOrganizationId,
            keys: uniqueKeys.slice(offset, offset + 100),
          },
          {
            onError: () => {
              // Restore the server's view of the indicators.
              void index.refetch();
            },
          },
        );
      }
    },
    [activeOrganizationId, index, mutation, queryClient],
  );

  const indicator = useCallback(
    (kind: SidebarIndicatorKind, entityId: string) =>
      items.find((item) => item.kind === kind && item.entityId === entityId),
    [items],
  );

  const markEntitySeen = useCallback(
    (kind: SidebarIndicatorKind, entityId: string) => {
      const item = indicator(kind, entityId);
      if (item?.unread) markSeen([item.key]);
    },
    [indicator, markSeen],
  );

  const markAllSeen = useCallback(() => {
    markSeen(items.filter((item) => item.unread).map((item) => item.key));
  }, [items, markSeen]);

  return {
    indicator,
    items,
    markAllSeen,
    markEntitySeen,
    markSeen,
    unreadCount: countUnreadIndicators(items),
  };
}
