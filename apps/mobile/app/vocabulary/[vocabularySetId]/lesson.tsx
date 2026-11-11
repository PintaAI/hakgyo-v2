import { displayMeanings, entryMeanings } from "@hakgyo/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

import {
  Action,
  Card,
  Empty,
  Eyebrow,
  FullScreenState,
} from "../../../src/components/learning-ui";
import { CardsScreen } from "../../../src/games/cards-screen";
import { GameResult } from "../../../src/games/game-result";
import { GameBackToolbar, GamePage } from "../../../src/games/game-screens";
import {
  lessonRounds,
  pickLessonWords,
  type GameLesson,
  type LessonRound,
} from "../../../src/games/lesson";
import { SentenceBuilderScreen } from "../../../src/games/sentence-builder/sentence-builder-screen";
import { VocabularyMatchScreen } from "../../../src/games/vocabulary-match/vocabulary-match-screen";
import { WordFallScreen } from "../../../src/games/word-fall/word-fall-screen";
import { authClient } from "../../../src/lib/auth-client";
import { firstParam } from "../../../src/lib/route-params";
import { api } from "../../../src/lib/trpc";
import { useVocabularyProgressReporter } from "../../../src/lib/use-vocabulary-progress";
import { useCourseItem } from "../../../src/sync/hooks";
import { VocabularyWordStatusChip } from "../../../src/components/vocabulary-word-status-chip";
import {
  vocabularySetProgress,
  vocabularyWordStatus,
  type VocabularyWordProgress,
  type VocabularyWordStatus,
} from "../../../src/lib/vocabulary-word-status";

type Entry = NonNullable<
  NonNullable<ReturnType<typeof useCourseItem>["data"]>["vocabularySet"]
>["entries"][number];
type LessonWord = Entry & { meanings: string[] };
type Plan = {
  words: LessonWord[];
  rounds: LessonRound[];
  /** Each word's status when the lesson began, to show what it changed. */
  before: ReadonlyMap<string, VocabularyWordStatus>;
};
/** The set's progress the server sent back after a round synced. */
type SetEvidence = {
  items: ReadonlyArray<{ entryId: string } & VocabularyWordProgress>;
};

function leave() {
  router.back();
}

/**
 * "Mulai latihan" from a vocabulary set: one short lesson without choices.
 * Five words (new ones first, then words due for review) go through the
 * practice games in turn, each as a round that starts at once: match the
 * meaning, recall the word (Kartu), build a sentence, then Hujan Kata. A
 * summary closes it and leads back to the set. Picking a game is left to the
 * Latihan tab.
 */
export default function VocabularyLessonScreen() {
  const params = useLocalSearchParams<{
    vocabularySetId?: string | string[];
    sourceCourseItemId?: string | string[];
    courseId?: string | string[];
  }>();
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const courseIdParam = firstParam(params.courseId);
  const { data: session } = authClient.useSession();
  const item = useCourseItem(courseIdParam || undefined, sourceCourseItemId, {
    enabled: Boolean(session),
  });
  const vocabulary = item.data?.vocabularySet;
  const courseId = courseIdParam || item.data?.module.courseId || "";
  const progress = api.learning.getVocabularyProgress.useQuery(
    { vocabularySetId: vocabulary?.id ?? "", sourceCourseItemId },
    { enabled: Boolean(vocabulary && sourceCourseItemId), retry: false },
  );
  const words = useMemo<LessonWord[]>(
    () =>
      (vocabulary?.entries ?? []).map((entry) => ({
        ...entry,
        meanings: entryMeanings(entry),
      })),
    [vocabulary?.entries],
  );
  const [plan, setPlan] = useState<Plan>();
  const [round, setRound] = useState(0);
  const [evidence, setEvidence] = useState<SetEvidence>();

  // Planned once the saved progress is in (or failed to load: then every
  // word counts as new). "Latihan lagi" plans again from fresh progress.
  useEffect(() => {
    if (plan || !vocabulary || progress.isPending || progress.isFetching)
      return;
    const byEntry = new Map(
      (progress.data?.items ?? []).map((entry) => [entry.entryId, entry]),
    );
    const picked = pickLessonWords(words, byEntry);
    setPlan({
      words: picked,
      rounds: lessonRounds(picked, { progress: byEntry }),
      before: new Map(
        picked.map((word) => [
          word.id,
          vocabularyWordStatus(byEntry.get(word.id)),
        ]),
      ),
    });
    setRound(0);
  }, [plan, progress.data, progress.isFetching, vocabulary, words]);

  // A round reports its end once; the next round takes over.
  const completedRound = useRef(-1);
  const completeRound = useCallback((finished: number) => {
    if (completedRound.current >= finished) return;
    completedRound.current = finished;
    setRound(finished + 1);
  }, []);

  const lesson = useMemo<GameLesson | undefined>(
    () =>
      plan && round < plan.rounds.length
        ? {
            title: `Babak ${round + 1} dari ${plan.rounds.length}`,
            onRoundComplete: () => completeRound(round),
          }
        : undefined,
    [completeRound, plan, round],
  );

  if (!session || item.isPending || (vocabulary && !plan)) {
    return (
      <>
        <LessonHeader title="" />
        <FullScreenState kind="loading" />
      </>
    );
  }

  if (!vocabulary || !plan || plan.rounds.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <LessonHeader title="Latihan" />
        <GamePage>
          <Empty>
            {item.isError || !vocabulary
              ? "Set kosakata ini tidak dapat dimuat."
              : "Set kosakata ini belum memiliki kata yang bisa dilatih."}
          </Empty>
          <Action onPress={leave}>Kembali</Action>
        </GamePage>
      </View>
    );
  }

  const kind = plan.rounds[round];
  if (!kind || !lesson) {
    return (
      <LessonSummary
        words={plan.words}
        rounds={plan.rounds.length}
        before={plan.before}
        evidence={evidence}
        courseId={courseId}
        courseItemId={sourceCourseItemId}
        onAgain={() => {
          completedRound.current = -1;
          setEvidence(undefined);
          setPlan(undefined);
          void progress.refetch();
        }}
      />
    );
  }

  return (
    <LessonRoundScreen
      key={`${round}:${kind}`}
      kind={kind}
      courseId={courseId}
      sourceCourseItemId={sourceCourseItemId}
      vocabularySetId={vocabulary.id}
      words={plan.words}
      lesson={lesson}
      onEvidence={setEvidence}
    />
  );
}

function LessonHeader({
  title,
  finished = false,
}: {
  title: string;
  /** The lesson is over: swiping back leaves like the button does. */
  finished?: boolean;
}) {
  return (
    <>
      <GameBackToolbar accessibilityLabel="Tutup latihan" onPress={leave} />
      <Stack.Screen
        options={{
          gestureEnabled: finished,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShadowVisible: false,
          headerShown: true,
          title,
        }}
      />
    </>
  );
}

/** One round: the game for `kind`, reporting progress under its own game key. */
function LessonRoundScreen({
  kind,
  courseId,
  sourceCourseItemId,
  vocabularySetId,
  words,
  lesson,
  onEvidence,
}: {
  kind: LessonRound;
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
  words: LessonWord[];
  lesson: GameLesson;
  onEvidence: (evidence: SetEvidence) => void;
}) {
  const reporter = useVocabularyProgressReporter({
    gameKey: kind,
    reactive: false,
    sourceCourseItemId,
    vocabularySetId,
  });
  const game = {
    courseId,
    sourceCourseItemId,
    words,
    lesson,
    onAttempt: async (
      ...args: Parameters<typeof reporter.report>
    ): Promise<void> => {
      await reporter.report(...args);
    },
    // Sends the round's answers; once synced, the set's new progress feeds
    // the summary.
    onComplete: async () => {
      const synced = await reporter.finishSession();
      const set = synced?.sets.find(
        (item) => item.vocabularySetId === vocabularySetId,
      );
      if (set) onEvidence(set);
    },
    onExit: leave,
    onSessionStart: reporter.startSession,
  };

  if (kind === "match") return <VocabularyMatchScreen {...game} />;
  if (kind === "sentences") return <SentenceBuilderScreen {...game} />;
  if (kind === "word-fall") return <WordFallScreen {...game} />;
  return <CardsScreen {...game} vocabularySetId={vocabularySetId} />;
}

/**
 * The end of the lesson: the words it went through with their status now
 * (marking the ones it moved up), the set's progress, and the way back.
 */
function LessonSummary({
  words,
  rounds,
  before,
  evidence,
  courseId,
  courseItemId,
  onAgain,
}: {
  words: LessonWord[];
  rounds: number;
  before: ReadonlyMap<string, VocabularyWordStatus>;
  /** Absent until a round has synced (offline). */
  evidence?: SetEvidence;
  courseId: string;
  courseItemId: string;
  onAgain: () => void;
}) {
  const after = evidence
    ? new Map(
        evidence.items.map((item) => [
          item.entryId,
          vocabularyWordStatus(item),
        ]),
      )
    : undefined;
  const setProgress = after ? vocabularySetProgress([...after.values()]) : null;
  const known = (status?: VocabularyWordStatus) =>
    status === "LEARNED" || status === "MASTERED";
  const movedUp = (wordId: string) => {
    const status = after?.get(wordId);
    const previous = before.get(wordId);
    return status === "MASTERED"
      ? previous !== "MASTERED"
      : known(status) && !known(previous);
  };
  const risen = words.filter((word) => movedUp(word.id)).length;
  return (
    <View className="flex-1 bg-background">
      <LessonHeader title="" finished />
      <GameResult
        courseId={courseId}
        courseItemId={courseItemId}
        eyebrow="Latihan selesai"
        title={`${words.length} kata, ${rounds} babak`}
        description={
          setProgress
            ? setProgress.complete
              ? "Semua kata di set ini sudah dipelajari. Kosakata ini selesai di kelasmu."
              : "Kata yang belum dipelajari muncul lebih dulu di latihan berikutnya."
            : "Jawabanmu tersimpan di perangkat. Status kata diperbarui setelah tersambung ke internet."
        }
        mark={
          setProgress
            ? {
                value: `${setProgress.learned}/${setProgress.total}`,
                label: "dipelajari",
              }
            : { value: String(words.length), label: "kata" }
        }
        done={Boolean(setProgress?.complete)}
        celebrate={Boolean(setProgress?.complete)}
        facts={[
          { icon: "checkmark.seal.fill", text: `${rounds} babak selesai` },
          ...(risen
            ? [{ icon: "flame.fill" as const, text: `${risen} kata naik` }]
            : []),
        ]}
        primary={{
          eyebrow: "Latihan lagi",
          title: "Kata berikutnya",
          meta: "Kata baru dan yang perlu dihafal lebih dulu",
          pill: "Mulai",
          onPress: onAgain,
        }}
        secondary={{ label: "Selesai", onPress: leave }}
      >
        <Card className="gap-3 p-4">
          <Eyebrow size="xs">Kata yang dilatih</Eyebrow>
          {words.map((word) => {
            const status = after?.get(word.id);
            return (
              <View key={word.id} className="flex-row items-center gap-3">
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-base font-bold text-foreground">
                    {word.term}
                  </Text>
                  <Text
                    className="text-sm text-muted-foreground"
                    numberOfLines={2}
                  >
                    {displayMeanings(word.meanings)}
                  </Text>
                </View>
                {status ? (
                  <View className="items-end gap-0.5">
                    <VocabularyWordStatusChip status={status} />
                    {movedUp(word.id) ? (
                      <Text className="text-[11px] font-bold text-primary">
                        Naik!
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      </GameResult>
    </View>
  );
}
