import { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../../../src/lib/trpc";
import {
  Action,
  Empty,
  QueryState,
  Row,
  Section,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import {
  dateLabel,
  meetingState,
  safeExternalUrl,
} from "../../../../src/lib/study";
import { assessmentAttemptPresentation } from "../../../../src/lib/assessment-state";

async function openLink(value: string, kind: "zoom" | "whatsapp") {
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

export default function CohortsTab() {
  const query = api.learning.listMyCohorts.useQuery();
  const events = api.assessmentEvent.listForLearner.useQuery();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <StudyScreen
      title="Cohorts"
      refreshing={query.isRefetching || events.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void events.refetch();
      }}
    >
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <QueryState
        pending={events.isPending}
        error={events.error}
        retry={() => void events.refetch()}
      />
      {query.data?.length === 0 ? (
        <Empty>
          Your active study groups will appear here after you join a cohort.
        </Empty>
      ) : null}
      {query.data?.map((cohort) => {
        const meetings = cohort.meetings.filter(
          (meeting) => meetingState(meeting, now) !== "ended",
        );
        const cohortEvents =
          events.data?.filter((event) => event.cohort?.id === cohort.id) ?? [];
        return (
          <Section key={cohort.id} title={cohort.name}>
            <Row
              title={cohort.course.title}
              detail={cohort.description ?? undefined}
              onPress={() =>
                router.push({
                  pathname: "/courses/[courseId]",
                  params: { courseId: cohort.course.id },
                })
              }
            />
            {cohort.whatsappGroupUrl ? (
              <Action
                secondary
                onPress={() => {
                  if (cohort.whatsappGroupUrl)
                    void openLink(cohort.whatsappGroupUrl, "whatsapp");
                }}
              >
                Open WhatsApp discussion
              </Action>
            ) : (
              <Empty>A discussion link hasn’t been shared yet.</Empty>
            )}
            {!events.isPending && !events.error ? (
              <View className="gap-1 rounded-2xl bg-muted px-5 py-2">
                <Text className="pt-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  Assessments ({cohortEvents.length})
                </Text>
                {cohortEvents.length === 0 ? (
                  <Empty>No assessment events in this cohort.</Empty>
                ) : (
                  cohortEvents.map((event) => {
                    const attempt = event.attempts[0];
                    const state = assessmentAttemptPresentation(attempt);
                    const timing = event.closesAt
                      ? ` · closes ${dateLabel(event.closesAt)}`
                      : "";
                    return (
                      <Row
                        key={event.id}
                        title={event.title}
                        detail={`${event.type === "TRYOUT" ? "Tryout" : "On-demand assessment"} · ${state.detail}${timing}`}
                        onPress={() =>
                          router.push({
                            pathname: "/events/[eventId]",
                            params: { eventId: event.id },
                          })
                        }
                      />
                    );
                  })
                )}
              </View>
            ) : null}
            {meetings.length === 0 ? (
              <Empty>No upcoming sessions in this cohort.</Empty>
            ) : (
              meetings.map((meeting) => {
                const state = meetingState(meeting, now);
                return (
                  <View
                    key={meeting.id}
                    className="gap-3 rounded-2xl bg-muted p-5"
                  >
                    <Text className="text-xs font-semibold uppercase text-primary">
                      {state === "live"
                        ? "Live now"
                        : state === "joining"
                          ? "Starting soon"
                          : "Upcoming"}
                    </Text>
                    <Text className="text-lg font-bold text-foreground">
                      {meeting.title}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {dateLabel(meeting.startsAt)} · {meeting.durationMinutes}{" "}
                      min · your local time
                    </Text>
                    {meeting.agenda ? (
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {meeting.agenda}
                      </Text>
                    ) : null}
                    <Action
                      disabled={!meeting.joinUrl || state === "upcoming"}
                      onPress={() => {
                        if (meeting.joinUrl)
                          void openLink(meeting.joinUrl, "zoom");
                      }}
                    >
                      {!meeting.joinUrl
                        ? "Meeting link not available"
                        : state === "upcoming"
                          ? "Join opens 10 minutes before"
                          : "Join Zoom session"}
                    </Action>
                  </View>
                );
              })
            )}
          </Section>
        );
      })}
    </StudyScreen>
  );
}
