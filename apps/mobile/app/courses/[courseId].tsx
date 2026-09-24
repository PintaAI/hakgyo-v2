import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CourseOutlineList } from "../../src/components/learn/course-outline-list";
import { getCourseResumeItem } from "../../src/lib/course-learning-path";
import { authClient } from "../../src/lib/auth-client";
import { api } from "../../src/lib/trpc";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { withOpacity } from "../../src/theme/colors";

export default function CourseDetailScreen() {
  const params = useLocalSearchParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId)
    ? (params.courseId[0] ?? "")
    : (params.courseId ?? "");
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { activeOrganizationId, colors } = useAppTheme();
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && courseId), retry: false },
  );
  const dashboardCourse = dashboard.data?.outlines[courseId];
  const courseQuery = api.learning.getCourseOutline.useQuery(
    { courseId },
    {
      enabled: Boolean(
        session && courseId && !dashboard.isPending && !dashboardCourse,
      ),
      retry: false,
    },
  );

  useEffect(() => {
    if (!isSessionPending && !session && courseId) {
      router.replace({
        pathname: "/auth",
        params: { redirectTo: `/courses/${encodeURIComponent(courseId)}` },
      });
    }
  }, [courseId, isSessionPending, session]);

  const course = dashboardCourse ?? courseQuery.data;
  const resumeItem = course && getCourseResumeItem(course);
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
      ) : (dashboard.isPending || courseQuery.isPending) && !course ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">Loading course…</Text>
        </View>
      ) : dashboard.isError || courseQuery.isError || !course ? (
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
                  cachePolicy="memory-disk"
                  className="absolute inset-0 z-0 h-full w-full"
                  contentFit="cover"
                  source={{ uri: course.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  transition={0}
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

          {resumeItem ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={`Open ${resumeItem.title}`}
              className="flex-row items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 active:opacity-80"
              onPress={() => {
                if (
                  resumeItem.type === "ASSESSMENT" &&
                  resumeItem.attempt?.status === "IN_PROGRESS"
                ) {
                  router.replace({
                    pathname:
                      "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                    params: {
                      courseId,
                      courseItemId: resumeItem.id,
                      attemptId: resumeItem.attempt.id,
                    },
                  });
                  return;
                }
                router.replace({
                  pathname: "/courses/[courseId]/items/[courseItemId]",
                  params: { courseId, courseItemId: resumeItem.id },
                });
              }}
            >
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-primary">
                  {completedCount ? "Continue learning" : "Start learning"}
                </Text>
                <Text
                  className="text-base font-black text-foreground"
                  numberOfLines={1}
                >
                  {resumeItem.title}
                </Text>
              </View>
              <Text className="text-xl font-bold text-primary">→</Text>
            </Pressable>
          ) : allItems.length > 0 && completedCount === allItems.length ? (
            <View className="gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <Text className="text-xl font-black text-foreground">
                🏆 Course complete!
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                You did it. Every activity is complete — revisit any material
                below whenever you want a refresher.
              </Text>
            </View>
          ) : null}

          <CourseOutlineList
            courseId={courseId}
            showActiveState={false}
            onOpenItem={(item, attempt) => {
              if (attempt?.status === "IN_PROGRESS") {
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
              // Replace (not push) so the item renders as a
              // full-screen card instead of inside the
              // course formSheet. Trade-off: no back stack
              // to the course outline.
              router.replace({
                pathname: "/courses/[courseId]/items/[courseItemId]",
                params: {
                  courseId,
                  courseItemId: item.id,
                },
              });
            }}
          />
        </ScrollView>
      )}
    </>
  );
}
