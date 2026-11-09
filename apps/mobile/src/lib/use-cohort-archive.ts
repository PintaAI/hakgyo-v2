import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { useCallback, useEffect, useMemo } from "react";

import { useAppTheme } from "../providers/AppThemeProvider";
import { useCourseOutlines, useSyncIndex } from "../sync/hooks";
import { isStaleClosedOnDemandAssessment } from "./assessment-state";
import { authClient } from "./auth-client";
import { useBadgeClaims } from "./badge-claims";
import {
  hasPendingWork,
  isArchived,
  isClassFinished,
  isStaleShownOverride,
  outlineProgress,
  type OutlineProgress,
} from "./cohort-archive";
import {
  setArchiveOverride,
  useArchiveOverrides,
} from "./cohort-archive-store";

export type CohortArchiveState = {
  archived: boolean;
  finished: boolean;
  progress?: OutlineProgress;
};

/**
 * Which of the active organization's classes sit under Diarsipkan on
 * Belajar, with the actions to move them. `now` drives meeting and deadline
 * checks; pass the screen's clock.
 */
export function useCohortArchive(now: number) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const cohorts = index.data?.cohorts;
  const events = index.data?.events;
  const courseIds = useMemo(
    () => (cohorts ?? []).map((cohort) => cohort.course.id),
    [cohorts],
  );
  const { outlines } = useCourseOutlines(courseIds);
  const overrides = useArchiveOverrides(userId);
  const claims = useBadgeClaims(userId);

  const states = useMemo(() => {
    const byCohort = new Map<string, CohortArchiveState>();
    for (const cohort of cohorts ?? []) {
      const progress = outlineProgress(outlines[cohort.course.id]);
      const cohortEvents = (events ?? []).filter(
        (event) =>
          event.cohort?.id === cohort.id &&
          !isStaleClosedOnDemandAssessment(event, now),
      );
      const finished = isClassFinished(
        progress,
        hasPendingWork(
          { meetings: cohort.meetings, events: cohortEvents },
          now,
        ),
        !!claims[cohort.course.id],
      );
      byCohort.set(cohort.id, {
        finished,
        progress,
        archived: isArchived(
          finished,
          overrides[cohort.course.id],
          progress?.itemCount,
        ),
      });
    }
    return byCohort;
  }, [claims, cohorts, events, now, outlines, overrides]);

  // A card shown again goes back to following its finished state once the
  // curriculum changes, here and in Latihan and Cari.
  useEffect(() => {
    if (!userId) return;
    for (const cohort of cohorts ?? []) {
      const courseId = cohort.course.id;
      const itemCount = states.get(cohort.id)?.progress?.itemCount;
      if (isStaleShownOverride(overrides[courseId], itemCount)) {
        setArchiveOverride(userId, courseId, undefined);
      }
    }
  }, [cohorts, overrides, states, userId]);

  const archive = useCallback(
    (courseId: string) => {
      if (userId) setArchiveOverride(userId, courseId, { state: "archived" });
    },
    [userId],
  );
  /** Back to the carousel; a finished class stays there until it changes. */
  const restore = useCallback(
    (courseId: string, state: CohortArchiveState | undefined) => {
      if (!userId) return;
      setArchiveOverride(
        userId,
        courseId,
        state?.finished && state.progress
          ? { state: "shown", itemCount: state.progress.itemCount }
          : undefined,
      );
    },
    [userId],
  );

  return { states, archive, restore };
}

/**
 * Whether the screens outside Belajar leave Hangeul Mastery out (Latihan's
 * Hangeul games, Cari, the sidebar): from mastery on, as before the claim
 * existed, unless the learner showed it again on Belajar. The badge claim
 * only decides when the Belajar card moves under Diarsipkan.
 */
export function useHangeulArchived(mastered: boolean) {
  const { data: session } = authClient.useSession();
  const overrides = useArchiveOverrides(session?.user.id);
  return isArchived(mastered, overrides[HANGEUL_MASTERY_COURSE_ID]);
}

export type HangeulBadgeState = "unclaimed" | "archived" | "shown";

/** Where a finished Hangeul Mastery stands, for its badge copy. */
export function useHangeulBadgeState(): HangeulBadgeState {
  const { data: session } = authClient.useSession();
  const overrides = useArchiveOverrides(session?.user.id);
  const claims = useBadgeClaims(session?.user.id);
  if (!claims[HANGEUL_MASTERY_COURSE_ID]) return "unclaimed";
  return isArchived(true, overrides[HANGEUL_MASTERY_COURSE_ID])
    ? "archived"
    : "shown";
}
