import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { closesLabel, HeroBlock } from "../src/components/learn/cohort-card";
import { HakgyoHero, HERO_TITLE } from "../src/components/learn/hakgyo-hero";
import { LearningItemRow } from "../src/components/learn/learning-item-row";
import { AppSegmentedControl } from "../src/components/app-segmented-control";
import { Eyebrow, QueryState } from "../src/components/learning-ui";
import {
  AssessmentQueue,
  GameIcon,
  openLibraryItem,
  practiceLibraryItems,
  ResourceLibrary,
  selectedTool,
  type Event,
  type LibraryItem,
  type PracticeFilter,
} from "../src/components/practice-hub";
import { SymbolIcon } from "../src/components/ui/symbol-icon";
import type { SymbolName } from "../src/components/ui/symbol-names";
import { isGameKey, type GameKey } from "../src/games/catalog";
import { gameHeroAssets } from "../src/games/game-modals";
import { LevelSelector } from "../src/games/word-fall/word-fall-screen";
import { useWordFallSettings } from "../src/games/word-fall/word-fall-settings";
import { authClient } from "../src/lib/auth-client";
import { getCourseResumeItem } from "../src/lib/course-learning-path";
import { openAssessmentEvent } from "../src/lib/navigation";
import {
  setLastPlayed,
  useLastPlayed,
  type LastPlayed,
} from "../src/lib/practice-last-played";
import {
  suggestQuizzes,
  suggestVocabularySets,
} from "../src/lib/practice-suggestions";
import { firstParam } from "../src/lib/route-params";
import { usePracticeSources } from "../src/lib/use-practice-sources";
import { useAppTheme } from "../src/providers/AppThemeProvider";
import { withOpacity } from "../src/theme/colors";

/** How to play each game the sheet starts, from its old start screen. */
const howToPlay: Partial<Record<GameKey, string>> = {
  cards:
    "Lihat kata, ingat artinya, lalu balik kartunya. Kata yang belum kamu latih muncul lebih dulu.",
  "word-fall":
    "Ketik jawaban sebelum setiap kata mengenai kapalmu. Huruf yang benar terbuka saat kamu mengetik.",
  sentences:
    "Ketuk kata untuk menyusun contoh kalimat. Tanpa batas waktu, dan petunjuk bisa diminta kapan pun.",
  match:
    "Hubungkan setiap kata dengan artinya. Seret dari kiri, atau ketuk satu kartu di setiap sisi.",
};

/**
 * A fact about the game under the hero title, in the chip style of a tugas's
 * facts (time, attempts). Tappable chips change a setting.
 */
function FactChip({
  icon,
  text,
  onPress,
  accessibilityHint,
  active = false,
}: {
  icon: SymbolName;
  text: string;
  onPress?: () => void;
  accessibilityHint?: string;
  active?: boolean;
}) {
  const { colors } = useAppTheme();
  const body = (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{
        backgroundColor: active
          ? withOpacity(colors.primary, 0.14)
          : colors.muted,
      }}
    >
      <SymbolIcon
        name={icon}
        size={13}
        tintColor={onPress ? colors.primary : colors.mutedForeground}
        weight="semibold"
      />
      <Text className="text-sm font-semibold text-foreground">{text}</Text>
      {onPress ? (
        <SymbolIcon
          name="chevron.down"
          size={10}
          tintColor={colors.mutedForeground}
          weight="bold"
        />
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={text}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={text}
      accessibilityRole="button"
      className="active:opacity-60"
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

/**
 * Hujan Kata's settings as chips under the title: the answer language
 * toggles on tap, the level opens a picker. Saved on the phone.
 */
function WordFallFacts() {
  const [settings, update] = useWordFallSettings();
  const [showLevels, setShowLevels] = useState(false);
  return (
    <View className="w-full gap-3">
      <View className="flex-row flex-wrap justify-center gap-2">
        <FactChip
          accessibilityHint="Ganti bahasa jawaban"
          icon="keyboard.fill"
          onPress={() =>
            update({ answerMode: settings.answerMode === "ID" ? "KR" : "ID" })
          }
          text={
            settings.answerMode === "ID" ? "Jawab: Indonesia" : "Jawab: Korea"
          }
        />
        <FactChip
          accessibilityHint="Pilih level awal"
          active={showLevels}
          icon="flame.fill"
          onPress={() => setShowLevels((open) => !open)}
          text={`Level ${settings.startLevel}`}
        />
      </View>
      <Text className="text-center text-xs leading-4 text-muted-foreground">
        {settings.answerMode === "ID"
          ? "Lihat kata Korea, ketik artinya."
          : "Lihat arti Indonesia, ketik kata Koreanya."}
      </Text>
      {showLevels ? (
        <LevelSelector
          selected={settings.startLevel}
          onSelect={(startLevel) => {
            update({ startLevel });
            setShowLevels(false);
          }}
        />
      ) : null}
    </View>
  );
}

/** One suggestion, whatever it opens. */
type Pick = {
  key: string;
  type: PracticeFilter;
  title: string;
  /** The course, or the class for a tugas. */
  context: string;
  label: string;
  reason: string;
  /** Learned words of a set, when known. */
  progress?: { learned: number; total: number };
  /** Verb on the main pick's button. */
  action: string;
  open: () => void;
};

/**
 * Where a source is from, without repeating its title: the course, and the
 * chapter unless the set is already named after it.
 */
function placeLine(courseTitle: string, moduleTitle: string, title: string) {
  return title.toLowerCase().includes(moduleTitle.toLowerCase())
    ? courseTitle
    : `${courseTitle} · ${moduleTitle}`;
}

/**
 * The suggested source at the foot of the hero, on the glass tile of the
 * "Lanjutkan belajar" hero in a Belajar class card: why and what on the
 * left, "Main" on the right, the whole tile tappable.
 */
/** Suggestion labels whose reason only restates the curriculum order. */
const PLAIN_LABELS = new Set(["Bab sekarang", "Berikutnya"]);

function HeroPick({ pick }: { pick: Pick }) {
  const learned = pick.progress?.learned ?? 0;
  const total = pick.progress?.total ?? 0;
  const words =
    total > 0
      ? learned > 0
        ? ` · ${learned}/${total} kata dipelajari`
        : ` · ${total} kata`
      : "";
  // Where a set sits in the curriculum needs no telling; a reason that
  // says something (words due, a tugas closing) replaces the word count.
  const telling = !PLAIN_LABELS.has(pick.label);
  return (
    <View className="w-full">
      <HeroBlock
        hero={{
          kind: "learning",
          eyebrow: "Untukmu",
          title: pick.title,
          meta: telling
            ? `${pick.reason} · ${pick.context}`
            : `${pick.context}${words}`,
          pill: pick.action,
          onPress: pick.open,
        }}
      />
    </View>
  );
}

/**
 * Latihan's source picker, as a sheet over the game menu, in the look of a
 * course item's page: a Hakgyo hero with the game's illustration, title, how
 * to play and its settings; then one suggested vocabulary set (or tugas, for
 * Quiz) with its reason, two alternatives, and the full list under "Semua".
 * Picking one closes the sheet and starts the game.
 */
export default function PracticeSourceSheet() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ tool?: string | string[] }>();
  const tool = selectedTool(firstParam(params.tool));
  const [now] = useState(Date.now);
  const { index, courses, outlines, events } = usePracticeSources(now);
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const lastPlayedByGame = useLastPlayed(userId);
  const lastPlayed = tool ? lastPlayedByGame[tool.key] : undefined;
  const gameKey = tool && isGameKey(tool.key) ? tool.key : undefined;
  // 0: Rekomendasi, 1: the full list to search ("Cari set").
  const [segment, setSegment] = useState(0);

  // An unknown game (an old link): nothing to pick.
  useEffect(() => {
    if (!tool && router.canGoBack()) router.back();
  }, [tool]);

  const items = useMemo(
    () => (tool ? practiceLibraryItems(courses, outlines, tool.resource) : []),
    [courses, outlines, tool],
  );
  // The chapter each course is at in Belajar.
  const currentModuleByCourse = useMemo(() => {
    const byCourse: Record<string, string | undefined> = {};
    for (const course of courses) {
      const outline = outlines[course.id];
      const resume = outline ? getCourseResumeItem(outline) : undefined;
      byCourse[course.id] = resume
        ? outline?.modules.find((module) =>
            module.items.some((item) => item.id === resume.id),
          )?.id
        : undefined;
    }
    return byCourse;
  }, [courses, outlines]);
  const summaries = index.data?.vocabularySummaries;

  if (!tool) return null;
  const toolKey = tool.key;
  const isQuiz = tool.resource === "ASSESSMENT";

  // Close the sheet, then start the game, so leaving it returns to Latihan.
  const launch = (record: LastPlayed, open: () => void) => {
    if (userId) setLastPlayed(userId, toolKey, record);
    router.back();
    open();
  };
  const openItem = (item: LibraryItem) =>
    launch(
      {
        kind: "item",
        courseId: item.courseId,
        courseItemId: item.id,
        at: new Date().toISOString(),
      },
      () => openLibraryItem(item, gameKey),
    );
  const openEvent = (event: Event) =>
    launch(
      { kind: "event", eventId: event.id, at: new Date().toISOString() },
      () => openAssessmentEvent(event),
    );

  const picks: Pick[] = isQuiz
    ? suggestQuizzes({
        quizzes: items,
        events,
        currentModuleByCourse,
        now,
        closesLabel: (closesAt) => closesLabel(closesAt, now),
      }).map((suggestion) =>
        suggestion.kind === "event"
          ? {
              key: suggestion.item.key,
              type: "ASSESSMENT",
              title: suggestion.item.event.title,
              context: suggestion.item.event.course.title,
              label: suggestion.label,
              reason: suggestion.reason,
              action:
                suggestion.item.event.attempts[0]?.status === "IN_PROGRESS"
                  ? "Lanjutkan"
                  : "Mulai",
              open: () => openEvent(suggestion.item.event),
            }
          : {
              key: suggestion.item.key,
              type: "ASSESSMENT",
              title: suggestion.item.quiz.title,
              context: placeLine(
                suggestion.item.quiz.courseTitle,
                suggestion.item.quiz.moduleTitle,
                suggestion.item.quiz.title,
              ),
              label: suggestion.label,
              reason: suggestion.reason,
              action:
                suggestion.item.quiz.attempt?.status === "IN_PROGRESS"
                  ? "Lanjutkan"
                  : "Mulai",
              open: () => openItem(suggestion.item.quiz),
            },
      )
    : suggestVocabularySets({
        items,
        summaries,
        currentModuleByCourse,
        gameKey,
        lastPlayed,
        now,
      }).map((suggestion) => {
        const summary = summaries?.[suggestion.item.id];
        return {
          key: suggestion.item.key,
          type: "VOCABULARY_SET",
          title: suggestion.item.title,
          context: placeLine(
            suggestion.item.courseTitle,
            suggestion.item.moduleTitle,
            suggestion.item.title,
          ),
          label: suggestion.label,
          reason: suggestion.reason,
          progress: summary
            ? { learned: summary.learned, total: summary.total }
            : undefined,
          action: "Main",
          open: () => openItem(suggestion.item),
        };
      });
  const [mainPick, ...otherPicks] = picks;
  // Nothing to suggest (no sets yet): the list explains why.
  // Nothing to suggest (no sets yet): the full list explains why.
  const listOpen = segment === 1 || !mainPick;

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      className="flex-1"
      contentContainerClassName="gap-6 px-5 pb-10"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* The game's illustration, title and how to play, which its start
          screen used to show: picking a source starts the game at once. */}
      <HakgyoHero inSheet>
        {gameKey ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="contain"
            priority="high"
            source={gameHeroAssets[gameKey]}
            style={{ width: "100%", height: 110 }}
            transition={0}
          />
        ) : (
          <View className="items-center">
            <GameIcon size={72} tool={tool} />
          </View>
        )}
        <View className="items-center gap-2">
          <Eyebrow size="md" tone="primary">
            {isQuiz ? "Latihan soal" : "Game kosakata"}
          </Eyebrow>
          <Text
            accessibilityRole="header"
            className="text-center font-black tracking-tight text-foreground"
            numberOfLines={2}
            style={HERO_TITLE}
          >
            {tool.title}
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {gameKey
              ? (howToPlay[gameKey] ?? tool.subtitle)
              : "Kerjakan latihan dan tryout kelas, atau quiz dari kurikulummu."}
          </Text>
        </View>
        {gameKey === "word-fall" ? (
          <WordFallFacts />
        ) : (
          <View className="flex-row flex-wrap justify-center gap-2">
            <FactChip
              icon={isQuiz ? "doc.text" : "rectangle.stack.fill"}
              text={isQuiz ? `${items.length} quiz` : `${items.length} set`}
            />
            {isQuiz && events.length > 0 ? (
              <FactChip icon="calendar" text={`${events.length} tugas kelas`} />
            ) : null}
          </View>
        )}
        {mainPick ? <HeroPick pick={mainPick} /> : null}
      </HakgyoHero>

      <QueryState
        error={index.error}
        pending={index.isPending}
        retry={() => void index.refetch()}
      />

      {/* Like a Belajar class card: the glass tile above, then a segment
          between the other suggestions and the full list to search. */}
      {mainPick ? (
        <AppSegmentedControl
          values={["Rekomendasi", isQuiz ? "Cari tugas" : "Cari set"]}
          selectedIndex={segment}
          onIndexChange={setSegment}
        />
      ) : null}

      {!listOpen ? (
        otherPicks.length > 0 ? (
          <View className="-mt-2">
            {otherPicks.map((pick, position) => (
              <LearningItemRow
                accessibilityHint={pick.reason}
                completed={false}
                detailLines={1}
                isLast={position === otherPicks.length - 1}
                key={pick.key}
                onPress={pick.open}
                statusText={`${pick.reason} · ${pick.context}`}
                title={pick.title}
                type={pick.type}
                // Every row here is the same kind of source.
                typeLabel=""
              />
            ))}
          </View>
        ) : (
          <Text className="py-2 text-center text-sm text-muted-foreground">
            Belum ada pilihan lain. Cari sendiri di{" "}
            {isQuiz ? "Cari tugas" : "Cari set"}.
          </Text>
        )
      ) : (
        <>
          {isQuiz ? (
            <AssessmentQueue events={events} now={now} onOpen={openEvent} />
          ) : null}
          <ResourceLibrary
            courses={courses}
            filter={tool.resource}
            gameKey={gameKey}
            onOpenItem={openItem}
            onRetry={() => void index.refetch()}
            outlines={outlines}
            sourceLabel={tool.sourceLabel}
          />
        </>
      )}

      {/* Floats over the hero, top right, in its padding. */}
      <Pressable
        accessibilityLabel="Tutup"
        accessibilityRole="button"
        className="absolute right-5 top-4 size-9 items-center justify-center rounded-full active:opacity-60"
        onPress={() => router.back()}
        style={{ backgroundColor: withOpacity(colors.background, 0.8) }}
      >
        <SymbolIcon
          name="xmark"
          size={14}
          tintColor={colors.foreground}
          weight="bold"
        />
      </Pressable>
    </ScrollView>
  );
}
