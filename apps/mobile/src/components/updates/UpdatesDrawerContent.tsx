import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useDrawerProgress } from "react-native-drawer-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMemo } from "react";

import { requestLearnCohortFocus } from "../../lib/learn-cohort-focus";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { dateLabel } from "../../lib/study";
import {
  contentNoticeItemId,
  describeSyncNotice,
  groupSyncNotices,
  type SyncNoticeEntry,
} from "../../lib/sync-notices";
import { useAppTheme } from "../../providers/AppThemeProvider";
import {
  useCourseOutlines,
  useSyncIndex,
  useSyncNotices,
} from "../../sync/hooks";
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
  const index = useSyncIndex(activeOrganizationId);
  const { notices, markRead } = useSyncNotices(activeOrganizationId);
  const noticeEntries = useMemo(() => groupSyncNotices(notices), [notices]);
  const unreadNotices = noticeEntries.filter((entry) => !entry.read);
  // Read notices stay for 30 days as muted history.
  const readNotices = noticeEntries.filter((entry) => entry.read);
  // Validate notice destinations against the current outline, because an
  // item mentioned by an older revision may have since been removed.
  const outlineCourseIds = useMemo(
    () => [
      ...items
        .filter((item) => item.kind === "MODULE")
        .map((item) => item.courseId),
      ...noticeEntries
        .filter((entry) => entry.notice.kind === "COURSE_CONTENT")
        .map((entry) => entry.notice.courseId),
    ],
    [items, noticeEntries],
  );
  const { outlines } = useCourseOutlines(outlineCourseIds);
  const dashboard = {
    data: index.data ? { ...index.data, outlines } : undefined,
  };
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
      onNavigate(() => openMeeting(meeting));
      return;
    }
    onClose();
  }

  function markAllNoticesRead() {
    markRead(unreadNotices.flatMap((entry) => entry.ids));
  }

  function openNotice(entry: SyncNoticeEntry) {
    if (!entry.read) markRead(entry.ids);
    const notice = entry.notice;
    onNavigate(() => {
      switch (notice.kind) {
        case "COHORT_ADDED":
        case "MEETING_SCHEDULED":
        case "MEETING_RESCHEDULED":
        case "MEETING_CANCELLED":
          requestLearnCohortFocus(notice.cohortId);
          router.navigate("/(home)/(tabs)/learn");
          return;
        case "EVENT_OPENED":
        case "EVENT_DEADLINE_CHANGED":
        case "EVENT_CANCELLED":
          router.push({
            pathname: "/events/[eventId]",
            params: { eventId: notice.eventId },
          });
          return;
        case "ATTEMPT_GRADED":
          router.push({
            pathname:
              "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
            params: {
              courseId: notice.courseId,
              courseItemId: notice.courseItemId,
              attemptId: notice.attemptId,
            },
          });
          return;
        case "COURSE_CONTENT": {
          // A single changed activity opens directly; anything more opens
          // the course outline.
          const itemId = contentNoticeItemId(notice, outlines[notice.courseId]);
          if (itemId) {
            router.push({
              pathname: "/courses/[courseId]/items/[courseItemId]",
              params: {
                courseId: notice.courseId,
                courseItemId: itemId,
              },
            });
            return;
          }
          router.push({
            pathname: "/courses/[courseId]",
            params: { courseId: notice.courseId },
          });
          return;
        }
        case "COURSE_ADDED":
          router.push({
            pathname: "/courses/[courseId]",
            params: { courseId: notice.courseId },
          });
      }
    });
  }

  function renderNotice(entry: SyncNoticeEntry) {
    const { title, detail, icon } = describeSyncNotice(entry.notice);
    return (
      <View
        className="flex-row items-center"
        key={entry.key}
        style={entry.read ? { opacity: 0.55 } : undefined}
      >
        <Pressable
          accessibilityHint="Membuka pembaruan ini"
          accessibilityRole="button"
          className="min-w-0 flex-1 overflow-hidden rounded-xl py-2 pl-2.5 pr-1"
          onPress={() => openNotice(entry)}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="size-7 items-center justify-center rounded-full"
              style={{
                backgroundColor: entry.read
                  ? colors.sidebarAccent
                  : colors.primary,
              }}
            >
              <SymbolView
                fallback={
                  <Text
                    style={{
                      color: entry.read
                        ? colors.mutedForeground
                        : colors.primaryForeground,
                      fontSize: 14,
                    }}
                  >
                    •
                  </Text>
                }
                name={icon}
                size={14}
                tintColor={
                  entry.read ? colors.mutedForeground : colors.primaryForeground
                }
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className={entry.read ? "font-medium" : "font-semibold"}
                numberOfLines={1}
                style={{
                  color: entry.read
                    ? colors.mutedForeground
                    : colors.foreground,
                  fontSize: 13,
                }}
              >
                {title}
              </Text>
              <Text
                className="text-xs"
                numberOfLines={2}
                style={{ color: colors.mutedForeground }}
              >
                {detail}
              </Text>
            </View>
          </View>
        </Pressable>
        {entry.read ? null : (
          <Pressable
            accessibilityLabel={`Tandai ${title} sudah dibaca`}
            accessibilityRole="button"
            className="size-9 items-center justify-center rounded-full"
            hitSlop={4}
            onPress={() => markRead(entry.ids)}
          >
            <SymbolView
              fallback={
                <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>
                  ✓
                </Text>
              }
              name="checkmark"
              size={12}
              tintColor={colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>
    );
  }

  function renderNotices() {
    if (unreadNotices.length === 0) return null;
    return (
      <View
        className="rounded-2xl px-1 py-2"
        style={{ backgroundColor: colors.sidebarAccent, marginBottom: 10 }}
      >
        <View className="mb-1.5 flex-row items-center gap-2 px-2">
          <Text
            className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[1.6px]"
            numberOfLines={1}
            style={{ color: colors.mutedForeground }}
          >
            Baru disinkronkan
          </Text>
          <View
            className="rounded-full px-1.5 py-0.5"
            style={{ backgroundColor: colors.destructive }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: colors.destructiveForeground }}
            >
              {unreadNotices.length > 99 ? "99+" : unreadNotices.length}
            </Text>
          </View>
          <Pressable
            accessibilityHint="Menandai semua pemberitahuan sinkronisasi sudah dibaca"
            accessibilityRole="button"
            hitSlop={8}
            onPress={markAllNoticesRead}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primary }}
            >
              Tandai dibaca
            </Text>
          </Pressable>
        </View>
        <View style={{ gap: 1 }}>{unreadNotices.map(renderNotice)}</View>
      </View>
    );
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
      "Pembaruan belajar";
    const detail = courseModule
      ? `${course?.title ?? "Kurikulum"} · ${courseModule.items.length} aktivitas`
      : event
        ? `${event.course.title} · Tugas`
        : meeting && cohort
          ? `${cohort.name} · ${dateLabel(meeting.startsAt)}`
          : "Buka untuk melihat detail";
    const icon =
      item.kind === "MODULE"
        ? "book.pages.fill"
        : item.kind === "ASSESSMENT"
          ? "checklist"
          : "video.fill";

    return (
      <Pressable
        accessibilityHint="Membuka pembaruan ini"
        accessibilityRole="button"
        className="overflow-hidden rounded-xl px-2.5 py-2"
        key={item.key}
        onPress={() => openUpdate(item)}
        style={item.unread ? undefined : { opacity: 0.55 }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="size-7 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.sidebarAccent }}
          >
            <SymbolView
              fallback={
                <Text
                  style={{
                    color: item.unread
                      ? colors.primary
                      : colors.mutedForeground,
                    fontSize: 14,
                  }}
                >
                  •
                </Text>
              }
              name={icon}
              size={14}
              tintColor={item.unread ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`min-w-0 flex-1 ${item.unread ? "font-semibold" : "font-medium"}`}
                numberOfLines={1}
                style={{
                  color: item.unread
                    ? colors.foreground
                    : colors.mutedForeground,
                  fontSize: 13,
                }}
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
                    Baru
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

  function renderSection(
    label: string,
    sectionItems: typeof updateItems,
    sectionNotices: SyncNoticeEntry[] = [],
  ) {
    const total = sectionItems.length + sectionNotices.length;
    if (total === 0) return null;
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
            {total}
          </Text>
        </View>
        <View style={{ gap: 1 }}>
          {sectionNotices.map(renderNotice)}
          {sectionItems.map(renderUpdate)}
        </View>
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
            Pembaruan
          </Text>
          <Text
            className="text-xs font-semibold uppercase tracking-[2px]"
            numberOfLines={1}
            style={{ color: colors.mutedForeground }}
          >
            Belajar
          </Text>
        </View>
        {unreadCount > 0 || unreadNotices.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            className="rounded-xl px-2.5 py-2"
            onPress={() => {
              markAllSeen();
              markAllNoticesRead();
            }}
            style={{ backgroundColor: colors.sidebarAccent }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primary }}
            >
              Tandai dibaca
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Tutup pembaruan"
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
        {renderNotices()}
        {updateItems.length === 0 && noticeEntries.length === 0 ? (
          <View className="items-center border-y border-border px-6 py-10">
            <Text
              className="text-base font-bold"
              style={{ color: colors.foreground }}
            >
              Belum ada pembaruan
            </Text>
            <Text
              className="mt-2 text-center text-sm leading-5"
              style={{ color: colors.mutedForeground }}
            >
              Bab, tugas, dan pertemuan kelas baru akan muncul di sini.
            </Text>
          </View>
        ) : (
          <>
            {renderSection("Baru", newItems)}
            {renderSection("Sebelumnya · 30 hari", recentItems, readNotices)}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}
