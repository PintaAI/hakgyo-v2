"use client";

import { formatScoreOutOf, groupRanges } from "@hakgyo/shared";

import { useState } from "react";

import { assessmentResultPolicy } from "~/lib/learner/assessment-state";
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import type { RouterOutputs } from "~/trpc/react";
import { RichContent } from "../practice/rich-content";
import { Eyebrow } from "../eyebrow";
import { QuizNav } from "../quiz/quiz-nav";
import { QuizPager } from "../quiz/quiz-pager";
import { QuizQuestion } from "../quiz/quiz-question";
import { QuizStatusDots } from "../quiz/quiz-status-dots";
import { QuestionNavigator, StudyCard } from "./assessment-ui";

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
      <StudyCard className="rounded-2xl">
        <p className="font-bold">Tryout hanya skor</p>
        <p className="text-muted-foreground text-sm leading-5">
          Hasil tryout berisi skor akhir dan leaderboard. Kunci jawaban dan
          pembahasan tidak dipublikasikan.
        </p>
      </StudyCard>
    );
  if (!assessment.answersRevealed)
    return (
      <StudyCard className="rounded-2xl">
        <p className="font-bold">Review jawaban belum tersedia</p>
        <p className="text-muted-foreground text-sm leading-5">
          Kunci jawaban dan pembahasan tersedia setelah latihan ini ditutup.
        </p>
      </StudyCard>
    );

  const ranges = groupRanges(assessment.questions);
  const total = assessment.questions.length;

  function renderPage(position: number) {
    const question = assessment.questions[position];
    if (!question) return null;
    const answer = attempt.answers.find(
      (candidate) => candidate.questionId === question.id,
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
    const group = question.groupId
      ? assessment.groups.find(({ id }) => id === question.groupId)
      : undefined;
    const range = question.groupId ? ranges.get(question.groupId) : undefined;
    return (
      <QuizQuestion
        question={question}
        index={position}
        total={total}
        detail={
          question.type === "WRITTEN"
            ? writtenScore !== null
              ? `${formatScoreOutOf(writtenScore, question.points, " / ")} pt`
              : "Sudah direview"
            : statuses[position] === "correct"
              ? "Benar"
              : statuses[position] === "unanswered"
                ? "Tidak dijawab"
                : "Salah"
        }
        group={
          group && range
            ? {
                instructions: group.instructions,
                stimulus: group.stimulus,
                first: range.first,
                last: range.last,
              }
            : null
        }
        selectedOptionIds={
          answer?.selectedOptions.map((selection) => selection.optionId) ?? []
        }
        correctOptionIds={question.options
          .filter((option) => option.isCorrect === true)
          .map((option) => option.id)}
        writtenAnswer={
          typeof answer?.content === "string" ? answer.content : undefined
        }
      >
        {feedback ? (
          <StudyCard className="rounded-2xl">
            <Eyebrow size="md" tone="primary">
              Feedback pengajar
            </Eyebrow>
            <RichContent content={feedback} />
          </StudyCard>
        ) : null}
        {question.explanation ? (
          <StudyCard className="rounded-2xl">
            <Eyebrow size="md">Pembahasan</Eyebrow>
            <RichContent content={question.explanation} />
          </StudyCard>
        ) : null}
      </QuizQuestion>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-black">Review jawaban kamu</h2>
      <QuizStatusDots
        statuses={statuses}
        current={index}
        onOpenList={() => setNavigatorOpen(true)}
      />
      <QuizPager
        count={total}
        index={index}
        onIndexChange={setIndex}
        renderPage={renderPage}
      />
      <QuizNav
        answered={statuses.filter((status) => status !== "unanswered").length}
        total={total}
        onPrevious={index > 0 ? () => setIndex(index - 1) : undefined}
        onNext={index < total - 1 ? () => setIndex(index + 1) : undefined}
        onOpenList={() => setNavigatorOpen(true)}
      />
      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title={`Pembahasan · ${assessment.title}`}
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
