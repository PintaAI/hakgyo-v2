import { usesPictureGrid } from "@hakgyo/shared";
import { ActivityIndicator, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import type { CourseItemAssessment } from "../sync/hooks";
import {
  AssessmentOption,
  AssessmentOptions,
  AssessmentQuestion,
} from "./assessment-ui";
import { NativeContentRenderer, useApiAssetResolver } from "./content-renderer";
import { QuestionGroupHeader } from "./question-group-header";
import { SectionIntro } from "./section-intro";
import { Card } from "./learning-ui";
import { Skeleton } from "./ui/skeleton";

/** Grey lines where text appears once the server sets the order. */
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

/** Option cards in their final places, their text still hidden. */
function OptionPlaceholders({
  count,
  multiple,
}: {
  count: number;
  multiple: boolean;
}) {
  return (
    <AssessmentOptions grid={false}>
      {Array.from({ length: count }, (_, index) => (
        <AssessmentOption
          key={index}
          index={index}
          selected={false}
          multiple={multiple}
          disabled
        >
          <TextPlaceholder lines={1} />
        </AssessmentOption>
      ))}
    </AssessmentOptions>
  );
}

/** The option count most questions have, for a question not known yet. */
function typicalOptionCount(
  questions: ReadonlyArray<{ options: readonly unknown[] }>,
) {
  const counts = new Map<number, number>();
  for (const question of questions) {
    const count = question.options.length;
    if (count > 0) counts.set(count, (counts.get(count) ?? 0) + 1);
  }
  let typical = 0;
  let seen = 0;
  for (const [count, times] of counts) {
    if (times > seen) {
      typical = count;
      seen = times;
    }
  }
  return typical;
}

/** The status line above the preview while the server registers the start. */
function StartingStatus() {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2"
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text className="text-sm text-muted-foreground">
        Memulai… soal bisa dijawab sebentar lagi.
      </Text>
    </View>
  );
}

/**
 * The attempt's first screen, drawn from the course bundle on the device while
 * the server registers the start, so "Mulai" opens the assessment at once.
 * It matches what the attempt shows first: the first section's intro, or the
 * first question when the assessment does not shuffle (the app does not get
 * an event's own shuffle setting, so an event set to "Acak" can swap that
 * question once the attempt opens). What the server still has to order shows
 * as grey placeholders in its final place: the question text when questions
 * shuffle, the option text when options shuffle. Nothing can be answered
 * until the attempt exists.
 */
export function AttemptStartingPreview({
  assessment,
  shuffleQuestions,
}: {
  assessment: CourseItemAssessment | undefined;
  shuffleQuestions: boolean;
}) {
  const resolveAssetUrl = useApiAssetResolver();
  if (!assessment) return <StartingStatus />;
  const questions = [...assessment.questions].sort(
    (first, second) => first.position - second.position,
  );
  const sections = [...assessment.sections].sort(
    (first, second) => first.position - second.position,
  );
  const firstSection = sections[0];

  if (firstSection) {
    return (
      <>
        <StartingStatus />
        <SectionIntro
          busy
          instructions={firstSection.instructions}
          onStart={() => undefined}
          position={1}
          questionCount={
            questions.filter(
              (question) => question.sectionId === firstSection.id,
            ).length
          }
          resolveAssetUrl={resolveAssetUrl}
          sectionCount={sections.length}
          timeLimitSeconds={firstSection.timeLimitSeconds}
          title={firstSection.title}
        />
      </>
    );
  }

  const question = shuffleQuestions ? undefined : questions[0];
  if (!question) {
    return (
      <>
        <StartingStatus />
        <AssessmentQuestion current={0} total={questions.length} disabled>
          <TextPlaceholder lines={3} />
        </AssessmentQuestion>
        {typicalOptionCount(questions) > 0 ? (
          <OptionPlaceholders
            count={typicalOptionCount(questions)}
            multiple={false}
          />
        ) : null}
      </>
    );
  }

  const group = question.groupId
    ? assessment.groups.find((candidate) => candidate.id === question.groupId)
    : undefined;
  let groupSize = 0;
  while (questions[groupSize]?.groupId === question.groupId && group) {
    groupSize += 1;
  }
  const pictureGrid = usesPictureGrid(question.options);

  return (
    <>
      <StartingStatus />
      <AssessmentQuestion current={0} total={questions.length} disabled>
        {group ? (
          <QuestionGroupHeader
            first={1}
            instructions={group.instructions}
            last={groupSize}
            resolveAssetUrl={resolveAssetUrl}
            stimulus={group.stimulus}
          />
        ) : null}
        <NativeContentRenderer
          content={question.prompt}
          resolveAssetUrl={resolveAssetUrl}
        />
      </AssessmentQuestion>
      {question.type === "WRITTEN" ? (
        <Card className="gap-4 p-5">
          <View className="min-h-32" />
        </Card>
      ) : assessment.shuffleOptions ? (
        <OptionPlaceholders
          count={question.options.length}
          multiple={question.type === "MULTIPLE_CHOICE"}
        />
      ) : (
        <AssessmentOptions grid={pictureGrid}>
          {question.options.map((option, optionIndex) => (
            <AssessmentOption
              key={option.id}
              index={optionIndex}
              selected={false}
              multiple={question.type === "MULTIPLE_CHOICE"}
              disabled
              tile={pictureGrid}
            >
              <NativeContentRenderer
                content={option.content}
                resolveAssetUrl={resolveAssetUrl}
              />
            </AssessmentOption>
          ))}
        </AssessmentOptions>
      )}
    </>
  );
}
