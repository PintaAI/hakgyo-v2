import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import {
  CourseLearningFooter,
  type LearningRequirementAction,
} from "../../../../src/components/learn/course-learning-footer";
import { VocabularySetDetail } from "../../../../src/components/learn/vocabulary-set-detail";
import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptForItem,
} from "../../../../src/lib/assessment-state";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";

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
  const scrollRef = useRef<ScrollView>(null);
  const scrollTop = useRef(0);
  const readAgain = () =>
    scrollRef.current?.scrollTo({ y: scrollTop.current, animated: true });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  const { open } = useDrawer();
  const resolveAssetUrl = useApiAssetResolver();
  const itemQuery = api.learning.getCourseItem.useQuery(
    { courseItemId },
    { enabled: Boolean(session && courseItemId), retry: false },
  );
  const markProgress = api.learning.markContentProgress.useMutation();
  const assessmentQuery = api.assessment.getForCourseItem.useQuery(
    { courseItemId },
    {
      enabled: Boolean(session && courseItemId && itemQuery.data?.assessment),
      retry: false,
    },
  );
  const attemptsQuery = api.assessment.listMyAttempts.useQuery(undefined, {
    enabled: Boolean(session && itemQuery.data?.assessment),
    retry: false,
  });
  const latestAttempt = latestStandaloneAttemptForItem(
    attemptsQuery.data,
    courseItemId,
  );
  const startAssessment = api.assessment.startAttempt.useMutation();
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const item = itemQuery.data;
  const material = item?.material;
  const vocabulary = item?.vocabularySet;
  const assessment = assessmentQuery.data;
  const materialRequirementActions: LearningRequirementAction[] =
    material?.requiredActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      onPress: () => {
        if (activity.type === "VOCABULARY_SET") {
          router.push({
            pathname: "/vocabulary/[vocabularySetId]",
            params: {
              vocabularySetId: activity.resourceId,
              sourceCourseItemId: courseItemId,
              courseId,
            },
          });
          return;
        }
        router.push({
          pathname: "/courses/[courseId]/items/[courseItemId]",
          params: { courseId, courseItemId: activity.courseItemId },
        });
      },
    })) ?? [];

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
    if ((material || vocabulary) && item && item.progress.length === 0) {
      markProgress.mutate({ courseItemId, status: "IN_PROGRESS" });
    }
    // Progress creation is idempotent and should run only when the item loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseItemId, item?.id, item?.progress.length, material, vocabulary]);

  async function beginAssessment() {
    if (!assessment) return;
    if (latestAttempt) {
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
      const attempt = await startAssessment.mutateAsync({
        courseItemId,
        cohortId,
      });
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: { courseId, courseItemId, attemptId: attempt.id },
      });
    } catch {
      // The mutation error is shown next to the action.
    }
  }

  const loading =
    isSessionPending ||
    (!session && Boolean(courseItemId)) ||
    itemQuery.isPending ||
    (Boolean(item?.assessment) && assessmentQuery.isPending);

  return (
    <>
      {/* Sidebar trigger replaces the back chevron: the drawer carries the
          course contents, so learners navigate without leaving the screen. */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.menu}
          accessibilityLabel="Open course contents"
          onPress={open}
        />
      </Stack.Toolbar>
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
            <View className="gap-4 rounded-xl border border-border bg-card p-6">
              <View className="size-12 items-center justify-center rounded-xl bg-primary/10">
                <Text className="text-xl font-black text-primary">A</Text>
              </View>
              <View className="gap-2">
                <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">
                  Assessment · {assessment.questions.length} questions
                </Text>
                <Text className="text-3xl font-black leading-10 tracking-tight text-foreground">
                  {assessment.title}
                </Text>
                {assessment.description ? (
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {assessment.description}
                  </Text>
                ) : null}
              </View>
              {!latestAttempt && assessment.eligibleCohorts.length > 1 ? (
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
              <Pressable
                accessibilityRole="button"
                className="items-center rounded-full bg-primary px-5 py-4 disabled:opacity-50"
                disabled={
                  startAssessment.isPending ||
                  attemptsQuery.isPending ||
                  attemptsQuery.isError ||
                  (!latestAttempt &&
                    (assessment.questions.length === 0 ||
                      (assessment.eligibleCohorts.length > 1 &&
                        !selectedCohortId)))
                }
                onPress={() => void beginAssessment()}
              >
                <Text className="font-black text-primary-foreground">
                  {startAssessment.isPending
                    ? "Starting…"
                    : attemptsQuery.isPending
                      ? "Loading progress…"
                      : latestAttempt
                        ? assessmentAttemptPresentation(latestAttempt).action
                        : "Start assessment"}
                </Text>
              </Pressable>
              {attemptsQuery.isError ? (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center"
                  onPress={() => void attemptsQuery.refetch()}
                >
                  <Text className="text-sm text-destructive">
                    Could not load your attempts. Tap to retry.
                  </Text>
                </Pressable>
              ) : null}
              {startAssessment.isError ? (
                <Text className="text-center text-sm text-destructive">
                  {startAssessment.error.message}
                </Text>
              ) : null}
            </View>
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
          moduleId={item.moduleId}
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
          ref={scrollRef}
          onScroll={(event) => {
            scrollTop.current = -event.nativeEvent.contentInset.top;
          }}
          scrollEventThrottle={100}
          className="flex-1 bg-background"
          contentContainerClassName="gap-7 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <NativeContentRenderer
            content={material.content}
            resourceReferences={item.embeddedResources}
            resolveAssetUrl={resolveAssetUrl}
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

          <CourseLearningFooter
            courseId={courseId}
            courseItemId={courseItemId}
            onReadAgain={readAgain}
            requirementActions={materialRequirementActions}
          />
        </ScrollView>
      )}
    </>
  );
}
