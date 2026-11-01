import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
} from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Action,
  Badge,
  Card,
  Eyebrow,
  HeroHeader,
  PageDots,
} from "../../src/components/learning-ui";
import { LearningItemRow } from "../../src/components/learn/learning-item-row";
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
import type { LearningItemType } from "../../src/lib/learning-item-type";
import { markDeckTutorialSeen } from "../../src/lib/deck-tutorial";
import { hasPassedHangeulPlacement } from "../../src/lib/hangeul-placement";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "../../src/lib/onboarding";
import { getStreakProgressDays } from "../../src/lib/streak";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { BRAND_BLUE, withOpacity } from "../../src/theme/colors";
import { AppIcon } from "../../src/components/ui/app-icon";
import { SymbolIcon } from "../../src/components/ui/symbol-icon";

type Slide = {
  key: "course" | "vocabulary" | "streak" | "level";
  eyebrow: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    key: "course",
    eyebrow: "MULAI DARI NOL",
    title: "Kuasai Hangeul lebih dulu",
    description:
      "Setiap akun baru langsung mendapat kurikulum Hangeul Mastery. Belajar membaca dan menulis huruf Korea langkah demi langkah.",
  },
  {
    key: "vocabulary",
    eyebrow: "KOSAKATA",
    title: "Hafalkan kata dengan kartu",
    description:
      "Coba sekarang: begini cara berlatih kosakata sampai benar-benar hafal.",
  },
  {
    key: "streak",
    eyebrow: "SETIAP HARI",
    title: "Belajar sedikit, tapi rutin",
    description:
      "Kumpulkan XP dan jaga streak harianmu. Materi tetap bisa dibuka saat offline.",
  },
  {
    key: "level",
    eyebrow: "SKIP YANG BASIC",
    title: "Udah bisa baca Hangeul?",
    description: "10 soal, 2 menit. Lulus? Hangeul dasar langsung beres.",
  },
];

// What passing marks completed in Hangeul Mastery, rounded down so the copy
// survives small course edits (31 materials, 169 words, 10 quizzes when
// written).
const LEVEL_UNLOCKS = [
  { value: "30+", label: "materi" },
  { value: "160+", label: "kosakata" },
  { value: "10", label: "kuis" },
  { value: "1", label: "lencana" },
];

const SAMPLE_COURSE_ITEMS: {
  title: string;
  type: LearningItemType;
  statusText: string;
  completed: boolean;
  highlighted?: boolean;
  locked?: boolean;
}[] = [
  {
    title: "Mengenal Hangeul",
    type: "MATERIAL",
    statusText: "Selesai",
    completed: true,
  },
  {
    title: "Vokal dasar ㅏ ㅓ ㅗ ㅜ",
    type: "MATERIAL",
    statusText: "Lanjutkan",
    completed: false,
    highlighted: true,
  },
  {
    title: "Kata pertama",
    type: "VOCABULARY_SET",
    statusText: "12 kata",
    completed: false,
  },
  {
    title: "Kuis membaca Hangeul",
    type: "ASSESSMENT",
    statusText: "10 soal",
    completed: false,
    locked: true,
  },
];

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

function PreviewCard({ children }: { children: ReactNode }) {
  return (
    <View pointerEvents="none">
      <Card className="gap-4 p-5">{children}</Card>
    </View>
  );
}

function CoursePreview() {
  return (
    <PreviewCard>
      <View className="gap-1">
        <Eyebrow tone="primary" size="md">
          Kurikulum gratis
        </Eyebrow>
        <Text className="text-xl font-black text-foreground">
          Hangeul Mastery
        </Text>
      </View>
      <View>
        {SAMPLE_COURSE_ITEMS.map((item, index) => (
          <LearningItemRow
            completed={item.completed}
            highlighted={item.highlighted}
            isLast={index === SAMPLE_COURSE_ITEMS.length - 1}
            key={item.title}
            locked={item.locked}
            onPress={() => {}}
            showChevron={false}
            statusText={item.statusText}
            title={item.title}
            type={item.type}
          />
        ))}
      </View>
    </PreviewCard>
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

function StreakPreview() {
  const { colors } = useAppTheme();
  const [days] = useState(sampleStreakDays);

  return (
    <PreviewCard>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-foreground">Streak 4 hari</Text>
        <Badge>320 XP minggu ini</Badge>
      </View>
      <View className="flex-row">
        {days.map((day) => (
          <View className="flex-1 items-center gap-1.5" key={day.dateKey}>
            <Text className="text-[10px] font-bold uppercase text-muted-foreground">
              {day.weekday}
            </Text>
            <View
              className={`h-9 w-9 items-center justify-center rounded-full border ${day.today ? "border-foreground" : "border-transparent"} ${day.active ? "bg-primary/10" : "bg-muted"}`}
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
    </PreviewCard>
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
        <Text className="text-6xl font-black text-foreground">학교</Text>
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

const HEADER_ICON_SIZE = 32;
const LEVEL_ICON_SIZE = 64;
/** The test slide's top padding, above the app icon that settles there. */
const LEVEL_SLIDE_PADDING = 24;

/**
 * The app icon, which leaves the header corner for the centre of the test
 * slide on the same keyframes as `LevelWash`. Drawn at its final size and
 * scaled down in the header, so it stays sharp.
 */
function MovingAppIcon({
  position,
  pageWidth,
  lastPage,
  headerTop,
}: {
  /** The pager's scroll offset in pages. */
  position: SharedValue<number>;
  pageWidth: number;
  lastPage: number;
  /** Where the 40pt header row starts. */
  headerTop: number;
}) {
  // px-5 gutter, vertically centred in the header row.
  const start = { x: 20 + HEADER_ICON_SIZE / 2, y: headerTop + 20 };
  const end = {
    x: pageWidth / 2,
    y: headerTop + 40 + LEVEL_SLIDE_PADDING + LEVEL_ICON_SIZE / 2,
  };
  const style = useAnimatedStyle(() => {
    const progress = interpolate(
      position.value,
      [lastPage - 1, lastPage],
      [0, 1],
      "clamp",
    );
    return {
      transform: [
        { translateX: progress * (end.x - start.x) },
        { translateY: progress * (end.y - start.y) },
        {
          scale: interpolate(
            progress,
            [0, 1],
            [HEADER_ICON_SIZE / LEVEL_ICON_SIZE, 1],
          ),
        },
      ],
    };
  });
  return (
    <Animated.View
      accessibilityLabel="Hakgyo"
      accessible
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: start.x - LEVEL_ICON_SIZE / 2,
          top: start.y - LEVEL_ICON_SIZE / 2,
        },
        style,
      ]}
    >
      <AppIcon size={LEVEL_ICON_SIZE} />
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
}: {
  slide: Slide;
  scrollGesture: NativeGesture;
  placementPassed: boolean;
}) {
  if (slide.key === "course") return <CoursePreview />;
  if (slide.key === "vocabulary")
    return <VocabularyPreview scrollGesture={scrollGesture} />;
  if (slide.key === "level")
    return <LevelTestPreview passed={placementPassed} />;
  return <StreakPreview />;
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
  // The test runs on its own screen; read its result on the way back.
  useFocusEffect(
    useCallback(() => {
      setPlacementPassed(hasPassedHangeulPlacement());
    }, []),
  );

  useEffect(() => {
    if (isLastPage) markOnboardingSeen();
  }, [isLastPage]);

  const goToPage = (nextPage: number) => {
    pagerRef.current?.scrollToIndex({ index: nextPage, animated: true });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      pagePosition.value = event.contentOffset.x / width;
    },
    onMomentumEnd: (event) => {
      runOnJS(setPage)(
        Math.round(event.contentOffset.x / event.layoutMeasurement.width),
      );
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
          data={SLIDES}
          extraData={placementPassed}
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
          renderItem={({ item: slide }) => (
            <View
              className={`flex-1 px-5 ${slide.key === "level" ? "gap-6" : "gap-8 pt-8"}`}
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
              <HeroHeader
                align={slide.key === "level" ? "center" : "start"}
                description={slide.description}
                eyebrow={slide.eyebrow}
                size="lg"
                title={slide.title}
              />
              <SlidePreview
                placementPassed={placementPassed}
                scrollGesture={scrollGesture}
                slide={slide}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </GestureDetector>

      <MovingAppIcon
        headerTop={insets.top + 12}
        lastPage={lastPage}
        pageWidth={width}
        position={pagePosition}
      />

      <View className="gap-2 px-5">
        {isLastPage ? (
          <>
            {placementPassed ? null : (
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
            <Action onPress={() => openAuth("sign-up")}>Daftar gratis</Action>
            <Action variant="link" onPress={() => openAuth("sign-in")}>
              Sudah punya akun? Masuk
            </Action>
          </>
        ) : (
          <Action onPress={() => goToPage(page + 1)}>Lanjut</Action>
        )}
      </View>
    </View>
  );
}
