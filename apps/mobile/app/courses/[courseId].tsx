import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { CourseOutlineList } from "../../src/components/learn/course-outline-list";
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

          <CourseOutlineList
            courseId={courseId}
            onOpenItem={(item, attempt) => {
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
