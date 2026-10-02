"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button, buttonVariants } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { assessmentTerminalResult } from "~/lib/learner/assessment-state";
import {
  isQuestionAnswered,
  nextUnansweredQuestion,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { RichContent } from "../practice/rich-content";
import {
  AssessmentOption,
  AssessmentQuestion,
  QuestionNavigator,
  StudyCard,
} from "./assessment-ui";
import { AssessmentResultReview } from "./assessment-result-review";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];
type Answer = {
  questionId: string;
  content?: string;
  optionIds: string[];
};

function formatRemaining(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AssessmentAttempt({
  courseId,
  courseItemId,
  assessment: initialAssessment,
  attempt: initialAttempt,
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
  const attemptQuery = api.assessment.getMyAttempt.useQuery(
    { attemptId: initialAttempt.id },
    {
      initialData: initialAttempt,
      refetchInterval: (query) =>
        query.state.data?.status === "IN_REVIEW" ||
        query.state.data?.status === "SUBMITTED"
          ? 15_000
          : false,
    },
  );
  const attempt = attemptQuery.data;
  // Poll only while the result can still change: pending review, or a graded quick assessment
  // whose answers are revealed once its event closes.
  const assessmentQuery = api.assessment.getForCourseItem.useQuery(
    { courseItemId, attemptId: attempt.id },
    {
      initialData: initialAssessment,
      refetchInterval: (query) =>
        attempt.status === "IN_REVIEW" ||
        attempt.status === "SUBMITTED" ||
        (attempt.status === "GRADED" &&
          query.state.data?.event?.type === "QUICK_ASSESSMENT" &&
          query.state.data.event.status === "OPEN")
          ? 15_000
          : false,
    },
  );
  const assessment = assessmentQuery.data;
  // Grading changes what getForCourseItem reveals; refresh it once when a review completes
  // instead of polling it after the attempt is graded.
  const previousStatus = useRef(attempt.status);
  useEffect(() => {
    const wasPendingReview =
      previousStatus.current === "IN_REVIEW" ||
      previousStatus.current === "SUBMITTED";
    previousStatus.current = attempt.status;
    if (wasPendingReview && attempt.status === "GRADED") {
      void utils.assessment.getForCourseItem.invalidate({
        courseItemId,
        attemptId: attempt.id,
      });
    }
  }, [attempt.id, attempt.status, courseItemId, utils]);

  const [current, setCurrent] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
        Math.floor(
          ((assessment.attemptDeadline?.getTime() ??
            attempt.startedAt.getTime() +
              assessment.timeLimitMinutes * 60_000) -
            serverTime.getTime()) /
            1000,
        ),
      )
    : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds);
  const [dirty, setDirty] = useState(false);
  const save = api.assessment.saveAnswers.useMutation();
  const autosave = api.assessment.saveAnswers.useMutation();
  const submit = api.assessment.submitAttempt.useMutation();
  // Question ids edited since their last successful save; autosave sends only these.
  const dirtyQuestionIds = useRef(new Set<string>());
  const answersRef = useRef(answers);
  const autosaveRun = useRef<Promise<void> | null>(null);
  // Set for the whole submit flow so repeated clicks and pending autosave timers can't race it.
  const submitting = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const question = assessment.questions[current];
  const statuses: QuestionStatus[] = assessment.questions.map((entry) =>
    isQuestionAnswered(answers[entry.id]) ? "answered" : "unanswered",
  );
  const answeredCount = statuses.filter(
    (status) => status === "answered",
  ).length;
  const total = assessment.questions.length;
  const nextUnanswered = nextUnansweredQuestion(statuses, current);
  const eventEndedIncomplete = Boolean(
    assessment.event &&
    assessment.event.status !== "OPEN" &&
    attempt.status === "IN_PROGRESS",
  );
  const isFinished = attempt.status !== "IN_PROGRESS" || eventEndedIncomplete;
  const expired = secondsLeft === 0;
  const busy = submit.isPending || save.isPending;

  const editAnswer = (
    questionId: string,
    update: (current: Record<string, Answer>) => Answer,
  ) => {
    dirtyQuestionIds.current.add(questionId);
    setDirty(true);
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: update(currentAnswers),
    }));
  };

  // Answers still unsaved, plus a callback that clears those that were not edited again meanwhile.
  const takeDirtyAnswers = () => {
    const pending = [...dirtyQuestionIds.current].flatMap((questionId) => {
      const answer = answersRef.current[questionId];
      return answer ? [answer] : [];
    });
    return {
      pending,
      markSaved: () => {
        for (const answer of pending) {
          if (answersRef.current[answer.questionId] === answer) {
            dirtyQuestionIds.current.delete(answer.questionId);
          }
        }
        setDirty(dirtyQuestionIds.current.size > 0);
      },
    };
  };

  const submitAssessment = async () => {
    if (submitting.current || submit.isPending || save.isPending || isFinished)
      return;
    submitting.current = true;
    try {
      // Let a running autosave finish so it cannot overwrite the final save with older content.
      await autosaveRun.current;
      // Everything else is already persisted by autosave (saveAnswers only touches the answers
      // it receives).
      const { pending: payload, markSaved } = takeDirtyAnswers();
      let savedLate = false;
      if (payload.length) {
        try {
          for (let index = 0; index < payload.length; index += 200) {
            await save.mutateAsync({
              attemptId: attempt.id,
              answers: payload.slice(index, index + 200),
            });
          }
          markSaved();
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
        utils.assessment.getForCourseItem.invalidate({
          courseItemId,
          attemptId: attempt.id,
        }),
        utils.assessment.listMyAttemptHistory.invalidate(),
        utils.assessmentEvent.invalidate(),
        utils.gamification.getMySummary.invalidate(),
        utils.learning.invalidate(),
      ]);
      toast.success(
        savedLate || result.expired
          ? "Waktu habis. Jawaban yang tersimpan telah dikirim untuk dinilai."
          : result.status === "IN_REVIEW"
            ? "Jawaban dikirim untuk diperiksa."
            : "Tugas berhasil dinilai.",
      );
      // Like the app, land on the event (score and leaderboard) or the item.
      router.replace(
        assessment.event
          ? `/learn/assessments/${assessment.event.id}`
          : `/learn/${courseId}/items/${courseItemId}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Jawaban gagal dikirim.",
      );
    } finally {
      submitting.current = false;
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

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const flushAutosave = useEffectEvent(() => {
    // One save at a time so an older payload can never land after a newer one.
    if (autosaveRun.current || submitting.current) return;
    autosaveRun.current = (async () => {
      try {
        for (;;) {
          const { pending, markSaved } = takeDirtyAnswers();
          if (!pending.length) break;
          for (let index = 0; index < pending.length; index += 200) {
            await autosave.mutateAsync({
              attemptId: attempt.id,
              answers: pending.slice(index, index + 200),
            });
          }
          markSaved();
        }
      } catch {
        // Submission still performs a final save and reports any error.
      } finally {
        autosaveRun.current = null;
      }
    })();
  });

  useEffect(() => {
    if (isFinished || expired || !dirtyQuestionIds.current.size) return;
    const timer = window.setTimeout(() => flushAutosave(), 800);
    return () => window.clearTimeout(timer);
  }, [answers, isFinished, expired]);

  // A new question starts at its top, like the app's scroll reset.
  const firstQuestion = useRef(true);
  useEffect(() => {
    if (firstQuestion.current) {
      firstQuestion.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: "start" });
  }, [current]);

  const chooseOption = (optionId: string) => {
    if (!question || busy || expired || isFinished) return;
    editAnswer(question.id, (currentAnswers) => {
      const existing = currentAnswers[question.id]?.optionIds ?? [];
      const optionIds =
        question.type === "SINGLE_CHOICE"
          ? [optionId]
          : existing.includes(optionId)
            ? existing.filter((id) => id !== optionId)
            : [...existing, optionId];
      return { questionId: question.id, optionIds };
    });
  };

  const leaveHref = assessment.event
    ? `/learn/assessments/${assessment.event.id}`
    : `/learn/${courseId}/items/${courseItemId}`;

  if (isFinished) {
    const result = assessmentTerminalResult(attempt);
    const inReview = result?.status !== "GRADED";
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link
          href={leaveHref}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-muted-foreground -ml-2 self-start",
          )}
        >
          <ArrowLeftIcon />
          {assessment.event ? "Kembali ke event" : "Kembali ke tugas"}
        </Link>
        <StudyCard>
          <span className="bg-primary/10 text-primary flex size-16 items-center justify-center self-center rounded-full text-2xl font-black">
            ✓
          </span>
          <h1 className="text-center text-2xl font-black">
            {eventEndedIncomplete
              ? "Attempt tidak selesai"
              : inReview
                ? "Menunggu review"
                : "Tugas sudah direview"}
          </h1>
          {eventEndedIncomplete ? (
            <p className="text-muted-foreground text-center text-sm leading-5">
              Event telah ditutup sebelum jawaban kamu dikirim.
            </p>
          ) : result && !inReview ? (
            <p className="text-muted-foreground text-center text-lg">
              Score: {result.score}/{result.maxScore}
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-sm leading-5">
              Hasil lengkap kamu akan muncul di sini setelah pengajar selesai
              mereviewnya.
            </p>
          )}
        </StudyCard>

        <AssessmentResultReview assessment={assessment} attempt={attempt} />

        {assessment.event ? (
          <Link
            href={`/learn/assessments/${assessment.event.id}`}
            className={buttonVariants({ size: "lg" })}
          >
            Lihat skor & leaderboard
          </Link>
        ) : null}
      </div>
    );
  }

  if (!question) {
    return (
      <p className="text-muted-foreground py-16 text-center">
        Tugas ini belum memiliki soal.
      </p>
    );
  }
  const answer = answers[question.id];
  const isLast = current === total - 1;

  return (
    <div
      ref={top}
      className="mx-auto flex w-full max-w-2xl scroll-mt-20 flex-col gap-4"
    >
      <header className="flex items-center gap-3">
        <Link
          href={leaveHref}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Keluar dari tugas"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{assessment.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {assessment.context.label} · Percobaan #{attempt.attemptNumber}
            {attempt.cohort ? ` · ${attempt.cohort.name}` : ""}
          </p>
        </div>
      </header>

      {secondsLeft !== null ? (
        <p
          aria-live={expired ? "polite" : "off"}
          className={cn(
            "text-sm font-bold tabular-nums",
            expired || secondsLeft < 60 ? "text-destructive" : "text-primary",
          )}
        >
          {expired
            ? "Waktu habis · kirim jawaban yang tersimpan"
            : `${formatRemaining(secondsLeft)} tersisa`}
        </p>
      ) : null}

      <AssessmentQuestion
        current={current}
        total={total}
        answered={answeredCount}
        onOpen={() => setNavigatorOpen(true)}
        disabled={busy}
      >
        <RichContent content={question.prompt} />
      </AssessmentQuestion>

      <p className="text-sm font-bold">
        {question.type === "WRITTEN"
          ? "Tulis jawaban kamu"
          : question.type === "MULTIPLE_CHOICE"
            ? "Pilih semua jawaban yang benar"
            : "Pilih satu jawaban"}
      </p>
      {question.type === "WRITTEN" ? (
        <StudyCard>
          <Textarea
            aria-label={`Jawaban soal ${current + 1}`}
            value={answer?.content ?? ""}
            disabled={busy || expired}
            onChange={(event) => {
              const content = event.target.value;
              editAnswer(question.id, () => ({
                questionId: question.id,
                content,
                optionIds: [],
              }));
            }}
            placeholder="Tulis jawaban kamu…"
            className="min-h-32 resize-y border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
          />
        </StudyCard>
      ) : (
        <div
          role={question.type === "SINGLE_CHOICE" ? "radiogroup" : "group"}
          className="flex flex-col gap-3"
        >
          {question.options.map((option, optionIndex) => (
            <AssessmentOption
              key={option.id}
              index={optionIndex}
              selected={answer?.optionIds.includes(option.id) ?? false}
              multiple={question.type === "MULTIPLE_CHOICE"}
              disabled={busy || expired}
              onPress={() => chooseOption(option.id)}
            >
              <RichContent content={option.content} />
            </AssessmentOption>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs leading-5">
        Kamu bisa mengubah jawaban sampai mengirimnya. Jawaban tersimpan
        otomatis selama kamu mengerjakan.
        {secondsLeft !== null ? " Timer tetap berjalan meski kamu keluar." : ""}
      </p>

      <div className="border-border flex flex-col gap-3 border-t pt-4">
        <div className="flex gap-3">
          {current > 0 ? (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => setCurrent(current - 1)}
            >
              Sebelumnya
            </Button>
          ) : null}
          {!isLast || (nextUnanswered >= 0 && nextUnanswered !== current) ? (
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => setCurrent(isLast ? nextUnanswered : current + 1)}
            >
              {isLast ? "Soal belum dijawab berikutnya →" : "Berikutnya →"}
            </Button>
          ) : null}
        </div>
        {!expired ? (
          <p
            aria-live="polite"
            className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs"
          >
            {dirty || autosave.isPending ? (
              "Menyimpan jawaban…"
            ) : (
              <>
                <CheckIcon className="size-3" /> Jawaban tersimpan
              </>
            )}
          </p>
        ) : null}
        {expired || isLast || answeredCount === total ? (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {busy
              ? "Menyimpan…"
              : answeredCount === total
                ? "Kirim tugas"
                : `Kirim · ${answeredCount}/${total} dijawab`}
          </Button>
        ) : null}
      </div>

      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title={assessment.title}
        current={current}
        statuses={statuses}
        onSelect={(index) => {
          if (busy) return false;
          setCurrent(index);
          return true;
        }}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim tugas?</AlertDialogTitle>
            <AlertDialogDescription>
              {expired
                ? "Waktu habis. Hanya jawaban yang sudah tersimpan di server yang dapat dinilai."
                : `${answeredCount} dari ${total} soal dijawab. Jawaban yang dikirim tidak dapat diubah.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitAssessment()}>
              Kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
