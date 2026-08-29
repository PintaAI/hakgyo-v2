import { router, Stack } from "expo-router";

import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function HomeTab() {
  const { colors } = useAppTheme();
  const { open } = useDrawer();
  const coursesQuery = api.learning.listMyCourses.useQuery();
  const courses = coursesQuery.data ?? [];

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Open menu"
          icon={toolbarIcons.menu}
          onPress={open}
        />
      </Stack.Toolbar>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 px-5 pt-4 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            onRefresh={() => void coursesQuery.refetch()}
            refreshing={coursesQuery.isRefetching}
            tintColor={colors.primary}
          />
        }
      >
        <View className="gap-3">
          {coursesQuery.isPending ? (
            <View className="items-center rounded-xl border border-border bg-card px-5 py-10">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-muted-foreground">
                Loading your courses…
              </Text>
            </View>
          ) : coursesQuery.isError ? (
            <View className="gap-3 rounded-xl border border-border bg-card px-5 py-5">
              <Text className="text-sm leading-5 text-destructive">
                We couldn’t load your courses. Check your connection and try
                again.
              </Text>
              <Pressable
                className="self-start rounded-full bg-primary px-4 py-3"
                onPress={() => void coursesQuery.refetch()}
              >
                <Text className="font-bold text-primary-foreground">Retry</Text>
              </Pressable>
            </View>
          ) : courses.length === 0 ? (
            <View className="gap-2 rounded-xl border border-border bg-card px-5 py-6">
              <Text className="text-base font-bold text-foreground">
                No courses yet
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Enrolled courses will appear here when they are available.
              </Text>
            </View>
          ) : (
            courses.map((course) => (
              <Pressable
                accessibilityHint="Opens the course details"
                accessibilityRole="button"
                className={`relative min-h-48 overflow-hidden rounded-xl border border-border ${course.thumbnailUrl ? "bg-[#171915]" : "bg-card"}`}
                key={course.id}
                onPress={() =>
                  router.push({
                    pathname: "/courses/[courseId]",
                    params: { courseId: course.id },
                  })
                }
              >
                {course.thumbnailUrl ? (
                  <>
                    <Image
                      accessibilityIgnoresInvertColors
                      className="absolute inset-0 z-0 size-full"
                      resizeMode="cover"
                      source={{ uri: course.thumbnailUrl }}
                    />
                    <View
                      className="absolute inset-0 z-10"
                      style={{ backgroundColor: "rgba(0, 0, 0, 0.68)" }}
                    />
                  </>
                ) : null}
                <View className="relative z-20 min-h-48 justify-between gap-8 p-5">
                  <View className="gap-2">
                    <View className="flex-row items-start justify-between gap-3">
                      <Text
                        className={`flex-1 text-lg font-black ${course.thumbnailUrl ? "text-white" : "text-foreground"}`}
                      >
                        {course.title}
                      </Text>
                      <View
                        className={`rounded-full border px-2 py-1 ${course.thumbnailUrl ? "border-white/30" : "border-border"}`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase tracking-[1px] ${course.thumbnailUrl ? "text-white/80" : "text-muted-foreground"}`}
                        >
                          {course.progressionMode === "SEQUENTIAL"
                            ? "Sequential"
                            : "Open"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`text-sm font-semibold ${course.thumbnailUrl ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      {course.organization.name}
                    </Text>
                  </View>
                  {course.description ? (
                    <Text
                      className={`text-sm leading-5 ${course.thumbnailUrl ? "text-white/70" : "text-muted-foreground"}`}
                      numberOfLines={3}
                    >
                      {course.description}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center justify-between gap-3">
                    <Text
                      className={`text-xs font-semibold uppercase tracking-[1px] ${course.thumbnailUrl ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      Course
                    </Text>
                    <Text
                      className={`text-sm font-black ${course.thumbnailUrl ? "text-white" : "text-foreground"}`}
                    >
                      Open →
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}
