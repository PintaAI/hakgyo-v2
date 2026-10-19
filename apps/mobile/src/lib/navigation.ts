import { router, type Href } from "expo-router";

type AttemptRef = { id: string; status: string };

/**
 * Where a course item opens: its in-progress attempt when it has one, the
 * item itself otherwise.
 */
export function courseItemHref({
  courseId,
  courseItemId,
  attempt,
}: {
  courseId: string;
  courseItemId: string;
  attempt?: AttemptRef | null;
}): Href {
  if (attempt?.status === "IN_PROGRESS") {
    return {
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId, courseItemId, attemptId: attempt.id },
    };
  }
  return {
    pathname: "/courses/[courseId]/items/[courseItemId]",
    params: { courseId, courseItemId },
  };
}

type AssessmentEventRef = {
  id: string;
  entry: { destination: string };
  course: { id: string };
  courseItem: { id: string };
  attempts: { id: string }[];
};

/**
 * Where an assessment event opens: the learner's attempt when the event goes
 * straight to it, the event page otherwise.
 */
export function assessmentEventHref(event: AssessmentEventRef): Href {
  const attempt = event.attempts[0];
  if (event.entry.destination === "ATTEMPT" && attempt) {
    return {
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: {
        courseId: event.course.id,
        courseItemId: event.courseItem.id,
        attemptId: attempt.id,
      },
    };
  }
  return { pathname: "/events/[eventId]", params: { eventId: event.id } };
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
