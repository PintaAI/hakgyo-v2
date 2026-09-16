import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  getLearningMilestone,
  getLearningPath,
  type LearningPathCourse,
  type LearningPathItem,
} from "../../lib/course-learning-path";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";

import { MilestoneTrophy } from "./milestone-trophy";

type Milestone = NonNullable<ReturnType<typeof getLearningMilestone>>;
type FooterIssue =
  { kind: "requirements" } | { kind: "error"; message: string };

export type LearningRequirementAction = {
  id: string;
  type: "VOCABULARY_SET" | "ASSESSMENT";
  title: string;
  onPress: () => void;
};

export function CourseLearningFooter({
  courseId,
  courseItemId,
  onReadAgain,
  completionMode = "manual",
  initialOutline,
  requirementActions = [],
}: {
  courseId: string;
  courseItemId: string;
  onReadAgain?: () => void;
  completionMode?: "manual" | "assessment";
  initialOutline?: LearningPathCourse;
  requirementActions?: LearningRequirementAction[];
}) {
  const { colors } = useAppTheme();
  const utils = api.useUtils();
  const outline = api.learning.getCourseOutline.useQuery({ courseId });
  const complete = api.learning.markContentProgress.useMutation();
  const baseline = useRef(initialOutline);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const saved = useRef(false);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<FooterIssue>();
  const [milestone, setMilestone] = useState<Milestone>();
  const path = outline.data && getLearningPath(outline.data, courseItemId);
  const finishingModule =
    path &&
    !path.item.isCompleted &&
    path.completedCount === path.module.items.length - 1;
  const assessmentIncomplete =
    completionMode === "assessment" && path && !path.item.isCompleted;

  useEffect(() => {
    if (!baseline.current && outline.data) baseline.current = outline.data;
  }, [outline.data]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function navigate(nextItem?: LearningPathItem) {
    setMilestone(undefined);
    if (nextItem) {
      router.replace({
        pathname: "/courses/[courseId]/items/[courseItemId]",
        params: { courseId, courseItemId: nextItem.id },
      });
    } else {
      router.replace({ pathname: "/courses/[courseId]", params: { courseId } });
    }
  }

  async function continueLearning() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setIssue(undefined);
    try {
      // Refresh before and after saving: only server-confirmed progress unlocks a module.
      const before = await utils.learning.getCourseOutline.fetch(
        { courseId },
        { staleTime: 0 },
      );
      baseline.current ??= before;
      const current = getLearningPath(before, courseItemId);
      if (!current)
        throw new Error(
          "This activity is no longer available. Check the course contents for your next step.",
        );
      if (!current.item.isCompleted) {
        if (completionMode === "assessment") {
          setIssue({ kind: "requirements" });
          return;
        }
        await complete.mutateAsync({ courseItemId, status: "COMPLETED" });
        saved.current = true;
      }
      const after = await utils.learning.getCourseOutline.fetch(
        { courseId },
        { staleTime: 0 },
      );
      // Refresh other surfaces without making navigation wait for unrelated queries.
      void Promise.allSettled([
        utils.learning.getCourseItem.invalidate({ courseItemId }),
        utils.learning.listMyCourses.invalidate(),
        utils.gamification.invalidate(),
      ]);
      if (!mounted.current) return;
      const next = getLearningPath(after, courseItemId);
      if (!next?.item.isCompleted)
        throw new Error(
          "Complete the required activities in this material, then try again.",
        );
      const celebration = getLearningMilestone(
        baseline.current,
        after,
        courseItemId,
      );
      baseline.current = after;
      if (celebration) setMilestone(celebration);
      else if (next.nextItem) navigate(next.nextItem);
      else if (next.courseCompleted) navigate();
      else
        setIssue({
          kind: "error",
          message:
            "Your progress is saved. Open the course contents to see what is still required.",
        });
    } catch (cause) {
      if (!mounted.current) return;
      const code =
        cause && typeof cause === "object" && "data" in cause
          ? (cause.data as { code?: string } | undefined)?.code
          : undefined;
      setIssue(
        code === "PRECONDITION_FAILED"
          ? { kind: "requirements" }
          : {
              kind: "error",
              message: saved.current
                ? "Your progress was saved, but the next activity did not load. Tap continue to try again."
                : cause instanceof Error
                  ? cause.message
                  : "We couldn’t save your progress. Check your connection and try again.",
            },
      );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View className="gap-5 rounded-3xl border border-border bg-card p-5">
      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-primary">
          {path
            ? `Module ${path.moduleIndex + 1} · Activity ${path.itemIndex + 1} of ${path.module.items.length}`
            : "Your learning path"}
        </Text>
        <Text className="text-2xl font-black text-foreground">
          {path?.item.isCompleted ? "Nicely done!" : "Ready for the next step?"}
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground">
          {path?.module.title}
          {path
            ? ` · ${path.completedCount} of ${path.module.items.length} completed`
            : "Keep your momentum, one activity at a time."}
        </Text>
        {path ? (
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: path.module.items.length,
              now: path.completedCount,
            }}
            className="mt-1 h-2 overflow-hidden rounded-full bg-muted"
          >
            <View
              className="h-full rounded-full bg-primary"
              style={{
                width: `${(path.completedCount / path.module.items.length) * 100}%`,
              }}
            />
          </View>
        ) : null}
      </View>
      {path?.nextItem ? (
        <View className="gap-1 border-t border-border pt-4">
          <Text className="text-xs font-semibold text-muted-foreground">
            UP NEXT
            {path.nextModule?.id !== path.module.id
              ? ` · ${path.nextModule?.title}`
              : ""}
          </Text>
          <Text className="text-base font-bold text-foreground">
            {path.nextItem.title}
          </Text>
        </View>
      ) : path && !path.courseCompleted ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          Finish this step to see what’s next on your learning path.
        </Text>
      ) : null}
      {issue?.kind === "requirements" || assessmentIncomplete ? (
        <View
          accessibilityRole="alert"
          className="gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4"
        >
          <View className="flex-row items-start gap-3">
            <View className="size-9 items-center justify-center rounded-full bg-primary">
              <Text className="font-black text-primary-foreground">1</Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-black text-foreground">
                {assessmentIncomplete
                  ? "Complete this assessment first"
                  : "One quick step left"}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {assessmentIncomplete
                  ? "Pass the assessment, or wait for your teacher’s review if it is still being graded."
                  : requirementActions.length
                    ? "Complete the practice below to lock in what you learned. Your lesson progress is safe."
                    : "Complete the required practice in this lesson, then come back and continue."}
              </Text>
            </View>
          </View>
          {requirementActions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityHint={`Opens the required ${action.type === "VOCABULARY_SET" ? "vocabulary practice" : "assessment"}`}
              className="min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 active:opacity-80"
              onPress={() => {
                setIssue(undefined);
                action.onPress();
              }}
            >
              <Text className="text-center font-bold text-primary-foreground">
                {action.type === "VOCABULARY_SET" ? "Practice" : "Open"}{" "}
                {action.title} →
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View className="gap-2">
        {issue?.kind !== "requirements" && !assessmentIncomplete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-4 disabled:opacity-50"
            disabled={busy}
            onPress={() => void continueLearning()}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : null}
            <Text className="text-base font-bold text-primary-foreground">
              {busy
                ? "Saving your progress…"
                : path?.courseCompleted && !path.nextItem
                  ? "Finish course"
                  : path?.item.isCompleted || completionMode === "assessment"
                    ? "Continue learning →"
                    : finishingModule
                      ? "Complete module →"
                      : "Complete & continue →"}
            </Text>
          </Pressable>
        ) : null}
        {onReadAgain ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-full px-5 py-3"
            onPress={onReadAgain}
            disabled={busy}
          >
            <Text className="font-semibold text-muted-foreground">
              ↑ Read again
            </Text>
          </Pressable>
        ) : null}
      </View>
      {issue?.kind === "error" || outline.isError ? (
        <Text
          accessibilityRole="alert"
          className="text-sm leading-5 text-destructive"
        >
          {issue?.kind === "error"
            ? issue.message
            : "We couldn’t load your learning path. Tap continue to try again."}
        </Text>
      ) : null}
      <Modal
        visible={!!milestone}
        transparent
        animationType="none"
        onRequestClose={() => setMilestone(undefined)}
      >
        <View className="flex-1 justify-center bg-black/60 px-6 py-12">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <View
              accessibilityViewIsModal
              className="items-center gap-6 rounded-[32px] bg-card px-6 py-8"
            >
              {milestone ? <MilestoneTrophy /> : null}
              <View className="items-center gap-3">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-primary">
                  {milestone?.courseCompleted
                    ? "Every step counts. You did them all."
                    : "One more milestone"}
                </Text>
                <Text
                  accessibilityRole="header"
                  className="text-center text-3xl font-black text-foreground"
                >
                  {milestone?.courseCompleted
                    ? "Course complete!"
                    : "Module complete!"}
                </Text>
                <Text className="text-center text-base leading-6 text-muted-foreground">
                  You finished {milestone?.moduleTitle}. Take a moment — you
                  earned it.
                </Text>
              </View>
              {milestone?.unlockedModuleTitle || milestone?.nextItem ? (
                <View className="w-full gap-2 rounded-2xl bg-primary/10 p-5">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-primary">
                    {milestone.unlockedModuleTitle
                      ? "🔓 Next module unlocked"
                      : "Keep your momentum"}
                  </Text>
                  <Text className="text-lg font-bold text-foreground">
                    {milestone.unlockedModuleTitle ?? milestone.nextItem?.title}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="min-h-14 w-full items-center justify-center rounded-full bg-primary px-5 py-4"
                onPress={() => navigate(milestone?.nextItem)}
              >
                <Text className="text-base font-bold text-primary-foreground">
                  {milestone?.nextItem
                    ? "Let’s keep going →"
                    : "View my progress"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 items-center justify-center px-5"
                onPress={() => navigate()}
              >
                <Text className="font-semibold text-muted-foreground">
                  {milestone?.nextItem ? "Take a break" : "Back to course"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
