import { useMemo } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useCourseOutlines, useSyncIndex } from "../sync/hooks";
import { isStaleClosedOnDemandAssessment } from "./assessment-state";

/**
 * What Latihan's games practice on, from the local learner index: the
 * learner's courses with their composed outlines (vocabulary sets and
 * quizzes), and the class assessments still open to them.
 */
export function usePracticeSources(now: number) {
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const courses = index.data?.courses;
  const courseIds = useMemo(
    () => (courses ?? []).map((course) => course.id),
    [courses],
  );
  // Composed per course from the local bundles (learner view).
  const { outlines } = useCourseOutlines(courseIds);
  const events = index.data?.events;
  const actionableEvents = useMemo(
    () =>
      (events ?? []).filter((event) => {
        if (isStaleClosedOnDemandAssessment(event, now)) return false;
        const attempt = event.attempts[0];
        return !attempt || attempt.status === "IN_PROGRESS";
      }),
    [events, now],
  );
  return {
    index,
    courses: courses ?? [],
    outlines,
    events: actionableEvents,
  };
}
