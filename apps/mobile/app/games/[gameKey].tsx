import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";

import { Action, Empty, StudyScreen } from "../../src/components/learning-ui";
import { VocabularySession } from "../../src/components/vocabulary-session";
import { gameCatalog, isGameKey } from "../../src/games/catalog";
import { GamePage } from "../../src/games/game-screens";
import { VocabularyMatchScreen } from "../../src/games/vocabulary-match/vocabulary-match-screen";
import { WordFallScreen } from "../../src/games/word-fall/word-fall-screen";
import { authClient } from "../../src/lib/auth-client";
import { api } from "../../src/lib/trpc";
import { useVocabularyProgressReporter } from "../../src/lib/use-vocabulary-progress";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/(home)/(tabs)/assessments");
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
      <WordFallRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
      />
    );
  }

  if (key === "match") {
    return (
      <VocabularyMatchRoute
        courseId={courseIdParam}
        sessionReady={Boolean(session)}
        sourceCourseItemId={sourceCourseItemId}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerShown: true,
          title: game?.title ?? "Games",
        }}
      />
      <GamePage>
        {game && session ? (
          <>
            <Text className="text-4xl font-black text-primary">
              {game.icon}
            </Text>
            <Text className="text-2xl font-bold text-foreground">
              Coming soon
            </Text>
            <Text className="text-base text-muted-foreground">
              {game.description}
            </Text>
          </>
        ) : (
          <Empty>
            {session ? "This game does not exist." : "Sign in to play."}
          </Empty>
        )}
        <Action onPress={leave}>Back to practice</Action>
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
  const item = api.learning.getCourseItem.useQuery(
    { courseItemId: sourceCourseItemId },
    { enabled: Boolean(sourceCourseItemId && sessionReady), retry: false },
  );
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
    return <GameLoading title="Cards" />;
  }

  if (
    !sourceCourseItemId ||
    item.isError ||
    !vocabulary ||
    words.length === 0
  ) {
    return (
      <GameUnavailable title="Cards">
        {!sourceCourseItemId
          ? "Choose a vocabulary set from Practice to play."
          : item.isError
            ? "This vocabulary set could not be loaded."
            : "This vocabulary set has no playable words."}
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
      title="Cards"
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
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
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
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerShown: true,
          title,
        }}
      />
      <GamePage>
        <Empty>{children}</Empty>
        <Action onPress={leave}>Back to practice</Action>
      </GamePage>
    </View>
  );
}

function VocabularyMatchRoute({
  courseId,
  sourceCourseItemId,
  sessionReady,
}: {
  courseId: string;
  sourceCourseItemId: string;
  sessionReady: boolean;
}) {
  const item = api.learning.getCourseItem.useQuery(
    { courseItemId: sourceCourseItemId },
    { enabled: Boolean(sourceCourseItemId && sessionReady), retry: false },
  );
  const vocabulary = item.data?.vocabularySet;
  const effectiveCourseId = courseId || item.data?.module.courseId || "";
  const words = vocabulary?.entries ?? [];
  const reporter = useVocabularyProgressReporter({
    gameKey: "match",
    sourceCourseItemId,
    vocabularySetId: vocabulary?.id ?? "",
  });

  if (item.isPending && sourceCourseItemId && sessionReady) {
    return <GameLoading title="Vocabulary Match" />;
  }

  if (!sourceCourseItemId || item.isError || words.length < 2) {
    return (
      <GameUnavailable title="Vocabulary Match">
        {!sourceCourseItemId
          ? "Choose a vocabulary set from Practice to play."
          : item.isError
            ? "This vocabulary set could not be loaded."
            : "Add at least two playable words to this vocabulary set."}
      </GameUnavailable>
    );
  }

  return (
    <VocabularyMatchScreen
      courseId={effectiveCourseId}
      sourceCourseItemId={sourceCourseItemId}
      onAttempt={async (attempt) => {
        await reporter.report(attempt);
      }}
      onExit={leave}
      onSessionStart={reporter.startSession}
      words={words}
    />
  );
}

function WordFallRoute({
  courseId,
  sourceCourseItemId,
  sessionReady,
}: {
  courseId: string;
  sourceCourseItemId: string;
  sessionReady: boolean;
}) {
  const item = api.learning.getCourseItem.useQuery(
    { courseItemId: sourceCourseItemId },
    { enabled: Boolean(sourceCourseItemId && sessionReady), retry: false },
  );
  const vocabulary = item.data?.vocabularySet;
  const effectiveCourseId = courseId || item.data?.module.courseId || "";
  const words = vocabulary?.entries ?? [];
  const reporter = useVocabularyProgressReporter({
    gameKey: "word-fall",
    sourceCourseItemId,
    vocabularySetId: vocabulary?.id ?? "",
  });

  if (item.isPending && sourceCourseItemId && sessionReady) {
    return <GameLoading title="Word Fall" />;
  }

  if (!sourceCourseItemId || item.isError || words.length === 0) {
    return (
      <GameUnavailable title="Word Fall">
        {!sourceCourseItemId
          ? "Choose a vocabulary set from Practice to play."
          : item.isError
            ? "This vocabulary set could not be loaded."
            : "This vocabulary set has no playable words."}
      </GameUnavailable>
    );
  }

  return (
    <WordFallScreen
      courseId={effectiveCourseId}
      sourceCourseItemId={sourceCourseItemId}
      onAttempt={async (attempt, delivery) => {
        await reporter.report(attempt, delivery);
      }}
      onExit={leave}
      onSessionStart={reporter.startSession}
      words={words}
    />
  );
}
