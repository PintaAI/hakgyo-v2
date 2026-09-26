import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useSyncIndex } from "../../sync/hooks";
import {
  countUnreadIndicators,
  MAIN_SIDEBAR_INDICATOR_KINDS,
} from "../../lib/sidebar-indicator-count";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useAppTheme } from "../../providers/AppThemeProvider";
import {
  assessmentAttemptPresentation,
  isStaleClosedOnDemandAssessment,
} from "../../lib/assessment-state";
import { dateLabel, meetingState } from "../../lib/study";
import { CourseCard } from "../learn/course-card";
import {
  assessmentSourceBadge,
  closesLabel,
  openMeeting,
} from "../learn/cohort-card";

function SectionHeader({ label, count }: { label: string; count: number }) {
  const { colors } = useAppTheme();
  return (
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
        {count}
      </Text>
    </View>
  );
}

function SidebarActionRow({
  icon,
  title,
  detail,
  badge,
  unread = false,
  onPress,
}: {
  icon: "timer" | "video.fill" | "checkmark.seal.fill";
  title: string;
  detail: string;
  badge?: string;
  unread?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const iconName =
    icon === "timer"
      ? "timer"
      : icon === "video.fill"
        ? "video.fill"
        : "checkmark.seal.fill";
  return (
    <Pressable
      accessibilityRole="button"
      className="overflow-hidden rounded-xl px-2.5 py-2"
      onPress={onPress}
      style={{ backgroundColor: "transparent" }}
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
            name={iconName}
            size={14}
            tintColor={colors.primary}
          />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="font-semibold"
              numberOfLines={1}
              style={{ color: colors.foreground, fontSize: 13 }}
            >
              {title}
            </Text>
            {unread ? (
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
            {badge ? (
              <View
                className="rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: colors.primary }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: colors.primaryForeground }}
                >
                  {badge}
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
      </View>
    </Pressable>
  );
}

export function MainSidebarContent({
  onNavigate,
}: {
  onNavigate: (action: () => void) => void;
}) {
  const { activeOrganizationId, colors } = useAppTheme();
  const { indicator, items, markEntitySeen, markSeen } = useSidebarIndicators();
  const mainSidebarUnreadCount = countUnreadIndicators(
    items,
    MAIN_SIDEBAR_INDICATOR_KINDS,
  );
  const markMainSidebarSeen = () =>
    markSeen(
      items
        .filter(
          (item) => item.unread && MAIN_SIDEBAR_INDICATOR_KINDS.has(item.kind),
        )
        .map((item) => item.key),
    );
  const [now] = useState(() => Date.now());

  // Local learner index (events, cohorts, attempts, courses).
  const dashboard = useSyncIndex(activeOrganizationId);

  const upcomingEvents = (dashboard.data?.events ?? [])
    .filter((event) => !isStaleClosedOnDemandAssessment(event, now))
    .filter((event) => {
      const attempt = event.attempts[0];
      return (
        event.status === "OPEN" &&
        (!attempt || attempt.status === "IN_PROGRESS")
      );
    })
    .sort((a, b) => {
      const aTime = a.closesAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.closesAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 3);

  const upcomingMeetings = (dashboard.data?.cohorts ?? [])
    .flatMap((cohort) =>
      cohort.meetings.map((meeting) => ({ cohort, meeting })),
    )
    .filter(({ meeting }) => meetingState(meeting, now) !== "ended")
    .sort((a, b) => a.meeting.startsAt.getTime() - b.meeting.startsAt.getTime())
    .slice(0, 3);

  const gradedAttempts = (dashboard.data?.attempts ?? [])
    .filter((attempt) => attempt.status === "GRADED")
    .slice(0, 3);

  return (
    <>
      {mainSidebarUnreadCount > 0 ? (
        <View
          className="mx-1 mb-2 flex-row items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: colors.sidebarAccent }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.foreground }}
          >
            {mainSidebarUnreadCount} new{" "}
            {mainSidebarUnreadCount === 1 ? "update" : "updates"}
          </Text>
          <Pressable accessibilityRole="button" onPress={markMainSidebarSeen}>
            <Text
              className="text-xs font-bold"
              style={{ color: colors.primary }}
            >
              Catch up
            </Text>
          </Pressable>
        </View>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
          <SectionHeader label="Up next" count={upcomingEvents.length} />
          <View style={{ gap: 1 }}>
            {upcomingEvents.map((event) => {
              const attempt = event.attempts[0];
              const urgent =
                !!event.closesAt &&
                event.closesAt.getTime() - now < 48 * 3_600_000;
              return (
                <SidebarActionRow
                  key={event.id}
                  icon="timer"
                  title={event.title}
                  detail={`${assessmentSourceBadge(event)} · ${event.course.title}${event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}`}
                  badge={urgent ? "Due" : undefined}
                  unread={indicator("ASSESSMENT", event.id)?.unread ?? false}
                  onPress={() => {
                    markEntitySeen("ASSESSMENT", event.id);
                    if (event.entry.destination === "ATTEMPT" && attempt) {
                      onNavigate(() =>
                        router.push({
                          pathname:
                            "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                          params: {
                            courseId: event.course.id,
                            courseItemId: event.courseItem.id,
                            attemptId: attempt.id,
                          },
                        }),
                      );
                      return;
                    }
                    onNavigate(() =>
                      router.push({
                        pathname: "/events/[eventId]",
                        params: { eventId: event.id },
                      }),
                    );
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {upcomingMeetings.length > 0 ? (
        <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
          <SectionHeader label="Live classes" count={upcomingMeetings.length} />
          <View style={{ gap: 1 }}>
            {upcomingMeetings.map(({ cohort, meeting }) => {
              const state = meetingState(meeting, now);
              return (
                <SidebarActionRow
                  key={meeting.id}
                  icon="video.fill"
                  title={meeting.title}
                  detail={`${cohort.name} · ${dateLabel(meeting.startsAt)}`}
                  badge={state === "live" ? "Live" : undefined}
                  unread={indicator("MEETING", meeting.id)?.unread ?? false}
                  onPress={() => {
                    markEntitySeen("MEETING", meeting.id);
                    openMeeting(meeting, cohort.course.id);
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {gradedAttempts.length > 0 ? (
        <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
          <SectionHeader label="Results" count={gradedAttempts.length} />
          <View style={{ gap: 1 }}>
            {gradedAttempts.map((attempt) => {
              const presentation = assessmentAttemptPresentation(attempt);
              const score =
                attempt.score !== null && attempt.maxScore !== null
                  ? `${attempt.score}/${attempt.maxScore}`
                  : presentation.detail;
              return (
                <SidebarActionRow
                  key={attempt.id}
                  icon="checkmark.seal.fill"
                  title={attempt.assessment.title}
                  detail={`${score} · ${dateLabel(attempt.startedAt)}`}
                  onPress={() => {
                    onNavigate(() =>
                      router.push({
                        pathname:
                          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                        params: {
                          courseId: attempt.courseItem.module.courseId,
                          courseItemId: attempt.courseItemId,
                          attemptId: attempt.id,
                        },
                      }),
                    );
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {dashboard.data?.courses.length ? (
        <View className="rounded-2xl px-1 py-2" style={{ marginBottom: 10 }}>
          <SectionHeader
            label="Courses"
            count={dashboard.data.courses.length}
          />
          <View style={{ gap: 1 }}>
            {dashboard.data.courses.map((course) => (
              <CourseCard
                course={course}
                key={course.id}
                onPress={() =>
                  onNavigate(() =>
                    router.push({
                      pathname: "/courses/[courseId]",
                      params: { courseId: course.id },
                    }),
                  )
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {!upcomingEvents.length &&
      !upcomingMeetings.length &&
      !gradedAttempts.length &&
      !dashboard.data?.courses.length &&
      !dashboard.isPending ? (
        <View className="rounded-2xl px-3 py-4" style={{ marginBottom: 10 }}>
          <Text className="text-sm" style={{ color: colors.mutedForeground }}>
            Upcoming assessments, live classes, and results will appear here.
          </Text>
        </View>
      ) : null}
    </>
  );
}
