import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

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
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  const resolveAssetUrl = useApiAssetResolver();
  const utils = api.useUtils();
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
  const startAssessment = api.assessment.startAttempt.useMutation();
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const item = itemQuery.data;
  const material = item?.material;
  const vocabulary = item?.vocabularySet;
  const assessment = assessmentQuery.data;
  const completed = item?.progress[0]?.status === "COMPLETED";

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

  async function completeMaterial() {
    try {
      await markProgress.mutateAsync({
        courseItemId,
        status: "COMPLETED",
      });
      await Promise.all([
        utils.learning.getCourseItem.invalidate({ courseItemId }),
        utils.learning.getCourseOutline.invalidate({ courseId }),
        utils.learning.listMyCourses.invalidate(),
        utils.gamification.invalidate(),
      ]);
    } catch {
      // The mutation state renders a retryable error below the action.
    }
  }

  async function beginAssessment() {
    if (!assessment) return;
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode:
            Platform.OS === "ios" ? "minimal" : undefined,
          headerShadowVisible: false,
          headerTitle:
            material?.title ??
            vocabulary?.title ??
            item?.assessment?.title ??
            "Learning activity",
          headerLargeTitle: false,
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
              {assessment.eligibleCohorts.length > 1 ? (
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
                  assessment.questions.length === 0 ||
                  (assessment.eligibleCohorts.length > 1 && !selectedCohortId)
                }
                onPress={() => void beginAssessment()}
              >
                <Text className="font-black text-primary-foreground">
                  {startAssessment.isPending ? "Starting…" : "Start assessment"}
                </Text>
              </Pressable>
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
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-5 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="gap-2 border-b border-border pb-6">
            <Text className="text-xs font-black uppercase tracking-[2px] text-primary">
              Vocabulary · {vocabulary.entries.length} words
            </Text>
            <Text className="text-3xl font-black leading-10 tracking-tight text-foreground">
              {vocabulary.title}
            </Text>
            {vocabulary.description ? (
              <Text className="text-sm leading-6 text-muted-foreground">
                {vocabulary.description}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            className="items-center rounded-2xl bg-primary px-5 py-4"
            onPress={() =>
              router.push({
                pathname: "/vocabulary/[vocabularySetId]",
                params: {
                  vocabularySetId: vocabulary.id,
                  sourceCourseItemId: courseItemId,
                },
              })
            }
          >
            <Text className="text-base font-bold text-primary-foreground">
              Practice these words
            </Text>
          </Pressable>
          {vocabulary.entries.map((entry) => (
            <View
              className="gap-1 rounded-xl border border-border bg-card p-5"
              key={entry.id}
            >
              <Text className="text-lg font-black text-foreground">
                {entry.term}
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                {entry.definition}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            className={`items-center rounded-full px-5 py-4 ${completed ? "bg-muted" : "bg-primary"}`}
            disabled={completed || markProgress.isPending}
            onPress={() => void completeMaterial()}
          >
            <Text
              className={`font-black ${completed ? "text-muted-foreground" : "text-primary-foreground"}`}
            >
              {completed ? "Vocabulary completed" : "Mark as completed"}
            </Text>
          </Pressable>
        </ScrollView>
      ) : !material ? (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-center text-sm text-muted-foreground">
            This activity is not available in the mobile app yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-7 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="gap-2 border-b border-border pb-6">
            <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">
              Learning material
            </Text>
            <Text className="text-3xl font-black leading-10 tracking-tight text-foreground">
              {material.title}
            </Text>
            {material.description ? (
              <Text className="text-sm leading-6 text-muted-foreground">
                {material.description}
              </Text>
            ) : null}
          </View>

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

          <Pressable
            accessibilityRole="button"
            className={`items-center rounded-full px-5 py-4 ${completed ? "bg-muted" : "bg-primary"}`}
            disabled={completed || markProgress.isPending}
            onPress={() => void completeMaterial()}
          >
            <Text
              className={`font-black ${completed ? "text-muted-foreground" : "text-primary-foreground"}`}
            >
              {markProgress.isPending
                ? "Saving…"
                : completed
                  ? "Material completed"
                  : "Mark as completed"}
            </Text>
          </Pressable>
          {markProgress.isError ? (
            <Text className="text-center text-sm text-destructive">
              Progress could not be saved. Please try again.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </>
  );
}
