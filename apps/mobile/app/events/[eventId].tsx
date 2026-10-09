import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import {
  AssessmentMediaStatus,
  useAssessmentMediaPrefetch,
} from "../../src/components/assessment-media";
import { QueryState, Row, StudyScreen } from "../../src/components/learning-ui";
import { StudyAction, StudyGlass } from "../../src/components/study-glass";
import { assessmentAttemptPresentation } from "../../src/lib/assessment-state";
import { dateLabel } from "../../src/lib/study";
import { userErrorMessage } from "../../src/lib/error-message";
import { api } from "../../src/lib/trpc";
import { useSidebarIndicators } from "../../src/lib/sidebar-indicators";
import { useMobileSyncActions } from "../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../src/providers/PushNotificationsProvider";
import { useLearnerEvent } from "../../src/sync/hooks";

export default function AssessmentEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { markEntitySeen } = useSidebarIndicators();
  const { saveStartedAttempt } = useMobileSyncActions();
  const { promptInContext } = usePushNotifications();

  useEffect(() => {
    const timer = setTimeout(promptInContext, 800);
    return () => clearTimeout(timer);
  }, [promptInContext]);
  // Online detail (leaderboard included), persisted for offline reopening.
  const query = useLearnerEvent(eventId);
  const start = api.mobileSyncV2.startEventAssessment.useMutation();
  const event = query.data;
  const attempt = event?.attempts[0];
  const attemptState = assessmentAttemptPresentation(attempt);
  const invalidated = !!event?.participants[0]?.invalidatedAt;
  const assessment = event?.courseItem.assessment;
  // The server lists the media once the event is open; download it while the connection is good.
  const media = useAssessmentMediaPrefetch(event?.mediaAssetIds ?? []);

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
      const result = await start.mutateAsync({
        eventId,
        protocol: SYNC_PROTOCOL,
      });
      // Persisted locally so the attempt resumes offline.
      await saveStartedAttempt(result);
      openAttempt(result.attempt.id, true);
    } catch {
      /* Mutation error is shown below. */
    }
  }

  // A scheduled event can be started from its opening time; the server opens
  // it on the first start. The cached detail may predate that moment.
  const opensAt = event?.status === "SCHEDULED" ? event.opensAt : null;
  const opensAtTime = opensAt?.getTime() ?? null;
  const [now, setNow] = useState(() => Date.now());
  // Re-render at the opening time so the start button appears while the screen is open.
  useEffect(() => {
    // Nothing to wait for, or this render already happens after the opening.
    if (opensAtTime === null || opensAtTime <= now) return;
    // setTimeout overflows past ~24.8 days; the next render re-arms it.
    const wait = Math.min(opensAtTime - Date.now() + 500, 2 ** 31 - 1);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(wait, 0));
    return () => clearTimeout(timer);
  }, [opensAtTime, now]);
  const dueNow =
    opensAtTime !== null &&
    opensAtTime <= now &&
    !!event?.closesAt &&
    event.closesAt.getTime() > now &&
    !attempt &&
    !invalidated;
  const primaryAction =
    event?.entry.canStart || dueNow
      ? "Mulai tugas berwaktu"
      : event?.entry.canReattempt
        ? "Kerjakan ulang tugas"
        : null;

  return (
    <>
      <Stack.Screen options={{ headerBackButtonDisplayMode: "minimal" }} />
      <StudyScreen
        title={event?.title ?? "Latihan & tryout"}
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
              Melanjutkan tugas kamu…
            </Text>
          </StudyGlass>
        ) : event ? (
          <>
            <StudyGlass>
              <Text className="text-xs font-black uppercase tracking-[1.5px] text-primary">
                {event.type === "TRYOUT" ? "Tryout" : "Latihan"} ·{" "}
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
                {assessment?._count.questions ?? 0} soal ·{" "}
                {event.durationMinutes} menit
                {assessment?.passingScore != null
                  ? ` · lulus ${assessment.passingScore}%`
                  : ""}
                {opensAt ? `\nDibuka ${dateLabel(opensAt)}` : ""}
                {event.closesAt ? `\nDitutup ${dateLabel(event.closesAt)}` : ""}
                {assessment?.maxAttempts != null
                  ? `\n${event.attemptCount} dari ${assessment.maxAttempts} percobaan terpakai`
                  : `\n${event.attemptCount} percobaan terpakai · tanpa batas`}
              </Text>

              {invalidated ? (
                <Text className="text-sm text-destructive">
                  {event.participants[0]?.invalidationReason ??
                    "Partisipasi tidak tersedia. Hubungi tim kurikulum kamu."}
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

              <AssessmentMediaStatus
                progress={media.progress}
                onRetry={media.retry}
              />

              {primaryAction ? (
                <StudyAction
                  disabled={start.isPending}
                  onPress={() => void begin()}
                >
                  {start.isPending ? "Memulai…" : primaryAction}
                </StudyAction>
              ) : null}

              {attempt && attempt.status !== "IN_PROGRESS" ? (
                <StudyAction secondary onPress={() => openAttempt(attempt.id)}>
                  {attempt.status === "GRADED"
                    ? "Lihat hasil"
                    : "Lihat jawaban"}
                </StudyAction>
              ) : null}

              {!primaryAction && !attempt && !invalidated ? (
                <Text className="text-sm font-semibold text-muted-foreground">
                  {event.status === "CANCELLED"
                    ? "Event ini dibatalkan."
                    : opensAt
                      ? `Dibuka ${dateLabel(opensAt)}. Kamu bisa mulai mengerjakan saat itu.`
                      : "Event ini belum dibuka untuk dikerjakan."}
                </Text>
              ) : null}

              {start.error ? (
                <Text
                  accessibilityRole="alert"
                  className="text-sm text-destructive"
                >
                  {userErrorMessage(start.error, "Tryout tidak dapat dimulai.")}
                </Text>
              ) : null}
            </StudyGlass>

            {event.leaderboard ? (
              <StudyGlass>
                <Text className="text-xl font-black text-foreground">
                  Leaderboard
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Percobaan terbaik yang sudah direview yang dihitung. Nilai
                  seri ditentukan oleh waktu penyelesaian.
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
                    Belum ada hasil yang sudah direview.
                  </Text>
                )}
              </StudyGlass>
            ) : attempt ? (
              <StudyGlass>
                <Text className="text-lg font-black text-foreground">
                  Leaderboard belum tersedia
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Peringkat muncul setelah hasil direview.
                </Text>
              </StudyGlass>
            ) : null}
          </>
        ) : null}
      </StudyScreen>
    </>
  );
}
