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
  onNavigate: (action: () => void) => void;
};

export function CourseSidebarContent({
  courseId,
  currentItemId,
  onClose,
  onExitToMenu,
  onNavigate,
}: CourseSidebarContentProps) {
  const { colors } = useAppTheme();

  // The drawer opens from the course screen (no currentItemId) or from an
  // item/attempt screen. Replacing between items keeps the stack shallow so
  // back returns to the course instead of walking through every viewed item;
  // pushing from the course screen preserves back-to-course.
  type NavigateArgs = Parameters<typeof router.push>[0];
  const go = (args: NavigateArgs) => {
    if (currentItemId) router.replace(args);
    else router.push(args);
  };

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
            // Already on the course screen: pushing would duplicate it.
            if (!currentItemId) {
              onClose();
              return;
            }
            onNavigate(() =>
              go({
                pathname: "/courses/[courseId]",
                params: { courseId },
              }),
            );
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
          if (attempt?.status === "IN_PROGRESS") {
            onNavigate(() =>
              go({
                pathname:
                  "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                params: {
                  courseId,
                  courseItemId: item.id,
                  attemptId: attempt.id,
                },
              }),
            );
            return;
          }
          onNavigate(() =>
            go({
              pathname: "/courses/[courseId]/items/[courseItemId]",
              params: {
                courseId,
                courseItemId: item.id,
              },
            }),
          );
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
