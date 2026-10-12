/**
 * Calls `listener` when the tab is hidden or the page is closed, and returns
 * the unsubscribe function. Debounced saves flush here so they cannot lose
 * edits: phones rarely fire beforeunload, but they fire these when the user
 * switches apps or closes the tab.
 */
export function onPageHidden(listener: () => void) {
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") listener();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", listener);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", listener);
  };
}
