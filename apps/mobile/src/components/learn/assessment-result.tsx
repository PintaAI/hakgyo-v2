import { formatScore, formatScoreOutOf } from "@hakgyo/shared";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
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
import { SymbolIcon } from "../ui/symbol-icon";
import {
  gradedNote,
  hasPassed,
  ScoreBar,
  scorePercent,
  type LatestAttempt,
} from "./assessment-overview";
import { ConfettiBurst } from "./confetti";
import type { LearningContinuation } from "./course-learning-footer";
import { HeroTile } from "../hero-tile";
import { CardFan, HakgyoHero, HERO_TITLE } from "./hakgyo-hero";

/** The box the score cards sit in, which the confetti bursts from. */
const FAN_BOX = { width: 220, height: 112 };
const PASSED_GREEN = "#10b981";
/** How much of the previewed question shows before it fades out. */
const PREVIEW_MAX_HEIGHT = 420;

/**
 * A graded tugas, where the learner lands after finishing it: the score is
 * the hero, then one main tile (continue once the tugas is passed, retry
 * while it still holds the learner), an optional retry, and a preview of the
 * answers that opens the full review.
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
  const { colors } = useAppTheme();
  const percent = scorePercent(attempt);
  const passed = hasPassed(attempt, passingScore);
  const gatesProgress = Boolean(learning);
  const path = learning?.path;
  const next = path?.nextItem;

  // Continue once the course item is done; retry while it holds the learner.
  const primary: "continue" | "retry" | null =
    gatesProgress && itemCompleted === true && path
      ? "continue"
      : gatesProgress && itemCompleted === false && !passed && canReattempt
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
  const nextMeta = next ? getLearningItemTypeMeta(next.type) : null;

  return (
    <>
      <HakgyoHero>
        <View className="items-center">
          <View style={FAN_BOX}>
            <CardFan
              faces={[
                <View className="items-center" key="score">
                  <Text className="text-4xl font-black tabular-nums tracking-tight text-foreground">
                    {percent !== null
                      ? `${percent}%`
                      : attempt.score !== null
                        ? formatScore(attempt.score)
                        : "–"}
                  </Text>
                  {attempt.score !== null && attempt.maxScore !== null ? (
                    <Text className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {formatScoreOutOf(attempt.score, attempt.maxScore, " / ")}{" "}
                      poin
                    </Text>
                  ) : null}
                </View>,
                <View key="second" />,
                <View key="third" />,
              ]}
            />
            {passed && passingScore !== null ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute size-8 items-center justify-center rounded-full"
                style={{
                  left: FAN_BOX.width / 2 + 80 - 18,
                  top: -4,
                  backgroundColor: PASSED_GREEN,
                  borderWidth: 3,
                  borderColor: colors.background,
                }}
              >
                <SymbolIcon
                  name="checkmark"
                  size={14}
                  weight="bold"
                  tintColor="#ffffff"
                />
              </View>
            ) : null}
            <ConfettiBurst
              fire={celebrate}
              width={FAN_BOX.width}
              height={FAN_BOX.height}
              colors={[
                colors.primary,
                "#F2C14E",
                "#F472B6",
                "#34D399",
                "#60A5FA",
              ]}
            />
          </View>
        </View>
        <View className="items-center gap-2">
          <Eyebrow size="md" tone="primary">
            {eyebrow}
          </Eyebrow>
          <Text
            accessibilityRole="header"
            className="text-center font-black tracking-tight text-foreground"
            numberOfLines={2}
            style={HERO_TITLE}
          >
            {headline}
          </Text>
          {headline !== title ? (
            <Text
              className="text-center text-sm text-muted-foreground"
              numberOfLines={2}
            >
              {title}
            </Text>
          ) : null}
          {!passed ? (
            <View className="mt-1">
              <Badge tone="destructiveTinted">
                {missing !== null
                  ? `Belum lulus · kurang ${missing}%`
                  : "Belum lulus"}
              </Badge>
            </View>
          ) : null}
        </View>
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

      {primary === "continue" && path ? (
        <HeroTile
          eyebrow={
            next && nextMeta
              ? `Berikutnya · ${nextMeta.label}`
              : path.courseCompleted
                ? "Kurikulum selesai"
                : `Bab ${path.moduleIndex + 1}`
          }
          title={
            next
              ? next.title
              : path.courseCompleted
                ? "Kembali ke kurikulum"
                : path.module.title
          }
          meta={`Bab ${path.moduleIndex + 1} · ${path.completedCount}/${path.module.items.length} selesai`}
          pill={next ? "Lanjutkan" : "Buka"}
          loading={learning?.busy}
          onPress={() => void learning?.continueLearning()}
        />
      ) : primary === "retry" ? (
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
      {learning?.issue?.kind === "error" ? (
        <Text
          accessibilityRole="alert"
          className="text-sm leading-5 text-destructive"
        >
          {learning.issue.message}
        </Text>
      ) : null}
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
