import { useCallback, useRef, useState } from "react";

/**
 * Pull to refresh that only spins for the learner's own pull. Background
 * syncs (launch, resume, an update) must not drive a `RefreshControl`: iOS
 * pushes the content down for a spinner it was not pulled for, and when the
 * spinner stops while the screen is changing it can leave the content
 * stranded below the header.
 */
export function useUserRefresh(run: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const runRef = useRef(run);
  runRef.current = run;
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve()
      .then(() => runRef.current())
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, []);
  return { refreshing, onRefresh };
}
