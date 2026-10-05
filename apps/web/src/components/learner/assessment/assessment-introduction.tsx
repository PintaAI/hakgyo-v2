"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { resolveAssessmentEntry } from "@hakgyo/shared";
import { Button, buttonVariants } from "~/components/ui/button";
import { assessmentAttemptPresentation } from "~/lib/learner/assessment-state";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { CourseLearningFooter } from "../learn/course-learning-footer";
import { RichContent } from "../practice/rich-content";
import { StudyCard } from "./assessment-ui";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];

/** The tugas screen of a course item: details, start / continue / retake, and the learning footer. */
export function AssessmentIntroduction({
  courseId,
  courseItemId,
  assessment,
}: {
  courseId: string;
  courseItemId: string;
  assessment: Assessment;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const start = api.assessment.startAttempt.useMutation();
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const latest = assessment.latestStandaloneAttempt;
  const entry = resolveAssessmentEntry({
    attemptStatus: latest?.status,
    attemptsUsed: assessment.standaloneAttemptCount,
    maxAttempts: assessment.maxAttempts ?? null,
    available: true,
  });
  const attemptHref = (attemptId: string) =>
    `/learn/${courseId}/items/${courseItemId}/attempts/${attemptId}`;
  const cohorts = assessment.eligibleCohorts;
  const picksCohort =
    (entry.canStart || entry.canReattempt) && cohorts.length > 1;
  const cohortId = cohorts.length === 1 ? cohorts[0]?.id : selectedCohortId;

  async function begin() {
    if (latest?.status === "IN_PROGRESS") {
      router.push(attemptHref(latest.id));
      return;
    }
    try {
      const attempt = await start.mutateAsync({ courseItemId, cohortId });
      void utils.assessment.invalidate();
      router.push(attemptHref(attempt.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Tugas belum dapat dimulai.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href={`/learn/${courseId}`}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "text-muted-foreground -mb-2 -ml-2 self-start",
        )}
      >
        <ArrowLeftIcon /> Kembali ke kurikulum
      </Link>

      <StudyCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-black tracking-[2px] uppercase">
            Tugas · {assessment.questions.length} soal
          </p>
          <h1 className="text-3xl leading-10 font-black tracking-tight">
            {assessment.title}
          </h1>
          {assessment.description ? (
            <p className="text-muted-foreground text-sm leading-6">
              {assessment.description}
            </p>
          ) : null}
        </div>

        {assessment.instructions ? (
          <div className="border-border flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-bold">Petunjuk pengerjaan</p>
            <div className="text-sm">
              <RichContent content={assessment.instructions} />
            </div>
          </div>
        ) : null}

        {picksCohort ? (
          <div className="border-border flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-bold">Pilih Group belajar</p>
            <div role="radiogroup" className="flex flex-col gap-2">
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedCohortId === cohort.id}
                  onClick={() => setSelectedCohortId(cohort.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left font-bold transition-colors",
                    selectedCohortId === cohort.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  {cohort.name}
                </button>
              ))}
            </div>
          </div>
        ) : cohorts.length === 1 ? (
          <p className="text-muted-foreground text-sm">
            Hasil tugas dicatat untuk group{" "}
            <span className="text-foreground font-semibold">
              {cohorts[0]?.name}
            </span>
            .
          </p>
        ) : null}

        <p className="text-muted-foreground text-sm leading-6">
          {assessment.timeLimitMinutes != null
            ? `${assessment.timeLimitMinutes} menit`
            : "Tanpa batas waktu"}{" "}
          ·{" "}
          {assessment.maxAttempts == null
            ? "Percobaan tanpa batas"
            : `Maks. ${assessment.maxAttempts} percobaan`}
          {latest ? (
            <>
              <br />
              {assessmentAttemptPresentation(latest).detail}
            </>
          ) : null}
          <br />
          Bebas berpindah antarsoal. Kirim jika sudah siap.
        </p>

        {entry.canStart ||
        entry.canReattempt ||
        entry.destination === "ATTEMPT" ? (
          <Button
            size="lg"
            disabled={
              start.isPending ||
              assessment.questions.length === 0 ||
              (picksCohort && !selectedCohortId)
            }
            onClick={() => void begin()}
          >
            {start.isPending ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {start.isPending
              ? "Memulai…"
              : entry.destination === "ATTEMPT"
                ? "Lanjutkan tugas"
                : entry.canReattempt
                  ? "Kerjakan ulang tugas"
                  : "Mulai tugas"}
          </Button>
        ) : null}
        {latest && latest.status !== "IN_PROGRESS" ? (
          <Link
            href={attemptHref(latest.id)}
            className={buttonVariants({
              size: "lg",
              variant: entry.canReattempt ? "secondary" : "default",
            })}
          >
            {latest.status === "GRADED" ? "Lihat hasil" : "Lihat jawaban"}
          </Link>
        ) : null}
        {start.isError ? (
          <p role="alert" className="text-destructive text-center text-sm">
            {start.error.message}
          </p>
        ) : null}
      </StudyCard>

      {!assessment.event ? (
        <div className="border-border border-t pt-8">
          <CourseLearningFooter
            key={courseItemId}
            courseId={courseId}
            courseItemId={courseItemId}
            completionMode="assessment"
            assessmentState={{
              status: latest?.status ?? null,
              canReattempt: entry.canReattempt,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
