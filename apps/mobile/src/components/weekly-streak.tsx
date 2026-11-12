import type { RouterOutputs } from "@hakgyo/api";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatXp, useWeeklyLeaderboard } from "../lib/leaderboard";
import { getStreakProgressDays } from "../lib/streak";
import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import { Badge, QueryState } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";

type GamificationSummary = RouterOutputs["gamification"]["getMySummary"];

export function WeeklyStreak({
  summary,
}: {
  summary?: GamificationSummary;
} = {}) {
  const query = api.gamification.getMySummary.useQuery(undefined, {
    enabled: !summary,
  });
  const data = summary ?? query.data;
  const leaderboard = useWeeklyLeaderboard();

  return (
    <>
      <QueryState
        pending={!summary && query.isPending}
        error={summary ? null : query.error}
        retry={() => void query.refetch()}
      />
      {data ? (
        <WeeklyStreakView
          currentStreak={data.summary.currentStreak}
          weeklyActivity={data.weeklyActivity}
          rank={leaderboard.data?.me?.rank ?? null}
          onOpenLeaderboard={() => router.push("/leaderboard")}
        />
      ) : null}
    </>
  );
}

/**
 * The streak and this week's days, from data the caller already has. With
 * `onOpenLeaderboard`, this week's XP is a button to the weekly ranking that
 * also shows the learner's global rank once it is known.
 */
export function WeeklyStreakView({
  currentStreak,
  weeklyActivity,
  rank = null,
  onOpenLeaderboard,
}: {
  currentStreak: number;
  weeklyActivity: Pick<
    GamificationSummary["weeklyActivity"],
    "activeDates" | "startsOn" | "today" | "xp"
  >;
  rank?: number | null;
  onOpenLeaderboard?: () => void;
}) {
  const { colors } = useAppTheme();
  const days = getStreakProgressDays(weeklyActivity);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-foreground">
          Streak {currentStreak} hari
        </Text>
        {onOpenLeaderboard ? (
          <Pressable
            accessibilityHint="Membuka peringkat XP minggu ini"
            accessibilityLabel={
              rank
                ? `Peringkat ${rank} minggu ini, ${formatXp(weeklyActivity.xp)}`
                : `${formatXp(weeklyActivity.xp)} minggu ini`
            }
            accessibilityRole="button"
            className="min-w-0 shrink flex-row items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-2 active:opacity-70"
            hitSlop={8}
            onPress={onOpenLeaderboard}
          >
            <SymbolIcon
              name="trophy.fill"
              size={13}
              tintColor={colors.primary}
            />
            <Text
              className="shrink text-xs font-bold tabular-nums text-primary"
              numberOfLines={1}
            >
              {rank
                ? `#${rank.toLocaleString("id-ID")} · ${formatXp(weeklyActivity.xp)}`
                : `${formatXp(weeklyActivity.xp)} minggu ini`}
            </Text>
            <SymbolIcon
              name="chevron.right"
              size={11}
              tintColor={colors.primary}
              weight="bold"
            />
          </Pressable>
        ) : (
          <Badge>{formatXp(weeklyActivity.xp)} minggu ini</Badge>
        )}
      </View>

      <View className="flex-row">
        {days.map((day) => (
          <View className="flex-1 items-center gap-1.5" key={day.dateKey}>
            <Text className="text-[10px] font-bold uppercase text-muted-foreground">
              {day.weekday}
            </Text>
            <View
              accessible
              accessibilityLabel={`${day.weekday} ${day.dateNumber}, ${day.active ? "streak activity completed" : day.future ? "upcoming" : "no activity"}`}
              className={`h-9 w-9 items-center justify-center rounded-full border ${day.today ? "border-foreground" : "border-transparent"} ${day.active ? "bg-primary/10" : "bg-muted"}`}
            >
              {day.active ? (
                <SymbolIcon
                  name="flame.fill"
                  size={18}
                  tintColor={colors.primary}
                  weight="semibold"
                />
              ) : (
                <Text
                  className={`text-xs font-bold text-muted-foreground ${day.future ? "opacity-40" : ""}`}
                >
                  {day.dateNumber}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
