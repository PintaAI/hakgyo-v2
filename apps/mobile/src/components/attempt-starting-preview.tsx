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
import { StudyGlass } from "./study-glass";

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
 * first question when the order is known before the server picks it (no
 * shuffle). Shuffled questions show an empty question card instead, and
 * shuffled options are left out. Nothing can be answered until the attempt
 * exists.
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
          <View className="h-16" />
        </AssessmentQuestion>
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
        <StudyGlass>
          <View className="min-h-32" />
        </StudyGlass>
      ) : assessment.shuffleOptions ? null : (
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
