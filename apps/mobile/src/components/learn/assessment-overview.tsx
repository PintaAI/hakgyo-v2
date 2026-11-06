import type { ComponentProps } from "react";
import {
  formatScore,
  formatScoreOutOf,
  reachesPercent,
  type SectionNavigation,
  usesPictureGrid,
} from "@hakgyo/shared";
import { Text, View } from "react-native";

import type { LearnerAttemptStatus } from "../../lib/assessment-state";
import { dateLabel } from "../../lib/study";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { AssessmentOption, AssessmentOptions } from "../assessment-ui";
import { NativeContentRenderer } from "../content-renderer";
import type { AssetUrlResolver } from "../content-renderer/types";
import { Action, Badge, Eyebrow } from "../learning-ui";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";

type LatestAttempt = {
  status: LearnerAttemptStatus;
  score: number | null;
  maxScore: number | null;
};

/**
 * A tugas's rules as small chips with icons: its time, passing score and
 * attempts, plus the opening and closing time of a latihan or tryout. Sits
 * under the title in the intro hero.
 */
export function AssessmentFacts({
  timeLimitMinutes,
  passingScore,
  maxAttempts,
  attemptsUsed,
  opensAt,
  closesAt,
}: {
  timeLimitMinutes: number | null;
  passingScore: number | null;
  maxAttempts: number | null;
  attemptsUsed: number;
  /** A scheduled event's opening time. */
  opensAt?: Date | null;
  /** An event's closing time. */
  closesAt?: Date | null;
}) {
  const { colors } = useAppTheme();
  const facts: { icon: SymbolName; label: string; text: string }[] = [
    {
      icon: "timer",
      label: "Waktu",
      text: timeLimitMinutes != null ? `${timeLimitMinutes} menit` : "Bebas",
    },
    ...(passingScore != null
      ? [
          {
            icon: "checkmark.seal.fill" as const,
            label: "Nilai lulus",
            text: `Lulus ${passingScore}%`,
          },
        ]
      : []),
    {
      icon: "arrow.clockwise",
      label: "Percobaan",
      text:
        maxAttempts == null
          ? "Tanpa batas"
          : `${Math.min(attemptsUsed, maxAttempts)} dari ${maxAttempts}`,
    },
    ...(opensAt
      ? [
          {
            icon: "calendar.badge.clock" as const,
            label: "Dibuka",
            text: `Dibuka ${dateLabel(opensAt)}`,
          },
        ]
      : []),
    ...(closesAt
      ? [
          {
            icon: "calendar" as const,
            label: "Ditutup",
            text: `Tutup ${dateLabel(closesAt)}`,
          },
        ]
      : []),
  ];
  return (
    <View className="flex-row flex-wrap justify-center gap-2">
      {facts.map((fact) => (
        <View
          accessible
          accessibilityLabel={`${fact.label}: ${fact.text}`}
          className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"
          key={fact.label}
        >
          <SymbolIcon
            name={fact.icon}
            size={13}
            tintColor={colors.mutedForeground}
            weight="semibold"
          />
          <Text className="text-sm font-semibold text-foreground">
            {fact.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

type RendererContent = ComponentProps<typeof NativeContentRenderer>["content"];

type PreviewQuestion = {
  id: string;
  prompt: RendererContent;
  type: string;
  options: ReadonlyArray<{ id: string; content: RendererContent }>;
};

/**
 * The tugas's first question as it will look, so the learner knows what to
 * expect: its prompt and options in the same cards as the attempt, without
 * a way to answer them here.
 */
export function QuestionPreview({
  question,
  total,
  resolveAssetUrl,
}: {
  question: PreviewQuestion;
  total: number;
  resolveAssetUrl: AssetUrlResolver;
}) {
  const grid = usesPictureGrid(question.options);
  const { colors } = useAppTheme();
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Eyebrow>Contoh soal</Eyebrow>
        <Text className="text-xs font-semibold text-muted-foreground">
          1 dari {total}
        </Text>
      </View>
      {/* A sample, not the attempt: the bottom fades into the page under a
          "Pratinjau" pill, and the whole preview takes taps for nothing so
          its options do not look or feel answerable. */}
      <View
        accessible
        accessibilityLabel="Pratinjau soal pertama. Mulai tugas untuk menjawab."
        className="gap-3"
        onStartShouldSetResponder={() => true}
      >
        <View className="gap-4 rounded-2xl border border-border bg-card p-5">
          <NativeContentRenderer
            content={question.prompt}
            resolveAssetUrl={resolveAssetUrl}
          />
        </View>
        {question.options.length > 0 ? (
          <AssessmentOptions grid={grid}>
            {question.options.map((option, index) => (
              <AssessmentOption
                key={option.id}
                index={index}
                selected={false}
                multiple={question.type === "MULTIPLE_CHOICE"}
                tile={grid}
              >
                <NativeContentRenderer
                  content={option.content}
                  resolveAssetUrl={resolveAssetUrl}
                />
              </AssessmentOption>
            ))}
          </AssessmentOptions>
        ) : null}
        <View
          pointerEvents="none"
          className="absolute inset-x-0 bottom-0 items-center justify-end pb-3"
          style={{
            top: "45%",
            experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.background, 0)}, ${withOpacity(colors.background, 0.92)} 70%, ${colors.background})`,
          }}
        >
          <View
            className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            <SymbolIcon
              name="eye"
              size={14}
              tintColor={colors.mutedForeground}
              weight="semibold"
            />
            <Text className="text-xs font-semibold text-muted-foreground">
              Pratinjau · mulai tugas untuk menjawab
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * The latest attempt of a course tugas on its intro screen: unsent, waiting
 * for a grade, or graded. Nothing before a first attempt.
 */
export function AssessmentOverview({
  timeLimitMinutes,
  passingScore,
  maxAttempts,
  attemptsUsed,
  latestAttempt,
  itemCompleted,
  canReattempt,
  gatesProgress,
  sections,
  onOpenAttempt,
}: {
  timeLimitMinutes: number | null;
  passingScore: number | null;
  maxAttempts: number | null;
  attemptsUsed: number;
  latestAttempt?: LatestAttempt | null;
  /** Whether the course item already counts as completed; unknown while the outline loads. */
  itemCompleted?: boolean;
  canReattempt: boolean;
  /** Whether passing the tugas unlocks the next activity in the course. */
  gatesProgress: boolean;
  /** The assessment's sections, for how it is worked through. */
  sections: ReadonlyArray<{
    navigation: SectionNavigation;
    lockAnswers: boolean;
  }>;
  onOpenAttempt: () => void;
}) {
  const showGate = gatesProgress && itemCompleted === false;

  // Before a first attempt the hero says it all (facts and caption).
  if (!latestAttempt) return null;
  return (
    <>
      {latestAttempt.status === "IN_PROGRESS" ? (
        <View className="gap-1 rounded-2xl border border-border bg-card p-4">
          <Eyebrow size="xs">Percobaan terakhir</Eyebrow>
          <Text className="text-base font-bold text-foreground">
            Belum dikirim
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Jawabanmu tersimpan. Lanjutkan dan kirim jika sudah siap.
          </Text>
        </View>
      ) : (
        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Eyebrow size="xs">Hasil terakhir</Eyebrow>
            <Action
              variant="link"
              size="inline"
              accessibilityRole="link"
              trailingIcon="chevron.right"
              onPress={onOpenAttempt}
            >
              {latestAttempt.status === "GRADED"
                ? "Lihat hasil"
                : "Lihat jawaban"}
            </Action>
          </View>
          {latestAttempt.status === "GRADED" ? (
            <GradedResult
              attempt={latestAttempt}
              passingScore={passingScore}
              note={gradedNote({
                attempt: latestAttempt,
                passingScore,
                itemCompleted,
                canReattempt,
                gatesProgress,
              })}
            />
          ) : (
            <View className="gap-1">
              <Text className="text-xl font-black text-foreground">
                Menunggu penilaian
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Pengajar sedang menilai jawabanmu.
                {showGate ? " Kamu bisa lanjut setelah nilainya keluar." : ""}
              </Text>
            </View>
          )}
        </View>
      )}
    </>
  );
}

function scorePercent(attempt: LatestAttempt) {
  return attempt.score !== null &&
    attempt.maxScore !== null &&
    attempt.maxScore > 0
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : null;
}

function hasPassed(attempt: LatestAttempt, passingScore: number | null) {
  if (passingScore === null) return true;
  // Compare the exact ratio, like the server, not the rounded percentage.
  return reachesPercent(attempt.score, attempt.maxScore, passingScore);
}

function gradedNote({
  attempt,
  passingScore,
  itemCompleted,
  canReattempt,
  gatesProgress,
}: {
  attempt: LatestAttempt;
  passingScore: number | null;
  itemCompleted?: boolean;
  canReattempt: boolean;
  gatesProgress: boolean;
}) {
  if (hasPassed(attempt, passingScore) || passingScore === null) return null;
  if (itemCompleted) return "Kamu sudah lulus di percobaan sebelumnya.";
  const target = `Raih minimal ${passingScore}%`;
  if (!canReattempt) {
    return gatesProgress
      ? `${target} untuk lanjut, tetapi percobaanmu sudah habis. Hubungi pengajar.`
      : "Percobaanmu sudah habis.";
  }
  return gatesProgress
    ? `${target} untuk lanjut ke aktivitas berikutnya.`
    : `${target} untuk lulus.`;
}

function GradedResult({
  attempt,
  passingScore,
  note,
}: {
  attempt: LatestAttempt;
  passingScore: number | null;
  note: string | null;
}) {
  const percent = scorePercent(attempt);
  const passed = hasPassed(attempt, passingScore);
  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-4xl font-black tabular-nums tracking-tight text-foreground">
            {percent !== null
              ? `${percent}%`
              : attempt.score !== null
                ? formatScore(attempt.score)
                : "–"}
          </Text>
          {attempt.score !== null && attempt.maxScore !== null ? (
            <Text className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatScoreOutOf(attempt.score, attempt.maxScore, " / ")} poin
            </Text>
          ) : null}
        </View>
        {passingScore !== null ? (
          <View className="mb-1.5">
            <Badge tone={passed ? "primary" : "destructiveTinted"}>
              {passed ? "Lulus" : "Belum lulus"}
            </Badge>
          </View>
        ) : null}
      </View>
      {percent !== null ? (
        <ScoreBar percent={percent} passingScore={passingScore} />
      ) : null}
      {note ? (
        <Text className="text-sm leading-5 text-muted-foreground">{note}</Text>
      ) : null}
    </View>
  );
}

/** The score as a bar, with a tick where the passing score sits. */
function ScoreBar({
  percent,
  passingScore,
}: {
  percent: number;
  passingScore: number | null;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={
        passingScore !== null
          ? `Nilai ${percent}%, nilai lulus ${passingScore}%`
          : `Nilai ${percent}%`
      }
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      className="h-4 justify-center"
    >
      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${clamped}%` }}
        />
      </View>
      {passingScore !== null && passingScore > 0 && passingScore < 100 ? (
        <View
          className="absolute h-4 w-0.5 rounded-full bg-foreground"
          style={{ left: `${passingScore}%`, marginLeft: -1 }}
        />
      ) : null}
    </View>
  );
}
