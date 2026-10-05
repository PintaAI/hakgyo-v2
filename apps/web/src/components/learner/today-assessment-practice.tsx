"use client";

import { useMemo, useState } from "react";

import { randomSeed } from "~/lib/learner/practice";
import { api } from "~/trpc/react";
import { QuizSession, type QuizQuestionItem } from "./practice/quiz-session";
import { RichContent } from "./practice/rich-content";
import { QuestionSkeleton } from "./skeletons";

const QUESTION_COUNT = 5;

export function TodayAssessmentPractice() {
  const utils = api.useUtils();
  const [seed, setSeed] = useState(randomSeed);
  // The sample must not swap while the learner is answering it.
  const pool = api.practice.getAssessmentSample.useQuery(
    { seed, limit: QUESTION_COUNT },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  );

  const questions = useMemo<QuizQuestionItem[]>(
    () =>
      (pool.data?.questions ?? []).map((question) => ({
        id: question.questionId,
        type: question.type as QuizQuestionItem["type"],
        caption: `${question.assessmentTitle} · ${question.courseTitle}`,
        prompt: <RichContent content={question.prompt} />,
        options: question.options.map((option) => ({
          id: option.id,
          content: <RichContent content={option.content} />,
        })),
      })),
    [pool.data],
  );
  const sourceByQuestion = useMemo(
    () =>
      new Map(
        (pool.data?.questions ?? []).map((question) => [
          question.questionId,
          question.sourceCourseItemId,
        ]),
      ),
    [pool.data],
  );

  return (
    <section aria-labelledby="today-assessment" className="flex flex-col gap-4">
      <h2 id="today-assessment" className="text-lg font-bold tracking-tight">
        Tugas hari ini
      </h2>
      {pool.isPending ? (
        <QuestionSkeleton />
      ) : pool.isError ? (
        <p role="alert" className="text-destructive text-sm">
          Latihan tugas belum bisa dimuat.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void pool.refetch()}
          >
            Coba lagi
          </button>
        </p>
      ) : !pool.data.hasAvailableContent ? (
        <p className="text-muted-foreground bg-muted/50 rounded-xl p-4 text-sm">
          Latihan tugas muncul jika kurikulum yang terbuka memiliki soal pilihan
          yang dipublikasikan.
        </p>
      ) : (
        <QuizSession
          key={seed}
          questions={questions}
          finishNote="Latihan selesai. Nilai, percobaan, progres kurikulum, dan XP kamu tidak berubah."
          onRestart={() => setSeed(randomSeed())}
          grade={async (question, optionIds) => {
            const graded =
              await utils.client.practice.gradeAssessmentAnswer.mutate({
                questionId: question.id,
                sourceCourseItemId: sourceByQuestion.get(question.id) ?? "",
                optionIds,
              });
            return {
              correct: graded.correct,
              correctOptionIds: graded.correctOptionIds,
              explanation: graded.explanation ? (
                <RichContent content={graded.explanation} />
              ) : undefined,
            };
          }}
        />
      )}
    </section>
  );
}
