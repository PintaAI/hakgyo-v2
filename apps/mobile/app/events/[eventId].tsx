import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { api } from "../../src/lib/trpc";
import {
  Action,
  QueryState,
  Row,
  Section,
  StudyScreen,
} from "../../src/components/learning-ui";
import { assessmentAttemptPresentation } from "../../src/lib/assessment-state";
import { dateLabel } from "../../src/lib/study";

export default function AssessmentEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = api.assessmentEvent.getForLearner.useQuery(
    { eventId },
    { enabled: !!eventId, refetchInterval: 30_000 },
  );
  const start = api.assessmentEvent.startAttempt.useMutation();
  const event = query.data;
  const attempt = event?.attempts[0];
  const attemptState = assessmentAttemptPresentation(attempt);
  const invalidated = !!event?.participants[0]?.invalidatedAt;
  const open =
    event?.status === "OPEN" &&
    (!event.closesAt || event.closesAt.getTime() > Date.now());
  async function begin() {
    if (!event || invalidated) return;
    try {
      const result = attempt ?? (await start.mutateAsync({ eventId }));
      await query.refetch();
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: {
          courseId: event.course.id,
          courseItemId: event.courseItem.id,
          attemptId: result.id,
        },
      });
    } catch {
      /* Mutation error is shown below. */
    }
  }
  return (
    <StudyScreen
      title={event?.title ?? "Assessment event"}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {event ? (
        <>
          <Section title={event.course.title}>
            <Text className="text-base text-muted-foreground">
              {event.type === "TRYOUT" ? "Tryout" : "Quick assessment"} ·{" "}
              {event.durationMinutes} minutes · {event.status.toLowerCase()}
            </Text>
            {event.closesAt ? (
              <Text className="text-sm text-muted-foreground">
                Closes {dateLabel(event.closesAt)}
              </Text>
            ) : null}
            {invalidated ? (
              <Text className="text-sm text-destructive">
                {event.participants[0]?.invalidationReason ??
                  "Participation is unavailable. Contact your course team."}
              </Text>
            ) : null}
            {attempt && attempt.status !== "IN_PROGRESS" ? (
              <Text className="text-lg font-semibold text-foreground">
                {attemptState.detail}
              </Text>
            ) : null}
            <Action
              disabled={
                invalidated ||
                start.isPending ||
                (!attempt && !open) ||
                (attempt?.status === "IN_PROGRESS" && !open)
              }
              onPress={() => void begin()}
            >
              {start.isPending
                ? "Starting…"
                : attempt
                  ? attemptState.action
                  : open
                    ? "Start timed attempt"
                    : "Not open for attempts"}
            </Action>
            {start.error ? (
              <Text
                accessibilityRole="alert"
                className="text-sm text-destructive"
              >
                {start.error.message}
              </Text>
            ) : null}
          </Section>
          {event.leaderboard ? (
            <Section title="Results">
              <Text className="text-sm text-muted-foreground">
                Final rankings are available after the event closes.
              </Text>
              {event.leaderboard.map((entry) => (
                <Row
                  key={entry.attemptId}
                  title={`${entry.rank}. ${entry.name}`}
                  detail={`${entry.score} / ${entry.maxScore} · ${entry.percentage}%`}
                />
              ))}
            </Section>
          ) : null}
        </>
      ) : null}
    </StudyScreen>
  );
}
