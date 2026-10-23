import {
  composeHangeulSyllable,
  HANGEUL_CONTRAST_BLOCK_TYPE,
  HANGEUL_GAME_BLOCK_TYPE,
  HANGEUL_LETTERS_BLOCK_TYPE,
  HANGEUL_SYLLABLE_GRID_BLOCK_TYPE,
  getHangeulGameStage,
  HANGEUL_GAME_TITLES,
  hangeulGamePath,
  isHangeulGameKey,
  parseHangeulContrastRows,
  parseHangeulLetterCards,
  parseHangeulSyllableAudio,
  parseJamoList,
  romanizeHangeulSyllable,
  type HangeulContrastItem,
  type HangeulLetterCard,
} from "@hakgyo/shared/hangeul";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioPlayer,
} from "expo-audio";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Action, Card, Eyebrow } from "../learning-ui";
import { SymbolIcon } from "../ui/symbol-icon";
import { useContentRenderer } from "./context";
import { booleanProp, stringProp } from "./normalize";
import type { BlockRendererProps, ContentBlockRenderer } from "./types";
import { useApiAssetResolver } from "./use-api-asset-resolver";

// One clip plays at a time across every Hangeul block on the screen.
let activePlayer: AudioPlayer | null = null;

type ClipPlayer = {
  /** The clip that is playing, or null. */
  playing: string | null;
  /** The clip whose audio is being resolved, or null. */
  loading: string | null;
  /** Whether the asset failed to resolve; its button is then hidden. */
  failed: (assetId: string) => boolean;
  toggle: (clip: string, assetId: string) => void;
};

/**
 * One expo-audio player per block. A tap resolves the clip through the
 * renderer's asset resolver (offline copies first), swaps it into the player
 * and plays it; tapping the playing clip again pauses it.
 */
function useClipPlayer(): ClipPlayer {
  const { resolveAssetUrl } = useContentRenderer();
  const apiResolver = useApiAssetResolver();
  const resolve = resolveAssetUrl ?? apiResolver;
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [clip, setClip] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const loadedUrl = useRef<string | null>(null);
  const request = useRef(0);

  useEffect(
    () => () => {
      if (activePlayer === player) activePlayer = null;
    },
    [player],
  );

  const fail = (assetId: string) =>
    setFailedIds((current) => new Set(current).add(assetId));

  return {
    playing: status.playing ? clip : null,
    loading,
    failed: (assetId) => failedIds.has(assetId),
    toggle: (nextClip, assetId) => {
      if (!assetId) return;
      if (nextClip === clip && status.playing) {
        player.pause();
        return;
      }
      const id = ++request.current;
      setLoading(nextClip);
      void resolve(assetId).then(
        (url) => {
          if (id !== request.current) return;
          setLoading(null);
          if (!url) {
            fail(assetId);
            return;
          }
          if (activePlayer && activePlayer !== player) activePlayer.pause();
          activePlayer = player;
          if (loadedUrl.current === url) {
            void player.seekTo(0);
          } else {
            player.replace({ uri: url });
            loadedUrl.current = url;
          }
          player.play();
          setClip(nextClip);
        },
        () => {
          if (id !== request.current) return;
          setLoading(null);
          fail(assetId);
        },
      );
    },
  };
}

function hasClip(player: ClipPlayer, assetId: string) {
  return Boolean(assetId) && !player.failed(assetId);
}

/** A round play button; renders nothing when the clip has no audio. */
function PlayButton({
  assetId,
  clip,
  label,
  player,
}: {
  assetId: string;
  clip: string;
  label: string;
  player: ClipPlayer;
}) {
  const { colors } = useContentRenderer();
  if (!hasClip(player, assetId)) return null;
  const playing = player.playing === clip;
  return (
    <Pressable
      accessibilityLabel={playing ? `Jeda ${label}` : `Putar ${label}`}
      accessibilityRole="button"
      accessibilityState={{ busy: player.loading === clip }}
      className="size-10 items-center justify-center rounded-full bg-primary active:opacity-70"
      hitSlop={4}
      onPress={() => player.toggle(clip, assetId)}
    >
      {player.loading === clip ? (
        <ActivityIndicator color={colors.primaryForeground} size="small" />
      ) : (
        <SymbolIcon
          name={playing ? "pause.fill" : "play.fill"}
          size={14}
          tintColor={colors.primaryForeground}
          weight="semibold"
        />
      )}
    </Pressable>
  );
}

/** A small speaker (or spinner) on a playable tile. */
function AudioMark({
  className,
  loading,
  playing,
}: {
  className: string;
  loading: boolean;
  playing: boolean;
}) {
  const { colors } = useContentRenderer();
  return (
    <View
      className={`size-6 items-center justify-center rounded-full bg-primary ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} size="small" />
      ) : (
        <SymbolIcon
          name={playing ? "pause.fill" : "speaker.fill"}
          size={11}
          tintColor={colors.primaryForeground}
        />
      )}
    </View>
  );
}

function BlockHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <View className="gap-1">
      <Eyebrow size="md" tone="primary">
        {eyebrow}
      </Eyebrow>
      {title.trim() ? (
        <Text className="text-2xl font-black leading-8 tracking-tight text-foreground">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function LetterRow({
  card,
  clip,
  first,
  player,
  showRomanization,
}: {
  card: HangeulLetterCard;
  clip: string;
  first: boolean;
  player: ClipPlayer;
  showRomanization: boolean;
}) {
  const playable = hasClip(player, card.assetId);
  const playing = player.playing === clip;
  const example = card.example;
  const exampleClip = `${clip}:example`;

  return (
    <View
      className={`flex-row gap-4 p-4 ${first ? "" : "border-t border-border"}`}
    >
      <Pressable
        accessibilityLabel={
          playable ? `Putar bunyi ${card.character}` : card.character
        }
        accessibilityRole={playable ? "button" : "text"}
        className={`size-20 items-center justify-center rounded-2xl bg-muted active:opacity-70 ${playing ? "border-2 border-primary" : ""}`}
        disabled={!playable}
        onPress={() => player.toggle(clip, card.assetId)}
      >
        <Text className="text-5xl font-bold leading-[60px] text-foreground">
          {card.character}
        </Text>
        {playable ? (
          <AudioMark
            className="absolute bottom-1.5 right-1.5"
            loading={player.loading === clip}
            playing={playing}
          />
        ) : null}
      </Pressable>
      <View className="min-w-0 flex-1 gap-1">
        {card.name || (showRomanization && card.romanization) ? (
          <View className="flex-row flex-wrap items-center gap-2">
            {card.name ? (
              <Text className="text-sm font-bold text-foreground">
                {card.name}
              </Text>
            ) : null}
            {showRomanization && card.romanization ? (
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-bold text-primary">
                  {card.romanization}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {card.cue ? (
          <Text className="text-sm leading-5 text-foreground">{card.cue}</Text>
        ) : null}
        {card.note ? (
          <Text className="text-xs leading-5 text-muted-foreground">
            {card.note}
          </Text>
        ) : null}
        {example ? (
          <View className="mt-1.5 flex-row items-center gap-3 rounded-xl bg-muted/60 px-3 py-2">
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-baseline gap-x-2">
                <Text className="text-lg font-bold text-foreground">
                  {example.word}
                </Text>
                {showRomanization && example.romanization ? (
                  <Text className="text-xs text-muted-foreground">
                    {example.romanization}
                  </Text>
                ) : null}
              </View>
              {example.meaning ? (
                <Text className="text-sm text-muted-foreground">
                  {example.meaning}
                </Text>
              ) : null}
            </View>
            <PlayButton
              assetId={example.assetId}
              clip={exampleClip}
              label={example.word}
              player={player}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HangeulLetters({ block }: BlockRendererProps) {
  const player = useClipPlayer();
  const cards = parseHangeulLetterCards(block.props.letters);
  const title = stringProp(block.props, "title");
  const showRomanization = booleanProp(block.props, "showRomanization", true);
  if (!cards.length && !title) return null;

  return (
    <View className="gap-3">
      <BlockHeading eyebrow="한글 · Huruf" title={title} />
      {cards.length ? (
        <Card className="">
          {cards.map((card, index) => (
            <LetterRow
              card={card}
              clip={`${card.id}:${index}`}
              first={index === 0}
              key={`${card.id}:${index}`}
              player={player}
              showRomanization={showRomanization}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function ContrastTile({
  clip,
  item,
  player,
  showRomanization,
}: {
  clip: string;
  item: HangeulContrastItem;
  player: ClipPlayer;
  showRomanization: boolean;
}) {
  const playable = hasClip(player, item.assetId);
  const playing = player.playing === clip;
  return (
    <Pressable
      accessibilityLabel={playable ? `Putar ${item.text}` : item.text}
      accessibilityRole={playable ? "button" : "text"}
      className={`min-h-24 min-w-0 flex-1 items-center justify-center gap-1 rounded-2xl bg-muted px-2 py-3 active:opacity-70 ${playable ? "pb-9" : ""} ${playing ? "border-2 border-primary" : ""}`}
      disabled={!playable}
      onPress={() => player.toggle(clip, item.assetId)}
    >
      <Text
        className="text-center text-2xl font-black leading-8 text-foreground"
        numberOfLines={2}
      >
        {item.text}
      </Text>
      {showRomanization && item.romanization ? (
        <Text className="text-center text-xs font-bold text-primary">
          {item.romanization}
        </Text>
      ) : null}
      {item.meaning ? (
        <Text className="text-center text-xs leading-4 text-muted-foreground">
          {item.meaning}
        </Text>
      ) : null}
      {playable ? (
        <AudioMark
          className="absolute bottom-2 self-center"
          loading={player.loading === clip}
          playing={playing}
        />
      ) : null}
    </Pressable>
  );
}

function HangeulContrast({ block }: BlockRendererProps) {
  const player = useClipPlayer();
  const rows = parseHangeulContrastRows(block.props.rows);
  const title = stringProp(block.props, "title");
  const instructions = stringProp(block.props, "instructions");
  const showRomanization = booleanProp(block.props, "showRomanization", true);
  if (!rows.length && !title) return null;

  return (
    <View className="gap-3">
      <BlockHeading eyebrow="발음 · Pasangan bunyi" title={title}>
        {instructions ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {instructions}
          </Text>
        ) : null}
      </BlockHeading>
      {rows.length ? (
        <Card className="">
          {rows.map((row, rowIndex) => (
            <View
              className={`gap-2 p-3 ${rowIndex > 0 ? "border-t border-border" : ""}`}
              key={`${row.id}:${rowIndex}`}
            >
              <View className="flex-row gap-2">
                {row.items.map((item, itemIndex) => (
                  <ContrastTile
                    clip={`${row.id}:${rowIndex}:${itemIndex}`}
                    item={item}
                    key={itemIndex}
                    player={player}
                    showRomanization={showRomanization}
                  />
                ))}
              </View>
              {row.note ? (
                <Text className="px-1 text-sm leading-5 text-muted-foreground">
                  {row.note}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const GRID_HEADER_WIDTH = 48;
const GRID_CELL_WIDTH = 56;

function HangeulSyllableGrid({ block }: BlockRendererProps) {
  const player = useClipPlayer();
  const consonants = parseJamoList(block.props.consonants);
  const vowels = parseJamoList(block.props.vowels);
  const audio = parseHangeulSyllableAudio(block.props.audio);
  const final = stringProp(block.props, "final").trim();
  const title = stringProp(block.props, "title");
  const showRomanization = booleanProp(block.props, "showRomanization");
  const cellHeight = showRomanization ? 60 : 52;
  if ((!consonants.length || !vowels.length) && !title) return null;
  if (!consonants.length || !vowels.length) {
    return <BlockHeading eyebrow="음절표 · Suku kata" title={title} />;
  }

  const rows = consonants.map((consonant) =>
    vowels.map((vowel) => composeHangeulSyllable(consonant, vowel, final)),
  );
  const headerCell = "items-center justify-center bg-muted";

  return (
    <View className="gap-3">
      <BlockHeading eyebrow="음절표 · Suku kata" title={title}>
        {audio.size ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            Ketuk suku kata berwarna untuk mendengar bunyinya.
          </Text>
        ) : null}
      </BlockHeading>
      <Card className="flex-row">
        {/* The consonant column stays put while the vowels scroll. */}
        <View
          className="border-r border-border"
          style={{ width: GRID_HEADER_WIDTH }}
        >
          <View
            className={`${headerCell} border-b border-border`}
            style={{ height: 44 }}
          />
          {consonants.map((consonant, index) => (
            <View
              className={`${headerCell} ${index > 0 ? "border-t border-border" : ""}`}
              key={`${consonant}:${index}`}
              style={{ height: cellHeight }}
            >
              <Text className="text-lg font-black text-foreground">
                {consonant}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView
          className="flex-1"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View>
            <View
              className="flex-row border-b border-border bg-muted"
              style={{ height: 44 }}
            >
              {vowels.map((vowel, index) => (
                <View
                  className="items-center justify-center"
                  key={`${vowel}:${index}`}
                  style={{ width: GRID_CELL_WIDTH }}
                >
                  <Text className="text-lg font-black text-foreground">
                    {vowel}
                  </Text>
                </View>
              ))}
            </View>
            {rows.map((syllables, rowIndex) => (
              <View
                className={`flex-row ${rowIndex > 0 ? "border-t border-border" : ""}`}
                key={rowIndex}
                style={{ height: cellHeight }}
              >
                {syllables.map((syllable, index) => {
                  const assetId = syllable ? (audio.get(syllable) ?? "") : "";
                  const clip = `${rowIndex}:${index}`;
                  const playable =
                    Boolean(syllable) && hasClip(player, assetId);
                  const playing = player.playing === clip;
                  return (
                    <Pressable
                      accessibilityLabel={
                        syllable
                          ? playable
                            ? `Putar ${syllable}`
                            : syllable
                          : "Tidak ada"
                      }
                      accessibilityRole={playable ? "button" : "text"}
                      className={`items-center justify-center gap-0.5 active:opacity-60 ${playing ? "bg-primary/15" : ""}`}
                      disabled={!playable}
                      key={index}
                      onPress={() => player.toggle(clip, assetId)}
                      style={{ width: GRID_CELL_WIDTH }}
                    >
                      {player.loading === clip ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Text
                          className={`text-xl font-bold ${syllable ? (playable ? "text-primary" : "text-foreground") : "text-muted-foreground"}`}
                        >
                          {syllable ?? "–"}
                        </Text>
                      )}
                      {showRomanization && syllable ? (
                        <Text className="text-[10px] text-muted-foreground">
                          {romanizeHangeulSyllable(syllable)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>
    </View>
  );
}

function HangeulGame({ block }: BlockRendererProps) {
  const { colors, courseItemId } = useContentRenderer();
  const gameKey = stringProp(block.props, "gameKey", "stroke-master");
  if (!isHangeulGameKey(gameKey)) return null;
  const stage = getHangeulGameStage(stringProp(block.props, "stage"));
  const gameTitle = HANGEUL_GAME_TITLES[gameKey];
  const title = stringProp(block.props, "title").trim() || gameTitle;
  const description = stringProp(block.props, "description");
  // Assessment content has no course item: opening a game from a question
  // would leave the attempt, so the card only describes the game there.
  const open = courseItemId
    ? () =>
        router.push(
          hangeulGamePath({ gameKey, stage: stage?.id, courseItemId }) as Href,
        )
    : null;

  const content = (
    <Card className="gap-4 p-4">
      <View className="flex-row items-center gap-3">
        <View className="size-12 items-center justify-center rounded-2xl bg-primary">
          <SymbolIcon
            name="gamecontroller.fill"
            size={22}
            tintColor={colors.primaryForeground}
          />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Eyebrow size="md" tone="primary">
            Permainan · {gameTitle}
          </Eyebrow>
          <Text className="text-xl font-black leading-7 text-foreground">
            {title}
          </Text>
        </View>
      </View>
      {description ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
      ) : null}
      <View className="self-start rounded-full bg-primary/10 px-2.5 py-1">
        <Text className="text-xs font-bold text-primary">
          {stage ? `Tahap: ${stage.title}` : "Semua huruf"}
        </Text>
      </View>
      {open ? (
        <Action onPress={open} trailingIcon="arrow.right">
          Main sekarang
        </Action>
      ) : (
        <Text className="text-xs leading-5 text-muted-foreground">
          Mainkan dari materi pelajaran atau tab Latihan.
        </Text>
      )}
    </Card>
  );

  return open ? (
    <Pressable
      accessibilityHint="Membuka permainan"
      accessibilityLabel={`${title}, ${gameTitle}`}
      accessibilityRole="button"
      className="active:opacity-80"
      onPress={open}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

export const hangeulBlockRenderers: Readonly<
  Record<string, ContentBlockRenderer>
> = {
  [HANGEUL_LETTERS_BLOCK_TYPE]: HangeulLetters,
  [HANGEUL_CONTRAST_BLOCK_TYPE]: HangeulContrast,
  [HANGEUL_SYLLABLE_GRID_BLOCK_TYPE]: HangeulSyllableGrid,
  [HANGEUL_GAME_BLOCK_TYPE]: HangeulGame,
};
