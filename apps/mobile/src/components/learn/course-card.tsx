import { router } from "expo-router";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";

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
  onPress,
}: {
  course: StandaloneCourse;
  isFirst?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  void isFirst;
  const handlePress =
    onPress ??
    (() =>
      router.push({
        pathname: "/courses/[courseId]",
        params: { courseId: course.id },
      }));
  const initial = course.title.trim().charAt(0).toUpperCase() || "C";
  const modeLabel =
    course.progressionMode === "SEQUENTIAL" ? "Sequential" : "Open";
  return (
    <Pressable
      accessibilityHint="Opens the course details"
      accessibilityRole="button"
      className="flex-row items-center gap-2.5 rounded-xl px-2.5 py-2"
      onPress={handlePress}
      style={{ backgroundColor: "transparent" }}
    >
      {course.thumbnailUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: course.thumbnailUrl }}
          style={{ width: 44, height: 44, borderRadius: 12 }}
          transition={0}
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.sidebarAccent,
          }}
        >
          <Text
            className="text-base font-black"
            style={{ color: colors.primary }}
          >
            {initial}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className="font-semibold"
          numberOfLines={1}
          style={{ color: colors.foreground, fontSize: 13 }}
        >
          {course.title}
        </Text>
        <Text
          className="text-xs"
          numberOfLines={1}
          style={{ color: colors.mutedForeground }}
        >
          {course.organization.name} · {modeLabel}
        </Text>
      </View>
      <Text
        className="text-lg font-bold"
        style={{ color: colors.mutedForeground }}
      >
        ›
      </Text>
    </Pressable>
  );
}
