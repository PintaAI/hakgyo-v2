import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
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

import { LearningItemRow } from "../../src/components/learn/learning-item-row";
import type { LearningItemType } from "../../src/lib/learning-item-type";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "../../src/lib/onboarding";
import { getStreakProgressDays } from "../../src/lib/streak";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

type Slide = {
  key: "course" | "vocabulary" | "streak";
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
      "Latih kosakata dengan kartu yang bisa dibalik, didengarkan, dan diulang sampai benar-benar hafal.",
  },
  {
    key: "streak",
    eyebrow: "SETIAP HARI",
    title: "Belajar sedikit, tapi rutin",
    description:
      "Kumpulkan XP dan jaga streak harianmu. Materi tetap bisa dibuka saat offline.",
  },
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
    <View
      className="gap-4 rounded-[28px] border border-border bg-card p-5"
      pointerEvents="none"
    >
      {children}
    </View>
  );
}

function CoursePreview() {
  return (
    <PreviewCard>
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-primary">
          Kurikulum gratis
        </Text>
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

function VocabularyPreview() {
  return (
    <PreviewCard>
      <View className="items-center gap-2 rounded-2xl bg-primary/10 px-4 py-8">
        <Text className="text-4xl font-black text-foreground">안녕하세요</Text>
        <Text className="text-sm font-semibold text-muted-foreground">
          annyeonghaseyo
        </Text>
      </View>
      <View className="items-center gap-1">
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-muted-foreground">
          Arti
        </Text>
        <Text className="text-2xl font-bold text-foreground">Halo</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 items-center rounded-full border border-border px-4 py-3">
          <Text className="font-bold text-foreground">Belum hafal</Text>
        </View>
        <View className="flex-1 items-center rounded-full bg-primary px-4 py-3">
          <Text className="font-bold text-primary-foreground">Sudah hafal</Text>
        </View>
      </View>
    </PreviewCard>
  );
}

function StreakPreview() {
  const { colors } = useAppTheme();
  const [days] = useState(sampleStreakDays);

  return (
    <PreviewCard>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-bold text-foreground">Streak 4 hari</Text>
        <View className="rounded-full bg-primary/10 px-2.5 py-1">
          <Text className="text-xs font-bold text-primary">
            320 XP minggu ini
          </Text>
        </View>
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
                <SymbolView
                  fallback={<Text className="text-base">🔥</Text>}
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

function SlidePreview({ slide }: { slide: Slide }) {
  if (slide.key === "course") return <CoursePreview />;
  if (slide.key === "vocabulary") return <VocabularyPreview />;
  return <StreakPreview />;
}

function ProgressDot({
  scrollX,
  index,
  pageWidth,
}: {
  scrollX: SharedValue<number>;
  index: number;
  pageWidth: number;
}) {
  const style = useAnimatedStyle(() => {
    const active = interpolate(
      scrollX.value / pageWidth - index,
      [-1, 0, 1],
      [0, 1, 0],
      "clamp",
    );
    return { width: 8 + active * 20, opacity: 0.25 + active * 0.75 };
  });

  return (
    <Animated.View className="h-1.5 rounded-full bg-primary" style={style} />
  );
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
  const scrollX = useSharedValue(initialPage * width);
  const isLastPage = page === lastPage;

  useEffect(() => {
    if (isLastPage) markOnboardingSeen();
  }, [isLastPage]);

  const goToPage = (nextPage: number) => {
    pagerRef.current?.scrollToIndex({ index: nextPage, animated: true });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
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
      <View className="h-10 flex-row items-center px-6">
        <Text className="w-16 text-xs font-black tracking-[3px] text-primary">
          HAKGYO
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SLIDES.length, now: page + 1 }}
          className="flex-1 flex-row items-center justify-center gap-2"
        >
          {SLIDES.map((slide, index) => (
            <ProgressDot
              index={index}
              key={slide.key}
              pageWidth={width}
              scrollX={scrollX}
            />
          ))}
        </View>
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

      <Animated.FlatList
        className="flex-1"
        data={SLIDES}
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
          <View className="flex-1 gap-8 px-6 pt-8" style={{ width }}>
            <View className="gap-3">
              <Text className="text-xs font-bold tracking-[2px] text-primary">
                {slide.eyebrow}
              </Text>
              <Text className="text-4xl font-black leading-tight tracking-tight text-foreground">
                {slide.title}
              </Text>
              <Text className="text-base leading-6 text-muted-foreground">
                {slide.description}
              </Text>
            </View>
            <SlidePreview slide={slide} />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />

      <View className="gap-2 px-6">
        {isLastPage ? (
          <>
            <Pressable
              accessibilityRole="button"
              className="items-center rounded-full bg-primary px-6 py-4 active:opacity-80"
              onPress={() => openAuth("sign-up")}
            >
              <Text className="font-bold text-primary-foreground">
                Daftar gratis
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="items-center rounded-full px-6 py-3 active:opacity-60"
              onPress={() => openAuth("sign-in")}
            >
              <Text className="font-bold text-primary">
                Sudah punya akun? Masuk
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            className="items-center rounded-full bg-primary px-6 py-4 active:opacity-80"
            onPress={() => goToPage(page + 1)}
          >
            <Text className="font-bold text-primary-foreground">Lanjut</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
