import { formatScore, formatScoreOutOf } from "@hakgyo/shared";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { useLearnerAttempt } from "../../sync/hooks";
import { withOpacity } from "../../theme/colors";
import {
  reviewAvailable,
  reviewStatuses,
  ReviewQuestion,
} from "../assessment-result-review";
import { useApiAssetResolver } from "../content-renderer";
import { Action, Badge, Eyebrow } from "../learning-ui";
import {
  gradedNote,
  hasPassed,
  ScoreBar,
  scorePercent,
  type LatestAttempt,
} from "./assessment-overview";
import type { LearningContinuation } from "./course-learning-footer";
import { HeroTile } from "../hero-tile";
import { HakgyoHero } from "./hakgyo-hero";
import { HeroMark, HeroMarkValue, HeroTitle } from "./hero-parts";

/** How much of the previewed question shows before it fades out. */
const PREVIEW_MAX_HEIGHT = 420;

/**
 * A graded tugas, where the learner lands after finishing it: the score is
 * the hero, then a retry (a main tile while the tugas still holds the
 * learner, a plain button otherwise) and a preview of the answers that
 * opens the full review. Going on is the screen's: the "next" row under
 * this and pulling past the end, like a material.
 */
export function AssessmentResult({
  attemptId,
  courseItemId,
  eyebrow = "Tugas selesai",
  title,
  attempt,
  passingScore,
  itemCompleted,
  canReattempt,
  learning,
  celebrate,
  onReview,
  onRetry,
  retryDisabled,
  retryExtras,
  children,
}: {
  attemptId: string;
  /** Null for an event that runs a library assessment. */
  courseItemId: string | null;
  /** Over the headline: "Tugas selesai", "Tryout selesai". */
  eyebrow?: string;
  title: string;
  attempt: LatestAttempt;
  passingScore: number | null;
  /** Whether the course item counts as completed; unknown while the outline loads. */
  itemCompleted?: boolean;
  canReattempt: boolean;
  /**
   * The course's continuation, for a tugas in a course; none for one that
   * belongs to a latihan or tryout, which leads nowhere next.
   */
  learning?: LearningContinuation;
  /** Plays the confetti (a pass not celebrated before). */
  celebrate: boolean;
  /** Opens the full review, at a question when given. */
  onReview: (question?: number) => void;
  onRetry: () => void;
  retryDisabled?: boolean;
  /** Shown with the retry: a class to pick, an error starting. */
  retryExtras?: ReactNode;
  /** Between the actions and the answer preview (an event's ranking). */
  children?: ReactNode;
}) {
  const percent = scorePercent(attempt);
  const passed = hasPassed(attempt, passingScore);
  const gatesProgress = Boolean(learning);
  const path = learning?.path;
  const next = path?.nextItem;

  // Retry is the main action while the tugas holds the learner.
  const primary: "retry" | null =
    gatesProgress && itemCompleted === false && !passed && canReattempt
      ? "retry"
      : null;
  // Retrying after a pass (or in a latihan or tryout) is optional: a plain
  // button under the main tile.
  const secondaryRetry = canReattempt && primary !== "retry";
  // The lock line under the retry already says what passing unlocks.
  const note =
    primary === "retry"
      ? null
      : passed
        ? null
        : gradedNote({
            attempt,
            passingScore,
            itemCompleted,
            canReattempt,
            gatesProgress,
          });
  const missing =
    !passed && percent !== null && passingScore !== null
      ? Math.max(1, passingScore - percent)
      : null;
  const headline =
    passed && passingScore !== null ? "Mantap, kamu lulus!" : title;

  return (
    <>
      <HakgyoHero>
        <HeroMark
          done={passed && passingScore !== null}
          celebrate={celebrate}
          face={
            <HeroMarkValue
              value={
                percent !== null
                  ? `${percent}%`
                  : attempt.score !== null
                    ? formatScore(attempt.score)
                    : "–"
              }
              label={
                attempt.score !== null && attempt.maxScore !== null
                  ? `${formatScoreOutOf(attempt.score, attempt.maxScore, " / ")} poin`
                  : undefined
              }
            />
          }
        />
        <HeroTitle
          eyebrow={eyebrow}
          title={headline}
          description={headline !== title ? title : undefined}
        >
          {!passed ? (
            <View className="mt-1">
              <Badge tone="destructiveTinted">
                {missing !== null
                  ? `Belum lulus · kurang ${missing}%`
                  : "Belum lulus"}
              </Badge>
            </View>
          ) : null}
        </HeroTitle>
        {percent !== null ? (
          <View className="gap-1.5">
            <ScoreBar percent={percent} passingScore={passingScore} />
            {passingScore !== null ? (
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted-foreground">Nilaimu</Text>
                <Text className="text-xs text-muted-foreground">
                  Syarat lulus {passingScore}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {note ? (
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            {note}
          </Text>
        ) : null}
      </HakgyoHero>

      {primary === "retry" ? (
        <HeroTile
          eyebrow="Coba lagi"
          title="Kerjakan ulang tugas"
          meta={
            next
              ? `${next.title} terbuka setelah kamu lulus`
              : passingScore !== null
                ? `Raih minimal ${passingScore}% untuk lulus`
                : "Percobaan baru"
          }
          pill="Mulai"
          disabled={retryDisabled}
          onPress={onRetry}
        />
      ) : null}
      {secondaryRetry ? (
        <Action
          variant="secondary"
          leadingIcon="arrow.clockwise"
          disabled={retryDisabled}
          onPress={onRetry}
        >
          Kerjakan ulang
        </Action>
      ) : null}
      {canReattempt ? retryExtras : null}
      {learning?.outlineFailed && !path ? (
        <Text
          accessibilityRole="alert"
          className="text-center text-sm leading-5 text-destructive"
        >
          Jalur belajar kamu gagal dimuat. Coba buka lagi halaman ini.
        </Text>
      ) : null}

      {children}

      <AnswerPreview
        attemptId={attemptId}
        courseItemId={courseItemId}
        onReview={onReview}
      />
    </>
  );
}

/**
 * The first question the learner got wrong (or the first, when all were
 * right), as they answered it, over "Review semua jawaban", which opens the
 * full review at that question. A link to the score details while
 * the answers are not revealed.
 */
function AnswerPreview({
  attemptId,
  courseItemId,
  onReview,
}: {
  attemptId: string;
  courseItemId: string | null;
  onReview: (question?: number) => void;
}) {
  const { colors } = useAppTheme();
  const resolveAssetUrl = useApiAssetResolver();
  const { assessment, attempt } = useLearnerAttempt(attemptId, courseItemId);
  const [clipped, setClipped] = useState(false);
  const detail = assessment.data;
  const graded = attempt.data;
  if (!detail || !graded || graded.status !== "GRADED") return null;
  if (!reviewAvailable(detail, graded)) {
    return (
      <Action
        variant="secondary"
        leadingIcon="list.bullet.rectangle.fill"
        onPress={() => onReview()}
      >
        Lihat rincian nilai
      </Action>
    );
  }
  const statuses = reviewStatuses(detail, graded);
  const missed = statuses.filter(
    (status) => status === "incorrect" || status === "unanswered",
  ).length;
  const firstMissed = statuses.findIndex(
    (status) => status === "incorrect" || status === "unanswered",
  );
  const position = Math.max(0, firstMissed);
  if (!detail.questions[position]) return null;
  return (
    <View className="gap-3">
      <Eyebrow>
        {missed > 0
          ? `${missed} soal perlu dipelajari lagi`
          : "Semua jawabanmu benar"}
      </Eyebrow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Soal ${position + 1}. Buka review semua jawaban.`}
        className="active:opacity-90"
        onPress={() => onReview(position)}
      >
        <View style={{ maxHeight: PREVIEW_MAX_HEIGHT, overflow: "hidden" }}>
          <View
            onLayout={(event) =>
              setClipped(event.nativeEvent.layout.height > PREVIEW_MAX_HEIGHT)
            }
          >
            <ReviewQuestion
              assessment={detail}
              attempt={graded}
              position={position}
              statuses={statuses}
              resolveAssetUrl={resolveAssetUrl}
              brief
            />
          </View>
          {/* A long question fades out where it is cut. */}
          {clipped ? (
            <View
              pointerEvents="none"
              className="absolute inset-x-0 bottom-0 h-24"
              style={{
                experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.background, 0)}, ${colors.background})`,
              }}
            />
          ) : null}
        </View>
      </Pressable>
      <Action
        variant="secondary"
        leadingIcon="list.bullet.rectangle.fill"
        onPress={() => onReview(position)}
      >
        Review semua jawaban
      </Action>
    </View>
  );
}
