import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../../providers/AppThemeProvider";
import { useApiAssetResolver } from "../content-renderer";
import { Eyebrow } from "../learning-ui";
import { StudyAction } from "../study-glass";

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
      className={className}
      resizeMode="cover"
      source={{ uri: url }}
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
        <EntryImage
          assetId={entry.imageAsset.id}
          className="h-28 w-full rounded-xl"
        />
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

  const setViewMode = (mode: "list" | "grid") => {
    setViewModeState(mode);
    try {
      Storage.setItemSync(VIEW_MODE_KEY, mode);
    } catch {
      // The display preference is optional.
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pb-14 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-3 border-b border-border pb-5">
        <View className="flex-row items-center justify-between gap-3">
          <Eyebrow>Vocabulary set</Eyebrow>
          <Text className="text-xs font-semibold text-muted-foreground">
            {total} {total === 1 ? "word" : "words"}
          </Text>
        </View>
        <Text className="text-3xl font-black leading-10 tracking-tight text-foreground">
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

          {viewMode === "list" ? (
            <View>
              {vocabulary.entries.map((entry, index) => (
                <View
                  key={entry.id}
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
                    <EntryImage
                      assetId={entry.imageAsset.id}
                      className="size-14 rounded-xl"
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1 gap-3">
                {vocabulary.entries
                  .filter((_, index) => index % 2 === 0)
                  .map((entry) => (
                    <WordGridCard
                      entry={entry}
                      key={entry.id}
                      onSpeak={setSpeakingId}
                      speakingId={speakingId}
                    />
                  ))}
              </View>
              <View className="min-w-0 flex-1 gap-3">
                {vocabulary.entries
                  .filter((_, index) => index % 2 === 1)
                  .map((entry) => (
                    <WordGridCard
                      entry={entry}
                      key={entry.id}
                      onSpeak={setSpeakingId}
                      speakingId={speakingId}
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

      {courseId && courseItemId ? (
        <View className="mt-3">
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
      ) : null}
    </ScrollView>
  );
}
