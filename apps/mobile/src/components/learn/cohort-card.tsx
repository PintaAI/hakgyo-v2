import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, Image, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  assessmentAttemptPresentation,
  isStaleClosedOnDemandAssessment,
} from "../../lib/assessment-state";
import {
  canOpenModule,
  dateLabel,
  meetingState,
  safeExternalUrl,
} from "../../lib/study";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { QueryState, Row } from "../learning-ui";

export type CohortMeeting = {
  id: string;
  title: string;
  agenda: string | null;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  status: string;
  joinUrl: string | null;
};

export type LearnCohort = {
  id: string;
  name: string;
  description: string | null;
  whatsappGroupUrl: string | null;
  course: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    progressionMode: string;
  };
  meetings: CohortMeeting[];
  learnerCount: number;
  facilitators: { name: string; image: string | null }[];
};

export type CohortEvent = {
  id: string;
  title: string;
  type: string;
  scope?: string | null;
  status?: string | null;
  cohort?: { id: string; name: string } | null;
  closesAt: Date | null;
  closedAt?: Date | null;
  attempts: {
    status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
    score: number | null;
    maxScore: number | null;
  }[];
};

export function assessmentSourceBadge(event: {
  type: string;
  scope?: string | null;
}) {
  if (event.type === "TRYOUT") return "Tryout";
  if (event.scope === "COHORT") return "Cohort assessment";
  return "Assessment";
}

export async function openExternalLink(
  value: string,
  kind: "zoom" | "whatsapp",
) {
  const url = safeExternalUrl(value, kind);
  if (!url) {
    Alert.alert(
      "Link unavailable",
      "Ask your course contact for an updated link.",
    );
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn’t open the link",
      "Check that the app or a browser is available, then try again.",
    );
  }
}

function weekdayLabel(date: Date) {
  return date
    .toLocaleDateString(undefined, { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
}

export function SessionBlock({
  meeting,
  state,
}: {
  meeting: CohortMeeting;
  state: "live" | "joining" | "upcoming";
}) {
  const joinable =
    !!meeting.joinUrl && (state === "live" || state === "joining");
  const live = state === "live";
  return (
    <View
      className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${live ? "bg-primary" : "bg-muted"}`}
    >
      <View
        className={`w-12 items-center rounded-lg border py-1.5 ${live ? "border-primary-foreground/30 bg-primary-foreground/15" : "border-border bg-background"}`}
      >
        <Text
          className={`text-[10px] font-black tracking-[1px] ${live ? "text-primary-foreground/80" : "text-primary"}`}
        >
          {weekdayLabel(meeting.startsAt)}
        </Text>
        <Text
          className={`text-lg font-black leading-5 ${live ? "text-primary-foreground" : "text-foreground"}`}
        >
          {meeting.startsAt.getDate()}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`font-bold ${live ? "text-primary-foreground" : "text-foreground"}`}
          numberOfLines={1}
        >
          {meeting.title}
        </Text>
        <Text
          className={`text-xs font-semibold ${live ? "text-primary-foreground/75" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {live
            ? "Happening now"
            : state === "joining"
              ? "Starting soon"
              : dateLabel(meeting.startsAt)}{" "}
          · {meeting.durationMinutes} min
        </Text>
      </View>
      {joinable && meeting.joinUrl ? (
        <Pressable
          accessibilityHint="Opens the meeting link"
          accessibilityRole="button"
          className={`rounded-full px-4 py-2.5 ${live ? "bg-primary-foreground" : "bg-primary"}`}
          onPress={() =>
            meeting.joinUrl && void openExternalLink(meeting.joinUrl, "zoom")
          }
        >
          <Text
            className={`text-sm font-bold ${live ? "text-primary" : "text-primary-foreground"}`}
          >
            Join
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function eventSummary(events: CohortEvent[]) {
  const open = events.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  return { open, total: events.length };
}

export function closesLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return `closed ${dateLabel(closesAt)}`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `closes in ${Math.max(hours, 1)}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `closes in ${days}d`;
  return `closes ${dateLabel(closesAt)}`;
}

const SOURCE_BADGE = "text-[11px] font-bold uppercase tracking-[1.5px]";

export function CohortCard({
  cohort,
  thumbnailUrl,
  events,
  eventsPending,
  eventsError,
  onRetryEvents,
  now,
  isFirst = false,
}: {
  cohort: LearnCohort;
  thumbnailUrl?: string | null;
  events: CohortEvent[];
  eventsPending: boolean;
  eventsError?: { message: string } | null;
  onRetryEvents: () => void;
  now: number;
  isFirst?: boolean;
}) {
  const upcoming = cohort.meetings
    .filter((meeting) => meetingState(meeting, now) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const next = upcoming[0];
  const nextState = next
    ? (meetingState(next, now) as "live" | "joining" | "upcoming")
    : null;
  const visibleEvents = events.filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const { open, total } = eventSummary(visibleEvents);
  const featured = open[0] ?? visibleEvents[0];
  const remaining = featured ? total - 1 : 0;
  const featuredAttempt = featured?.attempts[0];
  const featuredActionable =
    !!featured &&
    (!featuredAttempt || featuredAttempt.status === "IN_PROGRESS");
  const featuredUrgent =
    !!featured?.closesAt &&
    featured.closesAt.getTime() - now < 48 * 3_600_000 &&
    featuredActionable;
  const featuredStatusLabel = !featured
    ? null
    : featuredUrgent
      ? "Due soon"
      : !featuredAttempt
        ? "Open"
        : featuredAttempt.status === "IN_PROGRESS"
          ? "In progress"
          : null;

  const openFeaturedAssessment = () => {
    if (!featured) return;
    router.push({
      pathname: "/events/[eventId]",
      params: { eventId: featured.id },
    });
  };
  // Outline is fetched once here and drives progress, next item, and type.
  const outlineQuery = api.learning.getCourseOutline.useQuery({
    courseId: cohort.course.id,
  });
  const outlineItems =
    outlineQuery.data?.modules.flatMap((module) => module.items) ?? [];
  const completedCount = outlineItems.filter((item) => item.isCompleted).length;
  const progress = outlineItems.length
    ? Math.round((completedCount / outlineItems.length) * 100)
    : null;
  const nextOutlineItem = outlineQuery.data?.modules
    .flatMap((module) =>
      module.items.map((item) => ({
        ...item,
        available: canOpenModule(module.access),
        moduleTitle: module.title,
      })),
    )
    .find((item) => item.available && !item.isCompleted);
  const nextTypeLabel = !nextOutlineItem
    ? null
    : nextOutlineItem.type === "VOCABULARY_SET"
      ? "Vocabulary"
      : nextOutlineItem.type === "ASSESSMENT"
        ? "Assessment"
        : "Lesson";
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Full-bleed first card sits under the status bar: keep the image bleeding
  // but push the titles down below it + extra breathing room.
  const headerTopPadding = isFirst ? insets.top + 20 : 16;

  const openCourse = () =>
    router.push({
      pathname: "/courses/[courseId]",
      params: { courseId: cohort.course.id },
    });

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="relative justify-end bg-muted">
        {thumbnailUrl ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              blurRadius={3}
              className="absolute inset-0 z-0 size-full"
              resizeMode="cover"
              source={{ uri: thumbnailUrl }}
            />
            <View
              className="absolute inset-0 z-10"
              style={{
                backgroundColor: withOpacity(colors.background, 0.72),
              }}
            />
          </>
        ) : null}
        <View
          className="relative z-20 gap-1.5 p-4"
          style={{ paddingTop: headerTopPadding }}
        >
          <View className="flex-row items-center gap-2">
            {nextState === "live" ? (
              <View className="rounded-full bg-primary px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-primary-foreground">
                  Live
                </Text>
              </View>
            ) : nextState === "joining" ? (
              <View className="rounded-full bg-primary/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-primary">
                  Soon
                </Text>
              </View>
            ) : null}
            <Text
              className="flex-1 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground"
              numberOfLines={1}
            >
              {cohort.course.title}
            </Text>
          </View>
          <Text
            className="text-2xl font-black leading-7 tracking-tight text-foreground"
            numberOfLines={2}
          >
            {cohort.name}
          </Text>
          {cohort.facilitators.length > 0 ? (
            <Text
              className="text-xs font-semibold text-muted-foreground"
              numberOfLines={1}
            >
              Mentored by {cohort.facilitators.map((f) => f.name).join(", ")}
            </Text>
          ) : null}
        </View>
        {progress !== null ? (
          <View className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-muted">
            <View
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-3 p-4">
        {next && nextState ? (
          <SessionBlock meeting={next} state={nextState} />
        ) : (
          <Text className="text-sm text-muted-foreground">
            No upcoming sessions — pick up your course below.
          </Text>
        )}

        <View className="flex-row gap-2">
          <Pressable
            accessibilityHint="Opens the course materials"
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-border px-3 py-3 active:opacity-70"
            onPress={openCourse}
          >
            <SymbolView
              fallback={<View />}
              name="book.closed.fill"
              size={15}
              tintColor={colors.foreground}
            />
            <Text className="text-sm font-bold text-foreground">
              View course
            </Text>
          </Pressable>
          {cohort.whatsappGroupUrl ? (
            <Pressable
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-border px-3 py-3 active:opacity-70"
              onPress={() =>
                cohort.whatsappGroupUrl &&
                void openExternalLink(cohort.whatsappGroupUrl, "whatsapp")
              }
            >
              <SymbolView
                fallback={<View />}
                name="message.fill"
                size={15}
                tintColor={colors.foreground}
              />
              <Text className="text-sm font-bold text-foreground">
                WhatsApp
              </Text>
            </Pressable>
          ) : null}
        </View>

        {progress !== null ? (
          progress === 0 ? (
            <Pressable
              accessibilityRole="button"
              className="items-center rounded-2xl bg-primary px-5 py-4 active:opacity-80"
              onPress={openCourse}
            >
              <Text className="text-base font-bold text-primary-foreground">
                Start learning
              </Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              {outlineQuery.isError ? (
                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-2xl border border-border px-5 py-4 active:opacity-70"
                  onPress={() => void outlineQuery.refetch()}
                >
                  <Text className="text-sm font-bold text-muted-foreground">
                    Couldn’t load what’s next — tap to retry
                  </Text>
                </Pressable>
              ) : nextOutlineItem && nextTypeLabel ? (
                <Pressable
                  accessibilityHint={`Continue with ${nextOutlineItem.title}`}
                  accessibilityRole="button"
                  className="flex-row items-center gap-3 rounded-2xl bg-primary px-5 py-4 active:opacity-80"
                  onPress={() =>
                    router.push({
                      pathname: "/courses/[courseId]/items/[courseItemId]",
                      params: {
                        courseId: cohort.course.id,
                        courseItemId: nextOutlineItem.id,
                      },
                    })
                  }
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary-foreground/70">
                      Continue learning
                    </Text>
                    <Text
                      className="text-lg font-black leading-6 text-primary-foreground"
                      numberOfLines={2}
                    >
                      {nextOutlineItem.title}
                    </Text>
                    <Text
                      className="text-xs font-semibold text-primary-foreground/70"
                      numberOfLines={1}
                    >
                      {nextTypeLabel} · {nextOutlineItem.moduleTitle}
                    </Text>
                  </View>
                  <Text className="text-2xl text-primary-foreground">›</Text>
                </Pressable>
              ) : (
                <Text className="text-sm text-muted-foreground">
                  No unlocked activities to continue.
                </Text>
              )}
            </View>
          )
        ) : null}

        <QueryState
          pending={eventsPending}
          error={eventsError}
          retry={onRetryEvents}
        />
        {!eventsPending && !eventsError && featured ? (
          <View className="gap-2">
            {featuredActionable ? (
              <Pressable
                accessibilityHint={`Open ${assessmentSourceBadge(featured)} ${featured.title}`}
                accessibilityRole="button"
                className={`flex-row items-center gap-3 rounded-2xl px-5 py-4 active:opacity-80 ${
                  featuredUrgent
                    ? "border border-primary/40 bg-primary/10"
                    : "border border-border bg-card"
                }`}
                onPress={openFeaturedAssessment}
              >
                <View className="min-w-0 flex-1 gap-1">
                  <Text className={`${SOURCE_BADGE} text-primary`}>
                    {featuredStatusLabel ? `${featuredStatusLabel} • ` : ""}
                    {assessmentSourceBadge(featured)}
                  </Text>
                  <Text
                    className="text-lg font-black leading-6 text-foreground"
                    numberOfLines={2}
                  >
                    {featured.title}
                  </Text>
                  <Text
                    className="text-xs font-semibold text-muted-foreground"
                    numberOfLines={1}
                  >
                    {assessmentAttemptPresentation(featured.attempts[0]).detail}
                    {featured.closesAt
                      ? ` · ${closesLabel(featured.closesAt, now)}`
                      : ""}
                  </Text>
                </View>
                <Text className="text-2xl text-primary">›</Text>
              </Pressable>
            ) : (
              <Row
                title={featured.title}
                detail={`${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featured.attempts[0]).detail}${featured.closesAt ? ` · ${closesLabel(featured.closesAt, now)}` : ""}`}
                onPress={openFeaturedAssessment}
              />
            )}
            {remaining > 0 ? (
              <Row
                title={`${remaining} more in Practice`}
                detail={`${open.length} open overall`}
                onPress={() => router.navigate("/(home)/(tabs)/assessments")}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
