/**
 * Root routes `app/_layout.tsx` presents as a form sheet or page sheet. Keep in
 * sync with the `formSheetOptions` and `presentation: "pageSheet"` screens there.
 */
const SHEET_ROUTES = new Set([
  "assessment-questions",
  "auth",
  "courses/[courseId]",
  "courses/[courseId]/chapter-complete",
  "courses/[courseId]/items/[courseItemId]/result",
  "material-link",
  "organization-switcher",
  "profile",
  "sync-status",
  "vocabulary/[vocabularySetId]/items/[entryId]",
]);

type RootNavigation = {
  getRootState: () =>
    | { key: string; type: string; routes: readonly { name: string }[] }
    | undefined;
  dispatch: (action: {
    type: "POP";
    payload: { count: number };
    target: string;
  }) => void;
};

/**
 * Closes the sheets open on the root stack, and the screens pushed over them,
 * so a screen opened from outside the current flow (a tapped push) shows as a
 * full screen. iOS presents anything pushed over a sheet inside that sheet.
 */
export function closeOpenSheets(navigation: RootNavigation) {
  const state = navigation.getRootState();
  if (state?.type !== "stack") return;
  const firstSheet = state.routes.findIndex((route) =>
    SHEET_ROUTES.has(route.name),
  );
  if (firstSheet <= 0) return;
  navigation.dispatch({
    type: "POP",
    payload: { count: state.routes.length - firstSheet },
    target: state.key,
  });
}
