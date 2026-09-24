import type { RouterOutputs } from "@hakgyo/api";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import { getStreakProgressDays } from "../lib/streak";
import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import { QueryState } from "./learning-ui";

export function WeeklyStreak({
  summary,
}: {
  summary?: RouterOutputs["gamification"]["getMySummary"];
} = {}) {
  const query = api.gamification.getMySummary.useQuery(undefined, {
    enabled: !summary,
  });
  const { colors } = useAppTheme();
  const data = summary ?? query.data;
  const days = data ? getStreakProgressDays(data.weeklyActivity) : [];

  return (
    <>
      <QueryState
        pending={!summary && query.isPending}
        error={summary ? null : query.error}
        retry={() => void query.refetch()}
      />
      {data ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-sm font-bold text-foreground">
              {data.summary.currentStreak} day streak
            </Text>
            <View className="rounded-full bg-primary/10 px-2.5 py-1">
              <Text className="text-xs font-bold text-primary">
                {data.weeklyActivity.xp.toLocaleString()} XP this week
              </Text>
            </View>
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
                    <SymbolView
                      fallback={<Text className="text-base">🔥</Text>}
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
      ) : null}
    </>
  );
}
