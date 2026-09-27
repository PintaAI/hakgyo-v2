import { useQueryClient } from "@tanstack/react-query";
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
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useMobileSyncActions } from "../../providers/MobileSyncProvider";
import { readCourseOutline, useCourseOutline } from "../../sync/hooks";
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
            "Buka daftar isi course untuk melihat apa yang masih perlu diselesaikan sebelum melanjutkan.",
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
        throw new Error("Data course tidak tersedia di perangkat ini.");
      baseline.current ??= before;
      const current = getLearningPath(before, courseItemId);
      if (!current)
        throw new Error(
          "Aktivitas ini tidak lagi tersedia. Cek daftar isi course untuk langkah berikutnya.",
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
              "Penyelesaian tersimpan di perangkat ini dan akan disinkronkan saat kamu online.",
          });
          return;
        }
        // The checkpoint applied the server's learner patch to the local
        // index, so the outline recomposes from the bundle with the new
        // progress (and unlocks) already in place.
        const after = readCourseOutline(
          queryClient,
          courseId,
          activeOrganizationId,
        );
        if (!after) {
          throw new Error(
            "Penyelesaian sudah disinkronkan, tetapi course terbaru gagal dimuat.",
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
              "Progres kamu tersimpan. Buka daftar isi course untuk melihat apa yang masih perlu diselesaikan.",
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

  const content = (
    <View className="gap-6">
      <View className="gap-3">
        <View className="gap-1.5">
          <Text className="text-center text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            {path
              ? `Bab ${path.moduleIndex + 1} · Aktivitas ${path.itemIndex + 1} dari ${path.module.items.length}`
              : "Jalur belajar kamu"}
          </Text>
          <Text className="text-[28px] font-black leading-8 tracking-tight text-foreground">
            {path?.item.isCompleted ? "Kerja bagus" : "Siap lanjut?"}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {path
              ? `${path.completedCount} dari ${path.module.items.length} aktivitas selesai di ${path.module.title}`
              : "Jaga semangatmu, satu aktivitas demi satu aktivitas."}
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
                Berikutnya
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
          Selesaikan langkah ini untuk membuka aktivitas berikutnya.
        </Text>
      ) : null}
      {issue?.kind === "requirements" || assessmentIncomplete ? (
        <View
          accessibilityRole="alert"
          className="gap-4 border-t border-border pt-5"
        >
          <View className="gap-1.5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
              Sebelum melanjutkan
            </Text>
            <Text className="text-base font-black text-foreground">
              {assessmentIncomplete
                ? "Selesaikan tugas ini dulu"
                : "Tinggal satu langkah lagi"}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {assessmentIncomplete
                ? "Lulus tugas ini, atau tunggu review dari pengajar jika masih dinilai."
                : requirementActions.length
                  ? "Selesaikan latihan di bawah untuk memantapkan yang sudah kamu pelajari. Progres materi kamu aman."
                  : "Selesaikan latihan wajib di materi ini, lalu kembali dan lanjutkan."}
            </Text>
          </View>
          {requirementActions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityHint={`Membuka ${action.type === "VOCABULARY_SET" ? "latihan kosakata" : "tugas"} yang wajib`}
              className="min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 active:opacity-80"
              onPress={() => {
                setIssue(undefined);
                action.onPress();
              }}
            >
              <Text className="text-center font-bold text-primary-foreground">
                {action.type === "VOCABULARY_SET" ? "Latih" : "Buka"}{" "}
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
              ? "Menyimpan progres kamu…"
              : path?.courseCompleted && !path.nextItem
                ? "Selesaikan course"
                : path?.item.isCompleted || completionMode === "assessment"
                  ? "Lanjutkan belajar →"
                  : finishingModule
                    ? "Selesaikan bab →"
                    : "Selesai & lanjutkan →"}
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
              ↑ Baca lagi
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
            : "Jalur belajar kamu gagal dimuat. Ketuk lanjutkan untuk mencoba lagi."}
        </Text>
      ) : null}
    </View>
  );

  if (!milestone) return content;

  return (
    <View className="gap-6">
      <View className="items-center gap-2">
        <Text className="text-center text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
          {milestone.courseCompleted ? "Course selesai" : "Bab selesai"}
        </Text>
        <Text
          accessibilityRole="header"
          className="text-center text-[28px] font-black leading-8 tracking-tight text-foreground"
        >
          {milestone.courseCompleted
            ? "Kamu berhasil"
            : "Pertahankan semangatmu"}
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          You completed {milestone.moduleTitle}.
        </Text>
      </View>

      {milestone.unlockedModuleTitle || milestone.nextItem ? (
        <View className="gap-1 border-t border-border pt-5">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            {milestone.unlockedModuleTitle ? "Terbuka" : "Berikutnya"}
          </Text>
          <Text className="text-base font-bold leading-6 text-foreground">
            {milestone.unlockedModuleTitle ?? milestone.nextItem?.title}
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        <StudyAction onPress={() => navigate(milestone.nextItem)}>
          {milestone.nextItem ? "Lanjutkan belajar →" : "Lihat progres course"}
        </StudyAction>
        {milestone.nextItem ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center px-5"
            onPress={() => navigate()}
          >
            <Text className="font-semibold text-muted-foreground">
              Kembali ke course
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
