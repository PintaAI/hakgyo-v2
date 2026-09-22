import { SymbolView } from "expo-symbols";
import type { RouterOutputs } from "@hakgyo/api";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/trpc";
import {
  getStreakLabel,
  getStreakProgressDays,
  getStreakStage,
} from "../lib/streak";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { QueryState } from "./learning-ui";

const TIER_COLORS = {
  dark: { green: "#4ade80", red: "#f87171", yellow: "#facc15" },
  light: { green: "#15803d", red: "#b91c1c", yellow: "#a16207" },
} as const;

export function WeeklyStreak({
  summary,
}: {
  summary?: RouterOutputs["gamification"]["getMySummary"];
} = {}) {
  const query = api.gamification.getMySummary.useQuery(undefined, {
    enabled: !summary,
  });
  const { colorScheme, colors } = useAppTheme();
  const liquidGlassAvailable =
    isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  const streakScale = useRef(new Animated.Value(1)).current;
  const streakShake = useRef(new Animated.Value(0)).current;
  const previousStreak = useRef<number | null>(null);
  const data = summary ?? query.data;

  const currentStreak = data?.summary.currentStreak;
  const stage = getStreakStage(currentStreak ?? 0);
  const tierColor = TIER_COLORS[colorScheme][stage.tone];
  const days = data
    ? getStreakProgressDays({
        ...data.weeklyActivity,
        currentStreak: data.summary.currentStreak,
      })
    : [];
  const newestActiveDate = days.reduce<string | undefined>(
    (newest, day) =>
      day.active && (!newest || day.dateKey > newest) ? day.dateKey : newest,
    undefined,
  );
  const streakLabel = getStreakLabel(currentStreak ?? 0);

  useEffect(() => {
    if (currentStreak === undefined) return;

    const previous = previousStreak.current;
    previousStreak.current = currentStreak;
    if (previous === null || currentStreak <= previous) return;

    streakScale.stopAnimation();
    streakShake.stopAnimation();
    streakScale.setValue(1);
    streakShake.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(streakScale, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        toValue: 1.24,
        useNativeDriver: true,
      }),
      Animated.sequence(
        [-3, 3, -2.5, 2.5, -1, 1, 0].map((toValue) =>
          Animated.timing(streakShake, {
            duration: 55,
            easing: Easing.inOut(Easing.quad),
            toValue,
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.timing(streakScale, {
        duration: 240,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [currentStreak, streakScale, streakShake]);

  return (
    <>
      <QueryState
        pending={!summary && query.isPending}
        error={summary ? null : query.error}
        retry={() => void query.refetch()}
      />
      {data ? (
        <View>
          <View className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm font-bold text-foreground">
                {streakLabel}
              </Text>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: withOpacity(tierColor, 0.14) }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: tierColor }}
                >
                  {data.weeklyActivity.xp.toLocaleString()} XP this week
                </Text>
              </View>
            </View>

            <View className="flex-row">
              {days.map((day) => {
                const dayTierColor = day.tone
                  ? TIER_COLORS[colorScheme][day.tone]
                  : tierColor;
                const accessibilityLabel = `${day.weekday} ${day.dateNumber}, ${day.active ? `${day.tone} streak activity completed` : day.future ? "upcoming" : "no activity"}`;
                const dayContent = day.active ? (
                  <SymbolView
                    fallback={<Text className="text-base">🔥</Text>}
                    name="flame.fill"
                    size={18}
                    tintColor={dayTierColor}
                    weight="semibold"
                  />
                ) : (
                  <Text
                    className={`text-xs font-bold text-muted-foreground ${day.future ? "opacity-40" : ""}`}
                  >
                    {day.dateNumber}
                  </Text>
                );
                const dayStyle = [
                  styles.dayBubble,
                  {
                    borderColor: day.today ? colors.foreground : "transparent",
                  },
                ];

                return (
                  <View
                    className="flex-1 items-center gap-1.5"
                    key={day.dateKey}
                  >
                    <Text className="text-[10px] font-bold uppercase text-muted-foreground">
                      {day.weekday}
                    </Text>
                    <Animated.View
                      style={
                        day.dateKey === newestActiveDate
                          ? {
                              transform: [
                                { translateX: streakShake },
                                { scale: streakScale },
                              ],
                            }
                          : undefined
                      }
                    >
                      {liquidGlassAvailable ? (
                        <GlassView
                          accessibilityLabel={accessibilityLabel}
                          colorScheme={colorScheme}
                          glassEffectStyle="clear"
                          style={dayStyle}
                          tintColor={withOpacity(
                            day.active ? dayTierColor : colors.primary,
                            colorScheme === "dark" ? 0.35 : 0.18,
                          )}
                        >
                          {dayContent}
                        </GlassView>
                      ) : (
                        <View
                          accessibilityLabel={accessibilityLabel}
                          style={[
                            ...dayStyle,
                            {
                              backgroundColor: day.active
                                ? withOpacity(dayTierColor, 0.14)
                                : colors.muted,
                            },
                          ]}
                        >
                          {dayContent}
                        </View>
                      )}
                    </Animated.View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  dayBubble: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
