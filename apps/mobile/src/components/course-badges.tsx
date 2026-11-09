import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { authClient } from "../lib/auth-client";
import { badgeEarnedAt, medalGlyph, useBadgeClaims } from "../lib/badge-claims";
import { CourseMedal } from "./hangeul-mastery-medal";
import { EmptyState, SectionHeader } from "./learning-ui";

function shortDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Profil's shelf of claimed course badges, newest first. Hangeul Mastery is
 * left out: Pencapaian above already shows it as an achievement.
 */
export function CourseBadges() {
  const { data: session } = authClient.useSession();
  const claims = useBadgeClaims(session?.user.id);
  const badges = Object.entries(claims)
    .filter(([courseId]) => courseId !== HANGEUL_MASTERY_COURSE_ID)
    .map(([courseId, claim]) => ({
      courseId,
      title: claim.title ?? "Kurikulum",
      earnedAt: badgeEarnedAt(claim),
    }))
    .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());

  return (
    <View className="gap-4">
      <SectionHeader
        title="Lencana kurikulum"
        trailing={
          badges.length > 0 ? (
            <Text className="text-xs font-semibold text-muted-foreground">
              {badges.length} diraih
            </Text>
          ) : undefined
        }
      />
      {badges.length === 0 ? (
        <EmptyState title="Belum ada lencana" variant="flush">
          Tuntaskan semua bab sebuah kurikulum, lalu klaim lencananya di daftar
          Bab pada tab Belajar.
        </EmptyState>
      ) : (
        <View className="flex-row flex-wrap" style={{ rowGap: 20 }}>
          {badges.map((badge) => (
            <Pressable
              accessibilityHint="Membuka kurikulum"
              accessibilityLabel={`Lencana ${badge.title}, selesai ${shortDate(badge.earnedAt)}`}
              accessibilityRole="button"
              className="w-1/3 items-center gap-2 px-1 active:opacity-60"
              key={badge.courseId}
              onPress={() =>
                router.push({
                  pathname: "/courses/[courseId]",
                  params: { courseId: badge.courseId },
                })
              }
            >
              <CourseMedal size={56} glyph={medalGlyph(badge.title)} />
              <View className="items-center gap-0.5">
                <Text
                  className="text-center text-xs font-semibold leading-4 text-foreground"
                  numberOfLines={2}
                >
                  {badge.title}
                </Text>
                <Text className="text-center text-[11px] text-muted-foreground">
                  {shortDate(badge.earnedAt)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
