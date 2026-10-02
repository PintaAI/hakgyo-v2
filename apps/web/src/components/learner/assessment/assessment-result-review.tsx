"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { assessmentResultPolicy } from "~/lib/learner/assessment-state";
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import type { RouterOutputs } from "~/trpc/react";
import { RichContent } from "../practice/rich-content";
import {
  AssessmentOption,
  AssessmentQuestion,
  QuestionNavigator,
  StudyCard,
} from "./assessment-ui";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];

/** Question-by-question review of a graded attempt, honouring tryout and on-demand reveal rules. */
export function AssessmentResultReview({
  assessment,
  attempt,
}: {
  assessment: Assessment;
  attempt: Attempt;
}) {
  const [index, setIndex] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const policy = assessmentResultPolicy(assessment.event?.type);
  const available =
    attempt.status === "GRADED" &&
    policy.showAnswerReview &&
    assessment.answersRevealed;
  const statuses: QuestionStatus[] = available
    ? assessment.questions.map((question) => {
        const answer = attempt.answers.find(
          (candidate) => candidate.questionId === question.id,
        );
        const optionIds =
          answer?.selectedOptions.map((selection) => selection.optionId) ?? [];
        if (
          !isQuestionAnswered({
            content:
              typeof answer?.content === "string" ? answer.content : undefined,
            optionIds,
          })
        )
          return "unanswered";
        if (question.type === "WRITTEN") return "answered";
        const correct = question.options.filter((option) => option.isCorrect);
        return optionIds.length === correct.length &&
          correct.every((option) => optionIds.includes(option.id))
          ? "correct"
          : "incorrect";
      })
    : [];

  if (attempt.status !== "GRADED") return null;
  if (!policy.showAnswerReview)
    return (
      <StudyCard>
        <p className="font-bold">Tryout hanya skor</p>
        <p className="text-muted-foreground text-sm leading-5">
          Hasil tryout berisi skor akhir dan leaderboard. Kunci jawaban dan
          pembahasan tidak dipublikasikan.
        </p>
      </StudyCard>
    );
  if (!assessment.answersRevealed)
    return (
      <StudyCard>
        <p className="font-bold">Review jawaban belum tersedia</p>
        <p className="text-muted-foreground text-sm leading-5">
          Kunci jawaban dan pembahasan tersedia setelah tugas on-demand ini
          ditutup.
        </p>
      </StudyCard>
    );

  const question = assessment.questions[index];
  if (!question) return null;
  const answer = attempt.answers.find(
    (candidate) => candidate.questionId === question.id,
  );
  const selected = new Set(
    answer?.selectedOptions.map((selection) => selection.optionId) ?? [],
  );
  const manualScore =
    answer && "manualScore" in answer ? answer.manualScore : null;
  const autoScore = answer && "autoScore" in answer ? answer.autoScore : null;
  const writtenScore =
    typeof manualScore === "number"
      ? manualScore
      : typeof autoScore === "number"
        ? autoScore
        : null;
  const feedback = answer && "feedback" in answer ? answer.feedback : null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-black">Review jawaban kamu</h2>
      <AssessmentQuestion
        detail={
          question.type === "WRITTEN"
            ? writtenScore !== null
              ? `${writtenScore} / ${question.points} pt`
              : "Sudah direview"
            : statuses[index] === "correct"
              ? "Benar"
              : statuses[index] === "unanswered"
                ? "Tidak dijawab"
                : "Salah"
        }
        current={index}
        total={assessment.questions.length}
        answered={statuses.filter((status) => status !== "unanswered").length}
        onOpen={() => setNavigatorOpen(true)}
      >
        <RichContent content={question.prompt} />
      </AssessmentQuestion>
      {question.type === "WRITTEN" ? (
        <StudyCard>
          <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Jawaban kamu
          </p>
          <p className="text-base leading-6 whitespace-pre-wrap">
            {typeof answer?.content === "string" && answer.content.trim()
              ? answer.content
              : "Tidak dijawab"}
          </p>
        </StudyCard>
      ) : (
        question.options.map((option, optionIndex) => (
          <AssessmentOption
            key={option.id}
            index={optionIndex}
            selected={selected.has(option.id)}
            correct={option.isCorrect === true}
            multiple={question.type === "MULTIPLE_CHOICE"}
          >
            <RichContent content={option.content} />
          </AssessmentOption>
        ))
      )}
      {feedback ? (
        <StudyCard>
          <p className="text-primary text-xs font-bold tracking-wider uppercase">
            Feedback pengajar
          </p>
          <RichContent content={feedback} />
        </StudyCard>
      ) : null}
      {question.explanation ? (
        <StudyCard>
          <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Pembahasan
          </p>
          <RichContent content={question.explanation} />
        </StudyCard>
      ) : null}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          className="flex-1"
          disabled={index === assessment.questions.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Berikutnya →
        </Button>
      </div>
      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title={`Review · ${assessment.title}`}
        current={index}
        statuses={statuses}
        onSelect={(next) => {
          setIndex(next);
          return true;
        }}
      />
    </section>
  );
}
