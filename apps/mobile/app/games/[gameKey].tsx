import { entryMeanings } from "@hakgyo/shared";
import { getHangeulGameStage } from "@hakgyo/shared/hangeul";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, type ReactNode } from "react";

import { CardsScreen } from "../../src/games/cards-screen";
import { gameCatalog, isGameKey } from "../../src/games/catalog";
import type { GameSource } from "../../src/games/game-exit";
import { GameLoading, GameUnavailable } from "../../src/games/game-screens";
import { HangeulScreen } from "../../src/games/hangeul/hangeul-screen";
import { createSentenceChallenges } from "../../src/games/sentence-builder/engine";
import { SentenceBuilderScreen } from "../../src/games/sentence-builder/sentence-builder-screen";
import { SyllableForgeScreen } from "../../src/games/syllable-forge/syllable-forge-screen";
import { VocabularyMatchScreen } from "../../src/games/vocabulary-match/vocabulary-match-screen";
import { WordFallScreen } from "../../src/games/word-fall/word-fall-screen";
import { WordBuilderScreen } from "../../src/games/word-builder/word-builder-screen";
import { authClient } from "../../src/lib/auth-client";
import { useCourseItem } from "../../src/sync/hooks";
import { useVocabularyGameReporter } from "../../src/lib/use-vocabulary-progress";
import { firstParam } from "../../src/lib/route-params";

/** Back to where the game was opened; Latihan when nothing is behind it. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.dismissTo("/(home)/(tabs)/assessments");
}

const back = { onBack: leave, backAction: "Kembali ke latihan" };

export default function GameRoute() {
  const params = useLocalSearchParams<{
    gameKey?: string | string[];
    sourceCourseItemId?: string | string[];
    courseId?: string | string[];
    stage?: string | string[];
  }>();
  const key = firstParam(params.gameKey);
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const courseIdParam = firstParam(params.courseId);
  // Hangeul games opened from a lesson: an unknown stage plays everything.
  const stage = getHangeulGameStage(firstParam(params.stage));
  const hangeulSource = useMemo<GameSource | undefined>(
    () =>
      sourceCourseItemId
        ? { sourceCourseItemId, courseId: courseIdParam || undefined }
        : undefined,
    [courseIdParam, sourceCourseItemId],
  );
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const game = isGameKey(key) ? gameCatalog[key] : undefined;

  if (key === "stroke-master") {
    return (
      <HangeulScreen key={stage?.id} source={hangeulSource} stage={stage} />
    );
  }

  if (key === "syllable-forge") {
    return (
      <SyllableForgeScreen
        key={stage?.id}
        source={hangeulSource}
        stage={stage}
      />
    );
  }

  if (key === "word-builder") {
    return (
      <WordBuilderScreen key={stage?.id} source={hangeulSource} stage={stage} />
    );
  }

  const vocabularyGame =
    key in vocabularyGames
      ? vocabularyGames[key as keyof typeof vocabularyGames]
      : undefined;
  if (vocabularyGame && session) {
    return (
      <VocabularyGameRoute
        courseId={courseIdParam}
        sourceCourseItemId={sourceCourseItemId}
        gameKey={key}
        {...vocabularyGame}
      />
    );
  }

  if (sessionPending)
    return <GameLoading title={game?.title ?? ""} onBack={leave} />;
  return (
    <GameUnavailable title={game?.title ?? "Game"} {...back}>
      {session ? "Game ini tidak ditemukan." : "Masuk untuk bermain."}
    </GameUnavailable>
  );
}

type VocabularyEntries = NonNullable<
  NonNullable<ReturnType<typeof useCourseItem>["data"]>["vocabularySet"]
>["entries"];
type VocabularyWords = Array<
  VocabularyEntries[number] & { meanings: string[] }
>;

type VocabularyGame = ReturnType<typeof useVocabularyGameReporter> & {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
  words: VocabularyWords;
  onExit: () => void;
};
type VocabularyGameDefinition = {
  title: string;
  isPlayable: (words: VocabularyWords) => boolean;
  unplayableMessage: string;
  render: (game: VocabularyGame) => ReactNode;
};

/** The games played on a vocabulary set, by game key. */
const vocabularyGames = {
  cards: {
    title: "Kartu",
    isPlayable: (words) => words.length > 0,
    unplayableMessage:
      "Set kosakata ini belum memiliki kata yang bisa dimainkan.",
    render: (game) => <CardsScreen {...game} />,
  },
  "word-fall": {
    title: "Hujan Kata",
    isPlayable: (words) => words.length > 0,
    unplayableMessage:
      "Set kosakata ini belum memiliki kata yang bisa dimainkan.",
    render: (game) => <WordFallScreen {...game} />,
  },
  sentences: {
    title: "Susun makna",
    isPlayable: (words) => createSentenceChallenges(words).length > 0,
    unplayableMessage:
      "Set kosakata ini belum punya contoh kalimat yang bisa disusun.",
    render: (game) => <SentenceBuilderScreen {...game} />,
  },
  match: {
    title: "Cocokkan Kata",
    isPlayable: (words) => words.length >= 2,
    unplayableMessage:
      "Tambahkan setidaknya dua kata yang bisa dimainkan ke set kosakata ini.",
    render: (game) => <VocabularyMatchScreen {...game} />,
  },
} satisfies Record<string, VocabularyGameDefinition>;

/**
 * Loads the vocabulary set behind a game and reports progress for it. Renders
 * the game only once the set loads and `isPlayable` accepts its words.
 */
function VocabularyGameRoute({
  courseId,
  gameKey,
  isPlayable,
  render,
  sourceCourseItemId,
  title,
  unplayableMessage,
}: VocabularyGameDefinition & {
  courseId: string;
  gameKey: string;
  sourceCourseItemId: string;
}) {
  const item = useCourseItem(courseId || undefined, sourceCourseItemId);
  const vocabulary = item.data?.vocabularySet;
  const entries = vocabulary?.entries;
  const words = useMemo<VocabularyWords>(
    () =>
      (entries ?? []).map((entry) => ({
        ...entry,
        meanings: entryMeanings(entry),
      })),
    [entries],
  );
  const reporter = useVocabularyGameReporter({
    gameKey,
    sourceCourseItemId,
    vocabularySetId: vocabulary?.id ?? "",
  });

  if (item.isPending && sourceCourseItemId) {
    return <GameLoading title={title} onBack={leave} />;
  }

  if (
    !sourceCourseItemId ||
    item.isError ||
    !vocabulary ||
    !isPlayable(words)
  ) {
    return (
      <GameUnavailable title={title} {...back}>
        {!sourceCourseItemId
          ? "Pilih set kosakata dari Latihan untuk bermain."
          : item.isError || !vocabulary
            ? "Set kosakata ini tidak dapat dimuat."
            : unplayableMessage}
      </GameUnavailable>
    );
  }

  return render({
    courseId: courseId || item.data?.module.courseId || "",
    sourceCourseItemId,
    vocabularySetId: vocabulary.id,
    words,
    onExit: leave,
    ...reporter,
  });
}
