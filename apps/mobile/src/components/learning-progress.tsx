import { Text, View } from "react-native";
import { api } from "../lib/trpc";
import { QueryState } from "./learning-ui";

export function LearningProgress() {
  const query = api.gamification.getMySummary.useQuery();
  return (
    <>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data ? (
        <View className="flex-row gap-3 rounded-2xl bg-muted p-5">
          {[
            [query.data.summary.currentStreak, "day streak"],
            [query.data.summary.totalXp, "XP earned"],
            [query.data.summary.completedActivities, "activities"],
          ].map(([value, label]) => (
            <View key={label} className="flex-1 gap-1">
              <Text className="text-2xl font-bold text-foreground">
                {value}
              </Text>
              <Text className="text-xs text-muted-foreground">{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
