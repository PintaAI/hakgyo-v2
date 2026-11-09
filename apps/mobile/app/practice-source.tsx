import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { closesLabel } from "../src/components/learn/cohort-card";
import { Action, Eyebrow, QueryState } from "../src/components/learning-ui";
import {
  AssessmentQueue,
  GameIcon,
  openLibraryItem,
  practiceLibraryItems,
  ResourceLibrary,
  selectedTool,
  type Event,
  type LibraryItem,
} from "../src/components/practice-hub";
import { SymbolIcon } from "../src/components/ui/symbol-icon";
import { isGameKey, type GameKey } from "../src/games/catalog";
import { gameHeroAssets } from "../src/games/game-modals";
import {
  LevelSelector,
  WordFallModeSelector,
} from "../src/games/word-fall/word-fall-screen";
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

/** Hujan Kata's settings, saved on the phone for the next game. */
function WordFallOptions() {
  const [settings, update] = useWordFallSettings();
  const [showLevels, setShowLevels] = useState(false);
  return (
    <View className="gap-3 rounded-2xl bg-muted/60 p-4">
      <WordFallModeSelector
        mode={settings.answerMode}
        onChange={(answerMode) => update({ answerMode })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showLevels }}
        className="flex-row items-center justify-between active:opacity-60"
        onPress={() => setShowLevels((open) => !open)}
      >
        <Text className="text-sm font-semibold text-foreground">
          Level awal
        </Text>
        <Text className="text-sm font-bold text-primary">
          {showLevels ? "Selesai" : `Level ${settings.startLevel}`}
        </Text>
      </Pressable>
      {showLevels ? (
        <LevelSelector
          selected={settings.startLevel}
          onSelect={(startLevel) => update({ startLevel })}
        />
      ) : null}
    </View>
  );
}

/** The course, and how far the learner is with the set when known. */
function setContext(
  item: LibraryItem,
  summary: { total: number; learned: number } | undefined,
) {
  return summary && summary.total > 0
    ? `${item.courseTitle} · ${summary.learned}/${summary.total} kata dipelajari`
    : `${item.courseTitle} · ${item.moduleTitle}`;
}

/** One suggestion, whatever it opens. */
type Pick = {
  key: string;
  title: string;
  /** The course, or the class for a tugas. */
  context: string;
  label: string;
  reason: string;
  /** Verb on the main pick's button. */
  action: string;
  open: () => void;
};

function MainPick({ pick }: { pick: Pick }) {
  const { colors } = useAppTheme();
  return (
    <View
      className="gap-3 rounded-2xl border p-4"
      style={{
        borderColor: withOpacity(colors.primary, 0.3),
        backgroundColor: withOpacity(colors.primary, 0.1),
      }}
    >
      <View className="gap-1">
        <Text
          className="text-lg font-black leading-6 text-foreground"
          numberOfLines={2}
        >
          {pick.title}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {pick.context}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="rounded-full bg-primary px-2.5 py-1">
          <Text className="text-[11px] font-bold text-primary-foreground">
            {pick.label}
          </Text>
        </View>
        <Text
          className="min-w-0 flex-1 text-xs text-muted-foreground"
          numberOfLines={1}
        >
          {pick.reason}
        </Text>
      </View>
      <Action accessibilityHint={pick.reason} onPress={pick.open}>
        {pick.action}
      </Action>
    </View>
  );
}

function OtherPick({ pick, isLast }: { pick: Pick; isLast: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityHint={pick.reason}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${isLast ? "" : "border-b border-border/60"}`}
      onPress={pick.open}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[15px] font-semibold text-foreground"
          numberOfLines={1}
        >
          {pick.title}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {pick.reason}
        </Text>
      </View>
      <SymbolIcon
        name="chevron.right"
        size={13}
        tintColor={colors.mutedForeground}
        weight="semibold"
      />
    </Pressable>
  );
}

/**
 * Latihan's source picker, as a sheet over the game menu. It opens on one
 * suggested vocabulary set (or tugas, for Quiz) with the reason, and two
 * alternatives; the full list stays one tap away under "Semua". Picking one
 * closes the sheet and starts the game.
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
  const [showAll, setShowAll] = useState(false);

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
              title: suggestion.item.quiz.title,
              context: `${suggestion.item.quiz.courseTitle} · ${suggestion.item.quiz.moduleTitle}`,
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
      }).map((suggestion) => ({
        key: suggestion.item.key,
        title: suggestion.item.title,
        context: setContext(suggestion.item, summaries?.[suggestion.item.id]),
        label: suggestion.label,
        reason: suggestion.reason,
        action: "Main",
        open: () => openItem(suggestion.item),
      }));
  const [mainPick, ...otherPicks] = picks;
  const total = items.length + (isQuiz ? events.length : 0);
  // Nothing to suggest (no sets yet): the list explains why.
  const listOpen = showAll || !mainPick;

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      className="flex-1"
      contentContainerClassName="gap-5 px-5 pb-10 pt-5"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* The game's illustration and how to play, which its start screen
          used to show: picking a source starts the game at once. */}
      <View className="items-center">
        {gameKey ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="contain"
            priority="high"
            source={gameHeroAssets[gameKey]}
            style={{ width: "100%", height: 150 }}
            transition={0}
          />
        ) : (
          <View className="w-full items-start">
            <GameIcon size={52} tool={tool} />
          </View>
        )}
        <Pressable
          accessibilityLabel="Tutup"
          accessibilityRole="button"
          className="absolute right-0 top-0 size-9 items-center justify-center rounded-full bg-muted active:opacity-60"
          onPress={() => router.back()}
        >
          <SymbolIcon
            name="xmark"
            size={14}
            tintColor={colors.mutedForeground}
            weight="bold"
          />
        </Pressable>
      </View>
      <View className="gap-1">
        <Text
          accessibilityRole="header"
          className="text-2xl font-black text-foreground"
        >
          {tool.title}
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          {gameKey ? howToPlay[gameKey] : tool.subtitle}
        </Text>
      </View>
      {gameKey === "word-fall" ? <WordFallOptions /> : null}

      <QueryState
        error={index.error}
        pending={index.isPending}
        retry={() => void index.refetch()}
      />

      {mainPick ? (
        <View className="gap-2">
          <Eyebrow tone="primary">Untukmu</Eyebrow>
          <MainPick pick={mainPick} />
        </View>
      ) : null}

      {otherPicks.length > 0 ? (
        <View>
          <Eyebrow>Pilihan lain</Eyebrow>
          {otherPicks.map((pick, position) => (
            <OtherPick
              isLast={position === otherPicks.length - 1}
              key={pick.key}
              pick={pick}
            />
          ))}
        </View>
      ) : null}

      {mainPick ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: listOpen }}
          className="flex-row items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 active:opacity-70"
          onPress={() => setShowAll((open) => !open)}
        >
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {isQuiz ? "Semua tugas & quiz" : "Semua set kosakata"} ({total})
          </Text>
          <View
            style={listOpen ? { transform: [{ rotate: "180deg" }] } : undefined}
          >
            <SymbolIcon
              name="chevron.down"
              size={13}
              tintColor={colors.mutedForeground}
              weight="semibold"
            />
          </View>
        </Pressable>
      ) : null}

      {listOpen ? (
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
      ) : null}
    </ScrollView>
  );
}
