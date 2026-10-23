import { HANGEUL_MASTERY_ACHIEVEMENT_CODE } from "@hakgyo/shared/hangeul";

import type { Prisma } from "../../../generated/prisma/client";

type PreferenceDb = Pick<Prisma.TransactionClient, "user" | "userPreference">;

export type HangeulVisibility = {
  /** The learner earned the Hangeul Mastery badge. */
  hangeulMastered: boolean;
  /** The learner chose to keep seeing the course after mastering it. */
  showHangeulAfterMastery: boolean;
  /** Learner lists leave out the Hangeul Mastery course and games. */
  hangeulHidden: boolean;
};

/**
 * Whether learner lists (sidebars, Latihan's Hangeul section, search) show
 * the Hangeul Mastery course. Direct links and practice pools ignore this.
 */
export async function getHangeulVisibility(
  db: PreferenceDb,
  userId: string,
): Promise<HangeulVisibility> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      achievements: {
        where: { code: HANGEUL_MASTERY_ACHIEVEMENT_CODE },
        select: { id: true },
        take: 1,
      },
      preference: { select: { showHangeulAfterMastery: true } },
    },
  });
  const hangeulMastered = (user?.achievements.length ?? 0) > 0;
  const showHangeulAfterMastery =
    user?.preference?.showHangeulAfterMastery ?? false;
  return {
    hangeulMastered,
    showHangeulAfterMastery,
    hangeulHidden: hangeulMastered && !showHangeulAfterMastery,
  };
}

export async function setShowHangeulAfterMastery(
  db: PreferenceDb,
  userId: string,
  show: boolean,
) {
  await db.userPreference.upsert({
    where: { userId },
    create: { userId, showHangeulAfterMastery: show },
    update: { showHangeulAfterMastery: show },
  });
  return getHangeulVisibility(db, userId);
}
