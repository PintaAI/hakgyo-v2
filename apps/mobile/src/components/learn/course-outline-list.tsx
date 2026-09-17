import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptForItem,
} from "../../lib/assessment-state";
import { getCourseResumeItem } from "../../lib/course-learning-path";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
import { authClient } from "../../lib/auth-client";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { QueryState } from "../learning-ui";

const itemLabels = {
  MATERIAL: "Materi",
  ASSESSMENT: "Assessment",
  VOCABULARY_SET: "Kosakata",
} as const;

type CourseItemType = keyof typeof itemLabels;

function itemIcon(type: CourseItemType): SymbolViewProps["name"] {
  if (type === "VOCABULARY_SET") return "character.book.closed.fill";
  if (type === "ASSESSMENT") return "checkmark.seal.fill";
  return "doc.text.fill";
}

function itemFallback(type: CourseItemType) {
  if (type === "VOCABULARY_SET") return "Aa";
  if (type === "ASSESSMENT") return "✓";
  return "•";
}

export function CourseOutlineList({
  courseId,
  currentItemId,
  onOpenItem,
  showHeader = true,
  showActiveState = true,
}: {
  courseId: string;
  currentItemId?: string;
  onOpenItem: (
    item: { id: string },
    attempt:
      | {
          id: string;
          status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
        }
      | undefined,
  ) => void;
  showHeader?: boolean;
  showActiveState?: boolean;
}) {
  const { colors } = useAppTheme();
  const { data: session } = authClient.useSession();
  const outlineQuery = api.learning.getCourseOutline.useQuery(
    { courseId },
    { enabled: Boolean(session && courseId), retry: false },
  );
  const attemptsQuery = api.assessment.listMyAttempts.useQuery(undefined, {
    enabled: Boolean(session && courseId),
    retry: false,
  });
  const course = outlineQuery.data;
  const resumeItem = course && getCourseResumeItem(course);
  const courseAttempts = attemptsQuery.data?.filter(
    (attempt) => attempt.courseItem.module.courseId === courseId,
  );

  if (outlineQuery.isPending || !course) {
    return (
      <QueryState
        pending={outlineQuery.isPending}
        error={outlineQuery.error}
        retry={() => void outlineQuery.refetch()}
      />
    );
  }

  return (
    <View className="gap-5">
      {showHeader ? (
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-xl font-bold text-foreground">
            Course materials
          </Text>
          <Text className="text-xs font-semibold text-muted-foreground">
            {course.modules.length} modules
          </Text>
        </View>
      ) : null}

      {course.modules.length === 0 ? (
        <View className="items-center border-y border-border px-6 py-10">
          <Text className="text-base font-bold text-foreground">
            No materials yet
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Published modules will appear here.
          </Text>
        </View>
      ) : (
        course.modules.map((module, moduleIndex) => {
          const locked = module.access === "LOCKED";

          return (
            <View
              className={`${moduleIndex > 0 ? "border-t border-border pt-6" : ""} ${locked ? "opacity-60" : ""}`}
              key={module.id}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className={`size-9 items-center justify-center rounded-md border ${module.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
                >
                  <Text
                    className={`text-xs font-bold tabular-nums ${module.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text
                    className="text-base font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {module.title}
                  </Text>
                  {locked ? (
                    <Text className="text-xs leading-5 text-muted-foreground">
                      Complete the previous modules to unlock.
                    </Text>
                  ) : null}
                  {module.description ? (
                    <Text
                      className="text-sm leading-5 text-muted-foreground"
                      numberOfLines={2}
                    >
                      {module.description}
                    </Text>
                  ) : null}
                </View>
                <Text className="pt-1 text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  {module.isCompleted
                    ? "Completed"
                    : locked
                      ? "Locked"
                      : `${module.items.filter((item) => item.isCompleted).length}/${module.items.length} done`}
                </Text>
              </View>

              {module.items.length === 0 ? (
                <Text className="py-5 pl-12 text-sm text-muted-foreground">
                  No activities in this module.
                </Text>
              ) : (
                <View className="relative ml-3 mt-6">
                  <View className="absolute -left-1 -top-6 h-10 w-2 rounded-bl-lg border-l border-b border-border" />
                  {module.items.map((item, itemIndex) => {
                    const attempt =
                      item.type === "ASSESSMENT"
                        ? latestStandaloneAttemptForItem(
                            courseAttempts,
                            item.id,
                          )
                        : undefined;
                    const assessmentState =
                      item.type === "ASSESSMENT"
                        ? assessmentAttemptPresentation(attempt)
                        : undefined;
                    const itemTypeMeta = getLearningItemTypeMeta(item.type);
                    const isLast = itemIndex === module.items.length - 1;
                    const isCurrent = item.id === currentItemId;
                    const isNext = !currentItemId && item.id === resumeItem?.id;
                    const status = locked
                      ? "Locked"
                      : (assessmentState?.detail ??
                        (item.isCompleted
                          ? "Completed"
                          : isNext
                            ? "Up next"
                            : "Ready"));

                    return (
                      <View className={isLast ? "pb-1" : "pb-6"} key={item.id}>
                        {!isLast ? (
                          <View className="absolute bottom-0 left-5 top-8 w-px bg-border" />
                        ) : null}
                        <View
                          className={`flex-row ${showActiveState && (isCurrent || isNext) ? "-mx-1 -my-2 rounded-xl bg-primary/10 px-1 py-2" : ""}`}
                        >
                          <View className="w-10 items-center">
                            <View
                              className={`size-8 items-center justify-center rounded-full border ${item.isCompleted ? "border-primary bg-primary" : locked ? "border-border bg-background" : `${itemTypeMeta.borderClass} ${itemTypeMeta.softClass}`}`}
                            >
                              <SymbolView
                                fallback={
                                  <Text
                                    className={`text-xs font-black ${item.isCompleted ? "text-primary-foreground" : "text-primary"}`}
                                  >
                                    {item.isCompleted
                                      ? "✓"
                                      : itemFallback(item.type)}
                                  </Text>
                                }
                                name={
                                  item.isCompleted
                                    ? "checkmark"
                                    : locked
                                      ? "lock.fill"
                                      : itemIcon(item.type)
                                }
                                size={14}
                                tintColor={
                                  item.isCompleted
                                    ? colors.primaryForeground
                                    : locked
                                      ? colors.mutedForeground
                                      : colors.primary
                                }
                                weight="semibold"
                              />
                            </View>
                          </View>
                          <Pressable
                            accessibilityHint={assessmentState?.action}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: locked }}
                            className="min-w-0 flex-1 pl-3 active:opacity-60"
                            disabled={locked}
                            onPress={() => onOpenItem(item, attempt)}
                          >
                            <View className="flex-row items-start gap-3">
                              <View className="min-w-0 flex-1 gap-1">
                                <Text
                                  className={`text-[15px] font-semibold leading-5 ${showActiveState && (isCurrent || isNext) ? "text-primary" : "text-foreground"}`}
                                  numberOfLines={1}
                                >
                                  {item.title}
                                </Text>
                                <Text
                                  className="text-xs leading-4 text-muted-foreground"
                                  numberOfLines={2}
                                >
                                  <Text
                                    className={`font-semibold ${getLearningItemTypeMeta(item.type).textClass}`}
                                  >
                                    {itemLabels[item.type]}
                                  </Text>
                                  {" · "}
                                  {status}
                                  {attempt && assessmentState?.action
                                    ? ` · ${assessmentState.action}`
                                    : ""}
                                </Text>
                              </View>
                              {!locked && !isCurrent ? (
                                <Text className="pt-0.5 text-lg text-muted-foreground">
                                  ›
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
