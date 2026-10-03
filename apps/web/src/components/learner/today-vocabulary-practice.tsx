"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";

import { useAssetDownloadUrl } from "~/components/asset-download-url";
import { Skeleton } from "~/components/ui/skeleton";
import { isPracticeAnswerCorrect, randomSeed } from "~/lib/learner/practice";
import { useVocabularyAttempts } from "~/lib/learner/use-vocabulary-attempts";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  FlipCardDeck,
  type FlipCardItem,
  type FlipCardResult,
} from "./practice/flip-card-deck";
import { FlipDeckSkeleton } from "./skeletons";

/** `ID` answers in Indonesian (receptive); `KR` answers in Korean (productive). */
type Mode = "ID" | "KR";

const ROUND_SIZE = 24;

function CardImage({ assetId, label }: { assetId: string; label: string }) {
  const { url } = useAssetDownloadUrl(assetId);
  if (!url) return <Skeleton className="size-24 rounded-xl" />;
  return (
    <Image
      src={url}
      alt={label}
      width={96}
      height={96}
      unoptimized
      className="size-24 rounded-xl object-cover"
    />
  );
}

function Face({
  text,
  assetId,
  imageLabel,
  muted,
}: {
  text: string;
  assetId?: string | null;
  imageLabel: string;
  muted?: string;
}) {
  return (
    <>
      {assetId ? <CardImage assetId={assetId} label={imageLabel} /> : null}
      <p className="font-heading text-3xl font-medium tracking-tight break-words">
        {text}
      </p>
      {muted ? (
        <p className="text-muted-foreground text-sm break-words">{muted}</p>
      ) : null}
    </>
  );
}

export function TodayVocabularyPractice() {
  const [seed, setSeed] = useState(randomSeed);
  const [mode, setMode] = useState<Mode>("ID");
  // The round must not swap while the learner is answering it.
  const pool = api.practice.getVocabularyPool.useQuery(
    { seed, limit: ROUND_SIZE },
    { staleTime: Infinity, refetchOnWindowFocus: false },
  );
  // Every round has its own random seed, which doubles as the session id.
  const attempts = useVocabularyAttempts({
    gameKey: "today-cards",
    sessionId: seed,
  });

  const items = pool.data?.items;
  const cards = useMemo<FlipCardItem[]>(
    () =>
      (items ?? []).map((item) => {
        const prompt = mode === "KR" ? item.definition : item.term;
        const answer = mode === "KR" ? item.term : item.definition;
        return {
          id: `${item.entryId}:${item.setVersion}`,
          caption: `${item.vocabularySetTitle} · ${item.courseTitle}`,
          front: (
            <Face
              text={prompt}
              assetId={item.imageAssetId}
              imageLabel={`${item.term} illustration`}
            />
          ),
          back: <Face text={answer} imageLabel="" muted={prompt} />,
        };
      }),
    [items, mode],
  );
  const itemById = useMemo(
    () =>
      new Map(
        (items ?? []).map((item) => [
          `${item.entryId}:${item.setVersion}`,
          item,
        ]),
      ),
    [items],
  );

  const isCorrect = useCallback(
    (card: FlipCardItem, value: string) => {
      const item = itemById.get(card.id);
      if (!item) return false;
      return isPracticeAnswerCorrect(
        value,
        mode === "KR" ? item.term : item.definition,
      );
    },
    [itemById, mode],
  );

  async function onResult(
    card: FlipCardItem,
    result: FlipCardResult,
    index: number,
  ) {
    const item = itemById.get(card.id);
    if (!item) return;
    await attempts.report(
      {
        entryId: item.entryId,
        vocabularySetId: item.vocabularySetId,
        sourceCourseItemId: item.sourceCourseItemId,
        result,
      },
      index,
    );
  }

  return (
    <section aria-labelledby="today-vocabulary" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="today-vocabulary" className="text-lg font-bold tracking-tight">
          Kosakata hari ini
        </h2>
        <div
          role="group"
          aria-label="Mode latihan"
          className="bg-muted inline-flex rounded-full p-1"
        >
          {(
            [
              ["ID", "Arti"],
              ["KR", "한국어"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-full px-4 py-1 text-sm font-semibold transition-colors",
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pool.isPending ? (
        <FlipDeckSkeleton />
      ) : pool.isError ? (
        <p role="alert" className="text-destructive text-sm">
          Kosakata belum bisa dimuat.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void pool.refetch()}
          >
            Coba lagi
          </button>
        </p>
      ) : !pool.data.hasAvailableContent ? (
        <p className="text-muted-foreground bg-muted/50 rounded-xl p-4 text-sm">
          Belum ada kata untuk dilatih.
        </p>
      ) : (
        <FlipCardDeck
          key={seed}
          mode="typed"
          cards={cards}
          isCorrect={isCorrect}
          onResult={onResult}
          onFinish={attempts.finish}
          onRestart={() => {
            void attempts.finish();
            setSeed(randomSeed());
          }}
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
      )}
    </section>
  );
}
