import { useEffect, useMemo, useState } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useMobileSync } from "../providers/MobileSyncProvider";
import { selectSyncActivity, type SyncActivity } from "./activity";
import { useSyncIndex } from "./hooks";

/** Course titles of the active organization's learner index, by id. */
export function useIndexedCourseTitles() {
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  return useMemo(
    () =>
      Object.fromEntries(
        (index.data?.courses ?? []).map((course) => [course.id, course.title]),
      ),
    [index.data],
  );
}

/** What sync is doing right now that the learner should know about. */
export function useSyncActivity(): SyncActivity | null {
  const { bundles, lastBundleBatch, outboxWaiting, pendingCount } =
    useMobileSync();
  const courseTitles = useIndexedCourseTitles();
  const [now, setNow] = useState(Date.now);
  const activity = selectSyncActivity({
    bundles,
    lastBundleBatch,
    outboxWaiting,
    pendingCount,
    courseTitles,
    now,
  });

  // A new batch arrives with a fresh clock; a summary hides once it expires.
  useEffect(() => setNow(Date.now()), [lastBundleBatch]);
  const expiresAt = activity?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  return activity;
}
