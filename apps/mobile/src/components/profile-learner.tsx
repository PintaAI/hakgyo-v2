import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { achievementLabel, dateLabel } from "../lib/study";
import { useAppTheme } from "../providers/AppThemeProvider";
import { QueryState } from "./learning-ui";

export type LearnerStats = {
  vocabularyMastered: number;
  modulesMastered: number;
  assessmentAttempts: number;
};

export type LearnerAchievement = {
  code: string;
  earnedAt: Date | string;
};

export type LearnerActivity = {
  action: string;
  xpAwarded: number;
  occurredAt: Date | string;
};

// Instagram-style hero: avatar with brand ring, learner identity, and three
// learned-context counts (vocabulary mastered, modules mastered, assessment
// attempts). Borderless so the stats read as identity, not settings rows.
export function ProfileHero({
  displayName,
  initials,
  image,
  email,
  stats,
  isPending,
}: {
  displayName: string;
  initials: string;
  image: string | null | undefined;
  email: string;
  stats: LearnerStats | undefined;
  isPending: boolean;
}) {
  const { activeBrand, colors } = useAppTheme();
  const counters = [
    {
      label: "Vocab",
      accessibilityLabel: "Vocabulary mastered",
      value: stats?.vocabularyMastered,
    },
    {
      label: "Modules",
      accessibilityLabel: "Modules mastered",
      value: stats?.modulesMastered,
    },
    {
      label: "Attempts",
      accessibilityLabel: "Assessment attempts",
      value: stats?.assessmentAttempts,
    },
  ];

  return (
    <View className="gap-3 pt-1">
      <View className="flex-row items-center gap-5">
        <View
          className="size-20 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          <View
            className="size-[74px] items-center justify-center overflow-hidden rounded-full"
            style={{
              backgroundColor: colors.primary,
              borderColor: colors.background,
              borderWidth: 3,
            }}
          >
            {image ? (
              <Image
                className="size-full"
                resizeMode="cover"
                source={{ uri: image }}
              />
            ) : (
              <Text
                className="text-2xl font-extrabold"
                style={{ color: colors.primaryForeground }}
              >
                {initials || "H"}
              </Text>
            )}
          </View>
        </View>
        <View className="min-w-0 flex-1 flex-row">
          {counters.map((counter) => (
            <View
              key={counter.label}
              accessibilityLabel={`${counter.accessibilityLabel}: ${counter.value ?? 0}`}
              accessibilityRole="text"
              className="flex-1 items-center gap-0.5"
            >
              <Text className="text-lg font-black tabular-nums text-foreground">
                {isPending ? "–" : (counter.value ?? 0)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {counter.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View className="gap-0.5">
        <Text
          className="text-base font-bold text-foreground"
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {email}
        </Text>
        {activeBrand.name ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            Learning with {activeBrand.name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Compact recent activity: the latest three events with an expander instead
// of rendering the full 20-event feed. Borderless with per-event XP pills
// and a live weekly-XP header, matching the hero/trail language.
export function RecentActivity({
  activities,
  weekXp,
}: {
  activities: LearnerActivity[];
  weekXp: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? activities : activities.slice(0, 3);

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-xl font-bold text-foreground">
          Recent activity
        </Text>
        <Text className="text-xs font-semibold text-muted-foreground">
          {weekXp > 0 ? `+${weekXp} XP this week` : "No XP this week"}
        </Text>
      </View>

      {activities.length === 0 ? (
        <View className="items-center border-y border-border px-6 py-10">
          <Text className="text-base font-bold text-foreground">
            No activity yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Finish a lesson or practice to see activity here.
          </Text>
        </View>
      ) : (
        <View>
          {visible.map((activity, index) => (
            <View
              key={`${activity.action}-${index}`}
              className={`flex-row items-center gap-3 py-2.5 ${index > 0 ? "border-t border-border" : ""}`}
            >
              <View
                accessibilityLabel={`Plus ${activity.xpAwarded} XP`}
                className="rounded-full bg-primary/10 px-2.5 py-1"
              >
                <Text className="text-[11px] font-black tabular-nums text-primary">
                  +{activity.xpAwarded}
                </Text>
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  className="text-[15px] font-semibold capitalize leading-5 text-foreground"
                  numberOfLines={1}
                >
                  {activity.action.replaceAll("_", " ").toLowerCase()}
                </Text>
                <Text
                  className="text-xs leading-4 text-muted-foreground"
                  numberOfLines={1}
                >
                  {dateLabel(new Date(activity.occurredAt))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activities.length > 3 ? (
        <Pressable
          accessibilityRole="button"
          className="-mt-2 py-1 active:opacity-60"
          onPress={() => setExpanded((current) => !current)}
        >
          <Text className="text-sm font-bold text-primary">
            {expanded ? "Show less" : `Show all ${activities.length}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Milestone trail in the course-outline visual language: completed node,
// connecting rail, and an index badge echoing the outline module numbers.
export function MilestoneTrail({
  achievements,
  isPending,
  error,
  onRetry,
}: {
  achievements: LearnerAchievement[] | undefined;
  isPending: boolean;
  error: { message: string } | null;
  onRetry: () => void;
}) {
  const { colors } = useAppTheme();

  if (isPending || error || !achievements) {
    return (
      <QueryState pending={isPending} error={error} retry={onRetry} />
    );
  }

  return (
    <View className="gap-5">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-xl font-bold text-foreground">Milestones</Text>
        <Text className="text-xs font-semibold text-muted-foreground">
          {achievements.length} earned
        </Text>
      </View>

      {achievements.length === 0 ? (
        <View className="items-center border-y border-border px-6 py-10">
          <Text className="text-base font-bold text-foreground">
            No milestones yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Complete your first learning activity to earn a milestone.
          </Text>
        </View>
      ) : (
        <View>
          {achievements.map((achievement, index) => {
            const isLast = index === achievements.length - 1;
            return (
              <View key={achievement.code} className={isLast ? "pb-1" : "pb-6"}>
                {!isLast ? (
                  <View className="absolute bottom-0 left-5 top-8 w-px bg-border" />
                ) : null}
                <View className="flex-row">
                  <View className="w-10 items-center">
                    <View className="size-8 items-center justify-center rounded-full border border-primary bg-primary">
                      <SymbolView
                        fallback={
                          <Text className="text-xs font-black text-primary-foreground">
                            ✓
                          </Text>
                        }
                        name="checkmark"
                        size={14}
                        tintColor={colors.primaryForeground}
                        weight="semibold"
                      />
                    </View>
                  </View>
                  <View className="min-w-0 flex-1 pl-3">
                    <View className="flex-row items-start gap-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <Text
                          className="text-[15px] font-semibold leading-5 text-foreground"
                          numberOfLines={1}
                        >
                          {achievementLabel(achievement.code)}
                        </Text>
                        <Text
                          className="text-xs leading-4 text-muted-foreground"
                          numberOfLines={1}
                        >
                          Earned ·{" "}
                          {dateLabel(new Date(achievement.earnedAt))}
                        </Text>
                      </View>
                      <Text className="pt-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
