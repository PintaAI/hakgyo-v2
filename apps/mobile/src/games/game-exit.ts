// Where a game goes when the learner leaves it. Kept free of expo-router so
// it can be unit tested; `leaveGame` in game-navigation.ts performs it.

/** A lesson that opened the game (`sourceCourseItemId` search param). */
export type GameSource = {
  sourceCourseItemId?: string;
  courseId?: string;
};

export const PRACTICE_TAB_HREF = "/(home)/(tabs)/assessments";

export type GameExitAction =
  | { type: "dismissTo"; href: typeof PRACTICE_TAB_HREF }
  | { type: "back" }
  | {
      type: "replace";
      href: {
        pathname: "/courses/[courseId]/items/[courseItemId]";
        params: { courseId: string; courseItemId: string };
      };
    };

/**
 * Practice launches pop back to the Latihan tab. Lesson launches return to
 * the lesson: back when it is underneath, otherwise its route when the course
 * is known, otherwise Latihan.
 */
export function gameExitAction(
  source: GameSource | undefined,
  canGoBack: boolean,
): GameExitAction {
  const courseItemId = source?.sourceCourseItemId;
  if (!courseItemId) return { type: "dismissTo", href: PRACTICE_TAB_HREF };
  if (canGoBack) return { type: "back" };
  if (source.courseId) {
    return {
      type: "replace",
      href: {
        pathname: "/courses/[courseId]/items/[courseItemId]",
        params: { courseId: source.courseId, courseItemId },
      },
    };
  }
  return { type: "dismissTo", href: PRACTICE_TAB_HREF };
}

/** Label of the button that leaves a finished game. */
export function gameLeaveLabel(source: GameSource | undefined) {
  return source?.sourceCourseItemId
    ? "Kembali ke pelajaran"
    : "Kembali ke latihan";
}
