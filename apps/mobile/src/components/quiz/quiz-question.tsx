import { usesPictureGrid } from "@hakgyo/shared";
import type { ComponentProps, ReactNode } from "react";
import { Text, TextInput, View } from "react-native";

import { AssessmentOption, AssessmentOptions } from "../assessment-ui";
import {
  type AssetUrlResolver,
  NativeContentRenderer,
} from "../content-renderer";
import { Card, Eyebrow } from "../learning-ui";
import { QuestionGroupHeader } from "../question-group-header";
import { Skeleton } from "../ui/skeleton";

type Content = ComponentProps<typeof NativeContentRenderer>["content"];

export type QuizQuestionData = {
  type: string;
  prompt: Content;
  options: ReadonlyArray<{ id: string; content: Content }>;
};

/** The instructions and shared stimulus of the question's group. */
export type QuizQuestionGroup = {
  instructions: unknown;
  stimulus: unknown;
  /** Display numbers of the group's first and last question. */
  first: number;
  last: number;
};

// Audio inside the content, hidden while a section plays it through its own player.
const hiddenAudioRenderers = { assetAudio: () => null, audio: () => null };

function TextPlaceholder({ lines }: { lines: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton
          key={line}
          className={`h-4 rounded-md ${line === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </View>
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
 * The one question design of the app: Home's daily challenge, the attempt,
 * the start preview, the tugas intro's sample and the result review. The
 * question sits on the page under its number, then the answer
 * options (or the written answer) as cards. What differs between those
 * places is data, not layout:
 *
 * - `onChooseOption` / `onChangeWritten` make it answerable; without them it
 *   is read only (review, preview, sample).
 * - `correctOptionIds` marks right and wrong options once graded.
 * - `hidden` shows grey placeholders where the server has not set the
 *   content yet (the start preview of a shuffled tugas).
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
  resolveAssetUrl,
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
  /** Blocks everything, the question list included (saving, grading). */
  disabled?: boolean;
  /** Blocks only the answers (graded, time up, a locked first choice). */
  answersDisabled?: boolean;
  hideInlineAudio?: boolean;
  /** Content not known yet, drawn as placeholders in its final place. */
  hidden?: "prompt" | "options";
  media?: ReactNode;
  resolveAssetUrl: AssetUrlResolver;
  children?: ReactNode;
}) {
  const renderers = hideInlineAudio ? hiddenAudioRenderers : undefined;
  const answersBlocked = disabled || answersDisabled;
  const grid = !hidden && usesPictureGrid(question.options);
  const multiple = question.type === "MULTIPLE_CHOICE";

  return (
    <View className="gap-4">
      {/* Where the learner is, once. Moving and the answered count live in
          the screen's navigation (QuizNav, or the attempt's toolbar). */}
      <View
        accessible
        accessibilityLabel={`Soal ${index + 1} dari ${total}`}
        className="flex-row items-center gap-2"
      >
        <View className="size-9 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-base font-black tabular-nums text-primary">
            {index + 1}
          </Text>
        </View>
        <Text className="text-sm font-semibold tabular-nums text-muted-foreground">
          / {total}
        </Text>
      </View>

      {detail ? <Eyebrow size="xs">{detail}</Eyebrow> : null}
      {group ? (
        <QuestionGroupHeader
          first={group.first}
          instructions={group.instructions}
          last={group.last}
          renderers={renderers}
          resolveAssetUrl={resolveAssetUrl}
          stimulus={group.stimulus}
        />
      ) : null}
      {hidden === "prompt" ? (
        <TextPlaceholder lines={3} />
      ) : (
        <NativeContentRenderer
          content={question.prompt}
          renderers={renderers}
          resolveAssetUrl={resolveAssetUrl}
        />
      )}
      {media}

      {/* What to do, until the question is graded. */}
      {!correctOptionIds ? (
        <Text className="text-sm font-bold text-foreground">
          {instructionFor(question.type)}
        </Text>
      ) : null}
      {question.type === "WRITTEN" ? (
        <Card className="gap-3 p-5">
          {onChangeWritten ? (
            <TextInput
              accessibilityLabel={`Jawaban soal ${index + 1}`}
              className="min-h-32 text-base text-foreground"
              multiline
              editable={!answersBlocked}
              onChangeText={onChangeWritten}
              placeholder="Tulis jawaban kamu…"
              textAlignVertical="top"
              value={writtenAnswer ?? ""}
            />
          ) : hidden ? (
            <View className="min-h-32" />
          ) : (
            <>
              <Eyebrow size="md">Jawaban kamu</Eyebrow>
              <Text className="text-base leading-6 text-foreground">
                {writtenAnswer?.trim() ? writtenAnswer : "Tidak dijawab"}
              </Text>
            </>
          )}
        </Card>
      ) : (
        <AssessmentOptions grid={grid}>
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
                <NativeContentRenderer
                  content={option.content}
                  renderers={renderers}
                  resolveAssetUrl={resolveAssetUrl}
                />
              )}
            </AssessmentOption>
          ))}
        </AssessmentOptions>
      )}
      {children}
    </View>
  );
}
