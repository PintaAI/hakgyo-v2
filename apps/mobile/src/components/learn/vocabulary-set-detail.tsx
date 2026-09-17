import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { api } from "../../lib/trpc";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { useApiAssetResolver } from "../content-renderer";
import { GlassBox } from "../GlassBox";
import { Eyebrow, QueryState } from "../learning-ui";
import { StudyAction } from "../study-glass";

// Same corner family as the cohort card: card-level surfaces share
// SURFACE_RADIUS, pills stay fully round. Clear glass, no overflow on the
// glass view itself (the native side rounds the effect from borderRadius).
const SURFACE_RADIUS = 20;
const SECONDS_PER_WORD = 15;
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
  className,
}: {
  assetId: string;
  className?: string;
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
  if (!url) return <View className={`bg-muted ${className ?? ""}`} />;
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: url }}
      className={className}
      resizeMode="cover"
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
  // Only one pronunciation plays at a time: starting another entry pauses
  // this one.
  useEffect(() => {
    if (speakingId !== entryId && status.playing) player.pause();
  }, [speakingId, entryId, status.playing, player]);
  // The toggle only mounts after a tap resolved the URL, so autoplay
  // fulfills that tap.
  useEffect(() => {
    player.play();
    onSpeak(entryId);
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
  // Resolve lazily on first tap so opening the screen doesn't fire a
  // signed-URL request per word.
  if (failed) return null;
  if (url) {
    return (
      <SpeakerToggle
        url={url}
        entryId={entryId}
        speakingId={speakingId}
        onSpeak={onSpeak}
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
  mastered,
  speakingId,
  onSpeak,
}: {
  entry: VocabularySetEntry;
  mastered: boolean;
  speakingId: string | null;
  onSpeak: (entryId: string | null) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="gap-2 rounded-[20px] border border-border bg-card p-4">
      {entry.imageAsset ? (
        <EntryImage
          assetId={entry.imageAsset.id}
          className="h-28 w-full rounded-xl"
        />
      ) : null}
      <View className="flex-row items-start gap-2">
        <Text
          className="min-w-0 flex-1 text-[15px] font-bold leading-5 text-foreground"
          numberOfLines={3}
        >
          {entry.term}
        </Text>
        <SymbolView
          fallback={
            <Text
              className={`text-xs font-black ${mastered ? "text-primary" : "text-muted-foreground"}`}
            >
              {mastered ? "✓" : "○"}
            </Text>
          }
          name={mastered ? "checkmark.circle.fill" : "circle"}
          size={14}
          tintColor={mastered ? colors.primary : colors.mutedForeground}
          weight="semibold"
        />
      </View>
      <Text
        className="text-xs leading-4 text-muted-foreground"
        numberOfLines={5}
      >
        {entry.definition}
      </Text>
      {entry.audioAsset ? (
        <View className="flex-row justify-end pt-1">
          <WordSpeakerButton
            assetId={entry.audioAsset.id}
            entryId={entry.id}
            speakingId={speakingId}
            onSpeak={onSpeak}
          />
        </View>
      ) : null}
    </View>
  );
}

export function VocabularySetDetail({
  courseId,
  courseItemId,
  moduleId,
  vocabulary,
}: {
  courseId: string;
  courseItemId: string;
  moduleId: string;
  vocabulary: {
    id: string;
    title: string;
    description: string | null;
    entries: VocabularySetEntry[];
  };
}) {
  const { colors, colorScheme } = useAppTheme();
  const glassTint = withOpacity(
    colors.primary,
    colorScheme === "dark" ? 0.35 : 0.18,
  );
  const openLearningSheet = () =>
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/learning-progress",
      params: { courseId, courseItemId },
    });
  const [viewMode, setViewModeState] = useState<"list" | "grid">(() => {
    try {
      return Storage.getItemSync(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });
  const setViewMode = (mode: "list" | "grid") => {
    setViewModeState(mode);
    try {
      Storage.setItemSync(VIEW_MODE_KEY, mode);
    } catch {
      // A view preference is optional and can be re-chosen next visit.
    }
  };
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const memoryQuery = api.learning.getVocabularyMemory.useQuery({
    vocabularySetId: vocabulary.id,
    sourceCourseItemId: courseItemId,
  });
  const outlineQuery = api.learning.getCourseOutline.useQuery({ courseId });

  const total = vocabulary.entries.length;
  const memoryReady = memoryQuery.isSuccess;
  const memoryByEntry = new Map(
    (memoryQuery.data?.items ?? []).map((item) => [item.entryId, item]),
  );
  const remembered = memoryReady
    ? vocabulary.entries.filter(
        (entry) => memoryByEntry.get(entry.id)?.remembered,
      ).length
    : 0;
  const due = memoryReady
    ? vocabulary.entries.filter((entry) => {
        const state = memoryByEntry.get(entry.id);
        return (
          !!state &&
          !state.remembered &&
          !!state.nextReviewAt &&
          new Date(state.nextReviewAt).getTime() <= Date.now()
        );
      }).length
    : 0;
  const remaining = total - remembered;
  const minutesFor = (count: number) =>
    Math.max(1, Math.round((count * SECONDS_PER_WORD) / 60));
  const moduleTitle =
    outlineQuery.data?.modules.find((module) => module.id === moduleId)
      ?.title ?? null;
  const thumbnailUrl = outlineQuery.data?.thumbnailUrl ?? null;

  const openPractice = () =>
    router.push({
      pathname: "/vocabulary/[vocabularySetId]",
      params: {
        vocabularySetId: vocabulary.id,
        sourceCourseItemId: courseItemId,
        courseId,
      },
    });
  // The one thing to do: fresh sets invite a start, partial sets continue,
  // fully remembered sets offer a review.
  let hero: {
    eyebrow: string;
    title: string;
    meta: string;
    pill: string;
  } | null = null;
  if (memoryReady && total > 0) {
    if (remembered >= total) {
      hero = {
        eyebrow: "Review",
        title: `All ${total} mastered`,
        meta:
          due > 0
            ? `${due} due for review · Mixed recall`
            : "Mixed recall · Keep them fresh",
        pill: "Review",
      };
    } else if (remembered > 0) {
      hero = {
        eyebrow: "Practice",
        title: `${remaining} ${remaining === 1 ? "word" : "words"} to go`,
        meta: `Mixed recall · ~${minutesFor(remaining)} min`,
        pill: "Continue",
      };
    } else {
      hero = {
        eyebrow: "Practice",
        title: `${total} words ready`,
        meta: `Mixed recall · ~${minutesFor(total)} min`,
        pill: "Start",
      };
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pb-14 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="relative justify-end bg-muted" style={styles.header}>
        {thumbnailUrl ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              blurRadius={3}
              className="absolute inset-0 z-0 size-full"
              resizeMode="cover"
              source={{ uri: thumbnailUrl }}
            />
            <View
              className="absolute inset-0 z-10"
              style={{
                backgroundColor: withOpacity(colors.background, 0.72),
              }}
            />
          </>
        ) : null}
        <View className="relative z-20 gap-1.5 p-4">
          <View className="flex-row items-center gap-2">
            <Text
              className="flex-1 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground"
              numberOfLines={1}
            >
              {moduleTitle ? `Vocabulary · ${moduleTitle}` : "Vocabulary"}
            </Text>
            {memoryReady ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                {remembered}/{total}
              </Text>
            ) : null}
          </View>
          <Text
            className="text-2xl font-black leading-7 tracking-tight text-foreground"
            numberOfLines={2}
          >
            {vocabulary.title}
          </Text>
          {vocabulary.description ? (
            <Text
              className="text-sm leading-6 text-muted-foreground"
              numberOfLines={3}
            >
              {vocabulary.description}
            </Text>
          ) : null}
        </View>
        {memoryReady && total > 0 ? (
          <View className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-muted">
            <View
              className="h-full bg-primary"
              style={{
                width: `${Math.round((remembered / total) * 100)}%`,
              }}
            />
          </View>
        ) : null}
      </View>

      {hero ? (
        <Pressable
          accessibilityHint={hero.title}
          accessibilityRole="button"
          className="active:opacity-80"
          onPress={openPractice}
        >
          <GlassBox
            isInteractive
            tintColor={glassTint}
            glassEffectStyle="clear"
            style={styles.heroGlass}
          >
            <View className="flex-row items-center gap-3 px-5 py-4">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
                  {hero.eyebrow}
                </Text>
                <Text
                  className="text-lg font-black leading-6 text-foreground"
                  numberOfLines={2}
                >
                  {hero.title}
                </Text>
                <Text
                  className="text-xs font-semibold text-muted-foreground"
                  numberOfLines={1}
                >
                  {hero.meta}
                </Text>
              </View>
              <View className="rounded-full bg-primary px-4 py-2">
                <Text className="text-sm font-bold text-primary-foreground">
                  {hero.pill}
                </Text>
              </View>
            </View>
          </GlassBox>
        </Pressable>
      ) : null}

      <QueryState
        pending={false}
        error={memoryQuery.error}
        retry={() => void memoryQuery.refetch()}
      />

      {total > 0 ? (
        <View className="gap-3">
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
                  fallback={
                    <Text
                      className={`text-xs font-black ${viewMode === "list" ? "text-primary" : "text-muted-foreground"}`}
                    >
                      ≡
                    </Text>
                  }
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
                  fallback={
                    <Text
                      className={`text-xs font-black ${viewMode === "grid" ? "text-primary" : "text-muted-foreground"}`}
                    >
                      ⊞
                    </Text>
                  }
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
          {viewMode === "list" ? (
            <View>
              {vocabulary.entries.map((entry, index) => {
                const isLast = index === vocabulary.entries.length - 1;
                const mastered =
                  memoryByEntry.get(entry.id)?.remembered ?? false;
                return (
                  <View
                    key={entry.id}
                    className={`flex-row gap-3 py-3 ${isLast ? "" : "border-b border-border/60"}`}
                  >
                    <View className="size-8 items-center justify-center">
                      <SymbolView
                        fallback={
                          <Text
                            className={`text-sm font-black ${mastered ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {mastered ? "✓" : "○"}
                          </Text>
                        }
                        name={mastered ? "checkmark.circle.fill" : "circle"}
                        size={18}
                        tintColor={
                          mastered ? colors.primary : colors.mutedForeground
                        }
                        weight="semibold"
                      />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text className="text-[15px] font-semibold text-foreground">
                        {entry.term}
                      </Text>
                      <Text
                        className="text-xs leading-4 text-muted-foreground"
                        numberOfLines={3}
                      >
                        {entry.definition}
                      </Text>
                    </View>
                    {entry.audioAsset ? (
                      <WordSpeakerButton
                        assetId={entry.audioAsset.id}
                        entryId={entry.id}
                        speakingId={speakingId}
                        onSpeak={setSpeakingId}
                      />
                    ) : null}
                    {entry.imageAsset ? (
                      <EntryImage
                        assetId={entry.imageAsset.id}
                        className="size-14 rounded-xl"
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1 gap-3">
                {vocabulary.entries
                  .filter((_, index) => index % 2 === 0)
                  .map((entry) => (
                    <WordGridCard
                      key={entry.id}
                      entry={entry}
                      mastered={
                        memoryByEntry.get(entry.id)?.remembered ?? false
                      }
                      speakingId={speakingId}
                      onSpeak={setSpeakingId}
                    />
                  ))}
              </View>
              <View className="min-w-0 flex-1 gap-3">
                {vocabulary.entries
                  .filter((_, index) => index % 2 === 1)
                  .map((entry) => (
                    <WordGridCard
                      key={entry.id}
                      entry={entry}
                      mastered={
                        memoryByEntry.get(entry.id)?.remembered ?? false
                      }
                      speakingId={speakingId}
                      onSpeak={setSpeakingId}
                    />
                  ))}
              </View>
            </View>
          )}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">
          No words in this set yet.
        </Text>
      )}

      <View className="mt-3">
        <StudyAction onPress={openLearningSheet}>Continue</StudyAction>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    borderRadius: SURFACE_RADIUS,
    overflow: "hidden",
  },
  heroGlass: {
    borderRadius: SURFACE_RADIUS,
  },
});
