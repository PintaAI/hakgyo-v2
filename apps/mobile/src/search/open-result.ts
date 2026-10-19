import { router } from "expo-router";

import type { GameKey } from "../games/catalog";
import { requestLearnCohortFocus } from "../lib/learn-cohort-focus";
import { openAssessmentEvent, openCourseItem } from "../lib/navigation";
import type { SearchTarget } from "./documents";

/** Games that run without a vocabulary set. */
const STANDALONE_GAMES = new Set<GameKey>([
  "stroke-master",
  "syllable-forge",
  "word-builder",
]);

/**
 * Opens a search result. A cohort lives in the Belajar tab of its own
 * organization, so the active organization switches first when needed.
 */
export async function openSearchTarget(
  target: SearchTarget,
  {
    activeOrganizationId,
    selectOrganization,
  }: {
    activeOrganizationId: string | null;
    selectOrganization: (organizationId: string) => Promise<void>;
  },
) {
  switch (target.type) {
    case "course":
      router.push({
        pathname: "/courses/[courseId]",
        params: { courseId: target.courseId },
      });
      return;
    case "courseItem":
      openCourseItem({
        courseId: target.courseId,
        courseItemId: target.courseItemId,
      });
      return;
    case "vocabularyEntry":
      router.push({
        pathname: "/vocabulary/[vocabularySetId]/items/[entryId]",
        params: {
          vocabularySetId: target.vocabularySetId,
          entryId: target.entryId,
          sourceCourseItemId: target.sourceCourseItemId,
          courseId: target.courseId,
        },
      });
      return;
    case "event":
      openAssessmentEvent(target.event);
      return;
    case "cohort":
      if (
        target.organizationId &&
        target.organizationId !== activeOrganizationId
      ) {
        await selectOrganization(target.organizationId);
      }
      requestLearnCohortFocus(target.cohortId);
      router.navigate("/(home)/(tabs)/learn");
      return;
    case "game":
      if (STANDALONE_GAMES.has(target.gameKey)) {
        router.push({
          pathname: "/games/[gameKey]",
          params: { gameKey: target.gameKey },
        });
      } else {
        // Vocabulary games start from a set, which the Latihan tab picks.
        router.navigate("/(home)/(tabs)/assessments");
      }
      return;
  }
}
