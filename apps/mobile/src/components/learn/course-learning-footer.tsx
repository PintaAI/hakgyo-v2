import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  getLearningMilestone,
  getLearningPath,
  type LearningPathCourse,
  type LearningPathItem,
} from "../../lib/course-learning-path";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useMobileSyncActions } from "../../providers/MobileSyncProvider";
import { StudyAction } from "../study-glass";

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
  const utils = api.useUtils();
  const outline = api.learning.getCourseOutline.useQuery({ courseId });
  const { activeOrganizationId } = useAppTheme();
  const { completeContent } = useMobileSyncActions();
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
      if (
        nextItem.type === "ASSESSMENT" &&
        nextItem.attempt?.status === "IN_PROGRESS"
      ) {
        router.replace({
          pathname:
            "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
          params: {
            courseId,
            courseItemId: nextItem.id,
            attemptId: nextItem.attempt.id,
          },
        });
        return;
      }
      router.replace({
        pathname: "/courses/[courseId]/items/[courseItemId]",
        params: { courseId, courseItemId: nextItem.id },
      });
    } else {
      router.replace({ pathname: "/courses/[courseId]", params: { courseId } });
    }
  }

  async function continueLearning() {
    if (path?.item.isCompleted) {
      setIssue(undefined);
      if (path.nextItem) navigate(path.nextItem);
      else if (path.courseCompleted) navigate();
      else
        setIssue({
          kind: "error",
          message:
            "Open the course contents to see what is still required before continuing.",
        });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setIssue(undefined);
    try {
      const before =
        utils.learning.getCourseOutline.getData({ courseId }) ?? outline.data;
      if (!before)
        throw new Error("Course data is not available on this device.");
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
        const sync = await completeContent({
          courseItemId,
          organizationId: activeOrganizationId ?? undefined,
        });
        saved.current = true;
        if (sync.state === "queued") {
          setIssue({
            kind: "error",
            message:
              "Completion is saved on this device and will sync when you are online.",
          });
          return;
        }
        const after = sync.result.dashboard.outlines[courseId];
        if (!after) {
          throw new Error(
            "Completion synced, but the updated course did not load.",
          );
        }
        utils.learning.getCourseOutline.setData({ courseId }, after);
        // Refresh other cached surfaces without starting more server calls.
        void Promise.allSettled([
          utils.learning.getCourseItem.invalidate(
            { courseItemId },
            { refetchType: "none" },
          ),
          utils.learning.listMyCourses.invalidate(undefined, {
            refetchType: "none",
          }),
          utils.gamification.invalidate(undefined, { refetchType: "none" }),
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
        return;
      }
      if (current.nextItem) navigate(current.nextItem);
      else if (current.courseCompleted) navigate();
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

  const content = (
    <View className="gap-6">
      <View className="gap-3">
        <View className="gap-1.5">
          <Text className="text-center text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            {path
              ? `Module ${path.moduleIndex + 1} · Activity ${path.itemIndex + 1} of ${path.module.items.length}`
              : "Your learning path"}
          </Text>
          <Text className="text-[28px] font-black leading-8 tracking-tight text-foreground">
            {path?.item.isCompleted ? "Nice work" : "Ready to move on?"}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {path
              ? `${path.completedCount} of ${path.module.items.length} activities complete in ${path.module.title}`
              : "Keep your momentum, one activity at a time."}
          </Text>
        </View>
        {path ? (
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: path.module.items.length,
              now: path.completedCount,
            }}
            className="h-1 overflow-hidden rounded-full bg-muted"
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
        <View className="flex-row items-center gap-4 border-t border-border pt-5">
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
                Up next
              </Text>
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`size-1.5 rounded-full ${getLearningItemTypeMeta(path.nextItem.type).dotClass}`}
                />
                <Text
                  className={`text-xs font-semibold ${getLearningItemTypeMeta(path.nextItem.type).textClass}`}
                >
                  {getLearningItemTypeMeta(path.nextItem.type).label}
                </Text>
              </View>
            </View>
            <Text
              className="text-base font-bold leading-6 text-foreground"
              numberOfLines={2}
            >
              {path.nextItem.title}
            </Text>
            {path.nextModule?.id !== path.module.id ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                {path.nextModule?.title}
              </Text>
            ) : null}
          </View>
          <Text className="text-2xl font-light text-primary">→</Text>
        </View>
      ) : path && !path.courseCompleted ? (
        <Text className="border-t border-border pt-5 text-sm leading-5 text-muted-foreground">
          Finish this step to reveal the next activity.
        </Text>
      ) : null}
      {issue?.kind === "requirements" || assessmentIncomplete ? (
        <View
          accessibilityRole="alert"
          className="gap-4 border-t border-border pt-5"
        >
          <View className="gap-1.5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
              Before you continue
            </Text>
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
          <StudyAction
            disabled={busy}
            loading={busy}
            onPress={() => void continueLearning()}
          >
            {busy
              ? "Saving your progress…"
              : path?.courseCompleted && !path.nextItem
                ? "Finish course"
                : path?.item.isCompleted || completionMode === "assessment"
                  ? "Continue learning →"
                  : finishingModule
                    ? "Complete module →"
                    : "Complete & continue →"}
          </StudyAction>
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
    </View>
  );

  if (!milestone) return content;

  return (
    <View className="gap-6">
      <View className="items-center gap-2">
        <Text className="text-center text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
          {milestone.courseCompleted ? "Course complete" : "Module complete"}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-center text-[28px] font-black leading-8 tracking-tight text-foreground"
        >
          {milestone.courseCompleted ? "You did it" : "Keep the momentum"}
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          You completed {milestone.moduleTitle}.
        </Text>
      </View>

      {milestone.unlockedModuleTitle || milestone.nextItem ? (
        <View className="gap-1 border-t border-border pt-5">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            {milestone.unlockedModuleTitle ? "Unlocked" : "Up next"}
          </Text>
          <Text className="text-base font-bold leading-6 text-foreground">
            {milestone.unlockedModuleTitle ?? milestone.nextItem?.title}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <StudyAction onPress={() => navigate(milestone.nextItem)}>
          {milestone.nextItem ? "Continue learning →" : "View course progress"}
        </StudyAction>
        {milestone.nextItem ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center px-5"
            onPress={() => navigate()}
          >
            <Text className="font-semibold text-muted-foreground">
              Back to course
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
