import { displayMeanings, entryMeanings } from "@hakgyo/shared";
import { router, useFocusEffect } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { useApiAssetResolver } from "../content-renderer";
import { withOpacity } from "../../theme/colors";
import { HeroTile } from "../hero-tile";
import { Eyebrow, ProgressBar } from "../learning-ui";
import { api } from "../../lib/trpc";
import {
  sortByWordStatus,
  vocabularySetProgress,
  vocabularyWordStatus,
  type VocabularyWordStatus,
} from "../../lib/vocabulary-word-status";
import { VocabularyWordStatusChip } from "../vocabulary-word-status-chip";
import { CardFan, HakgyoHero, HERO_TITLE } from "./hakgyo-hero";
import {
  LearningFooterView,
  useLearningContinuation,
} from "./course-learning-footer";
import {
  PullHoldIndicator,
  PullToContinueIndicator,
  usePullShortContent,
  usePullToContinue,
} from "./pull-to-continue";
import { VocabularyAudioButton } from "../vocabulary-audio-button";
import { SymbolIcon } from "../ui/symbol-icon";

const VIEW_MODE_KEY = "hakgyo:vocab-view-mode:v1";
const ios = Platform.OS === "ios";

export type VocabularySetEntry = {
  id: string;
  term: string;
  /** Read through `entryMeanings`; older cached bundles only have `definition`. */
  meanings?: string[];
  definition?: string;
  examples?: unknown;
  audioAsset?: { id: string } | null;
  imageAsset?: { id: string } | null;
};

export function EntryImage({
  assetId,
  variant,
}: {
  assetId: string;
  variant: "grid" | "list" | "detail";
}) {
  const resolveAssetUrl = useApiAssetResolver();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    void resolveAssetUrl(assetId).then(
      (resolved) => {
        if (!cancelled) setUrl(resolved);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [assetId, resolveAssetUrl]);

  if (failed) return null;
  const className =
    variant === "grid"
      ? "h-28 w-full rounded-xl"
      : variant === "detail"
        ? "h-44 w-full rounded-2xl"
        : "size-14 rounded-xl";
  if (!url) return <View className={`bg-muted ${className}`} />;
  return (
    <Image
      accessibilityIgnoresInvertColors
      cachePolicy="memory-disk"
      className={className}
      contentFit="cover"
      source={{ uri: url }}
      style={
        variant === "grid"
          ? { width: "100%", height: 112 }
          : variant === "detail"
            ? { width: "100%", height: 176 }
            : { width: 56, height: 56 }
      }
      transition={0}
    />
  );
}

/** The first Hangul syllable of a term ("-(으)ㄴ 적이 있다" → "으"). */
function leadSyllable(term: string) {
  for (const char of term) {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return char;
  }
  return [...term.trim()][0] ?? "";
}

/**
 * A square tile with a term's first Hangul syllable, in place of a row
 * number: the list reads as Korean at a glance.
 */
function SyllableTile({ term }: { term: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="size-11 items-center justify-center rounded-xl"
      style={{ backgroundColor: withOpacity(colors.primary, 0.1) }}
    >
      <Text className="text-lg font-black" style={{ color: colors.primary }}>
        {leadSyllable(term)}
      </Text>
    </View>
  );
}

/** The set's first words on a fan of cards: what is inside, at a glance. */
function DeckPreview({ terms }: { terms: string[] }) {
  return (
    <CardFan
      faces={terms.slice(0, 3).map((term) => (
        <Text
          key={term}
          adjustsFontSizeToFit
          className="text-center text-2xl font-black text-foreground"
          minimumFontScale={0.6}
          numberOfLines={1}
        >
          {term}
        </Text>
      ))}
    />
  );
}

function WordGridCard({
  entry,
  status,
  speakingId,
  onSpeak,
  onOpen,
}: {
  entry: VocabularySetEntry;
  /** Shown once the learner's progress has loaded. */
  status?: VocabularyWordStatus;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
  onOpen: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="overflow-hidden rounded-[20px] border border-border bg-card">
      <Pressable
        accessibilityLabel={`Lihat detail ${entry.term}`}
        accessibilityRole="button"
        className="active:opacity-60"
        onPress={onOpen}
      >
        {entry.imageAsset ? (
          <EntryImage assetId={entry.imageAsset.id} variant="grid" />
        ) : (
          // A flashcard face: the word, large, on a wash of the brand colour.
          <View
            className="h-24 items-center justify-center px-3"
            style={{ backgroundColor: withOpacity(colors.primary, 0.08) }}
          >
            <Text
              adjustsFontSizeToFit
              className="text-center text-2xl font-black text-foreground"
              minimumFontScale={0.6}
              numberOfLines={2}
            >
              {entry.term}
            </Text>
          </View>
        )}
        <View className="gap-1 p-3">
          {entry.imageAsset ? (
            <Text className="text-[15px] font-bold leading-5 text-foreground">
              {entry.term}
            </Text>
          ) : null}
          <Text
            className="text-xs leading-4 text-muted-foreground"
            numberOfLines={2}
          >
            {displayMeanings(entryMeanings(entry))}
          </Text>
          {status ? (
            <View className="pt-1">
              <VocabularyWordStatusChip status={status} />
            </View>
          ) : null}
        </View>
      </Pressable>
      {entry.audioAsset ? (
        <View className="flex-row justify-end px-3 pb-3">
          <VocabularyAudioButton
            assetId={entry.audioAsset.id}
            entryId={entry.id}
            onSpeak={onSpeak}
            speakingId={speakingId}
          />
        </View>
      ) : null}
    </View>
  );
}

export function VocabularySetDetail({
  courseId,
  courseItemId,
  vocabulary,
}: {
  courseId?: string;
  courseItemId?: string;
  vocabulary: {
    id: string;
    title: string;
    description: string | null;
    entries: VocabularySetEntry[];
  };
}) {
  const { colors } = useAppTheme();
  const [viewMode, setViewModeState] = useState<"list" | "grid">(() => {
    try {
      return Storage.getItemSync(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const total = vocabulary.entries.length;

  // Each word's status, from the saved progress (kept on the device, so it
  // shows offline too). Without a course placement there is none to show.
  const progressQuery = api.learning.getVocabularyProgress.useQuery(
    { vocabularySetId: vocabulary.id, sourceCourseItemId: courseItemId ?? "" },
    { enabled: Boolean(courseItemId), retry: false },
  );
  const { refetch: refetchProgress } = progressQuery;
  // Back from a lesson: show what it changed.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedBefore.current) {
        focusedBefore.current = true;
        return;
      }
      if (courseItemId) void refetchProgress();
    }, [courseItemId, refetchProgress]),
  );
  const progressItems = progressQuery.data?.items;
  const statusById = useMemo(
    () =>
      progressItems
        ? new Map(
            progressItems.map((item) => [
              item.entryId,
              vocabularyWordStatus(item),
            ]),
          )
        : undefined,
    [progressItems],
  );
  const statusOf = useCallback(
    (entry: VocabularySetEntry): VocabularyWordStatus =>
      statusById?.get(entry.id) ?? "NEW",
    [statusById],
  );
  // Words still to memorise first.
  const entries = useMemo(
    () =>
      statusById
        ? sortByWordStatus(vocabulary.entries, statusOf)
        : vocabulary.entries,
    [statusById, statusOf, vocabulary.entries],
  );
  const setProgress = statusById
    ? vocabularySetProgress(vocabulary.entries.map(statusOf))
    : undefined;

  // In a course, pulling past the end goes on, like a material, once every
  // word is learned (the set completes then).
  const inCourse = Boolean(courseId && courseItemId);
  const learning = useLearningContinuation({
    courseId: courseId ?? "",
    courseItemId: courseItemId ?? "",
  });
  const learned = Boolean(
    learning.path?.item.isCompleted || setProgress?.complete,
  );
  const wordsLeft = setProgress ? setProgress.total - setProgress.learned : 0;
  const pull = usePullToContinue({ onRelease: learning.continueLearning });
  const shortContent = usePullShortContent(inCourse ? pull.atEnd : undefined);
  useEffect(() => {
    pull.enabled.value = inCourse && learned && !learning.busy;
  }, [inCourse, learned, learning.busy, pull.enabled]);

  const setViewMode = useCallback((mode: "list" | "grid") => {
    setViewModeState(mode);
    try {
      Storage.setItemSync(VIEW_MODE_KEY, mode);
    } catch {
      // The display preference is optional.
    }
  }, []);

  const openEntry = useCallback(
    (entry: VocabularySetEntry) => {
      if (!courseItemId) return;
      setSpeakingId(null);
      router.push({
        pathname: "/vocabulary/[vocabularySetId]/items/[entryId]",
        params: {
          vocabularySetId: vocabulary.id,
          entryId: entry.id,
          sourceCourseItemId: courseItemId,
        },
      });
    },
    [courseItemId, vocabulary.id],
  );

  const renderEntry = useCallback(
    ({ item: entry, index }: { item: VocabularySetEntry; index: number }) =>
      viewMode === "grid" ? (
        <View className="min-w-0 flex-1 pb-3">
          <WordGridCard
            entry={entry}
            status={statusById ? statusOf(entry) : undefined}
            onOpen={() => openEntry(entry)}
            onSpeak={setSpeakingId}
            speakingId={speakingId}
          />
        </View>
      ) : (
        <View
          className={`flex-row items-center gap-3 py-3 ${index === total - 1 ? "" : "border-b border-border/60"}`}
        >
          <Pressable
            accessibilityLabel={`Lihat detail ${entry.term}`}
            accessibilityRole="button"
            className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-60"
            onPress={() => openEntry(entry)}
          >
            <SyllableTile term={entry.term} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-[17px] font-bold leading-6 text-foreground">
                {entry.term}
              </Text>
              <Text
                className="text-[13px] leading-5 text-muted-foreground"
                numberOfLines={1}
              >
                {displayMeanings(entryMeanings(entry))}
              </Text>
            </View>
            {statusById ? (
              <VocabularyWordStatusChip status={statusOf(entry)} />
            ) : null}
            {entry.imageAsset ? (
              <EntryImage assetId={entry.imageAsset.id} variant="list" />
            ) : null}
          </Pressable>
          {entry.audioAsset ? (
            <VocabularyAudioButton
              assetId={entry.audioAsset.id}
              entryId={entry.id}
              onSpeak={setSpeakingId}
              speakingId={speakingId}
            />
          ) : null}
        </View>
      ),
    [openEntry, speakingId, statusById, statusOf, total, viewMode],
  );

  const list = (
    <Animated.FlatList<VocabularySetEntry>
      key={viewMode}
      onScroll={inCourse ? pull.onScroll : undefined}
      scrollEventThrottle={16}
      onLayout={shortContent.onLayout}
      onContentSizeChange={shortContent.onContentSizeChange}
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingBottom: 56,
        paddingHorizontal: 20,
        paddingTop: 16,
      }}
      // iOS: the hero runs up under the transparent header and status bar,
      // like the cohort cards on Belajar, and pads itself below them.
      contentInsetAdjustmentBehavior={ios ? "never" : "automatic"}
      data={entries}
      initialNumToRender={12}
      keyExtractor={(entry) => entry.id}
      ListEmptyComponent={
        <Text className="text-sm text-muted-foreground">
          Set ini belum memiliki kata.
        </Text>
      }
      ListFooterComponent={
        courseId && courseItemId ? (
          // Room under the "next" row for the pull indicator.
          <View className="mb-20 mt-5">
            <LearningFooterView
              learning={learning}
              compact
              continueButton="screenReader"
              nextLocked={!learned}
            />
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View className="mb-2 gap-6">
          <HakgyoHero className="-mt-4">
            <DeckPreview
              terms={vocabulary.entries.map((entry) => entry.term)}
            />
            <View className="items-center gap-2">
              <Eyebrow size="md" tone="primary">
                {`${total} kata`}
              </Eyebrow>
              <Text
                accessibilityRole="header"
                className="text-center font-black tracking-tight text-foreground"
                numberOfLines={2}
                style={HERO_TITLE}
              >
                {vocabulary.title}
              </Text>
              {vocabulary.description ? (
                <Text className="text-center text-sm leading-6 text-muted-foreground">
                  {vocabulary.description}
                </Text>
              ) : null}
            </View>
            {setProgress && setProgress.total > 0 ? (
              <View className="w-full gap-1.5">
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text className="text-sm font-bold text-foreground">
                    {setProgress.learned} dari {setProgress.total} kata
                    dipelajari
                  </Text>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {setProgress.mastered} dikuasai
                  </Text>
                </View>
                <ProgressBar
                  accessibilityLabel={`${setProgress.learned} dari ${setProgress.total} kata dipelajari`}
                  max={setProgress.total}
                  value={setProgress.learned}
                />
                <Text className="text-xs leading-4 text-muted-foreground">
                  {setProgress.complete
                    ? "Semua kata sudah dipelajari. Kosakata ini selesai di kelasmu."
                    : "Kosakata ini selesai di kelas setelah semua kata dijawab benar sekali dengan mengingat."}
                </Text>
              </View>
            ) : null}
            <HeroTile
              eyebrow="Latihan kosakata"
              title={
                !courseItemId
                  ? "Pilih permainan di Latihan"
                  : setProgress && setProgress.total > 0
                    ? setProgress.complete
                      ? `Ulangi ${setProgress.total} kata`
                      : `${setProgress.total - setProgress.learned} kata perlu dihafal`
                    : `${total} kata`
              }
              meta={
                courseItemId
                  ? "Satu sesi singkat dari beberapa permainan"
                  : "Pilih sendiri permainannya"
              }
              pill={
                !courseItemId
                  ? "Buka"
                  : setProgress &&
                      setProgress.learned > 0 &&
                      !setProgress.complete
                    ? "Lanjutkan"
                    : "Mulai"
              }
              onPress={() => {
                // One tap into a short lesson that mixes the games; picking
                // a game is left to the Latihan tab.
                if (courseItemId) {
                  router.push({
                    pathname: "/vocabulary/[vocabularySetId]/lesson",
                    params: {
                      vocabularySetId: vocabulary.id,
                      sourceCourseItemId: courseItemId,
                      ...(courseId ? { courseId } : null),
                    },
                  });
                  return;
                }
                router.push("/(home)/(tabs)/assessments");
              }}
            />
          </HakgyoHero>

          {total > 0 ? (
            <View className="flex-row items-center justify-between gap-3">
              <Eyebrow>
                {setProgress && !setProgress.complete
                  ? `Daftar kata · ${setProgress.total - setProgress.learned} perlu dihafal`
                  : "Daftar kata"}
              </Eyebrow>
              <View className="flex-row items-center rounded-full bg-muted p-1">
                <Pressable
                  accessibilityLabel="Tampilan daftar"
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === "list" }}
                  className={`size-7 items-center justify-center rounded-full active:opacity-60 ${viewMode === "list" ? "bg-background" : ""}`}
                  onPress={() => setViewMode("list")}
                >
                  <SymbolIcon
                    name="list.bullet"
                    size={14}
                    tintColor={
                      viewMode === "list"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                    weight="semibold"
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel="Tampilan kisi"
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === "grid" }}
                  className={`size-7 items-center justify-center rounded-full active:opacity-60 ${viewMode === "grid" ? "bg-background" : ""}`}
                  onPress={() => setViewMode("grid")}
                >
                  <SymbolIcon
                    name="square.grid.2x2"
                    size={14}
                    tintColor={
                      viewMode === "grid"
                        ? colors.primary
                        : colors.mutedForeground
                    }
                    weight="semibold"
                  />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      }
      numColumns={viewMode === "grid" ? 2 : 1}
      columnWrapperStyle={viewMode === "grid" ? { gap: 12 } : undefined}
      renderItem={renderEntry}
      removeClippedSubviews
      windowSize={7}
    />
  );
  if (!inCourse) return list;
  return (
    <View className="flex-1">
      <GestureDetector gesture={pull.gesture}>{list}</GestureDetector>
      {learned ? (
        <PullToContinueIndicator
          pull={pull.pull}
          locked={pull.locked}
          releasing={pull.releasing}
          drop={pull.drop}
          atEnd={pull.atEnd}
          enabled={pull.enabled}
          busy={learning.busy}
        />
      ) : setProgress ? (
        <PullHoldIndicator
          label={`Hafalkan ${wordsLeft} kata lagi untuk lanjut`}
          progress={
            setProgress.total > 0 ? setProgress.learned / setProgress.total : 0
          }
          icon="character.book.closed.fill"
          atEnd={pull.atEnd}
        />
      ) : null}
    </View>
  );
}
