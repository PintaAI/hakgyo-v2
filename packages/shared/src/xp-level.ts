// A learner's level, computed from total XP wherever it is shown; never
// stored. Levels 1–8 follow the table, then every level takes 2,000 XP more.

const LEVEL_START_XP = [0, 200, 600, 1200, 2000, 3000, 4400, 6000] as const;
const XP_PER_LEVEL_AFTER_TABLE = 2000;

/** Total XP at which `level` (1-based) starts. */
export function xpForLevel(level: number) {
  if (level <= 1) return 0;
  if (level <= LEVEL_START_XP.length) return LEVEL_START_XP[level - 1]!;
  return (
    LEVEL_START_XP[LEVEL_START_XP.length - 1]! +
    (level - LEVEL_START_XP.length) * XP_PER_LEVEL_AFTER_TABLE
  );
}

export type XpLevel = {
  level: number;
  /** XP at which this level started and the next one starts. */
  levelStartXp: number;
  nextLevelXp: number;
  /** 0–1 through the current level. */
  progress: number;
};

export function levelForXp(totalXp: number): XpLevel {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    levelStartXp,
    nextLevelXp,
    progress: (xp - levelStartXp) / (nextLevelXp - levelStartXp),
  };
}
