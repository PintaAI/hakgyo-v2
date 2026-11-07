"use client";

import type { ReactNode } from "react";
import { usesPictureGrid } from "@hakgyo/shared";

import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import {
  AssessmentOption,
  AssessmentOptions,
  StudyCard,
} from "../assessment/assessment-ui";
import { QuestionGroupHeader } from "../assessment/question-group-header";
import { Eyebrow } from "../eyebrow";
import { RichContent } from "../practice/rich-content";

export type QuizQuestionData = {
  type: string;
  prompt: unknown;
  options: ReadonlyArray<{ id: string; content: unknown }>;
};

/** The instructions and shared stimulus of the question's group. */
export type QuizQuestionGroup = {
  instructions: unknown;
  stimulus: unknown;
  /** Display indexes of the group's first and last question. */
  first: number;
  last: number;
};

// Audio of the content itself, hidden while a section plays it through the controlled player.
export const hiddenContentAudio =
  // Important: BlockNote's styles are not in a cascade layer, so they beat Tailwind's utilities.
  "[&_[data-content-type=assetAudio]]:hidden! [&_[data-content-type=audio]]:hidden!";

function TextPlaceholder({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton
          key={line}
          className={cn(
            "h-4 rounded-md",
            line === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

function instructionFor(type: string) {
  return type === "WRITTEN"
    ? "Tulis jawaban kamu"
    : type === "MULTIPLE_CHOICE"
      ? "Pilih semua jawaban yang benar"
      : "Pilih satu jawaban";
}

/**
 * The one question design, the same as the app's `QuizQuestion`: Home's daily
 * questions, the attempt, the tugas intro's sample and the result review. The
 * question sits on the page under its number, then the answer options (or the
 * written answer) as cards. What differs between those places is data, not
 * layout:
 *
 * - `onChooseOption` / `onChangeWritten` make it answerable; without them it
 *   is read only (review, sample).
 * - `correctOptionIds` marks right and wrong options once graded.
 * - `hidden` shows grey placeholders instead of content.
 * - `media` sits between the question and its answers (a section's audio
 *   player); `children` below them (feedback, explanation, actions).
 */
export function QuizQuestion({
  question,
  index,
  total,
  detail,
  group,
  selectedOptionIds = [],
  correctOptionIds,
  writtenAnswer,
  onChooseOption,
  onChangeWritten,
  disabled = false,
  answersDisabled = false,
  hideInlineAudio = false,
  hidden,
  media,
  children,
}: {
  question: QuizQuestionData;
  /** Zero-based position of the question among `total`. */
  index: number;
  total: number;
  /** A short label above the question, such as "Benar" in the review. */
  detail?: string;
  group?: QuizQuestionGroup | null;
  selectedOptionIds?: readonly string[];
  /** Graded: the right options are marked, wrong selections struck. */
  correctOptionIds?: readonly string[] | null;
  writtenAnswer?: string;
  onChooseOption?: (optionId: string) => void;
  onChangeWritten?: (content: string) => void;
  /** Blocks everything (saving, grading). */
  disabled?: boolean;
  /** Blocks only the answers (graded, time up, a locked first choice). */
  answersDisabled?: boolean;
  hideInlineAudio?: boolean;
  /** Content not known yet, drawn as placeholders in its final place. */
  hidden?: "prompt" | "options";
  media?: ReactNode;
  children?: ReactNode;
}) {
  const answersBlocked = disabled || answersDisabled;
  const grid = !hidden && usesPictureGrid(question.options);
  const multiple = question.type === "MULTIPLE_CHOICE";
  const audioClass = cn(hideInlineAudio && hiddenContentAudio);

  return (
    <div className="flex flex-col gap-4">
      {/* Where the learner is, once. Moving and the answered count live in
          the screen's navigation (QuizNav, or the attempt's bottom bar). */}
      <div
        role="group"
        aria-label={`Soal ${index + 1} dari ${total}`}
        className="flex items-center gap-2"
      >
        <span className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-full text-base font-black tabular-nums">
          {index + 1}
        </span>
        <span className="text-muted-foreground text-sm font-semibold tabular-nums">
          / {total}
        </span>
      </div>

      {detail ? <Eyebrow size="xs">{detail}</Eyebrow> : null}
      {group ? (
        <QuestionGroupHeader
          contentClassName={audioClass}
          first={group.first}
          instructions={group.instructions}
          last={group.last}
          stimulus={group.stimulus}
        />
      ) : null}
      {hidden === "prompt" ? (
        <TextPlaceholder lines={3} />
      ) : (
        <div className={audioClass}>
          <RichContent content={question.prompt} />
        </div>
      )}
      {media}

      {/* What to do, until the question is graded. */}
      {!correctOptionIds ? (
        <p className="text-sm font-bold">{instructionFor(question.type)}</p>
      ) : null}
      {question.type === "WRITTEN" ? (
        <StudyCard className="gap-3 rounded-2xl p-5">
          {onChangeWritten ? (
            <Textarea
              aria-label={`Jawaban soal ${index + 1}`}
              value={writtenAnswer ?? ""}
              disabled={answersBlocked}
              onChange={(event) => onChangeWritten(event.target.value)}
              placeholder="Tulis jawaban kamu…"
              className="min-h-32 resize-y border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          ) : hidden ? (
            <div className="min-h-32" />
          ) : (
            <>
              <Eyebrow size="md">Jawaban kamu</Eyebrow>
              <p className="text-base leading-6 whitespace-pre-wrap">
                {writtenAnswer?.trim() ? writtenAnswer : "Tidak dijawab"}
              </p>
            </>
          )}
        </StudyCard>
      ) : (
        <AssessmentOptions grid={grid} multiple={multiple}>
          {question.options.map((option, optionIndex) => (
            <AssessmentOption
              key={option.id}
              index={optionIndex}
              selected={selectedOptionIds.includes(option.id)}
              multiple={multiple}
              disabled={answersBlocked || !onChooseOption}
              correct={
                correctOptionIds
                  ? correctOptionIds.includes(option.id)
                  : undefined
              }
              tile={grid}
              onPress={
                onChooseOption ? () => onChooseOption(option.id) : undefined
              }
            >
              {hidden ? (
                <TextPlaceholder lines={1} />
              ) : (
                <div className={audioClass}>
                  <RichContent content={option.content} />
                </div>
              )}
            </AssessmentOption>
          ))}
        </AssessmentOptions>
      )}
      {children}
    </div>
  );
}
