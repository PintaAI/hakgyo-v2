"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  TrophyIcon,
  UsersIcon,
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
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  nextUnansweredQuestion,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
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
  return minutes ? `${minutes}m ${rest}d` : `${rest}d`;
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

  return (
    <AssetUrlLoaderContext value={loadAsset}>
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10">
        <header className="flex items-center gap-3">
          {quiz.organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quiz.organization.logoUrl}
              alt=""
              className="size-10 rounded-xl object-cover"
            />
          ) : (
            <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-lg font-black">
              {quiz.organization.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold">{quiz.organization.name}</p>
            <p className="text-muted-foreground text-xs">Quiz online</p>
          </div>
        </header>
        {body}
        <footer className="text-muted-foreground mt-auto pt-6 text-center text-xs">
          Dibuat dengan{" "}
          <Link
            href="/"
            className="font-semibold underline-offset-4 hover:underline"
          >
            Hakgyo
          </Link>
        </footer>
      </div>
    </AssetUrlLoaderContext>
  );
}

type QuizRef = { organizationSlug: string; slug: string };

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
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const start = api.publicQuiz.start.useMutation({
    onSuccess: onStarted,
    onError: (error) => toast.error(error.message || "Quiz gagal dimulai."),
  });

  return (
    <>
      <StudyCard className="gap-5 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight">{quiz.title}</h1>
          {quiz.description ? (
            <p className="text-muted-foreground leading-6 whitespace-pre-wrap">
              {quiz.description}
            </p>
          ) : null}
        </div>
        <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li className="flex items-center gap-1.5">
            <ListChecksIcon className="size-4" /> {quiz.questionCount} soal
          </li>
          {quiz.timeLimitMinutes ? (
            <li className="flex items-center gap-1.5">
              <ClockIcon className="size-4" /> {quiz.timeLimitMinutes} menit
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <UsersIcon className="size-4" /> {quiz.participants} peserta
          </li>
        </ul>
        {quiz.isOpen ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (start.isPending) return;
              const trimmedContact = contact.trim();
              if (trimmedContact && !consent) {
                toast.error(
                  "Centang persetujuan di bawah kontak, atau kosongkan kontak.",
                );
                return;
              }
              start.mutate({
                ...quizRef,
                displayName: name.trim() || null,
                contact: trimmedContact || null,
                contactConsent: Boolean(trimmedContact) && consent,
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-quiz-name">Nama di leaderboard</Label>
              <Input
                id="public-quiz-name"
                value={name}
                maxLength={40}
                autoComplete="nickname"
                placeholder="Kosongkan untuk tampil sebagai Anonim"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-quiz-contact">
                Email atau WhatsApp (opsional)
              </Label>
              <Input
                id="public-quiz-contact"
                value={contact}
                maxLength={100}
                autoComplete="email"
                placeholder={`Agar ${quiz.organization.name} bisa mengabari kamu`}
                onChange={(event) => setContact(event.target.value)}
              />
              {contact.trim() ? (
                <Label
                  htmlFor="public-quiz-consent"
                  className="items-start gap-2 text-xs leading-5 font-normal"
                >
                  <Checkbox
                    id="public-quiz-consent"
                    className="mt-0.5"
                    checked={consent}
                    onCheckedChange={setConsent}
                  />
                  Saya setuju dihubungi oleh {quiz.organization.name} tentang
                  kelas dan info belajar. Kontak tidak ditampilkan di
                  leaderboard.
                </Label>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Tidak ditampilkan di leaderboard. Hanya{" "}
                  {quiz.organization.name} yang bisa melihatnya.
                </p>
              )}
            </div>
            <Button size="lg" type="submit" disabled={start.isPending}>
              {start.isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              {start.isPending ? "Memulai…" : "Mulai quiz"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Tanpa daftar akun. Quiz hanya bisa dikerjakan sekali di perangkat
              ini.
            </p>
          </form>
        ) : (
          <p className="font-semibold">
            Quiz ini sudah ditutup. Lihat hasil peserta di leaderboard.
          </p>
        )}
      </StudyCard>
      {!quiz.isOpen ? (
        <>
          <Leaderboard quizRef={quizRef} />
          <OrganizationCta quiz={quiz} />
        </>
      ) : null}
    </>
  );
}

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
  const nextUnanswered = nextUnansweredQuestion(statuses, current);
  const busy = submit.isPending;

  function choose(optionId: string) {
    if (!question || busy || expired) return;
    const next =
      question.type === "MULTIPLE_CHOICE"
        ? selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
        : [optionId];
    const updated = { ...answers, [question.id]: next };
    setAnswers(updated);
    onAnswersChange(updated);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-bold">{quiz.title}</p>
        {secondsLeft !== null ? (
          <p
            aria-live={expired ? "polite" : "off"}
            className={cn(
              "shrink-0 text-sm font-bold tabular-nums",
              secondsLeft < 60 ? "text-destructive" : "text-primary",
            )}
          >
            {expired
              ? "Waktu habis"
              : `${formatRemaining(secondsLeft)} tersisa`}
          </p>
        ) : null}
      </div>

      <AssessmentQuestion
        current={current}
        total={questions.length}
        answered={answeredCount}
        onOpen={() => setNavigatorOpen(true)}
        disabled={busy}
      >
        <RichContent content={question.prompt} />
      </AssessmentQuestion>

      <p className="text-sm font-bold">
        {question.type === "MULTIPLE_CHOICE"
          ? "Pilih semua jawaban yang benar"
          : "Pilih satu jawaban"}
      </p>
      <div
        role={question.type === "SINGLE_CHOICE" ? "radiogroup" : "group"}
        className="flex flex-col gap-3"
      >
        {question.options.map((option, index) => (
          <AssessmentOption
            key={option.id}
            index={index}
            selected={selected.includes(option.id)}
            multiple={question.type === "MULTIPLE_CHOICE"}
            disabled={busy || expired}
            onPress={() => choose(option.id)}
          >
            <RichContent content={option.content} />
          </AssessmentOption>
        ))}
      </div>

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
        {isLast || answeredCount === questions.length || expired ? (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => (expired ? send() : setConfirmOpen(true))}
          >
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {busy
              ? "Mengirim…"
              : answeredCount === questions.length
                ? "Kirim jawaban"
                : `Kirim · ${answeredCount}/${questions.length} dijawab`}
          </Button>
        ) : null}
      </div>

      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        title={quiz.title}
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
            <AlertDialogTitle>Kirim jawaban?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredCount} dari {questions.length} soal dijawab. Jawaban yang
              dikirim tidak dapat diubah.
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

  return (
    <>
      <StudyCard emphasized className="items-center gap-3 p-6 text-center">
        <TrophyIcon className="text-primary size-8" />
        <p className="text-muted-foreground text-sm">
          {attempt.displayName}, skor kamu
        </p>
        <p className="text-6xl font-black tabular-nums">{percentage}</p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {result.score}/{result.maxScore} poin ·{" "}
          {formatDuration(result.durationSeconds)}
          {result.rank ? ` · peringkat #${result.rank}` : ""}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowReview((value) => !value)}
          >
            {showReview ? "Tutup pembahasan" : "Lihat pembahasan"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => void share()}
          >
            Ajak teman
          </Button>
        </div>
        {result.rank !== null ? (
          <a
            href={storyImageUrl}
            download="skor-quiz.png"
            className="text-primary text-xs font-semibold underline-offset-4 hover:underline"
          >
            Simpan gambar skor untuk Story
          </a>
        ) : null}
      </StudyCard>

      {showReview ? <QuizReview quizRef={quizRef} token={token} /> : null}

      <Leaderboard quizRef={quizRef} token={token} />
      <OrganizationCta quiz={quiz} />
    </>
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
      <h2 className="text-xl font-black">Pembahasan</h2>
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
              <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
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

function Leaderboard({ quizRef, token }: { quizRef: QuizRef; token?: string }) {
  const leaderboard = api.publicQuiz.leaderboard.useQuery(
    { ...quizRef, token },
    { refetchInterval: 30_000 },
  );
  const data = leaderboard.data;
  const mineListed = data?.entries.some((entry) => entry.isMine);

  return (
    <StudyCard>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-black">Leaderboard</h2>
        {data ? (
          <p className="text-muted-foreground text-xs">{data.total} peserta</p>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        Skor tertinggi di atas. Skor seri ditentukan oleh waktu pengerjaan
        tercepat.
      </p>
      {!data ? (
        <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
      ) : data.entries.length ? (
        <ol>
          {data.entries.map((entry) => (
            <LeaderboardRow
              key={entry.rank}
              entry={entry}
              mine={entry.isMine}
            />
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
            </>
          ) : null}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">
          Belum ada peserta. Jadilah yang pertama!
        </p>
      )}
    </StudyCard>
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
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums",
          entry.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {entry.name}
        {mine ? " (kamu)" : ""}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {entry.score}/{entry.maxScore} · {formatDuration(entry.durationSeconds)}
      </span>
    </li>
  );
}

function OrganizationCta({ quiz }: { quiz: Quiz }) {
  if (!quiz.organization.landingPublished) return null;
  return (
    <StudyCard emphasized className="gap-3">
      <p className="text-lg font-black">Mau belajar lebih banyak?</p>
      <p className="text-muted-foreground text-sm leading-6">
        Lihat kelas dan materi lain dari {quiz.organization.name}.
      </p>
      <a
        href={`/api/public-quiz/${quiz.id}/cta`}
        className={buttonVariants({ size: "lg" })}
      >
        Kunjungi {quiz.organization.name}
        <ArrowRightIcon data-icon="inline-end" />
      </a>
    </StudyCard>
  );
}
