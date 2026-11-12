import type { RouterOutputs } from "@hakgyo/api";
import { Text, View } from "react-native";

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
        />
      ) : null}
    </>
  );
}

/** The streak and this week's days, from data the caller already has. */
export function WeeklyStreakView({
  currentStreak,
  weeklyActivity,
}: {
  currentStreak: number;
  weeklyActivity: Pick<
    GamificationSummary["weeklyActivity"],
    "activeDates" | "startsOn" | "today" | "xp"
  >;
}) {
  const { colors } = useAppTheme();
  const days = getStreakProgressDays(weeklyActivity);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-foreground">
          Streak {currentStreak} hari
        </Text>
        <Badge>{weeklyActivity.xp.toLocaleString("id-ID")} XP minggu ini</Badge>
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
