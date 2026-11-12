import type { RouterOutputs } from "@hakgyo/api";

import { api } from "./trpc";
import { useRefetchWhenBack } from "./use-refetch-when-back";

export type WeeklyLeaderboard =
  RouterOutputs["gamification"]["getWeeklyLeaderboard"];

/** Rankings move only as people study, so a few minutes old is fine. */
const LEADERBOARD_STALE_MS = 5 * 60 * 1000;

/**
 * This week's XP ranking, everyone's or one organization's. Online only: it
 * refreshes when its screen is shown again or the app returns, once it is a
 * few minutes old, and keeps the last ranking while offline.
 */
export function useWeeklyLeaderboard(organizationId?: string | null) {
  const query = api.gamification.getWeeklyLeaderboard.useQuery(
    organizationId ? { organizationId } : {},
    { staleTime: LEADERBOARD_STALE_MS, refetchOnMount: true },
  );
  useRefetchWhenBack(() => (query.isStale ? query.refetch() : undefined));
  return query;
}

/** "1.240 XP" with Indonesian digit grouping. */
export function formatXp(xp: number) {
  return `${xp.toLocaleString("id-ID")} XP`;
}
