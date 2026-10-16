import type { MockBackend } from "~/components/user-doc-previews/mock-trpc";
import type { RouterOutputs } from "~/trpc/react";

type Summary = RouterOutputs["gamification"]["getMySummary"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** This week's Monday to today, with the learner active on most days. */
function weeklyActivity(): Summary["weeklyActivity"] {
  const today = new Date();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const activeDates: string[] = [];
  for (const day = new Date(monday); day <= today;) {
    // Skip one day early in the week so the strip shows a gap.
    if (day.getUTCDay() !== 2 || dateKey(day) === dateKey(today)) {
      activeDates.push(dateKey(day));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return {
    activeDates,
    startsOn: dateKey(monday),
    today: dateKey(today),
    xp: 185,
  };
}

function summary(): Summary {
  return {
    achievements: [{ code: "STREAK_3", earnedAt: new Date() }],
    recentActivity: [],
    profileStats: {
      assessmentAttempts: 6,
      modulesMastered: 2,
      totalXp: 1240,
      vocabularyMastered: 48,
    },
    summary: {
      completedActivities: 37,
      currentStreak: 4,
      lastActivityDate: new Date(),
      longestStreak: 9,
      timeZone: "Asia/Jakarta",
      totalXp: 1240,
      updatedAt: new Date(),
    },
    weeklyActivity: weeklyActivity(),
  };
}

export const xpStreakBackend: MockBackend<null> = {
  createState: () => null,
  queries: { "gamification.getMySummary": () => summary() },
};
