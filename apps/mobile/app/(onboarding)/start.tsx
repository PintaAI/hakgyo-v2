import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action, HeroHeader, PageDots } from "../../src/components/learning-ui";
import {
  DeckTutorialCoach,
  DeckTutorialOverlay,
  type DeckTutorialStep,
} from "../../src/components/onboarding-deck-tutorial";
import {
  VocabularyPracticeDeck,
  type VocabularyPracticeDeckCard,
  type VocabularyPracticeDeckHandle,
} from "../../src/components/vocabulary-practice-deck";
import { markDeckTutorialSeen } from "../../src/lib/deck-tutorial";
import { hasPassedHangeulPlacement } from "../../src/lib/hangeul-placement";
import {
  hasSeenOnboarding,
  hasSignedInBefore,
  markOnboardingSeen,
} from "../../src/lib/onboarding";
import { getStreakProgressDays } from "../../src/lib/streak";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { BRAND_BLUE, withOpacity } from "../../src/theme/colors";
import { AppIcon } from "../../src/components/ui/app-icon";
import { SymbolIcon } from "../../src/components/ui/symbol-icon";

type Slide = {
  key: "features" | "vocabulary" | "progress" | "level";
  eyebrow?: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    key: "features",
    title: "Tempat terbaik belajar bahasa Korea",
    description:
      "Pelajari materi tiap bab, latih kosakata lewat game, kerjakan tugas dan tryout, sampai ikut kelas online. Semua di satu aplikasi.",
  },
  {
    key: "vocabulary",
    title: "Hafalan rasa main game",
    description:
      "Kosakata dilatih lewat game. Kartu salah satunya, coba main di bawah ini.",
  },
  {
    key: "progress",
    title: "Belajar sedikit, tapi rutin",
    description:
      "Tiap materi dan kosakata memberi XP. Belajar setiap hari menjaga streak dan membuka lencana.",
  },
  {
    key: "level",
    eyebrow: "SKIP YANG BASIC",
    title: "Udah bisa baca Hangeul?",
    description: "10 soal, 2 menit. Lulus? Hangeul dasar langsung beres.",
  },
];

/**
 * The last step for someone who has signed in on this device before: their
 * account already knows their Hangeul, so it offers sign-in, not the test.
 */
const RETURNING_LAST_SLIDE: Omit<Slide, "key"> = {
  eyebrow: "SELAMAT DATANG KEMBALI",
  title: "Lanjut dari terakhir kali",
  description:
    "Masuk lagi untuk melanjutkan kelas, streak, dan kosakatamu. Semua progres tersimpan di akunmu.",
};

// What passing marks completed in Hangeul Mastery, rounded down so the copy
// survives small course edits (31 materials, 169 words, 10 quizzes when
// written).
const LEVEL_UNLOCKS = [
  { value: "30+", label: "materi" },
  { value: "160+", label: "kosakata" },
  { value: "10", label: "kuis" },
  { value: "1", label: "lencana" },
];

/** The Latihan tab's vocabulary games, as `practice-hub.tsx` names them. */
const GAMES = ["Kartu", "Hujan Kata", "Susun makna", "Cocokkan"];

const SAMPLE_DECK_CARDS: VocabularyPracticeDeckCard[] = [
  { id: "onboarding-annyeong", prompt: "안녕하세요", answer: "Halo" },
  { id: "onboarding-gamsa", prompt: "감사합니다", answer: "Terima kasih" },
  { id: "onboarding-hakgyo", prompt: "학교", answer: "Sekolah" },
  { id: "onboarding-chingu", prompt: "친구", answer: "Teman" },
];

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sampleStreakDays() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const activeDates = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return toDateKey(date);
  });
  return getStreakProgressDays({
    activeDates,
    startsOn: toDateKey(monday),
    today: toDateKey(today),
  });
}

/** 학교, the word the app is named after, and how each block reads. */
const HAKGYO_SYLLABLES = [
  { block: "학", romanization: "hak" },
  { block: "교", romanization: "gyo" },
];

/** One square of the Hangeul practice sheet each block is written in. */
const PRACTICE_CELL = 84;

/**
 * A dashed guide through the middle of a practice square, drawn as dashes
 * because iOS does not dash a single border side.
 */
function GuideLine({ vertical = false }: { vertical?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        flexDirection: vertical ? "column" : "row",
        justifyContent: "space-between",
        ...(vertical
          ? { top: 6, bottom: 6, left: PRACTICE_CELL / 2 - 0.5, width: 1 }
          : { left: 6, right: 6, top: PRACTICE_CELL / 2 - 0.5, height: 1 }),
      }}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <View
          className="bg-border opacity-70"
          key={index}
          style={vertical ? { width: 1, height: 4 } : { width: 4, height: 1 }}
        />
      ))}
    </View>
  );
}

/**
 * Fades its children in (and up from `fromY`) once, on mount. Drives its own
 * shared value instead of a layout `entering` animation: those can stop
 * partway inside FlatList cells, leaving the content offset.
 */
function Entrance({
  delay = 0,
  duration = 400,
  fromY = 0,
  play = true,
  className,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  /** Where the content starts, in points below (positive) its place. */
  fromY?: number;
  /** Holds the entrance (content hidden) until true. */
  play?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    if (!play) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, duration, play, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * fromY }],
  }));

  return (
    <Animated.View className={className} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

/**
 * 학교 written into the squares of a Hangeul practice sheet: the sheet comes
 * first, then the blocks, then how they read.
 */
function HakgyoWordmark() {
  return (
    <View
      accessibilityLabel="학교, dibaca hakgyo, artinya sekolah"
      accessible
      className="items-center"
      pointerEvents="none"
    >
      <Entrance
        className="flex-row overflow-hidden rounded-xl border border-border bg-card"
        duration={300}
        style={{ borderCurve: "continuous" }}
      >
        {HAKGYO_SYLLABLES.map((syllable, index) => (
          <View
            className={index > 0 ? "border-l border-border" : ""}
            key={syllable.block}
            style={{ width: PRACTICE_CELL, height: PRACTICE_CELL }}
          >
            <GuideLine />
            <GuideLine vertical />
            <Entrance
              className="flex-1 items-center justify-center"
              delay={200 + index * 140}
              duration={500}
              fromY={-12}
            >
              <Text
                className="font-black text-foreground"
                style={{
                  fontSize: 56,
                  lineHeight: 68,
                  includeFontPadding: false,
                }}
              >
                {syllable.block}
              </Text>
            </Entrance>
          </View>
        ))}
      </Entrance>
      <Entrance className="mt-2 flex-row" delay={620}>
        {HAKGYO_SYLLABLES.map((syllable) => (
          <Text
            className="text-center text-sm font-bold tracking-wide"
            key={syllable.block}
            style={{ width: PRACTICE_CELL, color: BRAND_BLUE }}
          >
            {syllable.romanization}
          </Text>
        ))}
      </Entrance>
    </View>
  );
}

/**
 * The system serif (New York on iOS, Noto Serif on Android), so the app name
 * stands apart from the sans tagline without bundling a font.
 */
const BRAND_NAME_FONT = Platform.select({
  ios: "ui-serif",
  default: "serif",
});

/** The app name, set apart from the first slide's tagline. */
function BrandName() {
  return (
    <Text
      accessibilityRole="header"
      className="text-center text-foreground"
      style={{
        fontFamily: BRAND_NAME_FONT,
        fontSize: 44,
        fontWeight: "700",
        lineHeight: 52,
        letterSpacing: -0.5,
      }}
    >
      Hakgyo
    </Text>
  );
}

/**
 * The first slide's tagline and description, a step below `BrandName`:
 * bold rather than black, at normal tracking, with balanced line breaks so no
 * word is left alone on the last line.
 */
function IntroCopy({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="items-center gap-2">
      <Text
        className="text-center text-2xl font-bold leading-8 text-foreground"
        lineBreakStrategyIOS="push-out"
        textBreakStrategy="balanced"
      >
        {title}
      </Text>
      <Text
        className="max-w-[320px] text-center text-sm leading-5 text-muted-foreground"
        lineBreakStrategyIOS="push-out"
        textBreakStrategy="balanced"
      >
        {description}
      </Text>
    </View>
  );
}

/** Plain facts under the first slide's pitch, each true of every account. */
const INTRO_FACTS = ["Mulai gratis", "Bisa offline", "iPhone & Android"];

function IntroFacts() {
  return (
    <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5">
      {INTRO_FACTS.map((fact) => (
        <View className="flex-row items-center gap-1.5" key={fact}>
          <SymbolIcon
            name="checkmark.circle.fill"
            size={14}
            tintColor={BRAND_BLUE}
            weight="semibold"
          />
          <Text className="text-xs font-semibold text-muted-foreground">
            {fact}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The vocabulary games as a line of names, with Kartu, the one the deck below
 * plays, underlined in blue.
 */
function GameList() {
  return (
    <View
      accessibilityLabel="Game kosakata: Kartu, Hujan Kata, Susun makna, dan Cocokkan. Kartu bisa dicoba di bawah."
      accessible
      className="flex-row flex-wrap gap-x-4 gap-y-1"
      pointerEvents="none"
    >
      {GAMES.map((game, index) => {
        const playing = index === 0;
        return (
          <View className="gap-1" key={game}>
            <Text
              className={`text-base ${playing ? "font-black text-foreground" : "font-semibold text-muted-foreground"}`}
            >
              {game}
            </Text>
            <View
              className="h-0.5 rounded-full"
              style={{
                backgroundColor: playing ? BRAND_BLUE : "transparent",
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function VocabularyPreview({
  scrollGesture,
}: {
  scrollGesture: NativeGesture;
}) {
  const deckRef = useRef<VocabularyPracticeDeckHandle>(null);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Either gesture can be tried first; the coach asks for whichever is left.
  const [peeled, setPeeled] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const step: DeckTutorialStep = !peeled ? "peel" : !swiped ? "swipe" : "done";
  const finished = index >= SAMPLE_DECK_CARDS.length;

  // Learned here, so the first real deck skips its own tutorial.
  useEffect(() => {
    if (step === "done") markDeckTutorialSeen();
  }, [step]);

  useEffect(() => {
    if (!finished) return;
    // Deal the sample deck again after the real "round complete" card shows.
    const timer = setTimeout(() => {
      setRound((current) => current + 1);
      setIndex(0);
    }, 1600);
    return () => clearTimeout(timer);
  }, [finished]);

  return (
    <View className="gap-3">
      <GameList />
      <View>
        <VocabularyPracticeDeck
          cards={SAMPLE_DECK_CARDS}
          correct={undefined}
          index={index}
          key={round}
          onAdvanceComplete={() => {
            setSwiped(true);
            setRevealed(false);
            setIndex((current) => current + 1);
          }}
          onInteractionChange={setBusy}
          onReveal={() => {
            setPeeled(true);
            setRevealed(true);
          }}
          ref={deckRef}
          revealed={revealed}
          scrollGesture={scrollGesture}
        />
        {/* Step aside while the learner's own finger is on the card. */}
        {!busy && !finished ? <DeckTutorialOverlay step={step} /> : null}
      </View>
      <DeckTutorialCoach step={step} />
    </View>
  );
}

/** A sample day, at the real rates in `DEFAULT_REWARD_RULES`. */
const SAMPLE_XP_LEDGER = [
  { label: "Materi selesai", detail: "Perkenalan diri", xp: 20 },
  { label: "Jawaban kosakata benar", detail: "12 × 5 XP", xp: 60 },
];
const SAMPLE_STREAK = 4;
/** The next streak badge, `STREAK_7`. */
const NEXT_STREAK_BADGE = 7;

function StreakWeek() {
  const { colors } = useAppTheme();
  const [days] = useState(sampleStreakDays);

  return (
    <View className="flex-row">
      {days.map((day) => (
        <View className="flex-1 items-center gap-1.5" key={day.dateKey}>
          <Text className="text-[11px] font-bold uppercase text-muted-foreground">
            {day.weekday}
          </Text>
          <View
            className={`size-9 items-center justify-center rounded-full border ${day.today ? "border-foreground" : "border-transparent"} ${day.active ? "bg-primary/10" : "bg-muted"}`}
          >
            {day.active ? (
              <SymbolIcon
                name="flame.fill"
                size={18}
                tintColor={colors.primary}
                weight="semibold"
              />
            ) : (
              <Text
                className={`text-xs font-bold text-muted-foreground ${day.future ? "opacity-40" : ""}`}
              >
                {day.dateNumber}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The streak up top, the day's XP as a ledger, and how far the next badge
 * is. The ledger writes itself in once the slide is first reached.
 */
function ProgressPreview({ play }: { play: boolean }) {
  const { colors } = useAppTheme();
  const total = SAMPLE_XP_LEDGER.reduce((sum, row) => sum + row.xp, 0);

  return (
    <View
      accessibilityLabel={`Contoh: streak ${SAMPLE_STREAK} hari, ${total} XP hari ini dari satu materi dan 12 jawaban kosakata, dan lencana Streak ${NEXT_STREAK_BADGE} hari tinggal ${NEXT_STREAK_BADGE - SAMPLE_STREAK} hari lagi.`}
      accessible
      className="gap-5"
      pointerEvents="none"
    >
      <View className="gap-3">
        <View className="flex-row items-end gap-3">
          <Text
            className="font-black text-foreground"
            style={{ fontSize: 72, lineHeight: 76 }}
          >
            {SAMPLE_STREAK}
          </Text>
          <Text className="pb-3 text-lg font-bold text-foreground">
            hari streak
          </Text>
        </View>
        <StreakWeek />
      </View>

      <View className="border-t border-border">
        {SAMPLE_XP_LEDGER.map((row, index) => (
          <Entrance
            className="flex-row items-center gap-3 border-b border-border py-3"
            delay={index * 180}
            fromY={8}
            key={row.label}
            play={play}
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {row.label}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {row.detail}
              </Text>
            </View>
            <Text
              className="text-sm font-black"
              style={{ color: colors.primary }}
            >
              +{row.xp} XP
            </Text>
          </Entrance>
        ))}
        <Entrance
          className="flex-row items-baseline justify-between pt-3"
          delay={SAMPLE_XP_LEDGER.length * 180}
          play={play}
        >
          <Text className="text-sm font-semibold text-muted-foreground">
            Hari ini
          </Text>
          <Text className="text-xl font-black text-foreground">{total} XP</Text>
        </Entrance>
      </View>

      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-muted-foreground">
            Lencana berikutnya
          </Text>
          <Text className="text-sm font-bold text-foreground">
            Streak {NEXT_STREAK_BADGE} hari ·{" "}
            {NEXT_STREAK_BADGE - SAMPLE_STREAK} hari lagi
          </Text>
        </View>
        <View className="flex-row gap-1">
          {Array.from({ length: NEXT_STREAK_BADGE }, (_, index) => (
            <View
              className={`h-2 w-3 rounded-full ${index < SAMPLE_STREAK ? "bg-primary" : "bg-muted"}`}
              key={index}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function LevelUnlocks() {
  return (
    <View className="flex-row">
      {LEVEL_UNLOCKS.map((unlock) => (
        <View className="flex-1 items-center gap-0.5" key={unlock.label}>
          <Text className="text-xl font-black text-foreground">
            {unlock.value}
          </Text>
          <Text className="text-xs font-semibold text-muted-foreground">
            {unlock.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LevelTestPreview({ passed }: { passed: boolean }) {
  const { colors } = useAppTheme();

  if (passed) {
    return (
      <View className="items-center gap-5 pt-2">
        <SymbolIcon
          name="checkmark.seal.fill"
          size={44}
          tintColor={BRAND_BLUE}
        />
        <View className="items-center gap-1.5">
          <Text className="text-center text-xl font-black tracking-tight text-foreground">
            Lulus! Hangeul dasar: skip
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            Daftar atau masuk biar semua ini langsung nyangkut di akunmu.
          </Text>
        </View>
        <LevelUnlocks />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="items-center gap-1">
        <Text className="text-sm font-semibold text-muted-foreground">
          Bisa baca ini tanpa nyontek?
        </Text>
        <Text className="text-6xl font-black text-foreground">한국어</Text>
        <View className="flex-row items-center gap-1.5">
          <SymbolIcon
            name="lock.fill"
            size={11}
            tintColor={colors.mutedForeground}
          />
          <Text className="text-xs font-semibold text-muted-foreground">
            Jawabannya ada di dalam tes
          </Text>
        </View>
      </View>
      <View className="gap-3">
        <Text className="text-center text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
          Lulus = langsung kebuka
        </Text>
        <LevelUnlocks />
      </View>
    </View>
  );
}

/**
 * Warm morning tones for the opening slide, against the test slide's cool
 * blue: coral into peach, a little stronger in dark mode so it still shows.
 */
const INTRO_WASH = {
  light: {
    top: "#FF7A59",
    middle: "#FFB547",
    topAlpha: 0.2,
    middleAlpha: 0.08,
  },
  dark: {
    top: "#FF7A59",
    middle: "#FFB547",
    topAlpha: 0.26,
    middleAlpha: 0.1,
  },
};

/** The first slide's warm wash, fading out as the deck moves on. */
function IntroWash({ position }: { position: SharedValue<number> }) {
  const { colorScheme } = useAppTheme();
  const wash = INTRO_WASH[colorScheme === "dark" ? "dark" : "light"];
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(position.value, [0, 1], [1, 0], "clamp"),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60%",
          experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(wash.top, wash.topAlpha)}, ${withOpacity(wash.middle, wash.middleAlpha)} 55%, ${withOpacity(wash.middle, 0)})`,
        },
        style,
      ]}
    />
  );
}

/** The sign-in sheet's blue wash, fading in as the test slide comes in. */
function LevelWash({
  position,
  lastPage,
}: {
  /** The pager's scroll offset in pages. */
  position: SharedValue<number>;
  lastPage: number;
}) {
  const { colorScheme } = useAppTheme();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      position.value,
      [lastPage - 1, lastPage],
      [0, 1],
      "clamp",
    ),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "60%",
          experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(BRAND_BLUE, colorScheme === "dark" ? 0.28 : 0.16)}, ${withOpacity(BRAND_BLUE, 0)})`,
        },
        style,
      ]}
    />
  );
}

/** How long the footer takes to turn from "Lanjut" into the sign-up stack. */
const FOOTER_MS = 260;

const HEADER_ICON_SIZE = 32;
const LEVEL_ICON_SIZE = 64;
/** The icon's size on the first slide, its largest, so it is drawn at it. */
const INTRO_ICON_SIZE = 112;
/** The test slide's top padding, above the app icon that settles there. */
const LEVEL_SLIDE_PADDING = 24;

/**
 * The app icon. It opens large and centred above 학교 on the first slide,
 * tucks into the header corner as that slide leaves, and comes back out to
 * the centre of the test slide on the same keyframes as `LevelWash`. Drawn at
 * its largest size and scaled down, so it stays sharp.
 */
function MovingAppIcon({
  position,
  pageWidth,
  lastPage,
  headerTop,
  introCenterY,
}: {
  /** The pager's scroll offset in pages. */
  position: SharedValue<number>;
  pageWidth: number;
  lastPage: number;
  /** Where the 40pt header row starts. */
  headerTop: number;
  /** The centre of the first slide's icon slot, measured from the screen top. */
  introCenterY: number;
}) {
  // px-5 gutter, vertically centred in the header row.
  const corner = { x: 20 + HEADER_ICON_SIZE / 2, y: headerTop + 20 };
  const centreX = pageWidth / 2;
  const levelY = headerTop + 40 + LEVEL_SLIDE_PADDING + LEVEL_ICON_SIZE / 2;
  const style = useAnimatedStyle(() => {
    // Centred on the first and last slide, in the header corner between.
    const input = [0, 1, lastPage - 1, lastPage];
    const x = interpolate(
      position.value,
      input,
      [centreX, corner.x, corner.x, centreX],
      "clamp",
    );
    const y = interpolate(
      position.value,
      input,
      [introCenterY, corner.y, corner.y, levelY],
      "clamp",
    );
    const size = interpolate(
      position.value,
      input,
      [INTRO_ICON_SIZE, HEADER_ICON_SIZE, HEADER_ICON_SIZE, LEVEL_ICON_SIZE],
      "clamp",
    );
    return {
      transform: [
        { translateX: x - INTRO_ICON_SIZE / 2 },
        { translateY: y - INTRO_ICON_SIZE / 2 },
        { scale: size / INTRO_ICON_SIZE },
      ],
    };
  });
  return (
    <Animated.View
      accessibilityLabel="Hakgyo"
      accessible
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, top: 0 }, style]}
    >
      <AppIcon size={INTRO_ICON_SIZE} />
    </Animated.View>
  );
}

/** The onboarding's loudest button: the blue of the app icon. */
function LevelTestButton() {
  return (
    <Pressable
      accessibilityHint="Tes membaca Hangeul, 10 soal"
      accessibilityRole="button"
      className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 py-3 active:opacity-80"
      onPress={() => router.push("/(onboarding)/hangeul-test")}
      style={{
        borderCurve: "continuous",
        backgroundColor: BRAND_BLUE,
        experimental_backgroundImage: `linear-gradient(135deg, #4A93FF, ${BRAND_BLUE})`,
      }}
    >
      <Text className="text-base font-bold text-white">Gas, tes sekarang</Text>
      <SymbolIcon
        name="arrow.right"
        size={16}
        tintColor="#FFFFFF"
        weight="bold"
      />
    </Pressable>
  );
}

function SlidePreview({
  slide,
  scrollGesture,
  placementPassed,
  returning,
  progressReached,
}: {
  slide: Slide;
  scrollGesture: NativeGesture;
  placementPassed: boolean;
  returning: boolean;
  progressReached: boolean;
}) {
  if (slide.key === "features") return <HakgyoWordmark />;
  if (slide.key === "vocabulary")
    return <VocabularyPreview scrollGesture={scrollGesture} />;
  if (slide.key === "level")
    return returning ? null : <LevelTestPreview passed={placementPassed} />;
  return <ProgressPreview play={progressReached} />;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useAnimatedRef<Animated.FlatList<Slide>>();
  const lastPage = SLIDES.length - 1;
  // Returning learners (for example after signing out) start on the final
  // step so the sign-in and sign-up actions are one tap away.
  const initialPage = useRef(hasSeenOnboarding() ? lastPage : 0).current;
  const [page, setPage] = useState(initialPage);
  // The pager's scroll offset in pages, for the progress dots.
  const pagePosition = useSharedValue(initialPage);
  // The deck slide claims upward swipes and the peel corner; horizontal
  // touches fail there and fall through to the pager.
  const [scrollGesture] = useState(() => Gesture.Native());
  const isLastPage = page === lastPage;
  const [placementPassed, setPlacementPassed] = useState(
    hasPassedHangeulPlacement,
  );
  // Fixed for the visit: only the signed-in app sets it.
  const [returning] = useState(hasSignedInBefore);
  // Where the first slide's icon slot sits, for MovingAppIcon: the pager's
  // top in this screen plus the slot's centre within the slide.
  const [listTop, setListTop] = useState<number | null>(null);
  const [introSlotCenter, setIntroSlotCenter] = useState<number | null>(null);
  // The test runs on its own screen; read its result on the way back.
  useFocusEffect(
    useCallback(() => {
      setPlacementPassed(hasPassedHangeulPlacement());
    }, []),
  );

  useEffect(() => {
    if (isLastPage) markOnboardingSeen();
  }, [isLastPage]);

  // The progress slide's ledger plays the first time the slide comes in.
  const progressPage = SLIDES.findIndex((slide) => slide.key === "progress");
  const [progressReached, setProgressReached] = useState(
    initialPage >= progressPage,
  );
  useEffect(() => {
    if (page === progressPage) setProgressReached(true);
  }, [page, progressPage]);

  const goToPage = (nextPage: number) => {
    pagerRef.current?.scrollToIndex({ index: nextPage, animated: true });
  };

  // The page nearest the scroll offset. Following it mid-swipe, rather than
  // waiting for the momentum to end, lets the footer start changing while the
  // next slide slides in instead of popping in after it lands.
  const nearestPage = useSharedValue(initialPage);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      pagePosition.value = event.contentOffset.x / width;
      const nearest = Math.min(
        Math.max(Math.round(event.contentOffset.x / width), 0),
        lastPage,
      );
      if (nearest !== nearestPage.value) {
        nearestPage.value = nearest;
        runOnJS(setPage)(nearest);
      }
    },
  });

  const openAuth = (mode: "sign-in" | "sign-up") => {
    markOnboardingSeen();
    router.push({ pathname: "/auth", params: { mode } });
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
    >
      <IntroWash position={pagePosition} />
      <LevelWash lastPage={lastPage} position={pagePosition} />
      <View className="h-10 flex-row items-center px-5">
        {/* MovingAppIcon draws the icon over this slot. */}
        <View className="w-16" />
        <PageDots
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SLIDES.length, now: page + 1 }}
          className="flex-1 justify-center"
          count={SLIDES.length}
          position={pagePosition}
        />
        <View className="w-16 items-end">
          {!isLastPage ? (
            <Pressable
              accessibilityRole="button"
              className="py-2 active:opacity-60"
              onPress={() => goToPage(lastPage)}
            >
              <Text className="text-sm font-semibold text-muted-foreground">
                Lewati
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <GestureDetector gesture={scrollGesture}>
        <Animated.FlatList
          className="flex-1"
          onLayout={(event) => setListTop(event.nativeEvent.layout.y)}
          data={SLIDES}
          extraData={{ placementPassed, progressReached }}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          horizontal
          initialScrollIndex={initialPage}
          keyExtractor={(slide) => slide.key}
          onScroll={scrollHandler}
          pagingEnabled
          ref={pagerRef}
          renderItem={({ item: slide }) => {
            const copy =
              returning && slide.key === "level" ? RETURNING_LAST_SLIDE : slide;
            const header = (
              <HeroHeader
                align={
                  slide.key === "level" || slide.key === "features"
                    ? "center"
                    : "start"
                }
                description={copy.description}
                eyebrow={copy.eyebrow}
                // Under the app name on the first slide, so one step smaller.
                size={slide.key === "features" ? "md" : "lg"}
                title={copy.title}
              />
            );
            const preview = (
              <SlidePreview
                placementPassed={placementPassed}
                progressReached={progressReached}
                returning={returning}
                scrollGesture={scrollGesture}
                slide={slide}
              />
            );
            if (slide.key === "features") {
              // Centred: the app icon (drawn by MovingAppIcon over the empty
              // slot), the wordmark, then the title.
              return (
                <View
                  className="flex-1 justify-center gap-6 px-5"
                  style={{ width }}
                >
                  <View
                    className="self-center"
                    onLayout={(event) => {
                      const { y, height } = event.nativeEvent.layout;
                      setIntroSlotCenter(y + height / 2);
                    }}
                    style={{ width: INTRO_ICON_SIZE, height: INTRO_ICON_SIZE }}
                  />
                  {preview}
                  <View className="gap-1">
                    <BrandName />
                    <IntroCopy
                      description={slide.description}
                      title={slide.title}
                    />
                  </View>
                  <Entrance delay={900}>
                    <IntroFacts />
                  </Entrance>
                </View>
              );
            }
            return (
              <View
                className={`flex-1 px-5 ${slide.key === "level" ? "gap-6" : slide.key === "vocabulary" ? "gap-5 pt-4" : "gap-6 pt-4"}`}
                style={
                  slide.key === "level"
                    ? {
                        width,
                        // Room for the app icon, which settles above the title.
                        paddingTop: LEVEL_SLIDE_PADDING + LEVEL_ICON_SIZE + 12,
                      }
                    : { width }
                }
              >
                {header}
                {preview}
              </View>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      </GestureDetector>

      {listTop !== null && introSlotCenter !== null ? (
        <MovingAppIcon
          headerTop={insets.top + 12}
          introCenterY={listTop + introSlotCenter}
          lastPage={lastPage}
          pageWidth={width}
          position={pagePosition}
        />
      ) : null}

      {/* The footer grows into the sign-up stack instead of jumping to it. */}
      <Animated.View
        className="px-5"
        layout={LinearTransition.duration(FOOTER_MS)}
      >
        {isLastPage ? (
          <Animated.View
            className="gap-2"
            entering={FadeInDown.duration(FOOTER_MS).delay(60)}
            exiting={FadeOut.duration(FOOTER_MS / 2)}
            key="sign-up"
          >
            {returning ? (
              <>
                <Action onPress={() => openAuth("sign-in")}>Masuk</Action>
                <Action variant="link" onPress={() => openAuth("sign-up")}>
                  Belum punya akun? Daftar
                </Action>
              </>
            ) : null}
            {returning || placementPassed ? null : (
              <>
                <LevelTestButton />
                <View className="flex-row items-center gap-3 py-1">
                  <View className="h-px flex-1 bg-border" />
                  <Text className="text-xs font-semibold text-muted-foreground">
                    Belum bisa? Lanjut di bawah ini
                  </Text>
                  <View className="h-px flex-1 bg-border" />
                </View>
              </>
            )}
            {returning ? null : (
              <>
                <Action onPress={() => openAuth("sign-up")}>
                  Daftar gratis
                </Action>
                <Action variant="link" onPress={() => openAuth("sign-in")}>
                  Sudah punya akun? Masuk
                </Action>
              </>
            )}
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(FOOTER_MS)}
            exiting={FadeOut.duration(FOOTER_MS / 2)}
            key="next"
          >
            <Action onPress={() => goToPage(page + 1)}>Lanjut</Action>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
