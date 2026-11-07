"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { resolveAssessmentEntry } from "@hakgyo/shared";
import Link from "~/components/link";
import { Button, buttonVariants } from "~/components/ui/button";
import { getLearningPath } from "~/lib/learner/course-learning-path";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { Eyebrow } from "../eyebrow";
import { CourseLearningFooter } from "../learn/course-learning-footer";
import { CardFan, HakgyoHero, heroTitleClass } from "../learn/hakgyo-hero";
import { RichContent } from "../practice/rich-content";
import {
  AssessmentFacts,
  AssessmentOverview,
  QuestionPreview,
} from "./assessment-overview";
import { AttemptResultSheet } from "./attempt-result-details";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];

/** The question count on the top card of the hero's fan. */
export function QuestionCountFace({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-black tracking-tight tabular-nums">
        {count}
      </span>
      <Eyebrow>soal</Eyebrow>
    </div>
  );
}

/**
 * The tugas screen of a course item, like the app's: the hero with the
 * question count, rules and the start / continue / retake action, the first
 * question as a sample, the latest result, and the learning footer. A
 * finished attempt lands here, so the full result opens from "Review jawaban
 * kamu".
 */
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
  // Prefetched with the page; tells whether retrying is optional.
  const outline = api.learning.getCourseOutline.useQuery({ courseId });
  const [selectedCohortId, setSelectedCohortId] = useState<string>();
  const latest = assessment.latestStandaloneAttempt;
  const entry = resolveAssessmentEntry({
    attemptStatus: latest?.status,
    attemptsUsed: assessment.standaloneAttemptCount,
    maxAttempts: assessment.maxAttempts ?? null,
    available: true,
  });
  const itemCompleted = outline.data
    ? getLearningPath(outline.data, courseItemId)?.item.isCompleted
    : undefined;
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
        error instanceof Error ? error.message : "Tugas tidak dapat dimulai.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <HakgyoHero
        back={
          <Link
            href={`/learn/${courseId}`}
            aria-label="Kembali ke kurikulum"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeftIcon />
          </Link>
        }
      >
        <CardFan
          faces={[
            <QuestionCountFace
              key="count"
              count={assessment.questions.length}
            />,
            <div key="second" />,
            <div key="third" />,
          ]}
        />
        <div className="flex flex-col items-center gap-2">
          <Eyebrow size="md" tone="primary">
            Tugas
          </Eyebrow>
          <h1 className={heroTitleClass}>{assessment.title}</h1>
          {assessment.description ? (
            <p className="text-muted-foreground text-center text-sm leading-6">
              {assessment.description}
            </p>
          ) : null}
        </div>
        <AssessmentFacts
          timeLimitMinutes={assessment.timeLimitMinutes}
          passingScore={assessment.passingScore}
          maxAttempts={assessment.maxAttempts}
          attemptsUsed={assessment.standaloneAttemptCount}
        />
        {picksCohort ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold">Pilih kelas</p>
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
                      : "border-border bg-background/60 hover:bg-muted/50",
                  )}
                >
                  {cohort.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {entry.canStart ||
        entry.canReattempt ||
        entry.destination === "ATTEMPT" ? (
          <Button
            size="lg"
            // Once the tugas is done, retrying is optional: the footer's
            // "Lanjutkan belajar" becomes the main action.
            variant={
              entry.canReattempt &&
              (itemCompleted === true || Boolean(assessment.event))
                ? "secondary"
                : "default"
            }
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
            {start.isPending ? null : <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        ) : null}
        {/* The finished attempt in full, in a sheet: where the learner lands
            after finishing, so the attempt has no result screen of its own. */}
        {latest?.status === "GRADED" ? (
          <AttemptResultSheet
            attemptId={latest.id}
            courseItemId={courseItemId}
          />
        ) : null}
        {start.isError ? (
          <p role="alert" className="text-destructive text-center text-sm">
            {start.error.message || "Tugas tidak dapat dimulai."}
          </p>
        ) : null}
      </HakgyoHero>

      {assessment.instructions ? (
        <section className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
          <Eyebrow size="xs">Petunjuk pengerjaan</Eyebrow>
          <div className="text-sm">
            <RichContent content={assessment.instructions} />
          </div>
        </section>
      ) : null}

      {/* What the task is like before starting: its first question, as it
          will look, but not answerable here. */}
      {!latest && assessment.questions[0] ? (
        <QuestionPreview
          question={assessment.questions[0]}
          total={assessment.questions.length}
        />
      ) : null}

      <AssessmentOverview
        passingScore={assessment.passingScore}
        latestAttempt={latest}
        itemCompleted={itemCompleted}
        canReattempt={entry.canReattempt}
        gatesProgress={!assessment.event}
      />

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
