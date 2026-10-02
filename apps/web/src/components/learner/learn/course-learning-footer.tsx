"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";

import { Button, buttonVariants } from "~/components/ui/button";
import {
  getLearningMilestone,
  getLearningPath,
  type LearningPathCourse,
  type LearningPathItem,
} from "~/lib/learner/course-learning-path";
import { learningItemHref } from "~/lib/learner/hrefs";
import { getLearningItemTypeMeta } from "~/lib/learner/learning-item-type";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { MilestoneTrophy } from "./milestone-trophy";

type Milestone = NonNullable<ReturnType<typeof getLearningMilestone>>;
type FooterIssue =
  { kind: "requirements" } | { kind: "error"; message: string };

export type LearningAssessmentState = {
  status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED" | null;
  canReattempt: boolean;
};

export type LearningRequirementAction = {
  id: string;
  type: "VOCABULARY_SET" | "ASSESSMENT";
  title: string;
  href: string;
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-primary text-[11px] font-bold tracking-[1.5px] uppercase">
      {children}
    </p>
  );
}

/**
 * "Siap lanjut?" footer under every learning item: module progress, the next
 * item, completion (with chapter and course celebrations) and the actions
 * that must be done before a material can be completed.
 */
export function CourseLearningFooter({
  courseId,
  courseItemId,
  completionMode = "manual",
  requirementActions = [],
  assessmentState,
}: {
  courseId: string;
  courseItemId: string;
  completionMode?: "manual" | "assessment";
  requirementActions?: LearningRequirementAction[];
  assessmentState?: LearningAssessmentState;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const outline = api.learning.getCourseOutline.useQuery({ courseId });
  const markProgress = api.learning.markContentProgress.useMutation();
  const baseline = useRef<LearningPathCourse | undefined>(undefined);
  const inFlight = useRef(false);
  const saved = useRef(false);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<FooterIssue>();
  const [milestone, setMilestone] = useState<Milestone>();
  baseline.current ??= outline.data;

  const path = outline.data && getLearningPath(outline.data, courseItemId);
  const finishingModule =
    path &&
    !path.item.isCompleted &&
    path.completedCount === path.module.items.length - 1;
  const assessmentIncomplete =
    completionMode === "assessment" && path && !path.item.isCompleted;

  function navigate(nextItem?: LearningPathItem) {
    setMilestone(undefined);
    router.replace(
      nextItem
        ? learningItemHref(
            courseId,
            nextItem.id,
            nextItem.type === "ASSESSMENT" ? nextItem.attempt : undefined,
          )
        : `/learn/${courseId}`,
    );
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
      const before = outline.data;
      if (!before) throw new Error("Data course tidak tersedia.");
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
        await markProgress.mutateAsync({ courseItemId, status: "COMPLETED" });
        saved.current = true;
        // Progress changes XP, streak, the outline and the Belajar tab.
        void utils.gamification.getMySummary.invalidate();
        void utils.learning.listMyCohortMilestones.invalidate();
        const after = await utils.learning.getCourseOutline.fetch(
          { courseId },
          { staleTime: 0 },
        );
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
                ? "Progres kamu tersimpan, tetapi aktivitas berikutnya gagal dimuat. Klik lanjutkan untuk mencoba lagi."
                : cause instanceof Error
                  ? cause.message
                  : "Progres kamu gagal disimpan. Periksa koneksi lalu coba lagi.",
            },
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (milestone) {
    return (
      <section className="flex flex-col gap-6">
        <MilestoneTrophy />
        <div className="flex flex-col items-center gap-2 text-center">
          <Eyebrow>
            {milestone.courseCompleted ? "Course selesai" : "Bab selesai"}
          </Eyebrow>
          <h2 className="text-[28px] leading-8 font-black tracking-tight">
            {milestone.courseCompleted
              ? "Kamu berhasil"
              : "Pertahankan semangatmu"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Kamu menyelesaikan {milestone.moduleTitle}.
          </p>
        </div>
        {milestone.unlockedModuleTitle || milestone.nextItem ? (
          <div className="border-border flex flex-col gap-1 border-t pt-5">
            <Eyebrow>
              {milestone.unlockedModuleTitle ? "Terbuka" : "Berikutnya"}
            </Eyebrow>
            <p className="text-base font-bold">
              {milestone.unlockedModuleTitle ?? milestone.nextItem?.title}
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => navigate(milestone.nextItem)}>
            {milestone.nextItem ? "Lanjutkan belajar" : "Lihat progres course"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          {milestone.nextItem ? (
            <Button variant="ghost" onClick={() => navigate()}>
              Kembali ke course
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  const nextMeta = path?.nextItem
    ? getLearningItemTypeMeta(path.nextItem.type)
    : undefined;

  return (
    <section aria-label="Jalur belajar" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>
            {path
              ? `Bab ${path.moduleIndex + 1} · ${path.module.title}`
              : "Jalur belajar kamu"}
          </Eyebrow>
          {assessmentIncomplete ? null : (
            <h2 className="text-[28px] leading-8 font-black tracking-tight">
              {path?.item.isCompleted ? "Kerja bagus" : "Siap lanjut?"}
            </h2>
          )}
          <p className="text-muted-foreground text-sm">
            {path
              ? `${path.completedCount} dari ${path.module.items.length} aktivitas selesai`
              : "Jaga semangatmu, satu aktivitas demi satu aktivitas."}
          </p>
        </div>
        {path ? (
          <div
            role="progressbar"
            aria-label="Progres bab"
            aria-valuemin={0}
            aria-valuemax={path.module.items.length}
            aria-valuenow={path.completedCount}
            className="bg-muted h-1 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{
                width: `${(path.completedCount / path.module.items.length) * 100}%`,
              }}
            />
          </div>
        ) : null}
      </div>

      {path?.nextItem && nextMeta ? (
        <div className="border-border flex flex-col gap-1 border-t pt-5">
          <div className="flex items-center gap-2">
            <Eyebrow>Berikutnya</Eyebrow>
            <span className="flex items-center gap-1.5">
              <span
                className={cn("size-1.5 rounded-full", nextMeta.dotClass)}
              />
              <span className={cn("text-xs font-semibold", nextMeta.textClass)}>
                {nextMeta.label}
              </span>
            </span>
          </div>
          <p
            className={cn(
              "text-base leading-6 font-bold",
              assessmentIncomplete && "text-muted-foreground",
            )}
          >
            {path.nextItem.title}
          </p>
          {path.nextModule?.id !== path.module.id ? (
            <p className="text-muted-foreground text-xs font-semibold">
              {path.nextModule?.title}
            </p>
          ) : null}
          {assessmentIncomplete ? (
            <p role="alert" className="text-muted-foreground mt-1 text-sm">
              {assessmentGateMessage(assessmentState)}
            </p>
          ) : null}
        </div>
      ) : assessmentIncomplete ? (
        <p
          role="alert"
          className="border-border text-muted-foreground border-t pt-5 text-sm"
        >
          {assessmentGateMessage(assessmentState)}
        </p>
      ) : path && !path.courseCompleted ? (
        <p className="border-border text-muted-foreground border-t pt-5 text-sm">
          Selesaikan langkah ini untuk membuka aktivitas berikutnya.
        </p>
      ) : null}

      {issue?.kind === "requirements" ? (
        <div
          role="alert"
          className="border-border flex flex-col gap-4 border-t pt-5"
        >
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Sebelum melanjutkan</Eyebrow>
            <p className="text-base font-black">Tinggal satu langkah lagi</p>
            <p className="text-muted-foreground text-sm">
              {completionMode === "assessment"
                ? assessmentGateMessage(assessmentState)
                : requirementActions.length
                  ? "Selesaikan latihan di bawah untuk memantapkan yang sudah kamu pelajari. Progres materi kamu aman."
                  : "Selesaikan latihan wajib di materi ini, lalu kembali dan lanjutkan."}
            </p>
          </div>
          {requirementActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={buttonVariants({ size: "lg" })}
            >
              {action.type === "VOCABULARY_SET" ? "Latih" : "Buka"}{" "}
              {action.title}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          ))}
        </div>
      ) : null}

      {issue?.kind !== "requirements" && !assessmentIncomplete ? (
        <Button
          size="lg"
          disabled={busy}
          onClick={() => void continueLearning()}
        >
          {busy ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          {busy
            ? "Menyimpan progres kamu…"
            : path?.courseCompleted && !path.nextItem
              ? "Selesaikan course"
              : path?.item.isCompleted || completionMode === "assessment"
                ? "Lanjutkan belajar"
                : finishingModule
                  ? "Selesaikan bab"
                  : "Selesai & lanjutkan"}
          {!busy ? <ArrowRightIcon data-icon="inline-end" /> : null}
        </Button>
      ) : null}

      {issue?.kind === "error" || outline.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {issue?.kind === "error"
            ? issue.message
            : "Jalur belajar kamu gagal dimuat. Klik lanjutkan untuk mencoba lagi."}
        </p>
      ) : null}
    </section>
  );
}
