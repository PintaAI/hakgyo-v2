import { formatScoreOutOf, RUNTIME_VERSION } from "@hakgyo/shared";
import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import {
  AssessmentMediaStatus,
  useAssessmentMediaPrefetch,
} from "../../src/components/assessment-media";
import { AttemptStartingPreview } from "../../src/components/attempt-starting-preview";
import { randomUuid } from "../../src/lib/random-uuid";
import { AttemptResultDetails } from "../../src/components/attempt-result-details";
import { useApiAssetResolver } from "../../src/components/content-renderer";
import {
  AssessmentFacts,
  AssessmentOverview,
  QuestionPreview,
} from "../../src/components/learn/assessment-overview";
import {
  CardFan,
  HakgyoHero,
  HERO_TITLE,
} from "../../src/components/learn/hakgyo-hero";
import {
  Action,
  Eyebrow,
  FullScreenState,
  Row,
  StudyScreen,
} from "../../src/components/learning-ui";
import { dateLabel } from "../../src/lib/study";
import { userErrorMessage } from "../../src/lib/error-message";
import { api } from "../../src/lib/trpc";
import { useSidebarIndicators } from "../../src/lib/sidebar-indicators";
import { useMobileSyncActions } from "../../src/providers/MobileSyncProvider";
import { usePushNotifications } from "../../src/providers/PushNotificationsProvider";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { useTransitionOverride } from "../../src/navigation/screen-transition";
import { useItemAssessment, useLearnerEvent } from "../../src/sync/hooks";
import { assessmentAttemptHref } from "../../src/lib/navigation";
import {
  eventAssessment,
  eventQuestionCount,
} from "../../src/lib/event-assessment";

export default function AssessmentEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { markEntitySeen } = useSidebarIndicators();
  const { saveStartedAttempt } = useMobileSyncActions();
  const { promptInContext } = usePushNotifications();
  const { colors } = useAppTheme();
  const { fadeNextTransition } = useTransitionOverride();
  const resolveAssetUrl = useApiAssetResolver();

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
  const [startingSeed, setStartingSeed] = useState<string>();
  // Only a pull shows the refresh spinner. The refresh every open makes runs
  // quietly: a spinner set from code as the screen appears can stay stuck on
  // iOS, with nothing saying what it waits for.
  const [pulling, setPulling] = useState(false);
  const event = query.data;
  const attempt = event?.attempts[0];
  const invalidated = !!event?.participants[0]?.invalidatedAt;
  const assessment = event ? eventAssessment(event) : null;
  // The questions without answers, already on the device in the course bundle.
  // An event that runs an assessment from the organization's library (no
  // course item) has none on the device: its questions arrive with the start.
  const courseItemId = event?.courseItem?.id ?? null;
  const bundled = useItemAssessment(event?.course.id, courseItemId ?? "", {
    enabled: Boolean(courseItemId),
  });
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
    const target = assessmentAttemptHref({
      attemptId,
      courseId: event.course.id,
      courseItemId: event.courseItem?.id ?? null,
      eventId: event.id,
    });
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
    // Made here so the preview shows the attempt's own order at once.
    const shuffleSeed = randomUuid();
    setStartingSeed(shuffleSeed);
    setStarting(true);
    try {
      const result = await start.mutateAsync({
        eventId,
        shuffleSeed,
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

  const questionCount =
    eventQuestionCount(assessment) ?? bundled.data?.questions.length ?? 0;
  const firstQuestion = bundled.data?.questions
    .slice()
    .sort((first, second) => first.position - second.position)[0];
  const statusNote = invalidated
    ? (event?.participants[0]?.invalidationReason ??
      "Partisipasi tidak tersedia. Hubungi tim kurikulum kamu.")
    : !primaryAction && !attempt && event
      ? event.status === "CANCELLED"
        ? "Event ini dibatalkan."
        : opensAt
          ? `Dibuka ${dateLabel(opensAt)}. Kamu bisa mulai mengerjakan saat itu.`
          : "Event ini belum dibuka untuk dikerjakan."
      : null;

  return (
    <>
      {/* The same transparent header as a course tugas, over the hero. */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor:
              Platform.OS === "ios" ? "transparent" : colors.background,
          },
          headerTintColor: colors.foreground,
          headerTransparent: Platform.OS === "ios",
          scrollEdgeEffects:
            Platform.OS === "ios" ? { top: "soft" } : undefined,
        }}
      />
      {starting && event ? (
        <StudyScreen
          contentClassName="gap-4"
          title={bundled.data?.title ?? assessment?.title ?? event.title}
        >
          <AttemptStartingPreview
            assessment={bundled.data}
            shuffleQuestions={bundled.data?.shuffleQuestions ?? true}
            shuffleSeed={startingSeed}
          />
        </StudyScreen>
      ) : !event ? (
        query.isPending ? (
          <FullScreenState kind="loading" message="Memuat latihan…" />
        ) : (
          <FullScreenState
            kind="error"
            title="Latihan tidak tersedia"
            message={userErrorMessage(
              query.error ?? { message: "" },
              "Latihan ini tidak tersedia atau kamu tidak lagi memiliki akses.",
            )}
            onBack={() => router.back()}
          />
        )
      ) : event.entry.destination === "ATTEMPT" ? (
        <FullScreenState kind="loading" message="Melanjutkan tugas kamu…" />
      ) : (
        <StudyScreen
          title=""
          bleedTop
          refreshing={pulling}
          onRefresh={() => void pullToRefresh()}
        >
          <HakgyoHero>
            <CardFan
              faces={[
                <View className="items-center" key="count">
                  <Text className="text-4xl font-black tabular-nums tracking-tight text-foreground">
                    {questionCount}
                  </Text>
                  <Eyebrow>soal</Eyebrow>
                </View>,
                <View key="second" />,
                <View key="third" />,
              ]}
            />
            <View className="items-center gap-2">
              <Eyebrow size="md" tone="primary">
                {event.type === "TRYOUT" ? "Tryout" : "Latihan"} ·{" "}
                {event.cohort?.name ?? event.course.title}
              </Eyebrow>
              <Text
                accessibilityRole="header"
                className="text-center font-black tracking-tight text-foreground"
                numberOfLines={2}
                style={HERO_TITLE}
              >
                {assessment?.title ?? event.title}
              </Text>
              {assessment?.description ? (
                <Text className="text-center text-sm leading-6 text-muted-foreground">
                  {assessment.description}
                </Text>
              ) : null}
            </View>
            <AssessmentFacts
              timeLimitMinutes={event.durationMinutes}
              passingScore={assessment?.passingScore ?? null}
              maxAttempts={assessment?.maxAttempts ?? null}
              attemptsUsed={event.attemptCount}
              opensAt={opensAt}
              closesAt={event.closesAt}
            />
            {query.isRefetching && !pulling ? (
              <View
                accessibilityLiveRegion="polite"
                className="flex-row items-center justify-center gap-2"
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-xs text-muted-foreground">
                  Memperbarui status dan hasil…
                </Text>
              </View>
            ) : null}
            <AssessmentMediaStatus
              progress={media.progress}
              sizes={mediaSizes}
              onRetry={media.retry}
            />
            {primaryAction ? (
              <View className="gap-2">
                <Action
                  // Like a course tugas: retrying after a result is optional.
                  variant={attempt ? "secondary" : "primary"}
                  trailingIcon="arrow.right"
                  onPress={() => void begin()}
                >
                  {primaryAction}
                </Action>
                <Text className="text-center text-xs leading-5 text-muted-foreground">
                  Perlu internet untuk mulai. Setelah itu kamu bisa lanjut
                  mengerjakan tanpa internet.
                </Text>
              </View>
            ) : null}
            {statusNote ? (
              <Text
                className={`text-center text-sm ${invalidated ? "text-destructive" : "text-muted-foreground"}`}
              >
                {statusNote}
              </Text>
            ) : null}
            {start.error ? (
              <Text
                accessibilityRole="alert"
                className="text-center text-sm text-destructive"
              >
                {userErrorMessage(start.error, "Tryout tidak dapat dimulai.")}
              </Text>
            ) : null}
          </HakgyoHero>

          {!attempt && primaryAction && firstQuestion ? (
            <QuestionPreview
              question={firstQuestion}
              total={questionCount}
              resolveAssetUrl={resolveAssetUrl}
            />
          ) : null}

          <AssessmentOverview
            timeLimitMinutes={event.durationMinutes}
            passingScore={assessment?.passingScore ?? null}
            maxAttempts={assessment?.maxAttempts ?? null}
            attemptsUsed={event.attemptCount}
            latestAttempt={attempt}
            canReattempt={event.entry.canReattempt}
            gatesProgress={false}
            sections={bundled.data?.sections ?? []}
          />

          {event.leaderboard ? (
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <Eyebrow size="xs">Leaderboard</Eyebrow>
              <Text className="text-sm leading-5 text-muted-foreground">
                Percobaan terbaik yang sudah direview yang dihitung. Nilai seri
                ditentukan oleh waktu penyelesaian.
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
            </View>
          ) : attempt ? (
            <View className="gap-1 rounded-2xl border border-border bg-card p-4">
              <Eyebrow size="xs">Leaderboard</Eyebrow>
              <Text className="text-base font-bold text-foreground">
                Belum tersedia
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Peringkat muncul setelah hasil direview.
              </Text>
            </View>
          ) : null}
          {/* The finished attempt in full: where the learner lands after
              finishing, so the attempt has no result screen of its own. */}
          {attempt && attempt.status !== "IN_PROGRESS" ? (
            <AttemptResultDetails
              key={attempt.id}
              attemptId={attempt.id}
              courseItemId={event.courseItem?.id ?? null}
            />
          ) : null}
        </StudyScreen>
      )}
    </>
  );
}
