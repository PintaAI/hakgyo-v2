import { formatScoreOutOf } from "@hakgyo/shared";
import { Text, View } from "react-native";

import { useLearnerAttempt } from "../sync/hooks";
import { AssessmentResultReview } from "./assessment-result-review";
import { useApiAssetResolver } from "./content-renderer";
import { Card, Eyebrow, Spinner } from "./learning-ui";
import { ScoreBandResults } from "./score-band-results";
import { TagResults } from "./tag-results";

/**
 * The details of a graded attempt, under the "Hasil terakhir" card of the
 * tugas or event screen (which already shows the score and whether it
 * passed): the score bands, the score per section, the score per question
 * type, and the answer review with explanations when they are open. These
 * screens are where a learner lands after finishing, so the attempt has no
 * result screen of its own. Nothing shows until the attempt is graded.
 */
export function AttemptResultDetails({
  attemptId,
  courseItemId,
  initialQuestion,
}: {
  attemptId: string;
  /** The review opens at this question (from the preview on the tugas). */
  initialQuestion?: number;
  /** Null for attempts of library events (read through the attempt). */
  courseItemId: string | null;
}) {
  const resolveAssetUrl = useApiAssetResolver();
  // Graded attempts come from the persisted result; online otherwise.
  const { assessment, attempt } = useLearnerAttempt(attemptId, courseItemId);
  if (assessment.isPending || attempt.isPending) {
    return (
      <View className="py-4">
        <Spinner label="Memuat rincian hasil…" />
      </View>
    );
  }
  const detail = assessment.data;
  const graded = attempt.data;
  // Scores are withheld (null) for invalidated or cancelled participations.
  if (
    !detail ||
    !graded ||
    graded.status !== "GRADED" ||
    graded.score === null ||
    graded.maxScore === null
  ) {
    return null;
  }
  const sections = detail.sections.flatMap((section) => {
    const result = detail.sectionResults.find(
      (entry) => entry.sectionId === section.id,
    );
    return result ? [{ title: section.title, ...result }] : [];
  });

  return (
    <>
      {detail.scoreBands.length || sections.length ? (
        <Card className="gap-3 p-4">
          <Eyebrow size="xs">Rincian nilai</Eyebrow>
          <ScoreBandResults
            bands={detail.scoreBands}
            maxScore={graded.maxScore}
            score={graded.score}
          />
          {sections.map((section) => (
            <View
              key={section.sectionId}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="text-sm text-foreground">{section.title}</Text>
              <Text className="text-sm tabular-nums text-foreground">
                {formatScoreOutOf(section.score, section.maxScore)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      <TagResults answers={graded.answers} questions={detail.questions} />
      <AssessmentResultReview
        assessment={detail}
        attempt={graded}
        resolveAssetUrl={resolveAssetUrl}
        initialIndex={initialQuestion}
      />
    </>
  );
}
