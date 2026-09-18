import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { api } from "../../lib/trpc";
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
  onPress,
}: {
  icon: "timer" | "video.fill" | "checkmark.seal.fill";
  title: string;
  detail: string;
  badge?: string;
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

export function MainSidebarContent({ onClose }: { onClose: () => void }) {
  const { colors } = useAppTheme();
  const { activeOrganizationId } = useAppTheme();
  const scope = { organizationId: activeOrganizationId ?? undefined };
  const [now] = useState(() => Date.now());

  const coursesQuery = api.learning.listMyCourses.useQuery(scope);
  const cohortsQuery = api.learning.listMyCohorts.useQuery(scope);
  const eventsQuery = api.assessmentEvent.listForLearner.useQuery(scope);
  const attemptsQuery = api.assessment.listMyAttempts.useQuery(scope);

  const upcomingEvents = (eventsQuery.data ?? [])
    .filter((event) => !isStaleClosedOnDemandAssessment(event, now))
    .filter((event) => {
      const attempt = event.attempts[0];
      return (
        event.status === "OPEN" && (!attempt || attempt.status === "IN_PROGRESS")
      );
    })
    .sort((a, b) => {
      const aTime = a.closesAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.closesAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 3);

  const upcomingMeetings = (cohortsQuery.data ?? [])
    .flatMap((cohort) =>
      cohort.meetings.map((meeting) => ({ cohort, meeting })),
    )
    .filter(({ meeting }) => meetingState(meeting, now) !== "ended")
    .sort(
      (a, b) => a.meeting.startsAt.getTime() - b.meeting.startsAt.getTime(),
    )
    .slice(0, 3);

  const gradedAttempts = (attemptsQuery.data ?? [])
    .filter((attempt) => attempt.status === "GRADED")
    .slice(0, 3);

  return (
    <>
      {upcomingEvents.length > 0 ? (
        <View
          className="rounded-2xl px-1 py-2"
          style={{ marginBottom: 10 }}
        >
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
                  onPress={() => {
                    onClose();
                    if (
                      event.entry.destination === "ATTEMPT" &&
                      attempt
                    ) {
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
                      params: { eventId: event.id },
                    });
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {upcomingMeetings.length > 0 ? (
        <View
          className="rounded-2xl px-1 py-2"
          style={{ marginBottom: 10 }}
        >
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
                  onPress={() =>
                    openMeeting(meeting, cohort.course.id)
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {gradedAttempts.length > 0 ? (
        <View
          className="rounded-2xl px-1 py-2"
          style={{ marginBottom: 10 }}
        >
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
                    onClose();
                    router.push({
                      pathname:
                        "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                      params: {
                        courseId: attempt.courseItem.module.courseId,
                        courseItemId: attempt.courseItemId,
                        attemptId: attempt.id,
                      },
                    });
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {coursesQuery.data?.length ? (
        <View
          className="rounded-2xl px-1 py-2"
          style={{ marginBottom: 10 }}
        >
          <SectionHeader label="Courses" count={coursesQuery.data.length} />
          <View style={{ gap: 10 }}>
            {coursesQuery.data.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </View>
        </View>
      ) : null}

      {!upcomingEvents.length &&
      !upcomingMeetings.length &&
      !gradedAttempts.length &&
      !coursesQuery.data?.length &&
      !coursesQuery.isPending ? (
        <View className="rounded-2xl px-3 py-4" style={{ marginBottom: 10 }}>
          <Text
            className="text-sm"
            style={{ color: colors.mutedForeground }}
          >
            Upcoming assessments, live classes, and results will appear here.
          </Text>
        </View>
      ) : null}
    </>
  );
}
