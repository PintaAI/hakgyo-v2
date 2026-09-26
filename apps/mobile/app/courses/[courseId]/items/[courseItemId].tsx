import { router, Stack, useLocalSearchParams } from "expo-router";
import { resolveAssessmentEntry } from "@hakgyo/shared";
import { SYNC_PROTOCOL } from "@hakgyo/shared/mobile-sync";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../src/components/content-renderer";
import { VocabularySetDetail } from "../../../../src/components/learn/vocabulary-set-detail";
import { CourseLearningFooter } from "../../../../src/components/learn/course-learning-footer";
import { assessmentAttemptPresentation } from "../../../../src/lib/assessment-state";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import type { LearningPathCourse } from "../../../../src/lib/course-learning-path";
import { useSidebarIndicators } from "../../../../src/lib/sidebar-indicators";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../src/providers/MobileSyncProvider";
import {
  useCourseItem,
  useCourseOutline,
  useItemAssessment,
} from "../../../../src/sync/hooks";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import { SidebarToolbarButton } from "../../../../src/components/sidebar/SidebarToolbarButton";
import {
  StudyAction,
  StudyGlass,
} from "../../../../src/components/study-glass";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function CourseItemScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  return (
    <CourseItemContent
      key={courseItemId}
      courseId={courseId}
      courseItemId={courseItemId}
    />
  );
}

function CourseItemContent({
  courseId,
  courseItemId,
}: {
  courseId: string;
  courseItemId: string;
}) {
  const wasAtBottom = useRef(false);
  const isAtBottom = useRef(false);
  const materialContentHeight = useRef(0);
  const materialViewportHeight = useRef(0);
  // Paged blocks (PDF book pages) that the learner hasn't finished yet.
  const unreadPagedBlocks = useRef(new Set<string>());
  const openLearningSheet = () => {
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/learning-progress",
      params: { courseId, courseItemId },
    });
  };
  const openLearningSheetAtBottom = () => {
    if (wasAtBottom.current || unreadPagedBlocks.current.size > 0) return;
    wasAtBottom.current = true;
    openLearningSheet();
  };
  const openLearningSheetForShortContent = () => {
    if (
      materialContentHeight.current > 0 &&
      materialViewportHeight.current > 0 &&
      materialContentHeight.current <= materialViewportHeight.current + 32
    ) {
      openLearningSheetAtBottom();
    }
  };
  const openLearningSheetRef = useRef(() => {});
  openLearningSheetRef.current = () => {
    if (isAtBottom.current) openLearningSheetAtBottom();
    else openLearningSheetForShortContent();
  };
  const onReadingProgress = useCallback((key: string, finished: boolean) => {
    if (!finished) {
      unreadPagedBlocks.current.add(key);
      return;
    }
    if (!unreadPagedBlocks.current.delete(key)) return;
    if (unreadPagedBlocks.current.size === 0) openLearningSheetRef.current();
  }, []);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  const { markEntitySeen } = useSidebarIndicators();
  const { prefetchLesson, saveStartedAttempt } = useMobileSyncActions();
  // Everything below composes from the local course bundle + learner index;
  // the online procedures only run when the bundle is not on the device yet.
  // Keep the progress sheet's outline warm while the learner reads.
  const outline = useCourseOutline(courseId, {
    enabled: Boolean(session && courseId),
  });
  const initialOutline = useRef<LearningPathCourse>(undefined);
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
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const item = itemQuery.data;
  const currentModuleId = outline.data?.modules.find((module) =>
    module.items.some((entry) => entry.id === courseItemId),
  )?.id;
  const material = item?.material;
  const vocabulary = item?.vocabularySet;
  const assessment = assessmentQuery.data;
  const latestAttempt = assessment?.latestStandaloneAttempt;
  const assessmentEntry = resolveAssessmentEntry({
    attemptStatus: latestAttempt?.status,
    attemptsUsed: assessment?.standaloneAttemptCount ?? 0,
    maxAttempts: assessment?.maxAttempts ?? null,
    available: true,
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

  useEffect(() => {
    if (!initialOutline.current && outline.data)
      initialOutline.current = outline.data;
  }, [outline.data]);

  async function beginAssessment() {
    if (!assessment) return;
    if (latestAttempt?.status === "IN_PROGRESS") {
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: { courseId, courseItemId, attemptId: latestAttempt.id },
      });
      return;
    }
    const cohorts = assessment.eligibleCohorts;
    const cohortId = cohorts.length === 1 ? cohorts[0]?.id : selectedCohortId;
    try {
      const result = await startAssessment.mutateAsync({
        protocol: SYNC_PROTOCOL,
        courseItemId,
        cohortId,
      });
      // Persisted locally so the attempt resumes offline.
      await saveStartedAttempt(result);
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: { courseId, courseItemId, attemptId: result.attempt.id },
      });
    } catch {
      // The mutation error is shown next to the action.
    }
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
      <SidebarToolbarButton accessibilityLabel="Open course contents" />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcons.home}
          accessibilityLabel="Go to Today"
          onPress={() => router.replace("/(home)/(tabs)/home")}
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
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">
            Loading material…
          </Text>
        </View>
      ) : itemQuery.isError || !item ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-xl font-black text-foreground">
            Material unavailable
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            This activity is unavailable or you no longer have access.
          </Text>
          <Pressable
            className="rounded-full border border-border px-5 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-foreground">Go back</Text>
          </Pressable>
        </View>
      ) : item.assessment ? (
        assessment ? (
          <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="gap-6 px-5 pb-14 pt-4"
            contentInsetAdjustmentBehavior="automatic"
          >
            <StudyGlass>
              <View className="gap-2">
                <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">
                  Assessment · {assessment.questions.length} questions
                </Text>
                <Text
                  adjustsFontSizeToFit
                  className="text-3xl font-black leading-10 tracking-tight text-foreground"
                  minimumFontScale={0.7}
                  numberOfLines={1}
                >
                  {assessment.title}
                </Text>
                {assessment.description ? (
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {assessment.description}
                  </Text>
                ) : null}
              </View>
              {(assessmentEntry.canStart || assessmentEntry.canReattempt) &&
              assessment.eligibleCohorts.length > 1 ? (
                <View className="gap-2 border-t border-border pt-4">
                  <Text className="text-sm font-bold text-foreground">
                    Choose study group
                  </Text>
                  {assessment.eligibleCohorts.map((cohort) => (
                    <Pressable
                      className={`rounded-xl border px-4 py-3 ${selectedCohortId === cohort.id ? "border-primary bg-primary/10" : "border-border"}`}
                      key={cohort.id}
                      onPress={() => setSelectedCohortId(cohort.id)}
                    >
                      <Text className="font-bold text-foreground">
                        {cohort.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text className="text-sm leading-6 text-muted-foreground">
                {assessment.timeLimitMinutes != null
                  ? `${assessment.timeLimitMinutes} minutes`
                  : "No time limit"}{" "}
                ·{" "}
                {assessment.maxAttempts == null
                  ? "Unlimited attempts"
                  : `${assessment.maxAttempts} attempts allowed`}
                {latestAttempt
                  ? `\n${assessmentAttemptPresentation(latestAttempt).detail}${latestAttempt.status === "GRADED" && latestAttempt.score !== null && latestAttempt.maxScore !== null ? ` · ${latestAttempt.score}/${latestAttempt.maxScore}` : ""}`
                  : ""}
                {"\n"}Move freely between questions. Submit when you’re ready.
              </Text>
              {assessmentEntry.canStart ||
              assessmentEntry.canReattempt ||
              assessmentEntry.destination === "ATTEMPT" ? (
                <StudyAction
                  disabled={
                    startAssessment.isPending ||
                    assessment.questions.length === 0 ||
                    ((assessmentEntry.canStart ||
                      assessmentEntry.canReattempt) &&
                      assessment.eligibleCohorts.length > 1 &&
                      !selectedCohortId)
                  }
                  onPress={() => void beginAssessment()}
                >
                  {startAssessment.isPending
                    ? "Starting…"
                    : assessmentEntry.destination === "ATTEMPT"
                      ? "Resume assessment"
                      : assessmentEntry.canReattempt
                        ? "Re-attempt assessment"
                        : "Start assessment"}
                </StudyAction>
              ) : null}
              {latestAttempt && latestAttempt.status !== "IN_PROGRESS" ? (
                <StudyAction
                  secondary={assessmentEntry.canReattempt}
                  onPress={() =>
                    router.push({
                      pathname:
                        "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                      params: {
                        courseId,
                        courseItemId,
                        attemptId: latestAttempt.id,
                      },
                    })
                  }
                >
                  {latestAttempt.status === "GRADED"
                    ? "Review result"
                    : "View submission"}
                </StudyAction>
              ) : null}
              {startAssessment.isError ? (
                <Text className="text-center text-sm text-destructive">
                  {startAssessment.error.message}
                </Text>
              ) : null}
            </StudyGlass>
            {!assessment.event ? (
              <CourseLearningFooter
                key={courseItemId}
                courseId={courseId}
                courseItemId={courseItemId}
                completionMode="assessment"
                initialOutline={initialOutline.current}
              />
            ) : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center bg-background px-6">
            <Text className="text-center text-sm text-destructive">
              Assessment unavailable.
            </Text>
          </View>
        )
      ) : vocabulary ? (
        <VocabularySetDetail
          courseId={courseId}
          courseItemId={courseItemId}
          vocabulary={vocabulary}
        />
      ) : !material ? (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-center text-sm text-muted-foreground">
            This activity is not available in the mobile app yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          onContentSizeChange={(_width, height) => {
            materialContentHeight.current = height;
            openLearningSheetForShortContent();
          }}
          onLayout={(event) => {
            materialViewportHeight.current = event.nativeEvent.layout.height;
            openLearningSheetForShortContent();
          }}
          onScroll={(event) => {
            const {
              contentInset,
              contentOffset,
              contentSize,
              layoutMeasurement,
            } = event.nativeEvent;
            const distanceFromBottom =
              contentSize.height +
              contentInset.bottom -
              (contentOffset.y + layoutMeasurement.height);
            const atBottom = distanceFromBottom <= 32;
            isAtBottom.current = atBottom;
            if (atBottom) openLearningSheetAtBottom();
            else if (distanceFromBottom > 120) wasAtBottom.current = false;
          }}
          scrollEventThrottle={32}
          className="flex-1 bg-background"
          contentContainerClassName="px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <NativeContentRenderer
            content={material.content}
            resourceReferences={item.embeddedResources}
            resolveAssetUrl={resolveAssetUrl}
            onReadingProgress={onReadingProgress}
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
          <View className="mt-8">
            <StudyAction onPress={openLearningSheet}>Continue</StudyAction>
          </View>
        </ScrollView>
      )}
    </>
  );
}
