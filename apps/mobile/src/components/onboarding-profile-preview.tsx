import { useState } from "react";
import { Platform, Text, View, useWindowDimensions } from "react-native";

import { localDateKey } from "../lib/optimistic-gamification";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { ConfettiBurst } from "./learn/confetti";
import { MilestoneTrail, ProfileHero } from "./profile-learner";
import { SymbolIcon } from "./ui/symbol-icon";
import { WeeklyStreakView } from "./weekly-streak";

/** The width the profile is laid out at before it is scaled into the frame. */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
/** The phone's frame around the screen, as a share of the frame's width. */
const BEZEL_RATIO = 0.035;
const FRAME_CORNER_RATIO = 0.16;
const FADE_HEIGHT = 96;

const SAMPLE_LEARNER = {
  displayName: "Nadia Putri",
  initials: "NP",
  email: "nadia@contoh.id",
  stats: {
    vocabularyMastered: 248,
    modulesMastered: 6,
    assessmentAttempts: 12,
    totalXp: 3420,
  },
};
const SAMPLE_STREAK = 4;
const SAMPLE_WEEK_XP = 380;
/** Newest first, as Profil lists them. */
const SAMPLE_ACHIEVEMENTS = [
  { code: "XP_1000", daysAgo: 0 },
  { code: "STREAK_3", daysAgo: 1 },
  { code: "FIRST_ACTIVITY", daysAgo: 6 },
];

function sampleAchievements() {
  return SAMPLE_ACHIEVEMENTS.map(({ code, daysAgo }) => {
    const earnedAt = new Date();
    earnedAt.setDate(earnedAt.getDate() - daysAgo);
    return { code, earnedAt };
  });
}

/** This week with the last `SAMPLE_STREAK` days active, today included. */
function sampleWeek() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const activeDates = Array.from({ length: SAMPLE_STREAK }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return localDateKey(date);
  });
  return {
    activeDates,
    startsOn: localDateKey(monday),
    today: localDateKey(today),
    xp: SAMPLE_WEEK_XP,
  };
}

function StatusBar() {
  const { colors } = useAppTheme();
  return (
    <View className="h-[54px] flex-row items-center justify-between px-8 pt-3">
      <Text className="w-16 text-[17px] font-semibold text-foreground">
        9:41
      </Text>
      <View className="w-16 flex-row items-center justify-end gap-1.5">
        <SymbolIcon
          name="cellularbars"
          size={15}
          tintColor={colors.foreground}
        />
        <SymbolIcon name="wifi" size={15} tintColor={colors.foreground} />
        <SymbolIcon
          name="battery.100"
          size={22}
          tintColor={colors.foreground}
        />
      </View>
    </View>
  );
}

/** Profil's header and its Profil/Pengaturan switch, drawn rather than native. */
function ProfileChrome() {
  const { colors } = useAppTheme();
  return (
    <View className="gap-4 px-5">
      <View className="h-11 flex-row items-center justify-between">
        <View className="size-9 items-center justify-center rounded-full bg-muted">
          <SymbolIcon
            name="xmark"
            size={14}
            tintColor={colors.foreground}
            weight="semibold"
          />
        </View>
        <Text className="text-[17px] font-semibold text-foreground">
          Profil
        </Text>
        <View className="size-9" />
      </View>
      <View className="h-8 flex-row rounded-lg bg-muted p-0.5">
        <View className="flex-1 items-center justify-center rounded-md bg-background">
          <Text className="text-[13px] font-semibold text-foreground">
            Profil
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[13px] text-foreground">Pengaturan</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The real Profil components with sample data, scaled down into a phone like
 * a screenshot, its lower part fading into the page. Fills the height it is
 * given and crops the rest.
 */
export function OnboardingProfilePreview({
  celebrate = false,
}: {
  /** Bursts confetti over the phone, for example once a reminder is set. */
  celebrate?: boolean;
}) {
  const { colors } = useAppTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const { width } = useWindowDimensions();
  const [week] = useState(sampleWeek);
  const [achievements] = useState(sampleAchievements);
  const frameWidth = Math.min(Math.round(width * 0.66), 280);
  const bezel = Math.round(frameWidth * BEZEL_RATIO);
  const screenWidth = frameWidth - bezel * 2;
  const scale = screenWidth / SCREEN_WIDTH;
  const frameRadius = frameWidth * FRAME_CORNER_RATIO;

  return (
    <View
      accessibilityLabel={`Contoh halaman Profil: ${SAMPLE_LEARNER.stats.vocabularyMastered} kosakata, ${SAMPLE_LEARNER.stats.totalXp} XP, streak ${SAMPLE_STREAK} hari.`}
      accessible
      className="flex-1 overflow-hidden"
      onLayout={(event) => {
        const { width: boxWidth, height } = event.nativeEvent.layout;
        setSize({ width: boxWidth, height });
      }}
      pointerEvents="none"
    >
      <View className="items-center pt-1">
        <View
          style={{
            width: frameWidth,
            padding: bezel,
            borderRadius: frameRadius,
            borderCurve: "continuous",
            backgroundColor: "#0B0B0F",
            borderWidth: 1,
            borderColor: "#3A3A40",
          }}
        >
          <View
            className="overflow-hidden bg-background"
            style={{
              width: screenWidth,
              height: SCREEN_HEIGHT * scale,
              borderRadius: frameRadius - bezel,
              borderCurve: "continuous",
            }}
          >
            <View
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                transform: [{ scale }],
                transformOrigin: "top left",
              }}
            >
              <StatusBar />
              <View className="gap-6">
                <ProfileChrome />
                <View className="gap-6 px-5">
                  <ProfileHero
                    displayName={SAMPLE_LEARNER.displayName}
                    email={SAMPLE_LEARNER.email}
                    image={null}
                    initials={SAMPLE_LEARNER.initials}
                    isPending={false}
                    stats={SAMPLE_LEARNER.stats}
                  />
                  <WeeklyStreakView
                    currentStreak={SAMPLE_STREAK}
                    weeklyActivity={week}
                  />
                  {/* Runs under the fade, so the screen never ends blank. */}
                  <MilestoneTrail
                    achievements={achievements}
                    error={null}
                    isPending={false}
                    onRetry={() => undefined}
                  />
                </View>
              </View>
              {/* Dynamic Island on iOS, a punch-hole camera on Android. */}
              <View
                className="absolute rounded-full bg-black"
                style={
                  Platform.OS === "ios"
                    ? {
                        top: 11,
                        left: (SCREEN_WIDTH - 124) / 2,
                        width: 124,
                        height: 36,
                      }
                    : {
                        top: 14,
                        left: (SCREEN_WIDTH - 26) / 2,
                        width: 26,
                        height: 26,
                      }
                }
              />
            </View>
          </View>
        </View>
      </View>
      <View
        className="absolute inset-x-0 bottom-0"
        style={{
          height: FADE_HEIGHT,
          experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.background, 0)}, ${colors.background})`,
        }}
      />
      {size ? (
        <ConfettiBurst
          colors={[colors.primary, "#F2C14E", "#F472B6", "#34D399", "#60A5FA"]}
          delayMs={0}
          fire={celebrate}
          height={size.height}
          spread={2.2}
          width={size.width}
        />
      ) : null}
    </View>
  );
}
