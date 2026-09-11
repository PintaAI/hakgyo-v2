import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { dateLabel } from "../../lib/study";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { Empty, QueryState } from "../learning-ui";

export type CohortMilestone = {
  courseItemId: string;
  type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  title: string;
  moduleTitle: string;
  completedAt: Date | string | null;
  score: number | null;
  maxScore: number | null;
};

export type CohortMilestoneGroup = {
  cohortId: string;
  cohortName: string;
  courseId: string;
  courseTitle: string;
  totalItems: number;
  completedCount: number;
  progressPercent: number;
  milestones: CohortMilestone[];
};

function milestoneTypeLabel(type: CohortMilestone["type"]) {
  if (type === "VOCABULARY_SET") return "Vocabulary";
  if (type === "ASSESSMENT") return "Assessment";
  return "Lesson";
}

function milestoneIcon(type: CohortMilestone["type"]): SymbolViewProps["name"] {
  if (type === "VOCABULARY_SET") return "character.book.closed.fill";
  if (type === "ASSESSMENT") return "checkmark.seal.fill";
  return "doc.text.fill";
}

function milestoneFallback(type: CohortMilestone["type"]) {
  if (type === "VOCABULARY_SET") return "Aa";
  if (type === "ASSESSMENT") return "✓";
  return "•";
}

function milestoneDetail(milestone: CohortMilestone) {
  const parts = [
    `${milestoneTypeLabel(milestone.type)} · ${milestone.moduleTitle}`,
  ];
  if (
    milestone.type === "ASSESSMENT" &&
    milestone.score !== null &&
    milestone.maxScore !== null
  ) {
    parts.push(`Score ${milestone.score}/${milestone.maxScore}`);
  }
  if (milestone.completedAt) {
    parts.push(dateLabel(new Date(milestone.completedAt)));
  }
  return parts.join(" · ");
}

export function CohortMilestonesSection({
  groups,
  pending,
  error,
  retry,
}: {
  groups: CohortMilestoneGroup[] | undefined;
  pending: boolean;
  error?: { message: string } | null;
  retry: () => void;
}) {
  const { colors } = useAppTheme();

  if (pending || error) {
    return <QueryState pending={pending} error={error} retry={retry} />;
  }

  const visible = (groups ?? []).filter((group) => group.milestones.length > 0);
  if (visible.length === 0) return null;
  const showCohortContext = visible.length > 1;

  return (
    <View className="gap-3">
      {visible.map((group) => (
        <View className="gap-3 py-2" key={group.cohortId}>
          {showCohortContext ? (
            <View className="flex-row items-center justify-between gap-4">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  className="text-base font-bold text-foreground"
                  numberOfLines={1}
                >
                  {group.cohortName}
                </Text>
                <Text
                  className="text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {group.courseTitle}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                {group.completedCount} completed
              </Text>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-xs font-semibold text-muted-foreground">
                {group.completedCount} completed
              </Text>
            </View>
          )}

          <View className="mt-2">
            {group.milestones.map((milestone, index) => {
              const isLast = index === group.milestones.length - 1;
              return (
                <View className="flex-row" key={milestone.courseItemId}>
                  <View className="w-10 items-center">
                    {!isLast ? (
                      <View className="absolute bottom-0 top-8 w-px bg-border" />
                    ) : null}
                    <View className="size-8 items-center justify-center rounded-full border border-border bg-background">
                      <SymbolView
                        fallback={
                          <Text className="text-xs font-black text-primary">
                            {milestoneFallback(milestone.type)}
                          </Text>
                        }
                        name={milestoneIcon(milestone.type)}
                        size={14}
                        tintColor={colors.primary}
                        weight="semibold"
                      />
                    </View>
                  </View>
                  <Pressable
                    accessibilityHint={`Open completed ${milestoneTypeLabel(milestone.type).toLowerCase()}`}
                    accessibilityRole="button"
                    className={`min-w-0 flex-1 pl-3 active:opacity-60 ${isLast ? "pb-1" : "pb-6"}`}
                    onPress={() =>
                      router.push({
                        pathname: "/courses/[courseId]/items/[courseItemId]",
                        params: {
                          courseId: group.courseId,
                          courseItemId: milestone.courseItemId,
                        },
                      })
                    }
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <Text
                          className="text-[15px] font-semibold leading-5 text-foreground"
                          numberOfLines={2}
                        >
                          {milestone.title}
                        </Text>
                        <Text
                          className="text-xs leading-4 text-muted-foreground"
                          numberOfLines={2}
                        >
                          {milestoneDetail(milestone)}
                        </Text>
                      </View>
                      <Text className="pt-0.5 text-lg text-muted-foreground">
                        ›
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyMilestones() {
  return (
    <Empty>No milestones yet — complete your first lesson to earn one.</Empty>
  );
}
