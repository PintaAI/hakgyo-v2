"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  LoaderCircleIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AssetUrlLoaderContext } from "~/components/asset-download-url";
import { RichContent } from "~/components/learner/practice/rich-content";
import {
  AssessmentOption,
  AssessmentQuestion,
  QuestionNavigator,
  StudyCard,
} from "~/components/learner/assessment/assessment-ui";
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
import { headlineText, Kicker, leadText } from "~/components/brand/typography";
import { Button } from "~/components/ui/button";
import { cardSurface } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type QuestionStatus } from "~/lib/learner/question-progress";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Quiz = RouterOutputs["publicQuiz"]["get"];
type Attempt = NonNullable<RouterOutputs["publicQuiz"]["getAttempt"]>;
type Answers = Record<string, string[]>;

const storageKey = (quizId: string) => `hakgyo:public-quiz:${quizId}`;

type Stored = { token: string; answers?: Answers };

const storageListeners = new Set<() => void>();

function subscribeStorage(listener: () => void) {
  storageListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storageListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(quizId: string) {
  try {
    return localStorage.getItem(storageKey(quizId));
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): Stored | null {
  try {
    const value = JSON.parse(raw ?? "null") as Stored | null;
    return value && typeof value.token === "string" ? value : null;
  } catch {
    return null;
  }
}

function writeStored(quizId: string, value: Stored) {
  try {
    localStorage.setItem(storageKey(quizId), JSON.stringify(value));
  } catch {
    // Private browsing may refuse storage; the quiz still works for this visit.
  }
  storageListeners.forEach((listener) => listener());
}

/** This browser's attempt token and draft answers; undefined until hydrated. */
function useStoredAttempt(quizId: string) {
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => readRaw(quizId),
    () => undefined,
  );
  return useMemo(
    () => (raw === undefined ? undefined : parseStored(raw)),
    [raw],
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes} mnt ${rest} dtk` : `${rest} dtk`;
}

function formatRemaining(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Signs question media through the quiz, since visitors have no session. */
function usePublicAssetLoader(ref: QuizRef) {
  const assetUrls = api.publicQuiz.assetUrls.useMutation();
  const { mutateAsync } = assetUrls;
  const [cache] = useState(() => new Map<string, Promise<string>>());
  return useCallback(
    (assetId: string) => {
      let url = cache.get(assetId);
      if (!url) {
        url = mutateAsync({ ...ref, assetIds: [assetId] }).then((urls) => {
          const signed = urls[assetId]?.downloadUrl;
          if (!signed) throw new Error("Asset is not available");
          return signed;
        });
        url.catch(() => cache.delete(assetId));
        cache.set(assetId, url);
      }
      return url;
    },
    [cache, mutateAsync, ref],
  );
}

export function PublicQuizPlayer({
  quiz: initialQuiz,
  shareUrl,
}: {
  quiz: Quiz;
  shareUrl: string;
}) {
  const ref = useMemo(
    () => ({
      organizationSlug: initialQuiz.organization.slug,
      slug: initialQuiz.slug,
    }),
    [initialQuiz.organization.slug, initialQuiz.slug],
  );
  const quizQuery = api.publicQuiz.get.useQuery(ref, {
    initialData: initialQuiz,
  });
  const quiz = quizQuery.data;
  const loadAsset = usePublicAssetLoader(ref);

  // The token lives only in this browser, which is what limits a visitor to one attempt.
  const stored = useStoredAttempt(quiz.id);
  const token = stored?.token;
  const attemptQuery = api.publicQuiz.getAttempt.useQuery(
    { ...ref, token: token ?? "" },
    { enabled: Boolean(token), staleTime: Infinity, retry: 1 },
  );
  const utils = api.useUtils();

  let body: React.ReactNode;
  if (stored === undefined || (token && attemptQuery.isPending)) {
    body = (
      <div className="flex justify-center py-24">
        <LoaderCircleIcon className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  } else if (token && attemptQuery.data && !attemptQuery.data.submitted) {
    body = (
      <QuizRunner
        quiz={quiz}
        quizRef={ref}
        token={token}
        attempt={attemptQuery.data}
        initialAnswers={stored?.answers ?? {}}
        onAnswersChange={(answers) => writeStored(quiz.id, { token, answers })}
        onSubmitted={(attempt) => {
          writeStored(quiz.id, { token });
          utils.publicQuiz.getAttempt.setData({ ...ref, token }, attempt);
          void utils.publicQuiz.leaderboard.invalidate();
          void utils.publicQuiz.get.invalidate();
        }}
      />
    );
  } else if (token && attemptQuery.data?.submitted) {
    body = (
      <QuizResult
        quiz={quiz}
        quizRef={ref}
        token={token}
        attempt={attemptQuery.data}
        shareUrl={shareUrl}
      />
    );
  } else {
    body = (
      <QuizIntro
        quiz={quiz}
        quizRef={ref}
        onStarted={(started) => {
          writeStored(quiz.id, { token: started.token, answers: {} });
          utils.publicQuiz.getAttempt.setData(
            { ...ref, token: started.token },
            started.attempt,
          );
        }}
      />
    );
  }

  const answering = Boolean(
    token && attemptQuery.data && !attemptQuery.data.submitted,
  );
  // The floating call to action shows on the result and on a closed quiz.
  const ctaShown =
    quiz.organization.landingPublished &&
    !answering &&
    (Boolean(attemptQuery.data?.submitted) || !quiz.isOpen);

  return (
    <AssetUrlLoaderContext value={loadAsset}>
      <main className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative flex min-h-dvh flex-col overflow-x-clip">
        {answering ? null : (
          <div
            className="bg-primary/10 animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full blur-3xl"
            aria-hidden="true"
          />
        )}
        <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col px-5 sm:px-6">
          {/* While answering, the screen belongs to the question. */}
          {answering ? null : (
            <header className="flex h-16 items-center gap-2.5 sm:h-20">
              {quiz.organization.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={quiz.organization.logoUrl}
                  alt=""
                  className="size-8 rounded-lg object-cover"
                />
              ) : (
                <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
                  {quiz.organization.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <p className="min-w-0 truncate text-sm font-medium">
                {quiz.organization.name}
              </p>
            </header>
          )}
          <div className="flex flex-1 flex-col gap-8">{body}</div>
          {answering ? null : (
            <footer
              className={cn(
                "text-muted-foreground py-8 text-center text-xs",
                // Room for the floating call to action at the end of the page.
                ctaShown && "pb-28",
              )}
            >
              Dibuat dengan{" "}
              <Link
                href="/"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Hakgyo
              </Link>
            </footer>
          )}
        </div>
      </main>
    </AssetUrlLoaderContext>
  );
}

type QuizRef = { organizationSlug: string; slug: string };

/** A card from `sm` up; on phones it dissolves into the page like the auth screens. */
const surface = cn(
  cardSurface,
  "p-6 sm:p-8 max-sm:rounded-none max-sm:border-0 max-sm:border-t max-sm:bg-transparent max-sm:px-0 max-sm:pt-8 max-sm:pb-0 max-sm:shadow-none",
);

const fieldClass =
  "focus-visible:ring-ring/15 h-11 rounded-xl px-4 text-base transition-colors sm:h-12 md:text-sm";

/** Pins its children to the bottom of the screen on phones, above the safe area. */
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/95 border-border sticky bottom-0 z-10 -mx-5 mt-auto border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}

function QuizIntro({
  quiz,
  quizRef,
  onStarted,
}: {
  quiz: Quiz;
  quizRef: QuizRef;
  onStarted: (started: RouterOutputs["publicQuiz"]["start"]) => void;
}) {
  const [name, setName] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const [contact, setContact] = useState("");
  const start = api.publicQuiz.start.useMutation({
    onSuccess: onStarted,
    onError: (error) => toast.error(error.message || "Quiz gagal dimulai."),
  });
  const facts = [
    `${quiz.questionCount} soal`,
    quiz.timeLimitMinutes
      ? `${quiz.timeLimitMinutes} menit`
      : "Tanpa batas waktu",
    `${quiz.participants} peserta`,
  ];
  const steps = [
    "Tulis nama untuk leaderboard",
    quiz.timeLimitMinutes
      ? `Jawab ${quiz.questionCount} soal dalam ${quiz.timeLimitMinutes} menit`
      : `Jawab ${quiz.questionCount} soal pilihan ganda`,
    "Lihat skor, peringkat, dan pembahasan",
  ];

  function begin() {
    if (start.isPending) return;
    const trimmedContact = contact.trim();
    if (wantsUpdates && !trimmedContact) {
      toast.error("Isi email atau nomor WhatsApp, atau matikan pilihan ini.");
      return;
    }
    start.mutate({
      ...quizRef,
      displayName: name.trim() || null,
      contact: wantsUpdates ? trimmedContact : null,
      contactConsent: wantsUpdates,
    });
  }

  return (
    <>
      <section className="flex flex-col pt-2 sm:pt-6">
        <Kicker>Quiz online</Kicker>
        <h1 className={cn(headlineText, "mt-4 text-balance")}>{quiz.title}</h1>
        {quiz.description ? (
          <p className={cn(leadText, "mt-4 whitespace-pre-wrap")}>
            {quiz.description}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-5 font-mono text-[11px] tracking-[0.12em] uppercase">
          {facts.join("  ·  ")}
        </p>
      </section>

      {quiz.isOpen ? (
        <form
          className="flex flex-1 flex-col gap-7"
          onSubmit={(event) => {
            event.preventDefault();
            begin();
          }}
        >
          <section aria-labelledby="public-quiz-steps">
            <Kicker id="public-quiz-steps">Cara main</Kicker>
            <ol className="divide-border border-border mt-3 divide-y border-y">
              {steps.map((step, index) => (
                <li
                  key={step}
                  className="flex items-baseline gap-4 py-3 text-sm"
                >
                  <span className="text-primary font-mono text-xs tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-2">
            <Label htmlFor="public-quiz-name" className="text-foreground">
              Nama kamu
            </Label>
            <Input
              id="public-quiz-name"
              value={name}
              maxLength={40}
              autoComplete="nickname"
              enterKeyHint="go"
              placeholder="Contoh: Dewi"
              className={fieldClass}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Tampil di leaderboard. Kosongkan untuk tampil sebagai Anonim.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-foreground items-start gap-3 font-normal">
              <Checkbox
                className="mt-0.5"
                checked={wantsUpdates}
                onCheckedChange={setWantsUpdates}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  Kabari aku info kelas dari {quiz.organization.name}
                </span>
                <span className="text-muted-foreground text-xs leading-5">
                  Opsional. Kontakmu tidak tampil di leaderboard.
                </span>
              </span>
            </Label>
            {wantsUpdates ? (
              <Input
                aria-label="Email atau nomor WhatsApp"
                value={contact}
                maxLength={100}
                autoComplete="email"
                inputMode="email"
                placeholder="Email atau nomor WhatsApp"
                className={fieldClass}
                autoFocus
                onChange={(event) => setContact(event.target.value)}
              />
            ) : null}
          </div>

          <BottomBar>
            <Button
              size="lg"
              type="submit"
              className="h-11 w-full text-base sm:h-12"
              disabled={start.isPending}
            >
              {start.isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              {start.isPending ? "Memulai…" : "Mulai quiz"}
              {start.isPending ? null : (
                <ArrowRightIcon data-icon="inline-end" />
              )}
            </Button>
            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              Tanpa daftar akun · Sekali main per perangkat
            </p>
          </BottomBar>
        </form>
      ) : (
        <>
          <p className="border-border border-y py-4 text-sm">
            Quiz ini sudah ditutup. Lihat hasil peserta di leaderboard.
          </p>
          <Leaderboard quizRef={quizRef} />
          <OrganizationCta quiz={quiz} />
        </>
      )}
    </>
  );
}

// Long enough to see the selection land before the next question slides in.
const AUTO_ADVANCE_MS = 350;

function QuizRunner({
  quiz,
  quizRef,
  token,
  attempt,
  initialAnswers,
  onAnswersChange,
  onSubmitted,
}: {
  quiz: Quiz;
  quizRef: QuizRef;
  token: string;
  attempt: Attempt;
  initialAnswers: Answers;
  onAnswersChange: (answers: Answers) => void;
  onSubmitted: (attempt: Attempt) => void;
}) {
  const questions = attempt.questions;
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [current, setCurrent] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = api.publicQuiz.submit.useMutation({
    onSuccess: onSubmitted,
    onError: (error) =>
      toast.error(error.message || "Jawaban gagal dikirim. Coba lagi."),
  });

  const deadline = attempt.deadline?.getTime() ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const secondsLeft =
    deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const expired = secondsLeft === 0;

  const send = useCallback(() => {
    if (submit.isPending || submit.isSuccess) return;
    submit.mutate({
      ...quizRef,
      token,
      answers: Object.entries(answers).map(([questionId, optionIds]) => ({
        questionId,
        optionIds,
      })),
    });
  }, [answers, quizRef, submit, token]);

  // Time is up: send whatever was answered instead of losing the attempt.
  useEffect(() => {
    if (expired && !submit.isPending && !submit.isSuccess && !submit.isError)
      send();
  }, [expired, send, submit.isError, submit.isPending, submit.isSuccess]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const goTo = useCallback((index: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setCurrent(index);
    window.scrollTo({ top: 0 });
  }, []);

  const statuses: QuestionStatus[] = questions.map((question) =>
    answers[question.id]?.length ? "answered" : "unanswered",
  );
  const answeredCount = statuses.filter(
    (status) => status === "answered",
  ).length;
  const question = questions[current];
  if (!question) return null;
  const selected = answers[question.id] ?? [];
  const isLast = current === questions.length - 1;
  const allAnswered = answeredCount === questions.length;
  const busy = submit.isPending;
  const multiple = question.type === "MULTIPLE_CHOICE";

  function choose(optionId: string) {
    if (!question || busy || expired) return;
    const next = multiple
      ? selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId]
      : [optionId];
    const updated = { ...answers, [question.id]: next };
    setAnswers(updated);
    onAnswersChange(updated);
    // One tap answers a single-choice question; move on like a quiz game.
    if (!multiple && !isLast) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const target = current + 1;
      advanceTimer.current = setTimeout(() => goTo(target), AUTO_ADVANCE_MS);
    }
  }

  const submitting = isLast || allAnswered || expired;
  const primaryLabel = submitting
    ? busy
      ? "Mengirim…"
      : allAnswered
        ? "Kirim jawaban"
        : `Kirim · ${answeredCount}/${questions.length} dijawab`
    : selected.length
      ? "Lanjut"
      : "Lewati";

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background/95 border-border sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setNavigatorOpen(true)}
            aria-label={`Soal ${current + 1} dari ${questions.length}. Buka daftar soal`}
            className="hover:bg-muted -ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
          >
            Soal {current + 1}
            <span className="text-muted-foreground">/{questions.length}</span>
            <ChevronDownIcon className="text-muted-foreground size-4" />
          </button>
          {secondsLeft !== null ? (
            <span
              aria-live={expired ? "polite" : "off"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs tabular-nums",
                secondsLeft < 60
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted",
              )}
            >
              <ClockIcon className="size-3.5" />
              {expired ? "Waktu habis" : formatRemaining(secondsLeft)}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
              {answeredCount} dijawab
            </span>
          )}
        </div>
        <div className="flex gap-1" aria-hidden>
          {statuses.map((status, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index === current
                  ? "bg-primary"
                  : status === "answered"
                    ? "bg-primary/40"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <div key={question.id} className="flex flex-col gap-4 py-5">
        <div className="[&_.bn-inline-content]:text-xl [&_.bn-inline-content]:leading-8 [&_.bn-inline-content]:font-medium [&_.bn-inline-content]:tracking-[-0.02em]">
          <RichContent content={question.prompt} />
        </div>
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
          {multiple ? "Pilih semua yang benar" : "Pilih satu jawaban"}
        </p>
        <div
          role={multiple ? "group" : "radiogroup"}
          className="flex flex-col gap-2.5"
        >
          {question.options.map((option, index) => (
            <AssessmentOption
              key={option.id}
              index={index}
              selected={selected.includes(option.id)}
              multiple={multiple}
              disabled={busy || expired}
              onPress={() => choose(option.id)}
            >
              <RichContent content={option.content} />
            </AssessmentOption>
          ))}
        </div>
      </div>

      <BottomBar>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            className="size-12 shrink-0"
            aria-label="Soal sebelumnya"
            disabled={busy || current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            size="lg"
            className="h-12 flex-1 text-base"
            variant={!submitting && !selected.length ? "secondary" : "default"}
            disabled={busy}
            onClick={() => {
              if (!submitting) goTo(current + 1);
              else if (expired) send();
              else setConfirmOpen(true);
            }}
          >
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {primaryLabel}
            {!busy && !submitting ? (
              <ChevronRightIcon data-icon="inline-end" />
            ) : null}
          </Button>
        </div>
      </BottomBar>

      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title={quiz.title}
        current={current}
        statuses={statuses}
        onSelect={(index) => {
          if (busy) return false;
          goTo(index);
          return true;
        }}
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim jawaban?</AlertDialogTitle>
            <AlertDialogDescription>
              {allAnswered
                ? "Semua soal sudah dijawab. Jawaban yang dikirim tidak dapat diubah."
                : `Masih ada ${questions.length - answeredCount} soal yang belum dijawab. Jawaban yang dikirim tidak dapat diubah.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuizResult({
  quiz,
  quizRef,
  token,
  attempt,
  shareUrl,
}: {
  quiz: Quiz;
  quizRef: QuizRef;
  token: string;
  attempt: Attempt;
  shareUrl: string;
}) {
  const [showReview, setShowReview] = useState(false);
  const result = attempt.result;
  if (!result) return null;
  const percentage = result.maxScore
    ? Math.round((result.score / result.maxScore) * 100)
    : 0;

  // The result page previews as a score card in chats; the story image is for Stories.
  const resultUrl = `${shareUrl}/hasil/${attempt.id}`;
  const storyImageUrl = `/${quizRef.organizationSlug}/quiz/${quizRef.slug}/hasil/${attempt.id}/kartu`;

  async function share() {
    const text = `Aku dapat skor ${percentage} di "${quiz.title}". Berani kalahkan?`;
    try {
      if (navigator.share) {
        const image = await fetch(storyImageUrl)
          .then((response) => (response.ok ? response.blob() : null))
          .catch(() => null);
        const files = image
          ? [new File([image], "skor-quiz.png", { type: "image/png" })]
          : [];
        if (files.length && navigator.canShare?.({ files })) {
          await navigator.share({ files, text: `${text} ${resultUrl}` });
        } else {
          await navigator.share({ title: quiz.title, text, url: resultUrl });
        }
        return;
      }
      await navigator.clipboard.writeText(`${text} ${resultUrl}`);
      toast.success("Link hasil disalin.");
    } catch {
      // Closing the share sheet is not an error worth reporting.
    }
  }

  const stats = [
    {
      label: "Peringkat",
      value: result.rank ? String(result.rank) : "–",
      detail: `dari ${result.participants}`,
    },
    {
      label: "Benar",
      value: `${result.score}/${result.maxScore}`,
      detail: "poin",
    },
    {
      label: "Waktu",
      value: formatDuration(result.durationSeconds),
      detail: "pengerjaan",
    },
  ];

  return (
    <>
      <section
        className={cn(
          surface,
          "flex flex-col items-center gap-6 text-center max-sm:border-t-0 max-sm:pt-2",
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <ScoreRing value={percentage} />
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-medium tracking-[-0.03em]">
              {attempt.displayName}
            </p>
            <p className="text-muted-foreground text-sm">{quiz.title}</p>
          </div>
        </div>
        <dl className="divide-border border-border grid w-full grid-cols-3 divide-x border-y py-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5 px-2">
              <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                {stat.label}
              </dt>
              <dd className="mt-1 text-xl font-medium tracking-tight tabular-nums">
                {stat.value}
              </dd>
              <dd className="text-muted-foreground text-xs">{stat.detail}</dd>
            </div>
          ))}
        </dl>
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            className={actionTile}
            aria-label="Bagikan skor"
            onClick={() => void share()}
          >
            <Share2Icon />
            Bagikan
          </button>
          <button
            type="button"
            aria-expanded={showReview}
            className={actionTile}
            onClick={() => setShowReview((value) => !value)}
          >
            <BookOpenIcon />
            Pembahasan
          </button>
        </div>
      </section>

      {showReview ? <QuizReview quizRef={quizRef} token={token} /> : null}

      <Leaderboard quizRef={quizRef} token={token} inviteUrl={shareUrl} />
      <OrganizationCta quiz={quiz} />
    </>
  );
}

/** Icon-over-label action used in the result card. */
const actionTile =
  "border-border bg-background hover:bg-muted aria-expanded:bg-primary/10 aria-expanded:border-primary/40 aria-expanded:text-primary focus-visible:ring-ring/50 flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]";

function ScoreRing({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-muted"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
          className="stroke-primary transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-medium tracking-[-0.04em] tabular-nums">
          {value}
        </span>
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Skor
        </span>
      </div>
    </div>
  );
}

function QuizReview({ quizRef, token }: { quizRef: QuizRef; token: string }) {
  const review = api.publicQuiz.review.useQuery({ ...quizRef, token });
  if (review.isPending) {
    return (
      <div className="flex justify-center py-8">
        <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }
  if (!review.data) {
    return (
      <p className="text-muted-foreground text-sm">
        Pembahasan tidak dapat dimuat.
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-6">
      <Kicker>Pembahasan</Kicker>
      {review.data.map((question, index) => (
        <div key={question.id} className="flex flex-col gap-3">
          <AssessmentQuestion
            detail={`Soal ${index + 1} · ${
              question.selectedOptionIds.length
                ? question.correct
                  ? "Benar"
                  : "Salah"
                : "Tidak dijawab"
            }`}
          >
            <RichContent content={question.prompt} />
          </AssessmentQuestion>
          {question.options.map((option, optionIndex) => (
            <AssessmentOption
              key={option.id}
              index={optionIndex}
              selected={question.selectedOptionIds.includes(option.id)}
              correct={option.isCorrect}
              multiple={question.type === "MULTIPLE_CHOICE"}
            >
              <RichContent content={option.content} />
            </AssessmentOption>
          ))}
          {question.explanation ? (
            <StudyCard>
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                Penjelasan
              </p>
              <RichContent content={question.explanation} />
            </StudyCard>
          ) : null}
        </div>
      ))}
    </section>
  );
}

// How long the invite stays after copying, then how long it takes to fade out.
const INVITE_LINGER_MS = 2500;
const INVITE_FADE_MS = 300;

/**
 * A quiet nudge under the participant's own row: copy the quiz link for a friend. It says
 * thanks and steps aside once used.
 */
function InviteRow({ url }: { url: string }) {
  const [phase, setPhase] = useState<"idle" | "copied" | "fading" | "gone">(
    "idle",
  );
  useEffect(() => {
    if (phase === "copied") {
      const timer = setTimeout(() => setPhase("fading"), INVITE_LINGER_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "fading") {
      const timer = setTimeout(() => setPhase("gone"), INVITE_FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);
  if (phase === "gone") return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link tersalin", { duration: 1500 });
      setPhase("copied");
    } catch {
      toast.error("Link tidak dapat disalin.");
    }
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2 pt-2 pb-3 transition-opacity duration-300",
        phase === "fading" && "opacity-0",
      )}
    >
      <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
        {phase === "idle"
          ? "Pengen ajak temen kerjain juga? Copy dan bagikan link ini."
          : "Sip! Tinggal tempel di chat temanmu."}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        aria-label="Copy link quiz"
        onClick={() => void copy()}
      >
        {phase === "idle" ? (
          <CopyIcon data-icon="inline-start" />
        ) : (
          <CheckIcon data-icon="inline-start" />
        )}
        {phase === "idle" ? "Link" : "Tersalin"}
      </Button>
    </li>
  );
}

function Leaderboard({
  quizRef,
  token,
  inviteUrl,
}: {
  quizRef: QuizRef;
  token?: string;
  /** Shown under the participant's own row so they can invite friends. */
  inviteUrl?: string;
}) {
  const leaderboard = api.publicQuiz.leaderboard.useQuery(
    { ...quizRef, token },
    { refetchInterval: 30_000 },
  );
  const data = leaderboard.data;
  const mineListed = data?.entries.some((entry) => entry.isMine);

  return (
    <section className={cn(surface, "flex flex-col gap-3")}>
      <div className="flex items-center justify-between gap-3">
        <Kicker>Leaderboard</Kicker>
        {data ? (
          <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {data.total} peserta
          </p>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        Skor seri diurutkan dari waktu tercepat.
      </p>
      {!data ? (
        <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
      ) : data.entries.length ? (
        <ol>
          {data.entries.map((entry) => (
            <Fragment key={entry.rank}>
              <LeaderboardRow entry={entry} mine={entry.isMine} />
              {entry.isMine && inviteUrl ? <InviteRow url={inviteUrl} /> : null}
            </Fragment>
          ))}
          {data.mine && !mineListed ? (
            <>
              <li
                aria-hidden
                className="text-muted-foreground py-1 text-center"
              >
                ⋯
              </li>
              <LeaderboardRow entry={data.mine} mine />
              {inviteUrl ? <InviteRow url={inviteUrl} /> : null}
            </>
          ) : null}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">
          Belum ada peserta. Jadilah yang pertama!
        </p>
      )}
    </section>
  );
}

function LeaderboardRow({
  entry,
  mine,
}: {
  entry: {
    rank: number;
    name: string;
    score: number;
    maxScore: number;
    durationSeconds: number;
  };
  mine: boolean;
}) {
  return (
    <li
      className={cn(
        "border-border/60 flex items-center gap-3 border-b py-3 last:border-b-0",
        mine && "bg-primary/10 -mx-2 rounded-lg px-2",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs tabular-nums",
          entry.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {entry.name}
        {mine ? " (kamu)" : ""}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {entry.score}/{entry.maxScore} · {formatDuration(entry.durationSeconds)}
      </span>
    </li>
  );
}

// Scroll distance that counts as a deliberate direction change, and how close to the end
// of the page counts as "reached the bottom".
const SCROLL_INTENT_PX = 8;
const BOTTOM_SLACK_PX = 96;
// The bar rises in shortly after the result appears, once the score has been seen.
const CTA_ENTRANCE_MS = 900;

/**
 * Shows the bar on entrance, when scrolling back up and at the end of the page; hides it while
 * scrolling down so it never covers the leaderboard someone is reading.
 */
function useScrollReveal() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    let entered = false;
    const entrance = setTimeout(() => {
      entered = true;
      setVisible(true);
    }, CTA_ENTRANCE_MS);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const atBottom =
          window.innerHeight + y >=
          document.documentElement.scrollHeight - BOTTOM_SLACK_PX;
        if (atBottom) setVisible(true);
        else if (y > lastY + SCROLL_INTENT_PX) setVisible(false);
        else if (y < lastY - SCROLL_INTENT_PX && entered) setVisible(true);
        if (Math.abs(y - lastY) > SCROLL_INTENT_PX) lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(entrance);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return visible;
}

/** The invitation to the organization's landing page, floating above the page. */
function OrganizationCta({ quiz }: { quiz: Quiz }) {
  const visible = useScrollReveal();
  if (!quiz.organization.landingPublished) return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <aside
          aria-label={`Kelas dari ${quiz.organization.name}`}
          className={cn(
            "bg-foreground text-background pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-2xl p-2.5 pl-3 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)] transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            visible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0",
          )}
          inert={!visible}
        >
          {quiz.organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quiz.organization.logoUrl}
              alt=""
              className="size-10 shrink-0 rounded-xl bg-white object-cover"
            />
          ) : (
            <span className="bg-background text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
              {quiz.organization.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Mau belajar lebih banyak?
            </p>
            <p className="truncate text-xs opacity-70">
              Lihat kelas dari {quiz.organization.name}
            </p>
          </div>
          <a
            href={`/api/public-quiz/${quiz.id}/cta`}
            className="bg-background text-foreground hover:bg-background/90 flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition-colors"
          >
            Lihat
            <ArrowRightIcon className="size-4" />
          </a>
        </aside>
      </div>
    </>
  );
}
