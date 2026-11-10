import {
  orderAssessmentQuestions,
  sectionRules,
  shufflesQuestions,
} from "@hakgyo/shared";
import { ActivityIndicator, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import type { CourseItemAssessment } from "../sync/hooks";
import { useApiAssetResolver } from "./content-renderer";
import { QuizQuestion } from "./quiz/quiz-question";
import { SectionIntro } from "./section-intro";

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

/**
 * The attempt's first screen, drawn from the course bundle on the device while
 * the server registers the start, so "Mulai" opens the assessment at once:
 * the first section's intro, or the first question in the attempt's own
 * `QuizQuestion`. With the start's `shuffleSeed` (made on the device) the
 * question and its options show in the attempt's own order. The app does
 * not get an event's own shuffle setting, so it follows the assessment's; an
 * event set to "Acak" on an unshuffled assessment can swap the question once
 * the attempt opens. Without a seed, what the server still has to order
 * shows as grey placeholders in its final place: the question when
 * questions shuffle, the option text when options shuffle. Nothing can be
 * answered until the attempt exists.
 */
export function AttemptStartingPreview({
  assessment,
  shuffleQuestions,
  shuffleSeed,
}: {
  assessment: CourseItemAssessment | undefined;
  shuffleQuestions: boolean;
  /** The seed the device sent with the start, when it made one. */
  shuffleSeed?: string;
}) {
  const resolveAssetUrl = useApiAssetResolver();
  if (!assessment) return <StartingStatus />;
  const byPosition = [...assessment.questions].sort(
    (first, second) => first.position - second.position,
  );
  const questions = shuffleSeed
    ? orderAssessmentQuestions(
        byPosition,
        shuffleSeed,
        shufflesQuestions(shuffleQuestions),
        assessment.shuffleOptions,
        { sections: assessment.sections },
      )
    : byPosition;
  const firstSection = [...assessment.sections].sort(
    (first, second) => first.position - second.position,
  )[0];

  if (firstSection) {
    return (
      <>
        <StartingStatus />
        <SectionIntro
          busy
          instructions={firstSection.instructions}
          onStart={() => undefined}
          rules={sectionRules(firstSection)}
          position={1}
          questionCount={
            questions.filter(
              (question) => question.sectionId === firstSection.id,
            ).length
          }
          resolveAssetUrl={resolveAssetUrl}
          sectionCount={assessment.sections.length}
          timeLimitSeconds={firstSection.timeLimitSeconds}
          title={firstSection.title}
        />
      </>
    );
  }

  const first = shuffleQuestions && !shuffleSeed ? undefined : questions[0];
  const group = first?.groupId
    ? assessment.groups.find((candidate) => candidate.id === first.groupId)
    : undefined;
  let groupSize = 0;
  while (group && questions[groupSize]?.groupId === group.id) groupSize += 1;

  return (
    <>
      <StartingStatus />
      <QuizQuestion
        question={
          first ?? {
            type: "SINGLE_CHOICE",
            prompt: null,
            options: Array.from(
              { length: typicalOptionCount(questions) },
              (_, option) => ({ id: String(option), content: null }),
            ),
          }
        }
        index={0}
        total={questions.length}
        group={
          group
            ? {
                instructions: group.instructions,
                stimulus: group.stimulus,
                first: 1,
                last: groupSize,
              }
            : null
        }
        hidden={
          !first
            ? "prompt"
            : assessment.shuffleOptions && !shuffleSeed
              ? "options"
              : undefined
        }
        disabled
        resolveAssetUrl={resolveAssetUrl}
      />
    </>
  );
}
