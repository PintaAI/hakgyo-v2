import { formatScoreOutOf, RUNTIME_VERSION } from "@hakgyo/shared";
import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import {
  AssessmentMediaStatus,
  useAssessmentMediaPrefetch,
} from "../../src/components/assessment-media";
import { AttemptStartingPreview } from "../../src/components/attempt-starting-preview";
import {
  Eyebrow,
  QueryState,
  Row,
  StudyScreen,
} from "../../src/components/learning-ui";
import { StudyAction, StudyGlass } from "../../src/components/study-glass";
import { assessmentAttemptPresentation } from "../../src/lib/assessment-state";
import { dateLabel } from "../../src/lib/study";
import { userErrorMessage } from "../../src/lib/error-message";
import { api } from "../../src/lib/trpc";
import { useSidebarIndicators } from "../../src/lib/sidebar-indicators";
import { useMobileSyncActions } from "../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../src/providers/PushNotificationsProvider";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { useTransitionOverride } from "../../src/navigation/screen-transition";
import { useItemAssessment, useLearnerEvent } from "../../src/sync/hooks";

export default function AssessmentEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { markEntitySeen } = useSidebarIndicators();
  const { saveStartedAttempt } = useMobileSyncActions();
  const { promptInContext } = usePushNotifications();
  const { colors } = useAppTheme();
  const { fadeNextTransition } = useTransitionOverride();

  useEffect(() => {
    const timer = setTimeout(promptInContext, 800);
    return () => clearTimeout(timer);
  }, [promptInContext]);
  // Online detail (leaderboard included), persisted for offline reopening.
  const query = useLearnerEvent(eventId);
  const start = api.mobileSyncV2.startEventAssessment.useMutation();
  // From the tap until the attempt screen replaces this one. Meanwhile the
  // screen already shows the attempt's first screen from the course bundle
  // (optimistic); answering waits for the server to register the start.
  const [starting, setStarting] = useState(false);
  // Only a pull shows the refresh spinner. The refresh every open makes runs
  // quietly: a spinner set from code as the screen appears can stay stuck on
  // iOS, with nothing saying what it waits for.
  const [pulling, setPulling] = useState(false);
  const event = query.data;
  const attempt = event?.attempts[0];
  const attemptState = assessmentAttemptPresentation(attempt);
  const invalidated = !!event?.participants[0]?.invalidatedAt;
  const assessment = event?.courseItem.assessment;
  // The questions without answers, already on the device in the course bundle.
  const bundled = useItemAssessment(
    event?.course.id,
    event?.courseItem.id ?? "",
    {
      enabled: Boolean(event),
    },
  );
  // The server lists the media once the event is open; download it while the connection is good.
  const media = useAssessmentMediaPrefetch(
    event?.media?.map((asset) => asset.assetId) ?? [],
  );
  const mediaSizes = useMemo(
    () => new Map(event?.media?.map((asset) => [asset.assetId, asset.size])),
    [event?.media],
  );

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
    if (!event || invalidated || starting) return;
    setStarting(true);
    try {
      const result = await start.mutateAsync({
        eventId,
        protocol: SYNC_PROTOCOL,
        runtimeVersion: RUNTIME_VERSION,
      });
      // Persisted locally so the attempt resumes offline.
      await saveStartedAttempt(result);
      // The preview already looks like the attempt: swap without a slide.
      fadeNextTransition();
      requestAnimationFrame(() => openAttempt(result.attempt.id, true));
    } catch {
      /* Mutation error is shown below. */
      setStarting(false);
    }
  }

  async function pullToRefresh() {
    setPulling(true);
    try {
      await query.refetch();
    } finally {
      setPulling(false);
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
      {starting && event ? (
        <StudyScreen
          contentClassName="gap-4"
          title={bundled.data?.title ?? assessment?.title ?? event.title}
        >
          <AttemptStartingPreview
            assessment={bundled.data}
            shuffleQuestions={bundled.data?.shuffleQuestions ?? true}
          />
        </StudyScreen>
      ) : (
        <StudyScreen
          title={event?.title ?? "Latihan & tryout"}
          refreshing={pulling}
          onRefresh={() => void pullToRefresh()}
        >
          <QueryState
            pending={query.isPending}
            pendingLabel="Memuat latihan…"
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
                {query.isRefetching && !pulling ? (
                  <View
                    className="flex-row items-center gap-2"
                    accessibilityLiveRegion="polite"
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text className="text-xs text-muted-foreground">
                      Memperbarui status dan hasil…
                    </Text>
                  </View>
                ) : null}
                <Eyebrow tone="primary" size="md">
                  {event.type === "TRYOUT" ? "Tryout" : "Latihan"} ·{" "}
                  {event.cohort?.name ?? event.course.title}
                </Eyebrow>
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
                  {event.closesAt
                    ? `\nDitutup ${dateLabel(event.closesAt)}`
                    : ""}
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
                    {/* The detail already carries the score once graded. */}
                    {attemptState.detail}
                  </Text>
                ) : null}

                <AssessmentMediaStatus
                  progress={media.progress}
                  sizes={mediaSizes}
                  onRetry={media.retry}
                />

                {primaryAction ? (
                  <>
                    <StudyAction onPress={() => void begin()}>
                      {primaryAction}
                    </StudyAction>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      Perlu internet untuk mulai. Setelah itu kamu bisa lanjut
                      mengerjakan tanpa internet.
                    </Text>
                  </>
                ) : null}

                {attempt && attempt.status !== "IN_PROGRESS" ? (
                  <StudyAction
                    secondary
                    onPress={() => openAttempt(attempt.id)}
                  >
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
                    {userErrorMessage(
                      start.error,
                      "Tryout tidak dapat dimulai.",
                    )}
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
                        detail={`${formatScoreOutOf(entry.score, entry.maxScore, " / ")} · ${entry.percentage}%`}
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
      )}
    </>
  );
}
