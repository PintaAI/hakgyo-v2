import { useCallback } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { api } from "./trpc";
import {
  countUnreadIndicators,
  type SidebarIndicatorKind,
} from "./sidebar-indicator-count";

export type { SidebarIndicatorKind } from "./sidebar-indicator-count";

export function useSidebarIndicators() {
  const { activeOrganizationId } = useAppTheme();
  const scope = activeOrganizationId
    ? { organizationId: activeOrganizationId }
    : undefined;
  const utils = api.useUtils();
  const dashboard = api.mobileSync.getDashboard.useQuery(scope, {
    enabled: Boolean(activeOrganizationId),
    retry: false,
  });
  const mutation = api.mobileSync.markSidebarSeen.useMutation();
  // Older persisted dashboard snapshots predate sidebarIndicators. Keep the
  // first render safe while React Query refreshes that cache entry.
  const items = dashboard.data?.sidebarIndicators?.items ?? [];

  const markSeen = useCallback(
    (keys: string[]) => {
      if (!scope || keys.length === 0) return;
      const uniqueKeys = [...new Set(keys)];
      const keySet = new Set(uniqueKeys);
      utils.mobileSync.getDashboard.setData(scope, (current) => {
        if (!current) return current;
        const nextItems = (current.sidebarIndicators?.items ?? []).map(
          (item) => (keySet.has(item.key) ? { ...item, unread: false } : item),
        );
        return {
          ...current,
          sidebarIndicators: {
            items: nextItems,
            unreadCount: nextItems.filter((item) => item.unread).length,
          },
        };
      });
      for (let offset = 0; offset < uniqueKeys.length; offset += 100) {
        mutation.mutate(
          {
            organizationId: scope.organizationId,
            keys: uniqueKeys.slice(offset, offset + 100),
          },
          {
            onError: () => {
              void utils.mobileSync.getDashboard.invalidate(scope);
            },
          },
        );
      }
    },
    [mutation, scope, utils.mobileSync.getDashboard],
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
