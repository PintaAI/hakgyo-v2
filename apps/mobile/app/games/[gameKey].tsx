import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";

import { Action, Empty, StudyScreen } from "../../src/components/learning-ui";
import { VocabularySession } from "../../src/components/vocabulary-session";
import { gameCatalog, isGameKey } from "../../src/games/catalog";
import { GameBackToolbar, GamePage } from "../../src/games/game-screens";
import { HangeulScreen } from "../../src/games/hangeul/hangeul-screen";
import { exampleSentences } from "../../src/games/sentence-builder/engine";
import { SentenceBuilderScreen } from "../../src/games/sentence-builder/sentence-builder-screen";
import { SyllableForgeScreen } from "../../src/games/syllable-forge/syllable-forge-screen";
import { VocabularyMatchScreen } from "../../src/games/vocabulary-match/vocabulary-match-screen";
import { WordFallScreen } from "../../src/games/word-fall/word-fall-screen";
import { WordBuilderScreen } from "../../src/games/word-builder/word-builder-screen";
import { authClient } from "../../src/lib/auth-client";
import { useCourseItem } from "../../src/sync/hooks";
import { useVocabularyProgressReporter } from "../../src/lib/use-vocabulary-progress";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function leave() {
  router.dismissTo("/(home)/(tabs)/assessments");
}

export default function GameRoute() {
  const params = useLocalSearchParams<{
    gameKey?: string | string[];
    sourceCourseItemId?: string | string[];
    courseId?: string | string[];
  }>();
  const key = first(params.gameKey);
  const sourceCourseItemId = first(params.sourceCourseItemId);
  const courseIdParam = first(params.courseId);
  const { data: session } = authClient.useSession();
  const game = isGameKey(key) ? gameCatalog[key] : undefined;

  if (key === "stroke-master") {
    return <HangeulScreen />;
  }

  if (key === "syllable-forge") {
    return <SyllableForgeScreen />;
  }

  if (key === "word-builder") {
    return <WordBuilderScreen />;
  }

  if (key === "cards") {
    return (
      <VocabularyCardsRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
      />
    );
  }

  if (key === "word-fall") {
    return (
      <VocabularyGameRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
        gameKey="word-fall"
        title="Hujan Kata"
        isPlayable={(words) => words.length > 0}
        unplayableMessage="Set kosakata ini belum memiliki kata yang bisa dimainkan."
      >
        {(game) => <WordFallScreen {...game} />}
      </VocabularyGameRoute>
    );
  }

  if (key === "sentences") {
    return (
      <VocabularyGameRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
        gameKey="sentences"
        title="Susun makna"
        isPlayable={(words) =>
          words.some((word) => exampleSentences(word.examples).length > 0)
        }
        unplayableMessage="Set kosakata ini belum punya contoh kalimat."
      >
        {(game) => <SentenceBuilderScreen {...game} />}
      </VocabularyGameRoute>
    );
  }

  if (key === "match") {
    return (
      <VocabularyGameRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
        gameKey="match"
        title="Cocokkan Kata"
        isPlayable={(words) => words.length >= 2}
        unplayableMessage="Tambahkan setidaknya dua kata yang bisa dimainkan ke set kosakata ini."
      >
        {(game) => <VocabularyMatchScreen {...game} />}
      </VocabularyGameRoute>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <GameBackToolbar onPress={leave} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          title: game?.title ?? "Game",
        }}
      />
      <GamePage>
        {game && session ? (
          <>
            <Text className="text-4xl font-black text-primary">
              {game.icon}
            </Text>
            <Text className="text-2xl font-bold text-foreground">
              Segera hadir
            </Text>
            <Text className="text-base text-muted-foreground">
              {game.description}
            </Text>
          </>
        ) : (
          <Empty>
            {session ? "Game ini tidak ditemukan." : "Masuk untuk bermain."}
          </Empty>
        )}
        <Action onPress={leave}>Kembali ke latihan</Action>
      </GamePage>
    </View>
  );
}

function VocabularyCardsRoute({
  courseId,
  sourceCourseItemId,
  sessionReady,
}: {
  courseId: string;
  sourceCourseItemId: string;
  sessionReady: boolean;
}) {
  const [scrollGesture] = useState(() => Gesture.Native());
  const [roundActive, setRoundActive] = useState(false);
  const item = useCourseItem(courseId || undefined, sourceCourseItemId, {
    enabled: sessionReady,
  });
  const vocabulary = item.data?.vocabularySet;
  const effectiveCourseId = courseId || item.data?.module.courseId || "";
  const words =
    vocabulary?.entries.map((entry) => ({
      id: entry.id,
      term: entry.term,
      definition: entry.definition,
      examples: entry.examples,
      imageAssetId: entry.imageAsset?.id,
    })) ?? [];

  if (item.isPending && sourceCourseItemId && sessionReady) {
    return <GameLoading title="Kartu" />;
  }

  if (
    !sourceCourseItemId ||
    item.isError ||
    !vocabulary ||
    words.length === 0
  ) {
    return (
      <GameUnavailable title="Kartu">
        {!sourceCourseItemId
          ? "Pilih set kosakata dari Latihan untuk bermain."
          : item.isError
            ? "Set kosakata ini tidak dapat dimuat."
            : "Set kosakata ini belum memiliki kata yang bisa dimainkan."}
      </GameUnavailable>
    );
  }

  return (
    <StudyScreen
      fillViewport
      gameHeader
      keyboardAvoiding
      scrollable={!roundActive}
      scrollGesture={scrollGesture}
      title="Kartu"
    >
      <VocabularySession
        key={`${sourceCourseItemId}:${vocabulary.id}`}
        courseId={effectiveCourseId}
        onComplete={async () => leave()}
        onRoundActiveChange={setRoundActive}
        scrollGesture={scrollGesture}
        sourceCourseItemId={sourceCourseItemId}
        vocabularySetId={vocabulary.id}
        words={words}
      />
    </StudyScreen>
  );
}

function GameLoading({ title }: { title: string }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <GameBackToolbar onPress={leave} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          title,
        }}
      />
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function GameUnavailable({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  return (
    <View className="flex-1 bg-background">
      <GameBackToolbar onPress={leave} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          title,
        }}
      />
      <GamePage>
        <Empty>{children}</Empty>
        <Action onPress={leave}>Kembali ke latihan</Action>
      </GamePage>
    </View>
  );
}

type VocabularyWords = NonNullable<
  NonNullable<ReturnType<typeof useCourseItem>["data"]>["vocabularySet"]
>["entries"];

/**
 * Loads the vocabulary set behind a game and reports progress for it. Renders
 * the game only once the set loads and `isPlayable` accepts its words.
 */
function VocabularyGameRoute({
  children,
  courseId,
  gameKey,
  isPlayable,
  sessionReady,
  sourceCourseItemId,
  title,
  unplayableMessage,
}: {
  children: (game: {
    courseId: string;
    sourceCourseItemId: string;
    words: VocabularyWords;
    onAttempt: (
      ...args: Parameters<
        ReturnType<typeof useVocabularyProgressReporter>["report"]
      >
    ) => Promise<void>;
    onComplete: () => unknown;
    onExit: () => void;
    onSessionStart: () => string;
  }) => ReactNode;
  courseId: string;
  gameKey: string;
  isPlayable: (words: VocabularyWords) => boolean;
  sessionReady: boolean;
  sourceCourseItemId: string;
  title: string;
  unplayableMessage: string;
}) {
  const item = useCourseItem(courseId || undefined, sourceCourseItemId, {
    enabled: sessionReady,
  });
  const vocabulary = item.data?.vocabularySet;
  const words = vocabulary?.entries ?? [];
  const reporter = useVocabularyProgressReporter({
    gameKey,
    reactive: false,
    sourceCourseItemId,
    vocabularySetId: vocabulary?.id ?? "",
  });

  if (item.isPending && sourceCourseItemId && sessionReady) {
    return <GameLoading title={title} />;
  }

  if (!sourceCourseItemId || item.isError || !isPlayable(words)) {
    return (
      <GameUnavailable title={title}>
        {!sourceCourseItemId
          ? "Pilih set kosakata dari Latihan untuk bermain."
          : item.isError
            ? "Set kosakata ini tidak dapat dimuat."
            : unplayableMessage}
      </GameUnavailable>
    );
  }

  return children({
    courseId: courseId || item.data?.module.courseId || "",
    sourceCourseItemId,
    words,
    onAttempt: async (...args) => {
      await reporter.report(...args);
    },
    onComplete: reporter.finishSession,
    onExit: leave,
    onSessionStart: reporter.startSession,
  });
}
