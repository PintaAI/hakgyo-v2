import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";

import { QueryState, Row, StudyScreen } from "../../src/components/learning-ui";
import { StudyAction, StudyGlass } from "../../src/components/study-glass";
import { assessmentAttemptPresentation } from "../../src/lib/assessment-state";
import { dateLabel } from "../../src/lib/study";
import { api } from "../../src/lib/trpc";
import { useSidebarIndicators } from "../../src/lib/sidebar-indicators";

export default function AssessmentEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { markEntitySeen } = useSidebarIndicators();
  const utils = api.useUtils();
  const query = api.assessmentEvent.getForLearner.useQuery(
    { eventId },
    { enabled: !!eventId },
  );
  const start = api.mobileSync.startEventAssessment.useMutation();
  const event = query.data;
  const attempt = event?.attempts[0];
  const attemptState = assessmentAttemptPresentation(attempt);
  const invalidated = !!event?.participants[0]?.invalidatedAt;
  const assessment = event?.courseItem.assessment;

  useEffect(() => {
    if (eventId) markEntitySeen("ASSESSMENT", eventId);
  }, [eventId, markEntitySeen]);

  function openAttempt(attemptId: string, replace = false) {
    if (!event) return;
    const target = {
      pathname:
        "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]" as const,
      params: {
        courseId: event.course.id,
        courseItemId: event.courseItem.id,
        attemptId,
      },
    };
    if (replace) router.replace(target);
    else router.push(target);
  }

  useEffect(() => {
    if (event?.entry.destination === "ATTEMPT" && attempt) {
      openAttempt(attempt.id, true);
    }
    // Route only when the server's entry decision changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, event?.entry.destination]);

  async function begin() {
    if (!event || invalidated) return;
    try {
      const result = await start.mutateAsync({ eventId });
      utils.assessment.getMyAttempt.setData(
        { attemptId: result.attempt.id },
        result.attempt,
      );
      utils.assessment.getForCourseItem.setData(
        {
          courseItemId: result.attempt.courseItemId,
          attemptId: result.attempt.id,
        },
        result.assessmentDetail,
      );
      openAttempt(result.attempt.id, true);
    } catch {
      /* Mutation error is shown below. */
    }
  }

  const primaryAction = event?.entry.canStart
    ? "Start timed assessment"
    : event?.entry.canReattempt
      ? "Re-attempt assessment"
      : null;

  return (
    <>
      <Stack.Screen options={{ headerBackButtonDisplayMode: "minimal" }} />
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

        {event?.entry.destination === "ATTEMPT" ? (
          <StudyGlass>
            <Text className="text-lg font-black text-foreground">
              Resuming your assessment…
            </Text>
          </StudyGlass>
        ) : event ? (
          <>
            <StudyGlass>
              <Text className="text-xs font-black uppercase tracking-[1.5px] text-primary">
                {event.type === "TRYOUT" ? "Tryout" : "Quick assessment"} ·{" "}
                {event.cohort?.name ?? event.course.title}
              </Text>
              <Text className="text-2xl font-black leading-8 text-foreground">
                {assessment?.title ?? event.title}
              </Text>
              {assessment?.description ? (
                <Text className="text-sm leading-6 text-muted-foreground">
                  {assessment.description}
                </Text>
              ) : null}

              <Text className="text-sm leading-6 text-muted-foreground">
                {assessment?._count.questions ?? 0} questions ·{" "}
                {event.durationMinutes} minutes
                {assessment?.passingScore != null
                  ? ` · ${assessment.passingScore}% to pass`
                  : ""}
                {event.closesAt ? `\nCloses ${dateLabel(event.closesAt)}` : ""}
                {assessment?.maxAttempts != null
                  ? `\n${event.attemptCount} of ${assessment.maxAttempts} attempts used`
                  : `\n${event.attemptCount} attempts used · unlimited`}
              </Text>

              {invalidated ? (
                <Text className="text-sm text-destructive">
                  {event.participants[0]?.invalidationReason ??
                    "Participation is unavailable. Contact your course team."}
                </Text>
              ) : null}

              {attempt ? (
                <Text className="text-base font-bold text-foreground">
                  {attemptState.detail}
                  {attempt.status === "GRADED" &&
                  attempt.score !== null &&
                  attempt.maxScore !== null
                    ? ` · ${attempt.score}/${attempt.maxScore}`
                    : ""}
                </Text>
              ) : null}

              {primaryAction ? (
                <StudyAction
                  disabled={start.isPending}
                  onPress={() => void begin()}
                >
                  {start.isPending ? "Starting…" : primaryAction}
                </StudyAction>
              ) : null}

              {attempt && attempt.status !== "IN_PROGRESS" ? (
                <StudyAction secondary onPress={() => openAttempt(attempt.id)}>
                  {attempt.status === "GRADED"
                    ? "Review result"
                    : "View submission"}
                </StudyAction>
              ) : null}

              {!primaryAction && !attempt && !invalidated ? (
                <Text className="text-sm font-semibold text-muted-foreground">
                  {event.status === "CANCELLED"
                    ? "This event was cancelled."
                    : "This event is not open for attempts."}
                </Text>
              ) : null}

              {start.error ? (
                <Text
                  accessibilityRole="alert"
                  className="text-sm text-destructive"
                >
                  {start.error.message}
                </Text>
              ) : null}
            </StudyGlass>

            {event.leaderboard ? (
              <StudyGlass>
                <Text className="text-xl font-black text-foreground">
                  Leaderboard
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Your best reviewed attempt counts. Ties are decided by
                  completion time.
                </Text>
                {event.leaderboard.length ? (
                  event.leaderboard.map((entry) => (
                    <Row
                      key={entry.userId}
                      title={`${entry.rank}. ${entry.name}`}
                      detail={`${entry.score} / ${entry.maxScore} · ${entry.percentage}%`}
                    />
                  ))
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    No reviewed results are available yet.
                  </Text>
                )}
              </StudyGlass>
            ) : attempt ? (
              <StudyGlass>
                <Text className="text-lg font-black text-foreground">
                  Leaderboard pending
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Rankings appear after results are reviewed.
                </Text>
              </StudyGlass>
            ) : null}
          </>
        ) : null}
      </StudyScreen>
    </>
  );
}
