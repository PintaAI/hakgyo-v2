import type { Href } from "expo-router";

/**
 * Where an attempt opens. Attempts of a tugas or of an event placed in the
 * course live under their course item; attempts of an event that runs an
 * assessment from the organization's library have no course item and open on
 * `event-attempts/[attemptId]`, which goes back to the event when they end.
 */
export function assessmentAttemptHref({
  attemptId,
  courseId,
  courseItemId,
  eventId,
}: {
  attemptId: string;
  courseId: string;
  courseItemId: string | null | undefined;
  eventId?: string | null;
}): Href {
  if (courseItemId) {
    return {
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId, courseItemId, attemptId },
    };
  }
  return {
    pathname: "/event-attempts/[attemptId]",
    params: eventId
      ? { attemptId, eventId, courseId }
      : { attemptId, courseId },
  };
}

type AssessmentEventRef = {
  id: string;
  entry: { destination: string };
  course: { id: string };
  /** Null when the event runs an assessment from the organization's library. */
  courseItem: { id: string } | null;
  attempts: { id: string }[];
};

/**
 * Where an assessment event opens: the learner's attempt when the event goes
 * straight to it, the event page otherwise.
 */
export function assessmentEventHref(event: AssessmentEventRef): Href {
  const attempt = event.attempts[0];
  if (event.entry.destination === "ATTEMPT" && attempt) {
    return assessmentAttemptHref({
      attemptId: attempt.id,
      courseId: event.course.id,
      courseItemId: event.courseItem?.id,
      eventId: event.id,
    });
  }
  return { pathname: "/events/[eventId]", params: { eventId: event.id } };
}

export type { AssessmentEventRef };
