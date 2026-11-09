import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";

import {
  getLearningMilestone,
  getLearningPath,
  type LearningPathCourse,
  type LearningPathItem,
} from "../../lib/course-learning-path";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
import { openCourseItem } from "../../lib/navigation";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useMobileSyncActions } from "../../providers/MobileSyncProvider";
import { hangeulCompletionBadgeCopy } from "../../lib/hangeul-visibility";
import { useHangeulBadgeState } from "../../lib/use-cohort-archive";
import { readCourseOutline, useCourseOutline } from "../../sync/hooks";
import { HangeulMasteryBadge } from "../hangeul-mastery-medal";
import { Action, Eyebrow, ProgressBar } from "../learning-ui";
import { StudyAction } from "../study-glass";
import { SymbolIcon } from "../ui/symbol-icon";

type Milestone = NonNullable<ReturnType<typeof getLearningMilestone>>;

/** Whether VoiceOver or TalkBack is on, following changes. */
function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setEnabled,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
type FooterIssue =
  { kind: "requirements" } | { kind: "error"; message: string };

export type LearningAssessmentState = {
  status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED" | null;
  canReattempt: boolean;
};

function assessmentGateMessage(state?: LearningAssessmentState) {
  switch (state?.status) {
    case "IN_PROGRESS":
      return "Selesaikan dan kirim tugas ini untuk lanjut.";
    case "SUBMITTED":
    case "IN_REVIEW":
      return "Jawabanmu sedang dinilai pengajar. Tunggu hasilnya untuk lanjut.";
    case "GRADED":
      return state.canReattempt
        ? "Nilaimu belum cukup untuk lanjut. Kerjakan ulang tugas ini."
        : "Nilaimu belum cukup untuk lanjut dan percobaan sudah habis. Hubungi pengajar.";
    default:
      return "Kerjakan tugas ini untuk lanjut ke aktivitas berikutnya.";
  }
}

export type LearningRequirementAction = {
  id: string;
  type: "VOCABULARY_SET" | "ASSESSMENT";
  title: string;
  onPress: () => void;
};

type FooterProps = {
  courseId: string;
  courseItemId: string;
  /**
   * `screenReader` shows the continue button only to VoiceOver and TalkBack
   * users, where another way to continue covers everyone else (pulling past
   * the end of a material).
   */
  continueButton?: "always" | "screenReader";
  /**
   * While an unfinished tugas holds the learner here, show only a one-line
   * "next" row: the screen above already says what to do.
   */
  compact?: boolean;
  onReadAgain?: () => void;
  completionMode?: "manual" | "assessment";
  initialOutline?: LearningPathCourse;
  requirementActions?: LearningRequirementAction[];
  assessmentState?: LearningAssessmentState;
};

/**
 * Completing a course item and moving on: marks it done (through the sync
 * outbox), then opens the next item, or holds for a chapter milestone, a
 * required activity or an error. Shared by the footer and by gestures that
 * continue without it, such as pulling past the end of a material.
 */
export function useLearningContinuation({
  courseId,
  courseItemId,
  completionMode = "manual",
  initialOutline,
  pendingRequirements,
}: Pick<
  FooterProps,
  "courseId" | "courseItemId" | "completionMode" | "initialOutline"
> & {
  /**
   * Required activities not done yet, from the local course item, read when
   * the learner continues. The server would refuse the completion; with any
   * left, the footer asks for them instead of saving.
   */
  pendingRequirements?: () => number;
}) {
  const queryClient = useQueryClient();
  const outline = useCourseOutline(courseId);
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
      openCourseItem(
        { courseId, courseItemId: nextItem.id, attempt: nextItem.attempt },
        { replace: true },
      );
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
            "Buka daftar isi kurikulum untuk melihat apa yang masih perlu diselesaikan sebelum melanjutkan.",
        });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setIssue(undefined);
    try {
      const before =
        readCourseOutline(queryClient, courseId, activeOrganizationId) ??
        outline.data;
      if (!before)
        throw new Error("Data kurikulum tidak tersedia di perangkat ini.");
      baseline.current ??= before;
      const current = getLearningPath(before, courseItemId);
      if (!current)
        throw new Error(
          "Aktivitas ini tidak lagi tersedia. Cek daftar isi kurikulum untuk langkah berikutnya.",
        );
      if (!current.item.isCompleted) {
        if (completionMode === "assessment") {
          setIssue({ kind: "requirements" });
          return;
        }
        // With the item's requirements known locally, completing is
        // optimistic: checked here, saved on the device and queued, and the
        // server catches up in the background, so the next item opens at
        // once, offline too. Otherwise the server decides, as it may refuse.
        const optimistic = pendingRequirements !== undefined;
        if (optimistic && pendingRequirements() > 0) {
          setIssue({ kind: "requirements" });
          return;
        }
        const sync = await completeContent({
          courseItemId,
          organizationId: activeOrganizationId ?? undefined,
          background: optimistic,
        });
        saved.current = true;
        if (sync?.state === "queued") {
          setIssue({
            kind: "error",
            message:
              "Penyelesaian tersimpan di perangkat ini dan akan disinkronkan saat kamu online.",
          });
          return;
        }
        // The local learner state now has the item done, so the outline
        // recomposes with the new progress (and unlocks) in place.
        const after = readCourseOutline(
          queryClient,
          courseId,
          activeOrganizationId,
        );
        if (!after) {
          throw new Error(
            "Progres kamu tersimpan, tetapi kurikulum terbaru gagal dimuat.",
          );
        }
        if (!mounted.current) return;
        const next = getLearningPath(after, courseItemId);
        if (!next?.item.isCompleted)
          throw new Error(
            "Selesaikan aktivitas wajib di materi ini, lalu coba lagi.",
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
              "Progres kamu tersimpan. Buka daftar isi kurikulum untuk melihat apa yang masih perlu diselesaikan.",
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
                ? "Progres kamu tersimpan, tetapi aktivitas berikutnya gagal dimuat. Ketuk lanjutkan untuk mencoba lagi."
                : cause instanceof Error
                  ? cause.message
                  : "Progres kamu gagal disimpan. Periksa koneksi lalu coba lagi.",
            },
      );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return {
    path,
    busy,
    issue,
    setIssue,
    milestone,
    navigate,
    continueLearning,
    finishingModule,
    assessmentIncomplete,
    outlineFailed: outline.isError,
  };
}

export type LearningContinuation = ReturnType<typeof useLearningContinuation>;

/** Icon and tint for each kind of next item, matching its type colour. */
const nextTypeIcons = {
  MATERIAL: { icon: "book.closed.fill", color: null },
  VOCABULARY_SET: { icon: "character.book.closed.fill", color: "#10b981" },
  ASSESSMENT: { icon: "doc.text", color: "#f59e0b" },
} as const;

/**
 * Where the chapter goes next, in one row: the next item's type and title
 * and how far along the chapter is. Locked while the current item still
 * holds the learner (an unfinished tugas).
 */
function NextUpRow({
  path,
  locked,
}: {
  path: NonNullable<ReturnType<typeof getLearningPath>>;
  locked: boolean;
}) {
  const { colors } = useAppTheme();
  const next = path.nextItem;
  const meta = next ? getLearningItemTypeMeta(next.type) : null;
  const look = next ? nextTypeIcons[next.type ?? "MATERIAL"] : null;
  const total = path.module.items.length;
  const label = next
    ? `Berikutnya: ${meta!.label}, ${next.title}${locked ? ", terkunci" : ""}.`
    : `${path.module.title}.`;
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${path.completedCount} dari ${total} aktivitas di bab ini selesai.`}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <View
        className={`size-10 items-center justify-center rounded-full ${locked || !meta ? "bg-muted" : meta.softClass}`}
      >
        <SymbolIcon
          name={locked ? "lock.fill" : (look?.icon ?? "checkmark.seal.fill")}
          size={locked ? 14 : 17}
          tintColor={
            locked ? colors.mutedForeground : (look?.color ?? colors.primary)
          }
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs font-semibold text-muted-foreground">
          {next ? (
            <>
              Berikutnya ·{" "}
              <Text className={locked ? "" : meta!.textClass}>
                {meta!.label}
              </Text>
            </>
          ) : (
            `Bab ${path.moduleIndex + 1}`
          )}
        </Text>
        <Text
          className="text-[15px] font-bold text-foreground"
          numberOfLines={1}
        >
          {next ? next.title : path.module.title}
        </Text>
      </View>
      <View className="rounded-full bg-muted px-2.5 py-1">
        <Text className="text-xs font-bold tabular-nums text-muted-foreground">
          {path.completedCount}/{total}
        </Text>
      </View>
    </View>
  );
}

/** The progress, next item and continue button after a course item. */
export function CourseLearningFooter(props: FooterProps) {
  const learning = useLearningContinuation(props);
  return <LearningFooterView {...props} learning={learning} />;
}

/** `CourseLearningFooter` for a caller that runs the continuation itself. */
export function LearningFooterView({
  courseId,
  continueButton = "always",
  compact = false,
  onReadAgain,
  completionMode = "manual",
  requirementActions = [],
  assessmentState,
  learning,
  continueLock,
}: FooterProps & {
  learning: LearningContinuation;
  /**
   * Holds "continue" with this label (a material's reading guard: "Baca dulu
   * · 0:42"). The pull to continue is held the same way by its owner.
   */
  continueLock?: string;
}) {
  const { colors } = useAppTheme();
  const screenReader = useScreenReaderEnabled();
  const showContinue = continueButton === "always" || screenReader;
  const {
    path,
    busy,
    issue,
    setIssue,
    milestone,
    navigate,
    continueLearning,
    finishingModule,
    assessmentIncomplete,
    outlineFailed,
  } = learning;
  // A finished Hangeul Mastery: claim it on Belajar, then Diarsipkan.
  const hangeulBadge = useHangeulBadgeState();

  const continueAction = (
    <StudyAction
      disabled={busy || Boolean(continueLock)}
      loading={busy}
      onPress={() => void continueLearning()}
      trailingIcon={
        busy || continueLock || (path?.courseCompleted && !path.nextItem)
          ? undefined
          : "arrow.right"
      }
    >
      {busy
        ? "Menyimpan progres kamu…"
        : continueLock
          ? continueLock
          : path?.courseCompleted && !path.nextItem
            ? "Selesaikan kurikulum"
            : path?.item.isCompleted || completionMode === "assessment"
              ? "Lanjutkan belajar"
              : finishingModule
                ? "Selesaikan bab"
                : "Selesai & lanjutkan"}
    </StudyAction>
  );
  const errorText =
    issue?.kind === "error" || outlineFailed ? (
      <Text
        accessibilityRole="alert"
        className="text-sm leading-5 text-destructive"
      >
        {issue?.kind === "error"
          ? issue.message
          : "Jalur belajar kamu gagal dimuat. Ketuk lanjutkan untuk mencoba lagi."}
      </Text>
    ) : null;

  // Compact: one "next" row instead of the full footer, where the screen
  // already shows how to go on (a tugas's start button, a material's pull
  // to continue). Milestones and required activities keep the full footer.
  if (compact && path && !milestone && issue?.kind !== "requirements") {
    return (
      <View className="gap-3">
        <NextUpRow path={path} locked={Boolean(assessmentIncomplete)} />
        {showContinue && !assessmentIncomplete ? continueAction : null}
        {errorText}
      </View>
    );
  }

  const content = (
    <View className="gap-6">
      <View className="gap-3">
        <View className="gap-1.5">
          <Eyebrow tone="primary" numberOfLines={1}>
            {path
              ? `Bab ${path.moduleIndex + 1} · ${path.module.title}`
              : "Jalur belajar kamu"}
          </Eyebrow>
          {/* An unfinished tugas has its own call to action above the footer,
              so the footer only reports progress instead of inviting a
              "continue" the learner can't take yet. */}
          {assessmentIncomplete ? null : (
            <Text className="text-[28px] font-black leading-8 tracking-tight text-foreground">
              {path?.item.isCompleted ? "Kerja bagus" : "Siap lanjut?"}
            </Text>
          )}
          <Text className="text-sm leading-5 text-muted-foreground">
            {path
              ? `${path.completedCount} dari ${path.module.items.length} aktivitas selesai`
              : "Jaga semangatmu, satu aktivitas demi satu aktivitas."}
          </Text>
        </View>
        {path ? (
          <ProgressBar
            size="sm"
            value={path.completedCount}
            max={path.module.items.length}
          />
        ) : null}
      </View>
      {path?.nextItem ? (
        <View className="flex-row items-center gap-4 border-t border-border pt-5">
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Eyebrow tone="primary">Berikutnya</Eyebrow>
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
              className={`text-base font-bold leading-6 ${assessmentIncomplete ? "text-muted-foreground" : "text-foreground"}`}
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
          {/* The tugas card above explains what unlocks it. */}
          {assessmentIncomplete ? (
            <SymbolIcon
              accessibilityLabel="Terkunci"
              name="lock.fill"
              size={16}
              tintColor={colors.mutedForeground}
            />
          ) : null}
        </View>
      ) : assessmentIncomplete ? null : path && !path.courseCompleted ? (
        <Text className="border-t border-border pt-5 text-sm leading-5 text-muted-foreground">
          Selesaikan langkah ini untuk membuka aktivitas berikutnya.
        </Text>
      ) : null}
      {issue?.kind === "requirements" ? (
        <View
          accessibilityRole="alert"
          className="gap-4 border-t border-border pt-5"
        >
          <View className="gap-1.5">
            <Eyebrow tone="primary">Sebelum melanjutkan</Eyebrow>
            <Text className="text-base font-black text-foreground">
              Tinggal satu langkah lagi
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {completionMode === "assessment"
                ? assessmentGateMessage(assessmentState)
                : requirementActions.length
                  ? "Selesaikan latihan di bawah untuk memantapkan yang sudah kamu pelajari. Progres materi kamu aman."
                  : "Selesaikan latihan wajib di materi ini, lalu kembali dan lanjutkan."}
            </Text>
          </View>
          {requirementActions.map((action) => (
            <Action
              key={action.id}
              accessibilityHint={`Membuka ${action.type === "VOCABULARY_SET" ? "latihan kosakata" : "tugas"} yang wajib`}
              onPress={() => {
                setIssue(undefined);
                action.onPress();
              }}
              trailingIcon="arrow.right"
            >
              {`${action.type === "VOCABULARY_SET" ? "Latih" : "Buka"} ${action.title}`}
            </Action>
          ))}
        </View>
      ) : null}
      <View className="gap-2">
        {showContinue && issue?.kind !== "requirements" && !assessmentIncomplete
          ? continueAction
          : null}
        {onReadAgain ? (
          <Action variant="ghost" onPress={onReadAgain} disabled={busy}>
            ↑ Baca lagi
          </Action>
        ) : null}
      </View>
      {errorText}
    </View>
  );

  if (!milestone) return content;

  return (
    <View className="gap-6">
      <View className="items-center gap-2">
        <Eyebrow tone="primary" className="text-center">
          {milestone.courseCompleted ? "Kurikulum selesai" : "Bab selesai"}
        </Eyebrow>
        <Text
          accessibilityRole="header"
          className="text-center text-[28px] font-black leading-8 tracking-tight text-foreground"
        >
          {milestone.courseCompleted
            ? "Kamu berhasil"
            : "Pertahankan semangatmu"}
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          Kamu menyelesaikan {milestone.moduleTitle}.
        </Text>
      </View>

      {milestone.courseCompleted && courseId === HANGEUL_MASTERY_COURSE_ID ? (
        <HangeulMasteryBadge {...hangeulCompletionBadgeCopy(hangeulBadge)} />
      ) : null}

      {milestone.unlockedModuleTitle || milestone.nextItem ? (
        <View className="gap-1 border-t border-border pt-5">
          <Eyebrow tone="primary">
            {milestone.unlockedModuleTitle ? "Terbuka" : "Berikutnya"}
          </Eyebrow>
          <Text className="text-base font-bold leading-6 text-foreground">
            {milestone.unlockedModuleTitle ?? milestone.nextItem?.title}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <StudyAction
          onPress={() => navigate(milestone.nextItem)}
          trailingIcon={milestone.nextItem ? "arrow.right" : undefined}
        >
          {milestone.nextItem ? "Lanjutkan belajar" : "Lihat progres kurikulum"}
        </StudyAction>
        {milestone.nextItem ? (
          <Action variant="ghost" onPress={() => navigate()}>
            Kembali ke kurikulum
          </Action>
        ) : null}
      </View>
    </View>
  );
}
