export const DEFAULT_REWARD_RULES = {
  MATERIAL_COMPLETED: { xp: 20, contributesToStreak: true },
  ASSESSMENT_SUBMITTED: { xp: 10, contributesToStreak: true },
  ASSESSMENT_PASSED: { xp: 40, contributesToStreak: true },
  VOCABULARY_REVIEWED: { xp: 5, contributesToStreak: true },
} as const;

export type GamificationAction = keyof typeof DEFAULT_REWARD_RULES;

export type RewardRule = {
  xp: number;
  contributesToStreak: boolean;
};

export type RewardRules = Record<GamificationAction, RewardRule>;

export type StreakSummary = {
  activeToday: boolean;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
};

export type AchievementMetric =
  "COMPLETED_ACTIVITIES" | "CURRENT_STREAK" | "LONGEST_STREAK" | "TOTAL_XP";

export type AchievementRule = {
  code: string;
  metric: AchievementMetric;
  threshold: number;
};

export type GamificationSnapshot = {
  completedActivities: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
};

export const DEFAULT_ACHIEVEMENT_RULES = [
  { code: "FIRST_ACTIVITY", metric: "COMPLETED_ACTIVITIES", threshold: 1 },
  { code: "STREAK_3", metric: "CURRENT_STREAK", threshold: 3 },
  { code: "STREAK_7", metric: "CURRENT_STREAK", threshold: 7 },
  { code: "STREAK_30", metric: "CURRENT_STREAK", threshold: 30 },
  { code: "XP_100", metric: "TOTAL_XP", threshold: 100 },
  { code: "XP_500", metric: "TOTAL_XP", threshold: 500 },
  { code: "XP_1000", metric: "TOTAL_XP", threshold: 1_000 },
] as const satisfies readonly AchievementRule[];

export function getRewardForAction(
  action: GamificationAction,
  rules: RewardRules = DEFAULT_REWARD_RULES,
): RewardRule {
  return rules[action];
}

export function getLocalDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not resolve the local activity date");
  }

  return `${year}-${month}-${day}`;
}

export function calculateStreak(
  activityDates: readonly Date[],
  options: { now?: Date; timeZone: string },
): StreakSummary {
  const now = options.now ?? new Date();
  const dateKeys = [
    ...new Set(
      activityDates.map((date) => getLocalDateKey(date, options.timeZone)),
    ),
  ].sort();

  if (dateKeys.length === 0) {
    return {
      activeToday: false,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    };
  }

  const today = getLocalDateKey(now, options.timeZone);
  const yesterday = shiftDateKey(today, -1);
  const dateKeySet = new Set(dateKeys);
  const currentAnchor = dateKeySet.has(today)
    ? today
    : dateKeySet.has(yesterday)
      ? yesterday
      : null;

  let currentStreak = 0;
  if (currentAnchor) {
    let cursor = currentAnchor;
    while (dateKeySet.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  let longestStreak = 1;
  let runningStreak = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previous = dateKeys[index - 1];
    const current = dateKeys[index];

    if (previous && current === shiftDateKey(previous, 1)) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  return {
    activeToday: dateKeySet.has(today),
    currentStreak,
    longestStreak,
    lastActivityDate: dateKeys.at(-1) ?? null,
  };
}

export function findNewAchievements(
  snapshot: GamificationSnapshot,
  rules: readonly AchievementRule[],
  earnedAchievementCodes: ReadonlySet<string>,
): string[] {
  return rules
    .filter(
      (rule) =>
        !earnedAchievementCodes.has(rule.code) &&
        getMetricValue(snapshot, rule.metric) >= rule.threshold,
    )
    .map((rule) => rule.code);
}

function getMetricValue(
  snapshot: GamificationSnapshot,
  metric: AchievementMetric,
): number {
  switch (metric) {
    case "COMPLETED_ACTIVITIES":
      return snapshot.completedActivities;
    case "CURRENT_STREAK":
      return snapshot.currentStreak;
    case "LONGEST_STREAK":
      return snapshot.longestStreak;
    case "TOTAL_XP":
      return snapshot.totalXp;
  }
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}
