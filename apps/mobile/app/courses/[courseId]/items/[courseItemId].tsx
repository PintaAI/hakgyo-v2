import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { resolveAssessmentEntry, RUNTIME_VERSION } from "@hakgyo/shared";
import type { MaterialLinkTarget } from "@hakgyo/shared/material-links";
import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import {
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../src/components/content-renderer";
import { VocabularySetDetail } from "../../../../src/components/learn/vocabulary-set-detail";
import {
  CardFan,
  HakgyoHero,
  HERO_TITLE,
} from "../../../../src/components/learn/hakgyo-hero";
import {
  LearningFooterView,
  useLearningContinuation,
} from "../../../../src/components/learn/course-learning-footer";
import {
  PullHoldIndicator,
  PullToContinueIndicator,
  ReadingGuardIndicator,
  usePullToContinue,
} from "../../../../src/components/learn/pull-to-continue";
import {
  formatCountdown,
  readingGuardSeconds,
} from "../../../../src/lib/reading-time";
import { useReadingGuard } from "../../../../src/lib/use-reading-guard";
import { requirementActionsFor } from "../../../../src/components/learn/requirement-actions";
import {
  AssessmentFacts,
  AssessmentOverview,
  hasPassed,
  QuestionPreview,
} from "../../../../src/components/learn/assessment-overview";
import { AssessmentResult } from "../../../../src/components/learn/assessment-result";
import { HeroTile } from "../../../../src/components/hero-tile";
import { useCelebration } from "../../../../src/lib/tugas-celebrations";
import { authClient } from "../../../../src/lib/auth-client";
import { userErrorMessage } from "../../../../src/lib/error-message";
import { api } from "../../../../src/lib/trpc";
import { getLearningPath } from "../../../../src/lib/course-learning-path";
import { useSidebarIndicators } from "../../../../src/lib/sidebar-indicators";
import { materialPosition } from "@hakgyo/shared/learning";
import { MaterialHeader } from "../../../../src/components/learn/material-header";
import { markContentSeen } from "../../../../src/lib/use-content-changes";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../src/providers/MobileSyncProvider";
import {
  canStartOnDevice,
  startAttemptOnDevice,
} from "../../../../src/lib/device-attempt";
import { randomUuid } from "../../../../src/lib/random-uuid";
import {
  type CourseItemDetail,
  useCourseItem,
  useCourseOutline,
  useItemAssessment,
} from "../../../../src/sync/hooks";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { SidebarToolbarButton } from "../../../../src/components/sidebar/SidebarToolbarButton";
import {
  Eyebrow,
  FullScreenState,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { firstParam } from "../../../../src/lib/route-params";
import { AttemptStartingPreview } from "../../../../src/components/attempt-starting-preview";
import { useTransitionOverride } from "../../../../src/navigation/screen-transition";

export default function CourseItemScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
    anchor?: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  return (
    <CourseItemContent
      key={courseItemId}
      anchor={firstParam(params.anchor) || null}
      courseId={courseId}
      courseItemId={courseItemId}
    />
  );
}

/** How long layout changes (images loading above) keep re-aiming an anchor jump. */
const ANCHOR_SETTLE_MS = 4000;

function CourseItemContent({
  anchor,
  courseId,
  courseItemId,
}: {
  /** Top-level block to scroll to once it is laid out (a linked section). */
  anchor: string | null;
  courseId: string;
  courseItemId: string;
}) {
  const materialContentHeight = useRef(0);
  const materialViewportHeight = useRef(0);
  // Whether the content was already taller than the screen.
  const wasLong = useRef(false);
  // Paged blocks (PDF book pages) that the learner hasn't finished yet.
  const unreadPagedBlocks = useRef(new Set<string>());
  // The end of a material: the progress footer sits there, and pulling past
  // it completes the material and opens the next item.
  // The course item, for the required activities completing needs.
  const itemRef = useRef<CourseItemDetail | undefined>(undefined);
  const learning = useLearningContinuation({
    courseId,
    courseItemId,
    pendingRequirements: () =>
      itemRef.current?.material?.requiredActivities.length ?? 0,
  });
  const continueFromEnd = useCallback(async () => {
    await learning.continueLearning();
    // Still here: a required activity or an error now shows
    // in the footer, at the end of the content.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd());
  }, [learning]);
  const pullToContinue = usePullToContinue({ onRelease: continueFromEnd });
  // A tugas in the course continues the same way, once it is passed.
  const tugasPull = usePullToContinue({ onRelease: continueFromEnd });
  // The reading guard of an unfinished material holds "next" (see below).
  const readingLocked = useRef(false);
  // Not before every PDF page has been read or the reading time has run,
  // nor while the footer shows a required activity instead.
  const updatePullEnabled = () => {
    pullToContinue.enabled.value =
      unreadPagedBlocks.current.size === 0 &&
      !readingLocked.current &&
      !learning.busy &&
      learning.issue?.kind !== "requirements";
  };
  const updatePullEnabledRef = useRef(updatePullEnabled);
  updatePullEnabledRef.current = updatePullEnabled;
  useEffect(() => {
    updatePullEnabledRef.current();
  }, [learning.busy, learning.issue]);
  // Content that fits on screen is at its end without scrolling. Content
  // that grew past the screen (images loaded) is not, until a scroll says so.
  const markShortContentAtEnd = () => {
    if (
      materialContentHeight.current <= 0 ||
      materialViewportHeight.current <= 0
    ) {
      return;
    }
    const fits =
      materialContentHeight.current <= materialViewportHeight.current + 32;
    if (fits) pullToContinue.atEnd.value = true;
    else if (pullToContinue.atEnd.value && !wasLong.current) {
      pullToContinue.atEnd.value = false;
    }
    wasLong.current = !fits;
  };
  // Anchor jumps: block offsets within the rendered material, the material's
  // offset within the scroll content, and the anchor still being aimed at.
  const scrollRef = useRef<ScrollView>(null);
  const blockOffsets = useRef(new Map<string, number>());
  const materialTop = useRef(0);
  const pendingAnchor = useRef<string | null>(anchor);
  const anchorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // iOS draws the header over the content (automatic insets); Android lays
  // the scroll view out below it.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const topInset = Platform.OS === "ios" ? headerHeight : 0;
  const scrollToBlock = (blockId: string | null, animated: boolean) => {
    const blockY = blockId ? blockOffsets.current.get(blockId) : 0;
    if (blockY === undefined) return false;
    const target = blockId
      ? materialTop.current + blockY - topInset - 12
      : -topInset;
    const maxY = Math.max(
      -topInset,
      materialContentHeight.current - materialViewportHeight.current,
    );
    const y = Math.min(Math.max(target, -topInset), maxY);
    scrollRef.current?.scrollTo({ y, animated });
    return true;
  };
  const aimPendingAnchor = () => {
    const blockId = pendingAnchor.current;
    if (!blockId || !scrollToBlock(blockId, false)) return;
    anchorTimer.current ??= setTimeout(() => {
      pendingAnchor.current = null;
    }, ANCHOR_SETTLE_MS);
  };
  useEffect(() => () => clearTimeout(anchorTimer.current), []);
  const aimPendingAnchorRef = useRef(aimPendingAnchor);
  aimPendingAnchorRef.current = aimPendingAnchor;
  const onBlockLayout = useCallback((blockId: string, y: number) => {
    blockOffsets.current.set(blockId, y);
    aimPendingAnchorRef.current();
  }, []);
  const onReadingProgress = useCallback((key: string, finished: boolean) => {
    if (finished) unreadPagedBlocks.current.delete(key);
    else unreadPagedBlocks.current.add(key);
    updatePullEnabledRef.current();
  }, []);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { activeOrganizationId, colors } = useAppTheme();
  const { markEntitySeen } = useSidebarIndicators();
  const userId = session?.user.id;
  // Opening an activity clears its "Baru"/"Diperbarui" mark in the outline.
  useEffect(() => {
    if (userId) markContentSeen(userId, courseItemId);
  }, [courseItemId, userId]);
  const { prefetchLesson, queueAssessmentStart, saveStartedAttempt } =
    useMobileSyncActions();
  // Everything below composes from the local course bundle + learner index;
  // the online procedures only run when the bundle is not on the device yet.
  // Keep the progress sheet's outline warm while the learner reads.
  const outline = useCourseOutline(courseId, {
    enabled: Boolean(session && courseId),
  });
  const resolveAssetUrl = useApiAssetResolver();
  const itemQuery = useCourseItem(courseId || undefined, courseItemId, {
    enabled: Boolean(session),
  });
  const assessmentQuery = useItemAssessment(
    courseId || undefined,
    courseItemId,
    { enabled: Boolean(session && itemQuery.data?.assessment) },
  );
  const startAssessment = api.mobileSyncV2.startAssessment.useMutation();
  // From the tap until the attempt opens: the attempt's first screen from the
  // bundle, like an event's start (optimistic; answering waits for the server).
  const [startingAssessment, setStartingAssessment] = useState(false);
  // The seed the device made for the start in flight, so the preview shows
  // the questions and options in the attempt's own order.
  const [startingSeed, setStartingSeed] = useState<string>();
  // Guards a second tap while an attempt starts on the device (no preview).
  const startingOnDevice = useRef(false);
  const { fadeNextTransition } = useTransitionOverride();
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const item = itemQuery.data;
  itemRef.current = item;
  const currentModuleId = outline.data?.modules.find((module) =>
    module.items.some((entry) => entry.id === courseItemId),
  )?.id;
  const itemCompleted = outline.data
    ? getLearningPath(outline.data, courseItemId)?.item.isCompleted
    : undefined;
  const material = item?.material;
  // Half the estimated reading time on an unfinished material before "next"
  // unlocks, so lessons are read rather than skipped through. Counted while
  // the page is in front of the learner, and kept across visits.
  const materialContent = material?.content;
  const readingSeconds = useMemo(
    () =>
      materialContent === undefined ? 0 : readingGuardSeconds(materialContent),
    [materialContent],
  );
  useEffect(() => {
    tugasPull.enabled.value = itemCompleted === true && !learning.busy;
  }, [itemCompleted, learning.busy, tugasPull.enabled]);
  const readingGuard = useReadingGuard({
    userId: session?.user.id,
    courseItemId,
    requiredSeconds: readingSeconds,
    active: Boolean(material) && itemCompleted === false,
  });
  readingLocked.current = readingGuard.locked;
  useEffect(() => {
    updatePullEnabledRef.current();
  }, [readingGuard.locked]);
  const vocabulary = item?.vocabularySet;
  const assessment = assessmentQuery.data;
  const latestAttempt = assessment?.latestStandaloneAttempt;
  const assessmentEntry = resolveAssessmentEntry({
    attemptStatus: latestAttempt?.status,
    attemptsUsed: assessment?.standaloneAttemptCount ?? 0,
    maxAttempts: assessment?.maxAttempts ?? null,
    available: true,
  });
  // A pass gets its confetti once, when the learner first sees it.
  const celebrate = useCelebration({
    userId,
    key: courseItemId,
    attemptId: latestAttempt?.id,
    passed: Boolean(
      assessment &&
      latestAttempt?.status === "GRADED" &&
      hasPassed(latestAttempt, assessment.passingScore),
    ),
  });
  useEffect(() => {
    if (currentModuleId) markEntitySeen("MODULE", currentModuleId);
  }, [currentModuleId, markEntitySeen]);
  // Warm this lesson's (and the next lesson's) media into the asset cache.
  useEffect(() => {
    const resolvedCourseId = courseId || itemQuery.courseId;
    if (resolvedCourseId && courseItemId)
      prefetchLesson(resolvedCourseId, courseItemId);
  }, [courseId, courseItemId, itemQuery.courseId, prefetchLesson]);
  useEffect(() => {
    if (!isSessionPending && !session && courseId && courseItemId) {
      router.replace({
        pathname: "/auth",
        params: {
          redirectTo: `/courses/${encodeURIComponent(courseId)}/items/${encodeURIComponent(courseItemId)}`,
        },
      });
    }
  }, [courseId, courseItemId, isSessionPending, session]);

  // Back from the attempt shows the tugas again, not the preview.
  useFocusEffect(
    useCallback(() => {
      setStartingAssessment(false);
      startingOnDevice.current = false;
    }, []),
  );

  async function beginAssessment() {
    if (!assessment || startingAssessment) return;
    if (latestAttempt?.status === "IN_PROGRESS") {
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: { courseId, courseItemId, attemptId: latestAttempt.id },
      });
      return;
    }
    const resolvedCourseId = courseId || itemQuery.courseId;
    if (resolvedCourseId && canStartOnDevice(assessment)) {
      await beginAssessmentOnDevice(resolvedCourseId);
      return;
    }
    const cohorts = assessment.eligibleCohorts;
    const cohortId = cohorts.length === 1 ? cohorts[0]?.id : selectedCohortId;
    const shuffleSeed = randomUuid();
    setStartingSeed(shuffleSeed);
    setStartingAssessment(true);
    try {
      const result = await startAssessment.mutateAsync({
        protocol: SYNC_PROTOCOL,
        runtimeVersion: RUNTIME_VERSION,
        courseItemId,
        cohortId,
        shuffleSeed,
      });
      // Persisted locally so the attempt resumes offline.
      await saveStartedAttempt(result);
      // The preview already looks like the attempt: fade instead of a slide.
      fadeNextTransition();
      requestAnimationFrame(() => {
        router.push({
          pathname:
            "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
          params: { courseId, courseItemId, attemptId: result.attempt.id },
        });
        // The preview stays while the attempt fades in over it: switching
        // back to the tugas here flashed it under the fade. It goes when
        // this screen is focused again (above).
      });
    } catch {
      // The mutation error is shown next to the action.
      setStartingAssessment(false);
    }
  }

  /**
   * Opens a tugas the server has nothing to decide about (`canStartOnDevice`)
   * at once: the attempt is made here, from the course bundle, and the server
   * records it from the outbox, in the background or once back online.
   */
  async function beginAssessmentOnDevice(resolvedCourseId: string) {
    if (!assessment || startingOnDevice.current) return;
    startingOnDevice.current = true;
    const attemptId = randomUuid();
    const shuffleSeed = randomUuid();
    const startedAt = new Date();
    const started = startAttemptOnDevice(assessment, {
      attemptId,
      shuffleSeed,
      courseId: resolvedCourseId,
      courseItemId,
      startedAt,
    });
    try {
      await saveStartedAttempt({
        attempt: started.attempt,
        assessmentDetail: started.assessmentDetail,
      });
      await queueAssessmentStart({
        attemptId,
        courseItemId,
        cohortId: started.attempt.cohort?.id,
        shuffleSeed,
        startedAt,
        standalone: started.standalone,
        organizationId: activeOrganizationId ?? undefined,
      });
    } catch (cause) {
      startingOnDevice.current = false;
      Alert.alert(
        "Tugas tidak bisa dimulai",
        cause instanceof Error ? cause.message : "Coba lagi sebentar lagi.",
      );
      return;
    }
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: { courseId: resolvedCourseId, courseItemId, attemptId },
    });
  }

  const loading =
    isSessionPending ||
    (!session && Boolean(courseItemId)) ||
    (itemQuery.isPending && !item) ||
    (Boolean(item?.assessment) && assessmentQuery.isPending && !assessment);

  return (
    <>
      {/* Sidebar trigger replaces the back chevron: the drawer carries the
          course contents, so learners navigate without leaving the screen. */}
      <SidebarToolbarButton accessibilityLabel="Buka daftar isi kurikulum" />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.home}
          accessibilityLabel="Buka Hari Ini"
          // Back to the tabs already below, rather than stacking a second
          // copy of them (with its own drawer trigger) on top.
          onPress={() => router.dismissTo("/(home)/(tabs)/home")}
        />
      </Stack.Toolbar>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackVisible: false,
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

      {loading ? (
        <FullScreenState kind="loading" message="Memuat materi…" />
      ) : itemQuery.isError || !item ? (
        <FullScreenState
          kind="error"
          message="Aktivitas ini tidak tersedia atau kamu tidak lagi memiliki akses."
          onBack={() => router.back()}
          title="Materi tidak tersedia"
        />
      ) : item.assessment ? (
        assessment && startingAssessment ? (
          <StudyScreen contentClassName="gap-4" title={assessment.title}>
            <AttemptStartingPreview
              assessment={assessment}
              shuffleQuestions={assessment.shuffleQuestions}
              shuffleSeed={startingSeed}
            />
          </StudyScreen>
        ) : assessment && latestAttempt?.status === "GRADED" ? (
          <TugasPullFrame
            pull={assessment.event ? undefined : tugasPull}
            itemCompleted={itemCompleted}
            busy={learning.busy}
            holdLabel="Lulus tugas ini untuk lanjut"
          >
            <StudyScreen
              title=""
              bleedTop
              contentClassName="gap-4"
              pullToContinue={assessment.event ? undefined : tugasPull}
            >
              <AssessmentResult
                attemptId={latestAttempt.id}
                courseItemId={courseItemId}
                title={assessment.title}
                attempt={latestAttempt}
                passingScore={assessment.passingScore}
                itemCompleted={itemCompleted}
                canReattempt={assessmentEntry.canReattempt}
                learning={assessment.event ? undefined : learning}
                celebrate={celebrate}
                onReview={(question) =>
                  router.push({
                    pathname: "/courses/[courseId]/items/[courseItemId]/result",
                    params: {
                      courseId,
                      courseItemId,
                      attemptId: latestAttempt.id,
                      ...(question !== undefined
                        ? { question: String(question) }
                        : null),
                    },
                  })
                }
                onRetry={() => void beginAssessment()}
                retryDisabled={
                  assessment.questions.length === 0 ||
                  (assessment.eligibleCohorts.length > 1 && !selectedCohortId)
                }
                retryExtras={
                  <>
                    {assessment.eligibleCohorts.length > 1 ? (
                      <CohortPicker
                        cohorts={assessment.eligibleCohorts}
                        selectedId={selectedCohortId}
                        onSelect={setSelectedCohortId}
                      />
                    ) : null}
                    {startAssessment.isError ? (
                      <Text className="text-center text-sm text-destructive">
                        {userErrorMessage(
                          startAssessment.error,
                          "Tugas tidak dapat dimulai.",
                        )}
                      </Text>
                    ) : null}
                  </>
                }
              />
              {!assessment.event ? (
                <LearningFooterView
                  learning={learning}
                  compact
                  continueButton="screenReader"
                  nextLocked={itemCompleted !== true}
                />
              ) : null}
            </StudyScreen>
          </TugasPullFrame>
        ) : assessment ? (
          <TugasPullFrame
            pull={assessment.event ? undefined : tugasPull}
            itemCompleted={itemCompleted}
            busy={learning.busy}
            holdLabel={
              latestAttempt?.status === "SUBMITTED" ||
              latestAttempt?.status === "IN_REVIEW"
                ? "Tunggu nilainya untuk lanjut"
                : "Kerjakan tugas ini untuk lanjut"
            }
          >
            <StudyScreen
              title=""
              bleedTop
              pullToContinue={assessment.event ? undefined : tugasPull}
            >
              <HakgyoHero>
                <CardFan
                  faces={[
                    <View className="items-center" key="count">
                      <Text className="text-4xl font-black tabular-nums tracking-tight text-foreground">
                        {assessment.questions.length}
                      </Text>
                      <Eyebrow>soal</Eyebrow>
                    </View>,
                    <View key="second" />,
                    <View key="third" />,
                  ]}
                />
                <View className="items-center gap-2">
                  <Eyebrow size="md" tone="primary">
                    Tugas
                  </Eyebrow>
                  <Text
                    accessibilityRole="header"
                    className="text-center font-black tracking-tight text-foreground"
                    numberOfLines={2}
                    style={HERO_TITLE}
                  >
                    {assessment.title}
                  </Text>
                  {assessment.description ? (
                    <Text className="text-center text-sm leading-6 text-muted-foreground">
                      {assessment.description}
                    </Text>
                  ) : null}
                </View>
                <AssessmentFacts
                  timeLimitMinutes={assessment.timeLimitMinutes}
                  passingScore={assessment.passingScore}
                  maxAttempts={assessment.maxAttempts}
                  attemptsUsed={assessment.standaloneAttemptCount}
                />
                {(assessmentEntry.canStart || assessmentEntry.canReattempt) &&
                assessment.eligibleCohorts.length > 1 ? (
                  <CohortPicker
                    cohorts={assessment.eligibleCohorts}
                    selectedId={selectedCohortId}
                    onSelect={setSelectedCohortId}
                  />
                ) : null}
                {assessmentEntry.canStart ||
                assessmentEntry.canReattempt ||
                assessmentEntry.destination === "ATTEMPT" ? (
                  <HeroTile
                    {...startTileCopy({
                      resuming: assessmentEntry.destination === "ATTEMPT",
                      retrying: assessmentEntry.canReattempt,
                      offline: canStartOnDevice(assessment),
                      attemptsLeft:
                        assessment.maxAttempts === null
                          ? null
                          : assessment.maxAttempts -
                            assessment.standaloneAttemptCount,
                    })}
                    disabled={
                      assessment.questions.length === 0 ||
                      ((assessmentEntry.canStart ||
                        assessmentEntry.canReattempt) &&
                        assessment.eligibleCohorts.length > 1 &&
                        !selectedCohortId)
                    }
                    onPress={() => void beginAssessment()}
                  />
                ) : null}
                {startAssessment.isError ? (
                  <Text className="text-center text-sm text-destructive">
                    {userErrorMessage(
                      startAssessment.error,
                      "Tugas tidak dapat dimulai.",
                    )}
                  </Text>
                ) : null}
              </HakgyoHero>
              {/* What the task is like before starting: its first question,
                as it will look, but not answerable here. */}
              {!latestAttempt && assessment.questions[0] ? (
                <QuestionPreview
                  question={assessment.questions[0]}
                  total={assessment.questions.length}
                  resolveAssetUrl={resolveAssetUrl}
                />
              ) : null}
              <AssessmentOverview
                passingScore={assessment.passingScore}
                latestAttempt={latestAttempt}
                itemCompleted={itemCompleted}
                canReattempt={assessmentEntry.canReattempt}
                gatesProgress={!assessment.event}
              />
              {!assessment.event ? (
                <LearningFooterView
                  learning={learning}
                  compact
                  continueButton="screenReader"
                  nextLocked={itemCompleted !== true}
                />
              ) : null}
            </StudyScreen>
          </TugasPullFrame>
        ) : (
          <FullScreenState
            kind="error"
            onBack={() => router.back()}
            title="Tugas tidak tersedia"
          />
        )
      ) : vocabulary ? (
        <VocabularySetDetail
          courseId={courseId}
          courseItemId={courseItemId}
          vocabulary={vocabulary}
        />
      ) : !material ? (
        <FullScreenState
          kind="empty"
          message="Materi ini belum tersimpan di perangkat. Sambungkan ke internet, lalu sinkronkan dari Profil > Pengaturan."
        />
      ) : (
        <View className="flex-1">
          <GestureDetector gesture={pullToContinue.gesture}>
            <Animated.ScrollView
              ref={scrollRef}
              onContentSizeChange={(_width, height) => {
                materialContentHeight.current = height;
                markShortContentAtEnd();
                aimPendingAnchor();
              }}
              onScrollBeginDrag={() => {
                // The learner took over; stop re-aiming the anchor.
                pendingAnchor.current = null;
              }}
              onLayout={(event) => {
                materialViewportHeight.current =
                  event.nativeEvent.layout.height;
                markShortContentAtEnd();
              }}
              onScroll={pullToContinue.onScroll}
              scrollEventThrottle={16}
              className="flex-1 bg-background"
              contentContainerClassName="px-5 pb-32 pt-4"
              contentInsetAdjustmentBehavior="automatic"
            >
              <View
                onLayout={(event) => {
                  materialTop.current = event.nativeEvent.layout.y;
                  aimPendingAnchor();
                }}
              >
                <MaterialHeader
                  title={material.title}
                  description={material.description}
                  position={materialPosition(outline.data, courseItemId)}
                />
                <NativeContentRenderer
                  content={material.content}
                  courseItemId={courseItemId}
                  resourceReferences={item.embeddedResources}
                  resolveAssetUrl={resolveAssetUrl}
                  onReadingProgress={onReadingProgress}
                  onBlockLayout={onBlockLayout}
                  onOpenMaterialLink={(target: MaterialLinkTarget) => {
                    // A section of this material: just scroll there.
                    if (target.materialId === material.id) {
                      scrollToBlock(target.anchor, true);
                      return;
                    }
                    router.push({
                      pathname: "/material-link",
                      params: {
                        materialId: target.materialId,
                        ...(target.anchor ? { anchor: target.anchor } : {}),
                        courseId: courseId || item.module.courseId,
                        sourceCourseItemId: courseItemId,
                      },
                    });
                  }}
                  onOpenResource={(type, resourceId, targetCourseItemId) => {
                    if (type === "vocabulary") {
                      router.push({
                        pathname: "/vocabulary/[vocabularySetId]",
                        params: {
                          vocabularySetId: resourceId,
                          sourceCourseItemId: courseItemId,
                          courseId,
                        },
                      });
                      return;
                    }
                    if (targetCourseItemId) {
                      router.push({
                        pathname: "/courses/[courseId]/items/[courseItemId]",
                        params: { courseId, courseItemId: targetCourseItemId },
                      });
                    }
                  }}
                />
              </View>
              <View className="mt-10">
                <LearningFooterView
                  learning={learning}
                  // One "next" row: pulling past the end is how to go on.
                  compact
                  // Pulling past the end continues; the button stays for
                  // screen readers, which cannot pull.
                  continueButton="screenReader"
                  continueLock={
                    readingGuard.locked
                      ? `Baca dulu · ${formatCountdown(readingGuard.remaining)}`
                      : undefined
                  }
                  requirementActions={requirementActionsFor(
                    item,
                    { courseId, courseItemId },
                    "push",
                  )}
                />
              </View>
            </Animated.ScrollView>
          </GestureDetector>
          {readingGuard.locked ? (
            <ReadingGuardIndicator
              atEnd={pullToContinue.atEnd}
              remaining={readingGuard.remaining}
              required={readingGuard.required}
            />
          ) : (
            <PullToContinueIndicator
              pull={pullToContinue.pull}
              locked={pullToContinue.locked}
              releasing={pullToContinue.releasing}
              drop={pullToContinue.drop}
              atEnd={pullToContinue.atEnd}
              enabled={pullToContinue.enabled}
              busy={learning.busy}
            />
          )}
        </View>
      )}
    </>
  );
}

/** The class to start a tugas in, when the learner is in more than one. */
function CohortPicker({
  cohorts,
  selectedId,
  onSelect,
}: {
  cohorts: ReadonlyArray<{ id: string; name: string }>;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-foreground">Pilih kelas</Text>
      {cohorts.map((cohort) => (
        <Pressable
          className={`rounded-xl border px-4 py-3 ${selectedId === cohort.id ? "border-primary bg-primary/10" : "border-border"}`}
          key={cohort.id}
          onPress={() => onSelect(cohort.id)}
        >
          <Text className="font-bold text-foreground">{cohort.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The start tile of a course tugas: start, continue or try again. */
function startTileCopy({
  resuming,
  retrying,
  offline,
  attemptsLeft,
}: {
  resuming: boolean;
  retrying: boolean;
  /** Starts on the device, without a connection. */
  offline: boolean;
  attemptsLeft: number | null;
}) {
  if (resuming)
    return {
      eyebrow: "Belum dikirim",
      title: "Lanjutkan tugas",
      meta: "Jawabanmu tersimpan. Kirim jika sudah siap.",
      pill: "Lanjutkan",
    };
  const connection = offline
    ? "Bisa dikerjakan tanpa internet"
    : "Perlu internet untuk mulai";
  if (retrying)
    return {
      eyebrow: "Coba lagi",
      title: "Kerjakan ulang tugas",
      meta:
        attemptsLeft === null
          ? connection
          : `Sisa ${attemptsLeft} percobaan · ${connection}`,
      pill: "Mulai",
    };
  return {
    eyebrow: "Siap mulai?",
    title: "Mulai tugas",
    meta: connection,
    pill: "Mulai",
  };
}

/**
 * A tugas page in a course with pulling past its end to continue: the
 * arrow once the tugas is passed, otherwise what still holds the learner.
 * Without `pull` (a latihan or tryout) it adds nothing.
 */
function TugasPullFrame({
  pull,
  itemCompleted,
  busy,
  holdLabel,
  children,
}: {
  pull: ReturnType<typeof usePullToContinue> | undefined;
  itemCompleted: boolean | undefined;
  busy: boolean;
  holdLabel: string;
  children: ReactNode;
}) {
  if (!pull) return <>{children}</>;
  return (
    <View className="flex-1">
      {children}
      {itemCompleted === true ? (
        <PullToContinueIndicator
          pull={pull.pull}
          locked={pull.locked}
          releasing={pull.releasing}
          drop={pull.drop}
          atEnd={pull.atEnd}
          enabled={pull.enabled}
          busy={busy}
        />
      ) : itemCompleted === false ? (
        <PullHoldIndicator label={holdLabel} atEnd={pull.atEnd} />
      ) : null}
    </View>
  );
}
