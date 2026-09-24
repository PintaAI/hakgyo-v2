import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { useApiAssetResolver } from "../content-renderer";
import { Eyebrow } from "../learning-ui";
import { StudyAction, StudyGlass } from "../study-glass";

const VIEW_MODE_KEY = "hakgyo:vocab-view-mode:v1";

export type VocabularySetEntry = {
  id: string;
  term: string;
  definition: string;
  audioAsset?: { id: string } | null;
  imageAsset?: { id: string } | null;
};

function EntryImage({
  assetId,
  variant,
}: {
  assetId: string;
  variant: "grid" | "list";
}) {
  const resolveAssetUrl = useApiAssetResolver();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
    variant === "grid" ? "h-28 w-full rounded-xl" : "size-14 rounded-xl";
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
          : { width: 56, height: 56 }
      }
      transition={0}
    />
  );
}

function SpeakerToggle({
  url,
  entryId,
  speakingId,
  onSpeak,
}: {
  url: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (speakingId !== entryId && status.playing) player.pause();
  }, [speakingId, entryId, status.playing, player]);

  useEffect(() => {
    player.play();
    onSpeak(entryId);
    // Autoplay is intentionally tied to the tap that mounted this control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      accessibilityLabel={
        status.playing ? "Pause pronunciation" : "Play pronunciation"
      }
      accessibilityRole="button"
      className="size-8 items-center justify-center rounded-full bg-muted active:opacity-60"
      onPress={() => {
        if (status.playing) {
          player.pause();
          onSpeak(null);
        } else {
          if (status.didJustFinish) void player.seekTo(0);
          player.play();
          onSpeak(entryId);
        }
      }}
    >
      <SymbolView
        fallback={
          <Text className="text-xs font-black text-primary">
            {status.playing ? "◉" : "♪"}
          </Text>
        }
        name={status.playing ? "speaker.wave.2.fill" : "speaker.fill"}
        size={14}
        tintColor={colors.primary}
        weight="semibold"
      />
    </Pressable>
  );
}

function WordSpeakerButton({
  assetId,
  entryId,
  speakingId,
  onSpeak,
}: {
  assetId: string;
  entryId: string;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  const { colors } = useAppTheme();
  const resolveAssetUrl = useApiAssetResolver();
  const [url, setUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;
  if (url) {
    return (
      <SpeakerToggle
        entryId={entryId}
        onSpeak={onSpeak}
        speakingId={speakingId}
        url={url}
      />
    );
  }

  return (
    <Pressable
      accessibilityLabel="Play pronunciation"
      accessibilityRole="button"
      className="size-8 items-center justify-center rounded-full bg-muted active:opacity-60"
      disabled={resolving}
      onPress={() => {
        if (resolving) return;
        setResolving(true);
        void resolveAssetUrl(assetId).then(
          (resolved) => {
            setUrl(resolved);
            setResolving(false);
          },
          () => {
            setFailed(true);
            setResolving(false);
          },
        );
      }}
    >
      {resolving ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <SymbolView
          fallback={<Text className="text-xs font-black text-primary">♪</Text>}
          name="speaker.fill"
          size={14}
          tintColor={colors.primary}
          weight="semibold"
        />
      )}
    </Pressable>
  );
}

function WordGridCard({
  entry,
  speakingId,
  onSpeak,
}: {
  entry: VocabularySetEntry;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  return (
    <View className="gap-2 rounded-[20px] border border-border bg-card p-4">
      {entry.imageAsset ? (
        <EntryImage assetId={entry.imageAsset.id} variant="grid" />
      ) : null}
      <Text className="text-[15px] font-bold leading-5 text-foreground">
        {entry.term}
      </Text>
      <Text className="text-xs leading-4 text-muted-foreground">
        {entry.definition}
      </Text>
      {entry.audioAsset ? (
        <View className="flex-row justify-end pt-1">
          <WordSpeakerButton
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

  const setViewMode = useCallback((mode: "list" | "grid") => {
    setViewModeState(mode);
    try {
      Storage.setItemSync(VIEW_MODE_KEY, mode);
    } catch {
      // The display preference is optional.
    }
  }, []);

  const renderEntry = useCallback(
    ({ item: entry, index }: { item: VocabularySetEntry; index: number }) =>
      viewMode === "grid" ? (
        <View className="min-w-0 flex-1 pb-3">
          <WordGridCard
            entry={entry}
            onSpeak={setSpeakingId}
            speakingId={speakingId}
          />
        </View>
      ) : (
        <View
          className={`flex-row gap-3 py-3 ${index === total - 1 ? "" : "border-b border-border/60"}`}
        >
          <Text className="w-6 pt-0.5 text-xs font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </Text>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-[15px] font-semibold text-foreground">
              {entry.term}
            </Text>
            <Text className="text-xs leading-4 text-muted-foreground">
              {entry.definition}
            </Text>
          </View>
          {entry.audioAsset ? (
            <WordSpeakerButton
              assetId={entry.audioAsset.id}
              entryId={entry.id}
              onSpeak={setSpeakingId}
              speakingId={speakingId}
            />
          ) : null}
          {entry.imageAsset ? (
            <EntryImage assetId={entry.imageAsset.id} variant="list" />
          ) : null}
        </View>
      ),
    [speakingId, total, viewMode],
  );

  return (
    <FlatList<VocabularySetEntry>
      key={viewMode}
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingBottom: 56,
        paddingHorizontal: 20,
        paddingTop: 16,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={vocabulary.entries}
      initialNumToRender={12}
      keyExtractor={(entry) => entry.id}
      ListEmptyComponent={
        <Text className="text-sm text-muted-foreground">
          No words in this set yet.
        </Text>
      }
      ListFooterComponent={
        courseId && courseItemId ? (
          <View className="mt-5">
            <StudyAction
              onPress={() =>
                router.push({
                  pathname:
                    "/courses/[courseId]/items/[courseItemId]/learning-progress",
                  params: { courseId, courseItemId },
                })
              }
            >
              Continue
            </StudyAction>
          </View>
        ) : null
      }
      ListHeaderComponent={
        <View className="mb-2 gap-5">
          <StudyGlass>
            <View className="gap-2">
              <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">
                Vocabulary · {total} {total === 1 ? "word" : "words"}
              </Text>
              <Text
                adjustsFontSizeToFit
                className="text-3xl font-black leading-10 tracking-tight text-foreground"
                minimumFontScale={0.7}
                numberOfLines={1}
              >
                {vocabulary.title}
              </Text>
              {vocabulary.description ? (
                <Text className="text-sm leading-6 text-muted-foreground">
                  {vocabulary.description}
                </Text>
              ) : null}
            </View>

            <StudyAction
              onPress={() => {
                if (courseId && courseItemId) {
                  router.push({
                    pathname: "/(home)/(tabs)/assessments",
                    params: {
                      courseId,
                      sourceCourseItemId: courseItemId,
                      vocabularySetId: vocabulary.id,
                      vocabularyTitle: vocabulary.title,
                    },
                  });
                  return;
                }
                router.push("/(home)/(tabs)/assessments");
              }}
            >
              Start practice
            </StudyAction>
          </StudyGlass>

          {total > 0 ? (
            <View className="flex-row items-center justify-between gap-3">
              <Eyebrow>{`Words (${total})`}</Eyebrow>
              <View className="flex-row items-center rounded-full bg-muted p-1">
                <Pressable
                  accessibilityLabel="List view"
                  accessibilityRole="button"
                  className={`size-7 items-center justify-center rounded-full active:opacity-60 ${viewMode === "list" ? "bg-background" : ""}`}
                  onPress={() => setViewMode("list")}
                >
                  <SymbolView
                    fallback={<Text className="text-xs font-black">≡</Text>}
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
                  accessibilityLabel="Grid view"
                  accessibilityRole="button"
                  className={`size-7 items-center justify-center rounded-full active:opacity-60 ${viewMode === "grid" ? "bg-background" : ""}`}
                  onPress={() => setViewMode("grid")}
                >
                  <SymbolView
                    fallback={<Text className="text-xs font-black">⊞</Text>}
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
}
