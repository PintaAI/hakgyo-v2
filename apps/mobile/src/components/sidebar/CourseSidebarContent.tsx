import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { CourseOutlineList } from "../learn/course-outline-list";
import { courseSidebarConfig } from "./config-course";

type CourseSidebarContentProps = {
  courseId: string;
  currentItemId?: string;
  onClose: () => void;
  onExitToMenu: () => void;
};

export function CourseSidebarContent({
  courseId,
  currentItemId,
  onClose,
  onExitToMenu,
}: CourseSidebarContentProps) {
  const { colors } = useAppTheme();

  return (
    <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
      <View className="mb-1.5 flex-row items-center justify-between px-2">
        <Text
          className="text-xs font-semibold uppercase tracking-[1.6px]"
          style={{ color: colors.mutedForeground }}
        >
          {courseSidebarConfig.sectionLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            router.push({
              pathname: "/courses/[courseId]",
              params: { courseId },
            });
          }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: colors.primary }}
          >
            {courseSidebarConfig.viewCourseLabel}
          </Text>
        </Pressable>
      </View>
      <CourseOutlineList
        courseId={courseId}
        currentItemId={currentItemId}
        showHeader={false}
        onOpenItem={(item, attempt) => {
          if (item.id === currentItemId) {
            onClose();
            return;
          }
          onClose();
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
          router.push({
            pathname: "/courses/[courseId]/items/[courseItemId]",
            params: {
              courseId,
              courseItemId: item.id,
            },
          });
        }}
      />
      <Pressable
        accessibilityRole="button"
        className="mt-3 px-2 py-2"
        onPress={onExitToMenu}
      >
        <Text
          className="text-xs font-bold"
          style={{ color: colors.mutedForeground }}
        >
          {courseSidebarConfig.backToMenuLabel}
        </Text>
      </Pressable>
    </View>
  );
}
