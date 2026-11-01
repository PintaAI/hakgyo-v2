import { HANGEUL_MASTERY_ACHIEVEMENT_CODE } from "@hakgyo/shared/hangeul";

import { db } from "~/server/db";
import {
  autoEnrollCohortIds,
  enrollInFoundationCohorts,
  hangeulMasteryNextCohortIds,
} from "./cohorts";

/**
 * Runs on every sign-in: puts the learner in the `AUTO_ENROLL_COHORT_IDS`
 * cohorts, such as Hangeul Mastery's Kelas Mandiri, and, once they hold the
 * Hangeul Mastery badge, the `HANGEUL_MASTERY_NEXT_COHORT_IDS` ones. Earning
 * the badge already enrolls them; this catches up a failed run, cohorts added
 * to a list later and accounts from before it.
 */
export async function ensureFoundationEnrollments(userId: string) {
  const nextIds = hangeulMasteryNextCohortIds();
  const mastered =
    nextIds.length > 0 &&
    (await db.userAchievement.findUnique({
      where: {
        userId_code: { userId, code: HANGEUL_MASTERY_ACHIEVEMENT_CODE },
      },
      select: { id: true },
    })) !== null;
  return enrollInFoundationCohorts(db, userId, [
    ...autoEnrollCohortIds(),
    ...(mastered ? nextIds : []),
  ]);
}
