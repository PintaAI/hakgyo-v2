import { router, type Href } from "expo-router";

import {
  assessmentAttemptHref,
  assessmentEventHref,
  type AssessmentEventRef,
} from "./attempt-href";

export { assessmentAttemptHref, assessmentEventHref, type AssessmentEventRef };

type AttemptRef = { id: string; status: string };

/**
 * Where a course item opens: its in-progress attempt when it has one, the
 * item itself otherwise. `anchor` is the id of a top-level block of a
 * material to scroll to (a section a material link points at).
 */
export function courseItemHref({
  courseId,
  courseItemId,
  attempt,
  anchor,
}: {
  courseId: string;
  courseItemId: string;
  attempt?: AttemptRef | null;
  anchor?: string | null;
}): Href {
  if (attempt?.status === "IN_PROGRESS") {
    return {
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId, courseItemId, attemptId: attempt.id },
    };
  }
  return {
    pathname: "/courses/[courseId]/items/[courseItemId]",
    params: anchor
      ? { courseId, courseItemId, anchor }
      : { courseId, courseItemId },
  };
}

/** Opens a course item (or its in-progress attempt). `replace` swaps the current screen. */
export function openCourseItem(
  target: Parameters<typeof courseItemHref>[0],
  { replace = false }: { replace?: boolean } = {},
) {
  const href = courseItemHref(target);
  if (replace) router.replace(href);
  else router.push(href);
}

/** Opens an assessment event (or the attempt it leads to). */
export function openAssessmentEvent(
  event: AssessmentEventRef,
  { replace = false }: { replace?: boolean } = {},
) {
  const href = assessmentEventHref(event);
  if (replace) router.replace(href);
  else router.push(href);
}

/** Opens the sync status sheet (downloads, queued progress, courses on the device). */
export function openSyncStatus() {
  router.push("/sync-status" as Href);
}
