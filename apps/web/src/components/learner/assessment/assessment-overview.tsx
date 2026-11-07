"use client";

import type { ComponentType, ReactNode } from "react";
import {
  BadgeCheckIcon,
  CalendarClockIcon,
  CalendarIcon,
  EyeIcon,
  RotateCwIcon,
  TimerIcon,
} from "lucide-react";
import { formatScore, formatScoreOutOf, reachesPercent } from "@hakgyo/shared";

import { LocalDateTime } from "~/components/local-date-time";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { Eyebrow } from "../eyebrow";
import { QuizQuestion, type QuizQuestionData } from "../quiz/quiz-question";

type LatestAttempt = {
  status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
  score: number | null;
  maxScore: number | null;
};

// The opening and closing time in the browser's zone, like the app's `dateLabel`.
const factDate = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Fact = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  text: ReactNode;
};

/**
 * A tugas's rules as small chips with icons: its time, passing score and
 * attempts, plus the opening and closing time of a latihan or tryout. Sits
 * under the title in the intro hero, like the app's `AssessmentFacts`.
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
  const facts: Fact[] = [
    {
      icon: TimerIcon,
      label: "Waktu",
      text: timeLimitMinutes != null ? `${timeLimitMinutes} menit` : "Bebas",
    },
    ...(passingScore != null
      ? [
          {
            icon: BadgeCheckIcon,
            label: "Nilai lulus",
            text: `Lulus ${passingScore}%`,
          },
        ]
      : []),
    {
      icon: RotateCwIcon,
      label: "Percobaan",
      text:
        maxAttempts == null
          ? "Tanpa batas"
          : `${Math.min(attemptsUsed, maxAttempts)} dari ${maxAttempts}`,
    },
    ...(opensAt
      ? [
          {
            icon: CalendarClockIcon,
            label: "Dibuka",
            text: (
              <>
                Dibuka <LocalDateTime value={opensAt} format={factDate} />
              </>
            ),
          },
        ]
      : []),
    ...(closesAt
      ? [
          {
            icon: CalendarIcon,
            label: "Ditutup",
            text: (
              <>
                Tutup <LocalDateTime value={closesAt} format={factDate} />
              </>
            ),
          },
        ]
      : []),
  ];
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {facts.map(({ icon: Icon, label, text }) => (
        <li
          key={label}
          className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1.5"
        >
          <Icon
            className="text-muted-foreground size-3.5 shrink-0"
            strokeWidth={2.5}
          />
          <span className="sr-only">{label}: </span>
          <span className="text-sm font-semibold">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The tugas's first question as it will look, in the attempt's own
 * `QuizQuestion`, so the learner knows what to expect, without a way to
 * answer it here.
 */
export function QuestionPreview({
  question,
  total,
}: {
  question: QuizQuestionData;
  total: number;
}) {
  return (
    <section aria-label="Contoh soal" className="flex flex-col gap-3">
      <Eyebrow>Contoh soal</Eyebrow>
      {/* A sample, not the attempt: the bottom fades into the page under a
          "Pratinjau" pill, and the preview is inert so its options do not
          look or feel answerable. */}
      <div className="relative">
        <div inert>
          <QuizQuestion question={question} index={0} total={total} disabled />
        </div>
        <div className="to-background via-background/92 pointer-events-none absolute inset-x-0 top-[45%] bottom-0 flex items-end justify-center bg-linear-to-b from-transparent via-70% pb-3">
          <p className="bg-card text-muted-foreground flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold">
            <EyeIcon className="size-3.5" strokeWidth={2.5} />
            Pratinjau · mulai tugas untuk menjawab
          </p>
        </div>
      </div>
    </section>
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
    <div
      role="progressbar"
      aria-label={
        passingScore !== null
          ? `Nilai ${percent}%, nilai lulus ${passingScore}%`
          : `Nilai ${percent}%`
      }
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="relative flex h-4 flex-col justify-center"
    >
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {passingScore !== null && passingScore > 0 && passingScore < 100 ? (
        <div
          className="bg-foreground absolute -ml-px h-4 w-0.5 rounded-full"
          style={{ left: `${passingScore}%` }}
        />
      ) : null}
    </div>
  );
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
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight tabular-nums">
            {percent !== null
              ? `${percent}%`
              : attempt.score !== null
                ? formatScore(attempt.score)
                : "–"}
          </span>
          {attempt.score !== null && attempt.maxScore !== null ? (
            <span className="text-muted-foreground text-sm font-semibold tabular-nums">
              {formatScoreOutOf(attempt.score, attempt.maxScore, " / ")} poin
            </span>
          ) : null}
        </p>
        {passingScore !== null ? (
          <Badge
            variant={passed ? "default" : "destructive"}
            className={cn(
              "mb-1.5 h-6 px-2.5 font-bold",
              passed && "bg-primary/15 text-primary",
            )}
          >
            {passed ? "Lulus" : "Belum lulus"}
          </Badge>
        ) : null}
      </div>
      {percent !== null ? (
        <ScoreBar percent={percent} passingScore={passingScore} />
      ) : null}
      {note ? (
        <p className="text-muted-foreground text-sm leading-5">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * The latest attempt on a tugas or event screen, like the app's
 * `AssessmentOverview`: unsent, waiting for a grade, or graded. Nothing before
 * a first attempt.
 */
export function AssessmentOverview({
  passingScore,
  latestAttempt,
  itemCompleted,
  canReattempt,
  gatesProgress,
}: {
  passingScore: number | null;
  latestAttempt?: LatestAttempt | null;
  /** Whether the course item already counts as completed; unknown while the outline loads. */
  itemCompleted?: boolean;
  canReattempt: boolean;
  /** Whether passing the tugas unlocks the next activity in the course. */
  gatesProgress: boolean;
}) {
  const showGate = gatesProgress && itemCompleted === false;

  // Before a first attempt the hero says it all (facts and caption).
  if (!latestAttempt) return null;
  if (latestAttempt.status === "IN_PROGRESS") {
    return (
      <section className="bg-card flex flex-col gap-1 rounded-2xl border p-4">
        <Eyebrow size="xs">Percobaan terakhir</Eyebrow>
        <p className="text-base font-bold">Belum dikirim</p>
        <p className="text-muted-foreground text-sm leading-5">
          Jawabanmu tersimpan. Lanjutkan dan kirim jika sudah siap.
        </p>
      </section>
    );
  }
  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <Eyebrow size="xs">Hasil terakhir</Eyebrow>
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
        <div className="flex flex-col gap-1">
          <p className="text-xl font-black">Menunggu penilaian</p>
          <p className="text-muted-foreground text-sm leading-5">
            Pengajar sedang menilai jawabanmu.
            {showGate ? " Kamu bisa lanjut setelah nilainya keluar." : ""}
          </p>
        </div>
      )}
    </section>
  );
}
