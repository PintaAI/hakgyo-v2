import { formatScore, formatScoreOutOf, reachesPercent } from "@hakgyo/shared";
import { Text, View } from "react-native";

import type { LearnerAttemptStatus } from "../../lib/assessment-state";
import { Action, Badge, Eyebrow } from "../learning-ui";

type LatestAttempt = {
  status: LearnerAttemptStatus;
  score: number | null;
  maxScore: number | null;
};

/**
 * The rules and latest result of a course tugas, shown on its intro screen
 * between the description and the start action.
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
  onOpenAttempt: () => void;
}) {
  const facts = [
    {
      label: "Waktu",
      value: timeLimitMinutes != null ? `${timeLimitMinutes} menit` : "Bebas",
    },
    passingScore != null
      ? { label: "Nilai lulus", value: `${passingScore}%` }
      : null,
    {
      label: "Percobaan",
      value:
        maxAttempts == null
          ? "Tanpa batas"
          : `${Math.min(attemptsUsed, maxAttempts)} dari ${maxAttempts}`,
    },
  ].filter((fact) => fact !== null);
  const showGate = gatesProgress && itemCompleted === false;

  return (
    <>
      <View className="flex-row gap-4 border-t border-border pt-4">
        {facts.map((fact) => (
          <View key={fact.label} className="min-w-0 flex-1 gap-1">
            <Eyebrow size="xs" numberOfLines={1}>
              {fact.label}
            </Eyebrow>
            <Text
              className="text-base font-bold text-foreground"
              numberOfLines={1}
            >
              {fact.value}
            </Text>
          </View>
        ))}
      </View>

      {!latestAttempt ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          Bebas berpindah antarsoal, lalu kirim jika sudah siap.
          {showGate && passingScore != null
            ? ` Raih minimal ${passingScore}% untuk membuka aktivitas berikutnya.`
            : ""}
        </Text>
      ) : latestAttempt.status === "IN_PROGRESS" ? (
        <View className="gap-1 border-t border-border pt-4">
          <Eyebrow size="xs">Percobaan terakhir</Eyebrow>
          <Text className="text-base font-bold text-foreground">
            Belum dikirim
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Jawabanmu tersimpan. Lanjutkan dan kirim jika sudah siap.
          </Text>
        </View>
      ) : (
        <View className="gap-3 border-t border-border pt-4">
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
