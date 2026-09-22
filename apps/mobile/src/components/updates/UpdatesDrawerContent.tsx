import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useDrawerProgress } from "react-native-drawer-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { dateLabel } from "../../lib/study";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { openMeeting } from "../learn/cohort-card";

type UpdatesDrawerContentProps = {
  onClose: () => void;
  onNavigate: (action: () => void) => void;
};

export function UpdatesDrawerContent({
  onClose,
  onNavigate,
}: UpdatesDrawerContentProps) {
  const insets = useSafeAreaInsets();
  const { activeOrganizationId, colors } = useAppTheme();
  const { items, markAllSeen, markEntitySeen, unreadCount } =
    useSidebarIndicators();
  const scope = activeOrganizationId
    ? { organizationId: activeOrganizationId }
    : undefined;
  const dashboard = api.mobileSync.getDashboard.useQuery(scope, {
    enabled: Boolean(activeOrganizationId),
    retry: false,
  });
  const updateItems = [...items].sort(
    (first, second) => Number(second.unread) - Number(first.unread),
  );
  const newItems = updateItems.filter((item) => item.unread);
  const recentItems = updateItems.filter((item) => !item.unread);
  const progress = useDrawerProgress();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [20, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  function openUpdate(item: (typeof items)[number]) {
    markEntitySeen(item.kind, item.entityId);

    if (item.kind === "MODULE") {
      const course = dashboard.data?.outlines[item.courseId];
      const courseModule = course?.modules.find(
        (candidate) => candidate.id === item.entityId,
      );
      const firstItem = courseModule?.items[0];
      onNavigate(() => {
        if (firstItem) {
          router.push({
            pathname: "/courses/[courseId]/items/[courseItemId]",
            params: { courseId: item.courseId, courseItemId: firstItem.id },
          });
          return;
        }
        router.push({
          pathname: "/courses/[courseId]",
          params: { courseId: item.courseId },
        });
      });
      return;
    }

    if (item.kind === "ASSESSMENT") {
      const event = dashboard.data?.events.find(
        (candidate) => candidate.id === item.entityId,
      );
      const attempt = event?.attempts[0];
      onNavigate(() => {
        if (event?.entry.destination === "ATTEMPT" && attempt) {
          router.push({
            pathname:
              "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
            params: {
              courseId: event.course.id,
              courseItemId: event.courseItem.id,
              attemptId: attempt.id,
            },
          });
          return;
        }
        router.push({
          pathname: "/events/[eventId]",
          params: { eventId: item.entityId },
        });
      });
      return;
    }

    const cohort = dashboard.data?.cohorts.find((candidate) =>
      candidate.meetings.some((meeting) => meeting.id === item.entityId),
    );
    const meeting = cohort?.meetings.find(
      (candidate) => candidate.id === item.entityId,
    );
    if (cohort && meeting) {
      onNavigate(() => void openMeeting(meeting, cohort.course.id));
      return;
    }
    onClose();
  }

  function renderUpdate(item: (typeof items)[number]) {
    const course = dashboard.data?.outlines[item.courseId];
    const courseModule =
      item.kind === "MODULE"
        ? course?.modules.find((candidate) => candidate.id === item.entityId)
        : undefined;
    const event =
      item.kind === "ASSESSMENT"
        ? dashboard.data?.events.find(
            (candidate) => candidate.id === item.entityId,
          )
        : undefined;
    const cohort =
      item.kind === "MEETING"
        ? dashboard.data?.cohorts.find((candidate) =>
            candidate.meetings.some((meeting) => meeting.id === item.entityId),
          )
        : undefined;
    const meeting = cohort?.meetings.find(
      (candidate) => candidate.id === item.entityId,
    );
    const title =
      courseModule?.title ??
      event?.title ??
      meeting?.title ??
      "Learning update";
    const detail = courseModule
      ? `${course?.title ?? "Course"} · ${courseModule.items.length} ${courseModule.items.length === 1 ? "activity" : "activities"}`
      : event
        ? `${event.course.title} · Assessment`
        : meeting && cohort
          ? `${cohort.name} · ${dateLabel(meeting.startsAt)}`
          : "Open to view details";
    const icon =
      item.kind === "MODULE"
        ? "book.pages.fill"
        : item.kind === "ASSESSMENT"
          ? "checklist"
          : "video.fill";

    return (
      <Pressable
        accessibilityHint="Opens this update"
        accessibilityRole="button"
        className="overflow-hidden rounded-xl px-2.5 py-2"
        key={item.key}
        onPress={() => openUpdate(item)}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="size-7 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.sidebarAccent }}
          >
            <SymbolView
              fallback={
                <Text style={{ color: colors.primary, fontSize: 14 }}>•</Text>
              }
              name={icon}
              size={14}
              tintColor={colors.primary}
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text
                className="min-w-0 flex-1 font-semibold"
                numberOfLines={1}
                style={{ color: colors.foreground, fontSize: 13 }}
              >
                {title}
              </Text>
              {item.unread ? (
                <View
                  className="rounded-full px-1.5 py-0.5"
                  style={{ backgroundColor: colors.destructive }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: colors.destructiveForeground }}
                  >
                    New
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              className="text-xs"
              numberOfLines={1}
              style={{ color: colors.mutedForeground }}
            >
              {detail}
            </Text>
          </View>
          <Text className="text-xl" style={{ color: colors.mutedForeground }}>
            ›
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderSection(label: string, sectionItems: typeof updateItems) {
    if (sectionItems.length === 0) return null;
    return (
      <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
        <View className="mb-1.5 flex-row items-center justify-between px-2">
          <Text
            className="text-xs font-semibold uppercase tracking-[1.6px]"
            style={{ color: colors.mutedForeground }}
          >
            {label}
          </Text>
          <Text
            className="text-xs font-bold"
            style={{ color: colors.mutedForeground }}
          >
            {sectionItems.length}
          </Text>
        </View>
        <View style={{ gap: 1 }}>{sectionItems.map(renderUpdate)}</View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.background,
          flex: 1,
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: Math.max(insets.top + 16, 54),
        },
      ]}
    >
      <View className="mb-5 flex-row items-center gap-3 px-1">
        <View
          className="size-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.primary }}
        >
          <SymbolView
            fallback={
              <Text style={{ color: colors.primaryForeground }}>•</Text>
            }
            name="bell.fill"
            size={19}
            tintColor={colors.primaryForeground}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-xl font-black tracking-tight"
            numberOfLines={1}
            style={{ color: colors.foreground }}
          >
            Updates
          </Text>
          <Text
            className="text-xs font-semibold uppercase tracking-[2px]"
            numberOfLines={1}
            style={{ color: colors.mutedForeground }}
          >
            Learn
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            className="rounded-xl px-2.5 py-2"
            onPress={markAllSeen}
            style={{ backgroundColor: colors.sidebarAccent }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primary }}
            >
              Mark read
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Close updates"
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-full"
          onPress={onClose}
          style={{ backgroundColor: colors.sidebarAccent }}
        >
          <SymbolView
            fallback={<Text style={{ color: colors.foreground }}>×</Text>}
            name="xmark"
            size={15}
            tintColor={colors.foreground}
          />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {updateItems.length === 0 ? (
          <View className="items-center border-y border-border px-6 py-10">
            <Text
              className="text-base font-bold"
              style={{ color: colors.foreground }}
            >
              No updates yet
            </Text>
            <Text
              className="mt-2 text-center text-sm leading-5"
              style={{ color: colors.mutedForeground }}
            >
              New modules, assessments, and class meetings will appear here.
            </Text>
          </View>
        ) : (
          <>
            {renderSection("New", newItems)}
            {renderSection("Recent", recentItems)}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}
