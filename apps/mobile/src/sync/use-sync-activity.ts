import { useEffect, useMemo, useState } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useMobileSync } from "../providers/MobileSyncProvider";
import { selectSyncActivity, type SyncActivity } from "./activity";
import { useSyncActivityPreview } from "./activity-preview";
import { useSyncIndex } from "./hooks";

/** Course titles of the active organization's learner index, by id. */
export function useIndexedCourseTitles() {
  return useIndexedCourses().courseTitles;
}

function useIndexedCourses() {
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const hasIndex = Boolean(index.data);
  const courseTitles = useMemo(
    () =>
      Object.fromEntries(
        (index.data?.courses ?? []).map((course) => [course.id, course.title]),
      ),
    [index.data],
  );
  return { hasIndex, courseTitles };
}

/** What sync is doing right now that the learner should know about. */
export function useSyncActivity(): SyncActivity | null {
  const {
    bundles,
    lastBundleBatch,
    outboxWaiting,
    pendingCount,
    refreshPhase,
  } = useMobileSync();
  const { hasIndex, courseTitles } = useIndexedCourses();
  const [now, setNow] = useState(Date.now);
  const activity = selectSyncActivity({
    bundles,
    lastBundleBatch,
    outboxWaiting,
    pendingCount,
    refreshPhase,
    hasIndex,
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

  const preview = useSyncActivityPreview();
  return __DEV__ && preview ? preview : activity;
}
