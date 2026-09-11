import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";

export type StandaloneCourse = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  progressionMode: string;
  organization: { name: string };
};

export function CourseCard({
  course,
  isFirst = false,
}: {
  course: StandaloneCourse;
  isFirst?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const contentTopPadding = isFirst ? insets.top + 20 : 20;
  return (
    <Pressable
      accessibilityHint="Opens the course details"
      accessibilityRole="button"
      className="relative min-h-48 overflow-hidden rounded-xl border border-border bg-card"
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
            style={{ backgroundColor: withOpacity(colors.background, 0.78) }}
          />
        </>
      ) : null}
      <View
        className="relative z-20 min-h-48 justify-between gap-8 p-5"
        style={{ paddingTop: contentTopPadding }}
      >
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-lg font-black text-foreground">
              {course.title}
            </Text>
            <View className="rounded-full border border-border px-2 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {course.progressionMode === "SEQUENTIAL"
                  ? "Sequential"
                  : "Open"}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-semibold text-muted-foreground">
            {course.organization.name}
          </Text>
        </View>
        {course.description ? (
          <Text
            className="text-sm leading-5 text-muted-foreground"
            numberOfLines={3}
          >
            {course.description}
          </Text>
        ) : null}
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
            Course
          </Text>
          <Text className="text-sm font-black text-foreground">Open →</Text>
        </View>
      </View>
    </Pressable>
  );
}
