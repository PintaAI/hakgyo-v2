import { router, Stack, useLocalSearchParams } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { authClient } from "../../src/lib/auth-client";
import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptForItem,
} from "../../src/lib/assessment-state";
import { api } from "../../src/lib/trpc";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { withOpacity } from "../../src/theme/colors";

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

export default function CourseDetailScreen() {
  const params = useLocalSearchParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId)
    ? (params.courseId[0] ?? "")
    : (params.courseId ?? "");
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  const courseQuery = api.learning.getCourseOutline.useQuery(
    { courseId },
    { enabled: Boolean(session && courseId), retry: false },
  );
  const attemptsQuery = api.assessment.listMyAttempts.useQuery(undefined, {
    enabled: Boolean(session && courseId),
    retry: false,
  });

  useEffect(() => {
    if (!isSessionPending && !session && courseId) {
      router.replace({
        pathname: "/auth",
        params: { redirectTo: `/courses/${encodeURIComponent(courseId)}` },
      });
    }
  }, [courseId, isSessionPending, session]);

  const course = courseQuery.data;
  const courseAttempts = attemptsQuery.data?.filter(
    (attempt) => attempt.courseItem.module.courseId === courseId,
  );
  const allItems = course?.modules.flatMap((module) => module.items) ?? [];
  const completedCount = allItems.filter((item) => item.isCompleted).length;
  const progress = allItems.length
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(home)/(tabs)/home");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {isSessionPending || (!session && Boolean(courseId)) ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">
            Opening your course…
          </Text>
        </View>
      ) : courseQuery.isPending ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">Loading course…</Text>
        </View>
      ) : courseQuery.isError || !course ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <View className="size-12 items-center justify-center rounded-lg bg-destructive/10">
            <Text className="text-lg font-black text-destructive">!</Text>
          </View>
          <View className="items-center gap-2">
            <Text className="text-xl font-black text-foreground">
              Course unavailable
            </Text>
            <Text className="text-center text-sm leading-5 text-muted-foreground">
              Your access may have ended, or the course is no longer published.
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className="rounded-full border border-border px-5 py-3"
              onPress={goBack}
            >
              <Text className="font-bold text-foreground">Go back</Text>
            </Pressable>
            <Pressable
              className="rounded-full bg-primary px-5 py-3"
              onPress={() => void courseQuery.refetch()}
            >
              <Text className="font-bold text-primary-foreground">Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-8 px-5 pb-14"
          contentInsetAdjustmentBehavior="never"
        >
          <View className="-mx-5 overflow-hidden bg-muted">
            {course.thumbnailUrl ? (
              <>
                <Image
                  accessibilityIgnoresInvertColors
                  blurRadius={5}
                  className="absolute inset-0 z-0 h-full w-full"
                  resizeMode="cover"
                  source={{ uri: course.thumbnailUrl }}
                />
                <View
                  className="absolute inset-0 z-10"
                  style={{
                    backgroundColor: withOpacity(colors.background, 0.72),
                  }}
                />
              </>
            ) : null}
            <View className="relative z-20 justify-end gap-2 px-5 pb-6 pt-6">
              <View className="gap-2">
                <Text className="text-center text-xs font-semibold uppercase tracking-[1.5px] text-muted-foreground">
                  {course.organization.name}
                </Text>
                <Text className="text-3xl font-black leading-9 tracking-tight text-foreground">
                  {course.title}
                </Text>
                {course.description ? (
                  <Text
                    className="text-sm leading-5 text-muted-foreground"
                    numberOfLines={3}
                  >
                    {course.description}
                  </Text>
                ) : null}
                <Text className="mt-1 text-xs font-semibold text-muted-foreground">
                  {completedCount} of {allItems.length} completed
                </Text>
              </View>
            </View>
            <View className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-muted">
              <View
                className="h-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </View>
          </View>

          <View className="gap-5">
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-xl font-bold text-foreground">
                Course materials
              </Text>
              <Text className="text-xs font-semibold text-muted-foreground">
                {course.modules.length} modules
              </Text>
            </View>

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
                        className={`size-9 items-center justify-center rounded-full border ${module.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
                      >
                        {module.isCompleted || locked ? (
                          <SymbolView
                            fallback={
                              <Text
                                className={`text-xs font-black ${module.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
                              >
                                {module.isCompleted ? "✓" : "—"}
                              </Text>
                            }
                            name={
                              module.isCompleted ? "checkmark" : "lock.fill"
                            }
                            size={14}
                            tintColor={
                              module.isCompleted
                                ? colors.primaryForeground
                                : colors.mutedForeground
                            }
                            weight="bold"
                          />
                        ) : (
                          <Text className="text-xs font-bold tabular-nums text-muted-foreground">
                            {String(moduleIndex + 1).padStart(2, "0")}
                          </Text>
                        )}
                      </View>
                      <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-base font-bold text-foreground">
                          {module.title}
                        </Text>
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
                            : `${module.items.length} activities`}
                      </Text>
                    </View>

                    {module.items.length === 0 ? (
                      <Text className="py-5 pl-12 text-sm text-muted-foreground">
                        No activities in this module.
                      </Text>
                    ) : (
                      <View className="mt-5">
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
                          const isLast = itemIndex === module.items.length - 1;
                          const status = locked
                            ? "Locked"
                            : (assessmentState?.detail ??
                              (item.isCompleted ? "Completed" : "Ready"));

                          return (
                            <View className="flex-row" key={item.id}>
                              <View className="w-10 items-center">
                                {!isLast ? (
                                  <View className="absolute bottom-0 top-8 w-px bg-border" />
                                ) : null}
                                <View
                                  className={`size-8 items-center justify-center rounded-full border ${item.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
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
                                className={`min-w-0 flex-1 pl-3 active:opacity-60 ${isLast ? "pb-1" : "pb-6"}`}
                                disabled={locked}
                                onPress={() => {
                                  if (attempt) {
                                    router.push({
                                      pathname:
                                        "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                                      params: {
                                        courseId,
                                        courseItemId: item.id,
                                        attemptId: attempt.id,
                                      },
                                    });
                                    return;
                                  }
                                  router.push({
                                    pathname:
                                      "/courses/[courseId]/items/[courseItemId]",
                                    params: {
                                      courseId,
                                      courseItemId: item.id,
                                    },
                                  });
                                }}
                              >
                                <View className="flex-row items-start gap-3">
                                  <View className="min-w-0 flex-1 gap-1">
                                    <Text
                                      className="text-[15px] font-semibold leading-5 text-foreground"
                                      numberOfLines={2}
                                    >
                                      {item.title}
                                    </Text>
                                    <Text
                                      className="text-xs leading-4 text-muted-foreground"
                                      numberOfLines={2}
                                    >
                                      {itemLabels[item.type]} · {status}
                                      {attempt && assessmentState?.action
                                        ? ` · ${assessmentState.action}`
                                        : ""}
                                    </Text>
                                  </View>
                                  {!locked ? (
                                    <Text className="pt-0.5 text-lg text-muted-foreground">
                                      ›
                                    </Text>
                                  ) : null}
                                </View>
                              </Pressable>
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
        </ScrollView>
      )}
    </>
  );
}
