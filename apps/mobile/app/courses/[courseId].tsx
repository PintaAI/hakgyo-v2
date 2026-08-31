import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { authClient } from "../../src/lib/auth-client";
import { api } from "../../src/lib/trpc";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

const itemLabels = {
  MATERIAL: "Materi",
  ASSESSMENT: "Assessment",
  VOCABULARY_SET: "Kosakata",
} as const;

const itemMarks = {
  MATERIAL: "M",
  ASSESSMENT: "A",
  VOCABULARY_SET: "V",
} as const;

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

  useEffect(() => {
    if (!isSessionPending && !session && courseId) {
      router.replace({
        pathname: "/auth",
        params: { redirectTo: `/courses/${encodeURIComponent(courseId)}` },
      });
    }
  }, [courseId, isSessionPending, session]);

  const course = courseQuery.data;
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode:
            Platform.OS === "ios" ? "minimal" : undefined,
          headerShadowVisible: false,
          headerTitle: "Course",
          headerLargeTitle: false,
          headerStyle: {
            backgroundColor:
              Platform.OS === "ios" ? "transparent" : colors.background,
          },
          headerTintColor: colors.foreground,
          headerTransparent: Platform.OS === "ios",
          scrollEdgeEffects:
            Platform.OS === "ios" ? { top: "soft" } : undefined,
        }}
      />

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
          contentContainerClassName="gap-6 px-4 pb-12 pt-3"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              onRefresh={() => void courseQuery.refetch()}
              refreshing={courseQuery.isRefetching}
              tintColor={colors.primary}
            />
          }
        >
          <View className="min-h-80 overflow-hidden rounded-xl bg-[#171915]">
            {course.thumbnailUrl ? (
              <>
                <Image
                  accessibilityIgnoresInvertColors
                  className="absolute inset-0 z-0 h-full w-full"
                  resizeMode="cover"
                  source={{ uri: course.thumbnailUrl }}
                />
                <View
                  className="absolute inset-0 z-10"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.68)" }}
                />
              </>
            ) : null}
            <View className="relative z-20 flex-1 justify-between p-6">
              <View className="self-start rounded-full border border-white/20 bg-white/10 px-3 py-2">
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-white">
                  {course.progressionMode === "SEQUENTIAL"
                    ? "Sequential learning"
                    : "Open learning"}
                </Text>
              </View>

              <View className="gap-3">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-white/70">
                  {course.organization.name}
                </Text>
                <Text className="text-4xl font-black leading-[42px] tracking-tight text-white">
                  {course.title}
                </Text>
                {course.description ? (
                  <Text
                    className="text-sm leading-5 text-white/75"
                    numberOfLines={3}
                  >
                    {course.description}
                  </Text>
                ) : null}
                <View className="mt-2 gap-2">
                  <View className="flex-row items-end justify-between">
                    <Text className="text-xs font-bold uppercase tracking-[1.5px] text-white/70">
                      Overall progress
                    </Text>
                    <Text className="text-sm font-black text-white">
                      {progress}% · {completedCount}/{allItems.length}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-white/20">
                    <View
                      className="h-full rounded-full bg-white/85"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <View className="gap-1 px-1">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
                Learning path
              </Text>
              <Text className="text-2xl font-black text-foreground">
                Course materials
              </Text>
            </View>

            {course.modules.length === 0 ? (
              <View className="items-center rounded-xl border border-dashed border-border bg-card px-6 py-10">
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
                    className={`overflow-hidden rounded-xl border border-border bg-card ${locked ? "opacity-60" : ""}`}
                    key={module.id}
                  >
                    <View className="flex-row gap-4 border-b border-border p-5">
                      <View
                        className={`size-11 items-center justify-center rounded-lg ${module.isCompleted ? "bg-primary" : "bg-muted"}`}
                      >
                        <Text
                          className={`font-black ${module.isCompleted ? "text-primary-foreground" : "text-foreground"}`}
                        >
                          {module.isCompleted
                            ? "✓"
                            : locked
                              ? "—"
                              : String(moduleIndex + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-base font-black text-foreground">
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
                        {locked ? (
                          <Text className="mt-1 text-xs font-bold uppercase tracking-[1px] text-muted-foreground">
                            Locked
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {module.items.length === 0 ? (
                      <Text className="px-5 py-4 text-sm text-muted-foreground">
                        No activities in this module.
                      </Text>
                    ) : (
                      module.items.map((item, itemIndex) => (
                        <Pressable
                          className={`flex-row items-center gap-3 px-5 py-4 ${itemIndex > 0 ? "border-t border-border" : ""}`}
                          disabled={locked || item.type !== "MATERIAL"}
                          key={item.id}
                          onPress={() =>
                            router.push({
                              pathname:
                                "/courses/[courseId]/items/[courseItemId]",
                              params: { courseId, courseItemId: item.id },
                            })
                          }
                        >
                          <View
                            className={`size-9 items-center justify-center rounded-lg ${item.isCompleted ? "bg-primary" : "bg-muted"}`}
                          >
                            <Text
                              className={`text-xs font-black ${item.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
                            >
                              {item.isCompleted ? "✓" : itemMarks[item.type]}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text
                              className="font-bold text-foreground"
                              numberOfLines={2}
                            >
                              {item.title}
                            </Text>
                            <Text className="mt-1 text-xs text-muted-foreground">
                              {itemLabels[item.type]}
                            </Text>
                          </View>
                          <Text className="text-xs font-bold text-muted-foreground">
                            {item.isCompleted
                              ? "Done"
                              : locked
                                ? "Locked"
                                : item.type === "MATERIAL"
                                  ? "Open"
                                  : "Ready"}
                          </Text>
                        </Pressable>
                      ))
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
