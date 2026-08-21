"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Progress } from "~/components/ui/progress";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];
type Answer = {
  questionId: string;
  content?: string;
  optionIds: string[];
};

function jsonText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map(jsonText).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.text) return jsonText(record.text);
    if (record.content) return jsonText(record.content);
    return Object.values(record).map(jsonText).filter(Boolean).join(" ");
  }
  return "";
}

export function AssessmentIntroduction({
  courseId,
  courseItemId,
  assessment,
}: {
  courseId: string;
  courseItemId: string;
  assessment: Assessment;
}) {
  const router = useRouter();
  const start = api.assessment.startAttempt.useMutation();

  const startAssessment = async () => {
    try {
      const attempt = await start.mutateAsync({ courseItemId });
      router.push(
        `/learn/${courseId}/items/${courseItemId}/attempts/${attempt.id}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Assessment belum dapat dimulai.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/learn/${courseId}`}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "text-muted-foreground mb-5 -ml-2",
        )}
      >
        <ArrowLeftIcon /> Kembali ke course
      </Link>
      <section className="bg-card ring-foreground/10 relative overflow-hidden rounded-lg p-7 ring-1 md:p-12">
        <div className="relative">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-md">
            <ClipboardCheckIcon className="size-6" />
          </span>
          <Badge variant="secondary" className="mt-6">
            Assessment
          </Badge>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-5xl">
            {assessment.title}
          </h1>
          {assessment.description ? (
            <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
              {assessment.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="bg-muted/30 rounded-md border p-4">
              <p className="text-muted-foreground text-xs">Jumlah soal</p>
              <p className="mt-1 text-xl font-semibold">
                {assessment.questions.length}
              </p>
            </div>
            <div className="bg-muted/30 rounded-md border p-4">
              <p className="text-muted-foreground text-xs">Batas waktu</p>
              <p className="mt-1 text-xl font-semibold">
                {assessment.timeLimitMinutes
                  ? `${assessment.timeLimitMinutes} menit`
                  : "Fleksibel"}
              </p>
            </div>
            <div className="bg-muted/30 rounded-md border p-4">
              <p className="text-muted-foreground text-xs">Nilai lulus</p>
              <p className="mt-1 text-xl font-semibold">
                {assessment.passingScore ?? 0}%
              </p>
            </div>
          </div>

          {assessment.instructions ? (
            <div className="bg-muted/30 mt-7 rounded-md border p-5">
              <p className="font-semibold">Petunjuk pengerjaan</p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {jsonText(assessment.instructions)}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground max-w-md text-sm">
              Jawaban disimpan saat kamu mengirim assessment. Pastikan koneksi
              tetap aktif.
            </p>
            <Button
              onClick={startAssessment}
              disabled={start.isPending || !assessment.questions.length}
              size="lg"
              className="px-5"
            >
              {start.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Mulai assessment <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AssessmentAttempt({
  courseId,
  courseItemId,
  assessment,
  attempt,
  serverTime,
}: {
  courseId: string;
  courseItemId: string;
  assessment: Assessment;
  attempt: Attempt;
  serverTime: Date;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(
      attempt.answers.map((answer) => [
        answer.questionId,
        {
          questionId: answer.questionId,
          content:
            typeof answer.content === "string" ? answer.content : undefined,
          optionIds: answer.selectedOptions.map(
            (selection) => selection.optionId,
          ),
        },
      ]),
    ),
  );
  const initialSeconds = assessment.timeLimitMinutes
    ? Math.max(
        0,
        assessment.timeLimitMinutes * 60 -
          Math.floor(
            (serverTime.getTime() - attempt.startedAt.getTime()) / 1000,
          ),
      )
    : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds);
  const save = api.assessment.saveAnswers.useMutation();
  const submit = api.assessment.submitAttempt.useMutation();
  const question = assessment.questions[current];
  const answeredCount = assessment.questions.filter((entry) => {
    const answer = answers[entry.id];
    return (
      answer && (answer.optionIds.length > 0 || Boolean(answer.content?.trim()))
    );
  }).length;
  const isFinished = attempt.status !== "IN_PROGRESS";
  const scorePercent =
    attempt.score !== null && attempt.maxScore
      ? Math.round((attempt.score / attempt.maxScore) * 100)
      : null;
  const passed =
    scorePercent !== null && scorePercent >= (assessment.passingScore ?? 0);

  const submitAssessment = async () => {
    if (submit.isPending || save.isPending || isFinished) return;
    try {
      const payload = Object.values(answers).filter(
        (answer) => answer.optionIds.length || answer.content?.trim(),
      );
      let savedLate = false;
      if (payload.length) {
        try {
          await save.mutateAsync({ attemptId: attempt.id, answers: payload });
        } catch (error) {
          const code =
            typeof error === "object" &&
            error !== null &&
            "data" in error &&
            typeof error.data === "object" &&
            error.data !== null &&
            "code" in error.data
              ? error.data.code
              : undefined;
          if (code !== "PRECONDITION_FAILED") throw error;
          savedLate = true;
        }
      }
      const result = await submit.mutateAsync({ attemptId: attempt.id });
      await Promise.all([
        utils.assessment.getMyAttempt.invalidate({ attemptId: attempt.id }),
        utils.learning.getCourseOutline.invalidate({ courseId }),
      ]);
      toast.success(
        savedLate || result.expired
          ? "Waktu habis. Jawaban yang tersimpan telah dikirim untuk dinilai."
          : result.status === "IN_REVIEW"
            ? "Jawaban dikirim untuk diperiksa."
            : "Assessment berhasil dinilai.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Jawaban gagal dikirim.",
      );
    }
  };
  const onTimeExpired = useEffectEvent(() => {
    void submitAssessment();
  });

  useEffect(() => {
    if (secondsLeft === null || isFinished) return;
    if (secondsLeft <= 0) {
      onTimeExpired();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((value) =>
        value === null ? null : Math.max(0, value - 1),
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, isFinished]);

  const updateOptions = (
    questionId: string,
    optionId: string,
    multiple: boolean,
  ) => {
    setAnswers((currentAnswers) => {
      const existing = currentAnswers[questionId]?.optionIds ?? [];
      const optionIds = multiple
        ? existing.includes(optionId)
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId]
        : [optionId];
      return { ...currentAnswers, [questionId]: { questionId, optionIds } };
    });
  };

  if (isFinished) {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-10rem)] max-w-3xl items-center">
        <section className="bg-card ring-foreground/10 w-full overflow-hidden rounded-lg p-7 text-center ring-1 md:p-12">
          <span
            className={cn(
              "mx-auto flex size-14 items-center justify-center rounded-md",
              attempt.status === "IN_REVIEW"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950"
                : passed
                  ? "bg-foreground text-background"
                  : "bg-red-100 text-red-700 dark:bg-red-950",
            )}
          >
            {attempt.status === "IN_REVIEW" ? (
              <Clock3Icon className="size-7" />
            ) : passed ? (
              <CheckCircle2Icon className="size-7" />
            ) : (
              <RotateCcwIcon className="size-7" />
            )}
          </span>
          <Badge variant="secondary" className="mt-6">
            Attempt #{attempt.attemptNumber}
          </Badge>
          <h1 className="mt-3 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight">
            {attempt.status === "IN_REVIEW"
              ? "Jawaban sedang diperiksa"
              : passed
                ? "Kamu berhasil!"
                : "Belum lulus, tetap lanjut."}
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            {attempt.status === "IN_REVIEW"
              ? "Pengajar akan memeriksa jawaban tertulis kamu. Nilai akan tampil setelah proses review selesai."
              : `Kamu memperoleh ${attempt.score ?? 0} dari ${attempt.maxScore ?? 0} poin.`}
          </p>
          {scorePercent !== null ? (
            <div className="bg-muted/30 mx-auto mt-8 max-w-sm rounded-md border p-5">
              <p className="text-5xl font-semibold tabular-nums">
                {scorePercent}%
              </p>
              <Progress
                value={scorePercent}
                className="mt-4 [&_[data-slot=progress-track]]:h-1.5"
              />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href={`/learn/${courseId}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Kembali ke course
            </Link>
            {!passed && attempt.status === "GRADED" ? (
              <Link
                href={`/learn/${courseId}/items/${courseItemId}`}
                className={buttonVariants({ size: "lg" })}
              >
                Coba lagi <ArrowRightIcon />
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (!question) return null;
  const answer = answers[question.id];
  const minutes = secondsLeft === null ? null : Math.floor(secondsLeft / 60);
  const seconds = secondsLeft === null ? null : secondsLeft % 60;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/learn/${courseId}/items/${courseItemId}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Keluar dari assessment"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{assessment.title}</p>
          <p className="text-muted-foreground text-xs">
            Attempt #{attempt.attemptNumber}
          </p>
        </div>
        {secondsLeft !== null ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-semibold",
              secondsLeft < 60 &&
                "border-red-300 bg-red-50 text-red-700 dark:bg-red-950",
            )}
          >
            <Clock3Icon className="size-4" /> {minutes}:
            {String(seconds).padStart(2, "0")}
          </div>
        ) : null}
      </header>
      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <section className="bg-card ring-foreground/10 rounded-lg p-6 ring-1 md:p-9">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">Soal {current + 1}</Badge>
            <span className="text-muted-foreground text-xs">
              {question.points} poin
            </span>
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-hanken-grotesk)] text-xl leading-relaxed font-medium md:text-2xl">
            {jsonText(question.prompt)}
          </h1>
          {question.type === "MULTIPLE_CHOICE" ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Pilih semua jawaban yang benar.
            </p>
          ) : null}
          <div className="mt-8 space-y-3">
            {question.type === "WRITTEN" ? (
              <Textarea
                value={answer?.content ?? ""}
                onChange={(event) =>
                  setAnswers((currentAnswers) => ({
                    ...currentAnswers,
                    [question.id]: {
                      questionId: question.id,
                      content: event.target.value,
                      optionIds: [],
                    },
                  }))
                }
                placeholder="Tulis jawaban kamu di sini..."
                className="min-h-44 resize-y p-4 leading-relaxed"
              />
            ) : (
              question.options.map((option, index) => {
                const selected = answer?.optionIds.includes(option.id) ?? false;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-md border p-4 transition-colors",
                      selected
                        ? "border-foreground bg-muted/60"
                        : "hover:bg-muted/50",
                    )}
                  >
                    {question.type === "MULTIPLE_CHOICE" ? (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() =>
                          updateOptions(question.id, option.id, true)
                        }
                      />
                    ) : (
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() =>
                          updateOptions(question.id, option.id, false)
                        }
                        className="accent-foreground size-4"
                      />
                    )}
                    <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="leading-relaxed">
                      {jsonText(option.content)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <footer className="mt-9 flex items-center justify-between border-t pt-5">
            <Button
              variant="outline"
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
              disabled={current === 0}
            >
              <ChevronLeftIcon /> Sebelumnya
            </Button>
            {current < assessment.questions.length - 1 ? (
              <Button onClick={() => setCurrent((value) => value + 1)}>
                Berikutnya <ChevronRightIcon />
              </Button>
            ) : (
              <Button
                onClick={submitAssessment}
                disabled={submit.isPending || save.isPending}
              >
                {submit.isPending || save.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SendIcon />
                )}{" "}
                Kirim jawaban
              </Button>
            )}
          </footer>
        </section>
        <aside className="bg-card ring-foreground/10 h-fit rounded-lg p-5 ring-1 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Navigasi soal</p>
            <span className="text-muted-foreground text-xs">
              {answeredCount}/{assessment.questions.length}
            </span>
          </div>
          <Progress
            value={(answeredCount / assessment.questions.length) * 100}
            className="mt-3"
          />
          <div className="mt-5 grid grid-cols-5 gap-2">
            {assessment.questions.map((entry, index) => {
              const entryAnswer = answers[entry.id];
              const answered =
                entryAnswer &&
                (entryAnswer.optionIds.length || entryAnswer.content?.trim());
              return (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => setCurrent(index)}
                  className={cn(
                    "aspect-square rounded-lg border text-xs font-semibold transition-colors",
                    index === current
                      ? "bg-foreground text-background border-foreground"
                      : answered
                        ? "border-foreground/20 bg-muted text-foreground"
                        : "hover:bg-muted",
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          {answeredCount < assessment.questions.length ? (
            <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" /> Kamu masih
              dapat mengirim meski ada soal kosong.
            </div>
          ) : (
            <div className="bg-muted text-foreground mt-5 flex gap-2 rounded-md p-3 text-xs">
              <CheckCircle2Icon className="size-4" /> Semua soal sudah dijawab.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
