"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  MessageSquareTextIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterOutputs } from "~/trpc/react";

type ReviewAttempt =
  RouterOutputs["assessment"]["listAttemptsNeedingReview"]["items"][number];

const submittedAtFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(contentText).filter(Boolean);
    const isInlineContent = value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "text" in item,
    );
    return parts.join(isInlineContent ? "" : "\n");
  }
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;

  return [record.content, record.children]
    .map(contentText)
    .filter(Boolean)
    .join("\n");
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Review belum berhasil disimpan. Silakan coba lagi.";
}

function ReviewCard({
  attempt,
  organizationId,
  cohortId,
}: {
  attempt: ReviewAttempt;
  organizationId: string;
  cohortId?: string;
}) {
  const utils = api.useUtils();
  const reviewAttempt = api.assessment.reviewAttempt.useMutation();
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      attempt.answers.map((answer) => [
        answer.id,
        answer.manualScore?.toString() ?? "",
      ]),
    ),
  );
  const [feedback, setFeedback] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      attempt.answers.map((answer) => [
        answer.id,
        contentText(answer.feedback),
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const answers = attempt.answers.map((answer) => ({
      answerId: answer.id,
      score: Number(scores[answer.id]),
      feedback: feedback[answer.id]?.trim() ?? "",
    }));
    const invalidAnswer = answers.find((answer, index) => {
      const scoreText = scores[answer.answerId]?.trim();
      const maxScore = attempt.answers[index]?.question.points ?? 0;
      return (
        !scoreText ||
        !Number.isInteger(answer.score) ||
        answer.score < 0 ||
        answer.score > maxScore
      );
    });

    if (invalidAnswer) {
      setError(
        "Isi skor setiap jawaban dengan bilangan bulat dalam batas poin.",
      );
      return;
    }

    setError(null);
    try {
      await reviewAttempt.mutateAsync({ attemptId: attempt.id, answers });
      await utils.assessment.listAttemptsNeedingReview.invalidate({
        organizationId,
        cohortId,
      });
      toast.success(`Review ${attempt.user.name} berhasil disimpan.`);
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">
              {attempt.assessment.title}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <UserRoundIcon className="size-3.5" />
                {attempt.user.name} · {attempt.user.email}
              </span>
              <span>Attempt {attempt.attemptNumber}</span>
              {attempt.cohort ? <span>{attempt.cohort.name}</span> : null}
            </CardDescription>
          </div>
          {attempt.submittedAt ? (
            <time
              dateTime={attempt.submittedAt.toISOString()}
              className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs"
            >
              <Clock3Icon className="size-3.5" />
              {submittedAtFormatter.format(attempt.submittedAt)}
            </time>
          ) : null}
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-6">
          {attempt.answers.map((answer, index) => {
            const prompt = contentText(answer.question.prompt);
            const response = contentText(answer.content);
            const scoreId = `score-${answer.id}`;
            const feedbackId = `feedback-${answer.id}`;

            return (
              <section
                key={answer.id}
                aria-labelledby={`question-${answer.id}`}
                className="space-y-4 border-b pb-6 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id={`question-${answer.id}`}
                      className="font-heading text-base leading-relaxed font-medium whitespace-pre-wrap"
                    >
                      {prompt || "Pertanyaan tertulis"}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Maksimum {answer.question.points} poin
                    </p>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-lg border px-4 py-3">
                  <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Jawaban siswa
                  </p>
                  <p className="text-foreground text-sm leading-6 whitespace-pre-wrap">
                    {response || "Tidak ada jawaban tertulis."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={scoreId}>Skor</Label>
                    <div className="relative">
                      <Input
                        id={scoreId}
                        name={scoreId}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={answer.question.points}
                        step={1}
                        required
                        aria-invalid={Boolean(error) && !scores[answer.id]}
                        className="h-10 pr-12 tabular-nums"
                        value={scores[answer.id] ?? ""}
                        onChange={(event) =>
                          setScores((current) => ({
                            ...current,
                            [answer.id]: event.target.value,
                          }))
                        }
                      />
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
                        / {answer.question.points}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={feedbackId}>
                      Feedback{" "}
                      <span className="text-muted-foreground">opsional</span>
                    </Label>
                    <Textarea
                      id={feedbackId}
                      name={feedbackId}
                      rows={2}
                      placeholder="Berikan arahan yang membantu siswa berkembang..."
                      className="min-h-20 resize-y"
                      value={feedback[answer.id] ?? ""}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          [answer.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </CardContent>

        <CardFooter className="mt-6 flex flex-wrap justify-between gap-3">
          <p className="text-muted-foreground text-xs" role="alert">
            {error ?? "Semua jawaban tertulis harus diberi skor."}
          </p>
          <Button type="submit" disabled={reviewAttempt.isPending}>
            {reviewAttempt.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <CheckCircle2Icon data-icon="inline-start" />
            )}
            Selesaikan review
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ReviewQueue({
  organizationId,
  cohortId,
  cohortName,
}: {
  organizationId: string;
  cohortId?: string;
  cohortName?: string;
}) {
  const queue = api.assessment.listAttemptsNeedingReview.useInfiniteQuery(
    { organizationId, cohortId, includeTotal: true },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const attempts = queue.data?.pages.flatMap((page) => page.items) ?? [];
  const answerCount = attempts.reduce(
    (total, attempt) => total + attempt.answers.length,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <ClipboardCheckIcon className="size-4" />
            Penilaian manual
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {cohortName ? `Review ${cohortName}` : "Antrean review"}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Nilai jawaban tertulis secara menyeluruh. Attempt akan langsung
            selesai setelah seluruh jawaban diberi skor.
          </p>
        </div>
        <div className="bg-card grid grid-cols-2 divide-x rounded-lg border shadow-sm">
          <div className="px-4 py-3">
            <span className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
              Attempt
            </span>
            <strong className="mt-1 block text-xl font-semibold tabular-nums">
              {attempts.length}
            </strong>
          </div>
          <div className="px-4 py-3">
            <span className="text-muted-foreground block text-[11px] font-semibold tracking-wide uppercase">
              Jawaban
            </span>
            <strong className="mt-1 block text-xl font-semibold tabular-nums">
              {answerCount}
            </strong>
          </div>
        </div>
      </header>

      {queue.isError ? (
        <Card className="items-center rounded-lg py-12 text-center">
          <CardContent className="max-w-md">
            <MessageSquareTextIcon className="text-muted-foreground mx-auto size-8" />
            <h2 className="font-heading mt-4 text-lg font-medium">
              Antrean belum dapat dimuat
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {errorMessage(queue.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => void queue.refetch()}
            >
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : attempts.length === 0 ? (
        <Card className="items-center rounded-lg py-14 text-center">
          <CardContent className="max-w-md">
            <span className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
              <UserRoundIcon className="text-muted-foreground size-5" />
            </span>
            <h2 className="font-heading mt-4 text-xl font-medium">
              Semua review sudah selesai
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Attempt baru dengan jawaban tertulis akan otomatis muncul di
              antrean ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {attempts.map((attempt) => (
            <ReviewCard
              key={attempt.id}
              attempt={attempt}
              organizationId={organizationId}
              cohortId={cohortId}
            />
          ))}
          {queue.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={queue.isFetchingNextPage}
              onClick={() => void queue.fetchNextPage()}
            >
              {queue.isFetchingNextPage ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Muat review berikutnya
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
