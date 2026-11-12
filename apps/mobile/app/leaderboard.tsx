import { router } from "expo-router";

import { LeaderboardContent } from "../src/components/leaderboard-content";

/** Peringkat minggu ini, opened from the XP pill of the weekly streak. */
export default function LeaderboardScreen() {
  return <LeaderboardContent onClose={() => router.back()} />;
}
