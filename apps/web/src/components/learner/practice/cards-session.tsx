"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button, buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { isPracticeAnswerCorrect, randomSeed } from "~/lib/learner/practice";
import { useVocabularyAttempts } from "~/lib/learner/use-vocabulary-attempts";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CourseLearningFooter } from "../learn/course-learning-footer";
import { EntryImage } from "../learn/entry-image";
import { SegmentedControl } from "../segmented-control";
import {
  FlipCardDeck,
  type FlipCardItem,
  type FlipCardResult,
} from "./flip-card-deck";

type Word = {
  id: string;
  term: string;
  definition: string;
  imageAssetId?: string | null;
};

/** `KR` answers in Korean (productive); `ID` answers in Indonesian (receptive). */
type Mode = "KR" | "ID";

function Face({
  text,
  imageAssetId,
  imageLabel,
  muted,
}: {
  text: string;
  imageAssetId?: string | null;
  imageLabel?: string;
  muted?: string;
}) {
  return (
    <>
      {imageAssetId ? (
        <EntryImage assetId={imageAssetId} variant="list" label={imageLabel} />
      ) : null}
      <p className="font-heading text-3xl font-medium tracking-tight break-words">
        {text}
      </p>
      {muted ? (
        <p className="text-muted-foreground text-sm break-words">{muted}</p>
      ) : null}
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-[20px] p-5 ring-1 sm:p-6">
      {children}
    </div>
  );
}

/**
 * Flip-card practice for one vocabulary set: set progress and a start screen,
 * a typed round over the words that are ready (never practiced first, then the
 * ones due for review), and a finish screen with the learning footer.
 */
export function CardsSession({
  courseId,
  sourceCourseItemId,
  vocabularySetId,
  title,
  words,
}: {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
  title: string;
  words: Word[];
}) {
  const scope = { vocabularySetId, sourceCourseItemId };
  const progressQuery = api.learning.getVocabularyProgress.useQuery(scope, {
    retry: false,
  });
  const utils = api.useUtils();
  const [sessionId, setSessionId] = useState(randomSeed);
  const attempts = useVocabularyAttempts({ gameKey: "cards", sessionId });
  const [mode, setMode] = useState<Mode>("KR");
  const [queue, setQueue] = useState<Word[]>([]);
  const [roundKey, setRoundKey] = useState(0);
  const [roundActive, setRoundActive] = useState(false);

  const usableWords = useMemo(
    () => words.filter((word) => word.term.trim() && word.definition.trim()),
    [words],
  );
  const evidence = progressQuery.data;
  const progressByEntry = useMemo(
    () => new Map(evidence?.items.map((item) => [item.entryId, item]) ?? []),
    [evidence?.items],
  );
  const unpracticed = usableWords.filter(
    (word) => !progressByEntry.get(word.id)?.practiced,
  );
  const reviewDue = usableWords.filter(
    (word) => progressByEntry.get(word.id)?.due,
  );
  const ready = unpracticed.length ? unpracticed : reviewDue;
  const practicedCount =
    evidence?.items.filter((item) => item.practiced).length ?? 0;
  const masteredCount =
    evidence?.items.filter((item) => item.mastered).length ?? 0;
  const progress = usableWords.length
    ? Math.min(100, Math.round((practicedCount / usableWords.length) * 100))
    : 0;

  const cards = useMemo<FlipCardItem[]>(
    () =>
      queue.map((word) => {
        const prompt = mode === "KR" ? word.definition : word.term;
        const answer = mode === "KR" ? word.term : word.definition;
        return {
          id: word.id,
          caption: title,
          front: (
            <Face
              text={prompt}
              imageAssetId={word.imageAssetId}
              imageLabel={`${word.term} illustration`}
            />
          ),
          back: <Face text={answer} muted={prompt} />,
        };
      }),
    [mode, queue, title],
  );
  const wordById = useMemo(
    () => new Map(queue.map((word) => [word.id, word])),
    [queue],
  );

  function beginRound() {
    if (!ready.length) return;
    setSessionId(randomSeed());
    setQueue([...ready]);
    setRoundKey((value) => value + 1);
    setRoundActive(true);
  }

  async function onResult(
    card: FlipCardItem,
    result: FlipCardResult,
    index: number,
  ) {
    await attempts.report(
      { entryId: card.id, vocabularySetId, sourceCourseItemId, result },
      index,
    );
  }

  async function onFinish() {
    // The round is saved; load the set's evidence for the finish screen.
    await attempts.finish();
    await utils.learning.getVocabularyProgress.invalidate(scope);
    await utils.learning.getVocabularyProgress.fetch(scope);
    setRoundActive(false);
  }

  const back = (
    <Link
      href={`/learn/${courseId}/items/${sourceCourseItemId}`}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "text-muted-foreground -ml-2 self-start",
      )}
    >
      <ArrowLeftIcon /> Kembali ke set kosakata
    </Link>
  );

  let body: React.ReactNode;
  if (progressQuery.isPending) {
    body = <Skeleton className="h-72 w-full rounded-[20px]" />;
  } else if (progressQuery.isError || !evidence) {
    body = (
      <p role="alert" className="text-destructive text-sm">
        Progres set belum bisa dimuat.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void progressQuery.refetch()}
        >
          Coba lagi
        </button>
      </p>
    );
  } else if (roundActive) {
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <SegmentedControl
            label="Mode latihan"
            value={mode}
            onChange={setMode}
            options={[
              { value: "KR", label: "한국어" },
              { value: "ID", label: "Arti" },
            ]}
          />
        </div>
        <FlipCardDeck
          key={roundKey}
          mode="typed"
          summary={false}
          cards={cards}
          isCorrect={(card, value) => {
            const word = wordById.get(card.id);
            return word
              ? isPracticeAnswerCorrect(
                  value,
                  mode === "KR" ? word.term : word.definition,
                )
              : false;
          }}
          onResult={onResult}
          onFinish={() => void onFinish()}
          labels={{
            answerPlaceholder:
              mode === "KR" ? "Ketik kata Koreanya" : "Ketik artinya",
            answerLabel:
              mode === "KR" ? "Kata Korea untuk kartu ini" : "Arti kartu ini",
            idleHint:
              mode === "KR"
                ? "Ketik kata Koreanya, lihat jawaban untuk belajar, atau lewati kartu."
                : "Ketik artinya, lihat jawaban untuk belajar, atau lewati kartu.",
          }}
        />
      </div>
    );
  } else if (!evidence.practiced && ready.length > 0) {
    body = (
      <Panel>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-black tracking-[2px] uppercase">
            Kartu
          </p>
          <h1 className="text-3xl leading-10 font-black tracking-tight">
            {title}
          </h1>
        </div>
        <div className="flex items-start justify-between gap-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-primary text-[11px] font-bold tracking-[1.4px] uppercase">
              Progres set
            </p>
            <p className="text-xl font-black tracking-tight">
              {practicedCount} dilatih
            </p>
          </div>
          <p className="text-2xl font-black tabular-nums">{progress}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Progres set"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="bg-muted h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            {usableWords.length} kata total
          </span>
          <span className="text-primary font-semibold">
            {ready.length} siap sekarang
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Pengulangan penguasaan tetap tersedia tanpa menghambat course kamu.
        </p>
        <Button size="lg" onClick={beginRound}>
          Mulai latihan · {ready.length} kata
        </Button>
      </Panel>
    );
  } else if (evidence.practiced) {
    body = (
      <div className="flex flex-col gap-6">
        <Panel>
          <p className="text-primary text-[11px] font-bold tracking-[1.4px] uppercase">
            Kartu
          </p>
          <h1 className="text-3xl leading-10 font-black tracking-tight">
            {evidence.mastered ? "Kosakata dikuasai" : "Latihan selesai"}
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            {evidence.mastered
              ? "Semua kata berhasil diingat. Jawaban kamu tersimpan dan progres kamu sudah diperbarui."
              : `Kamu sudah melatih setiap kata sekali. ${masteredCount} dari ${usableWords.length} kata sudah dikuasai, dan kamu bisa mengulanginya nanti.`}
          </p>
          {reviewDue.length ? (
            <Button size="lg" onClick={beginRound}>
              Ulangi lagi · {reviewDue.length} kata
            </Button>
          ) : (
            <Link
              href="/learn/assessments"
              className={buttonVariants({ size: "lg" })}
            >
              Kembali ke latihan
            </Link>
          )}
        </Panel>
        <CourseLearningFooter
          courseId={courseId}
          courseItemId={sourceCourseItemId}
        />
      </div>
    );
  } else {
    body = (
      <Panel>
        <p className="text-3xl">🌱</p>
        <h1 className="text-xl font-black">Kerja bagus untuk sekarang</h1>
        <p className="text-muted-foreground text-sm leading-6">
          Jawaban kamu tersimpan. Muat ulang untuk memuat kata yang tersisa.
        </p>
        <Button
          variant="secondary"
          onClick={() => void progressQuery.refetch()}
        >
          Periksa lagi
        </Button>
      </Panel>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {back}
      {body}
    </div>
  );
}
