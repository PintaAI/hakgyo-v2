import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  formatXp,
  useWeeklyLeaderboard,
  type WeeklyLeaderboard,
} from "../lib/leaderboard";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { AppSegmentedControl } from "./app-segmented-control";
import { HakgyoHero } from "./learn/hakgyo-hero";
import { HeroMark, HeroMarkValue, HeroTitle } from "./learn/hero-parts";
import { Avatar, EmptyState, QueryState } from "./learning-ui";

type Entry = WeeklyLeaderboard["entries"][number];

const SCOPES = ["Global", "Lembaga"] as const;

function LeaderboardRow({ entry }: { entry: Entry }) {
  const { colorScheme, colors } = useAppTheme();
  const podium = entry.rank <= 3;
  return (
    <View
      accessible
      accessibilityLabel={`Peringkat ${entry.rank}, ${entry.isMe ? "kamu, " : ""}${entry.name}, level ${entry.level}, ${formatXp(entry.xp)}`}
      className="min-h-14 flex-row items-center gap-3 px-4 py-2.5"
      style={
        entry.isMe
          ? {
              backgroundColor: withOpacity(
                colors.primary,
                colorScheme === "dark" ? 0.22 : 0.1,
              ),
            }
          : undefined
      }
    >
      <Text
        className={`w-9 text-center text-sm font-black tabular-nums ${podium ? "text-primary" : "text-muted-foreground"}`}
      >
        {entry.rank}
      </Text>
      <Avatar
        initials={entry.name.charAt(0).toUpperCase() || "H"}
        size={36}
        tone={entry.isMe ? "primary" : "muted"}
        uri={entry.image}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {entry.isMe ? `${entry.name} (kamu)` : entry.name}
        </Text>
        <Text className="text-xs text-muted-foreground">Lv {entry.level}</Text>
      </View>
      <Text className="text-sm font-bold tabular-nums text-foreground">
        {formatXp(entry.xp)}
      </Text>
    </View>
  );
}

/** The hero's title and line: where the learner stands, what the next rank takes. */
function standing(data: WeeklyLeaderboard | undefined) {
  const me = data?.me;
  if (!data) return { title: "Peringkat minggu ini", description: null };
  if (!me) {
    return {
      title: "Belum ada XP minggu ini",
      description:
        "Selesaikan satu materi, permainan, atau latihan untuk masuk peringkat.",
    };
  }
  if (me.xpToNextRank === null) {
    return {
      title: "Kamu di puncak",
      description: `Pertahankan ${formatXp(me.xp)} sampai Minggu.`,
    };
  }
  return {
    title: `${formatXp(me.xpToNextRank)} lagi ke #${(me.rank - 1).toLocaleString("id-ID")}`,
    description: `Kamu sudah mengumpulkan ${formatXp(me.xp)} sejak Senin.`,
  };
}

/**
 * This week's XP ranking (Monday to Sunday, WIB), for everyone or the active
 * organization: the learner's standing in the Hakgyo hero, then the top 100,
 * and the learner's own row below them when they rank lower.
 */
export function LeaderboardContent({ onClose }: { onClose: () => void }) {
  const { activeBrand, activeOrganizationId } = useAppTheme();
  const [scope, setScope] = useState(0);
  const organizationScope = SCOPES[scope] === "Lembaga" && activeOrganizationId;
  const query = useWeeklyLeaderboard(
    organizationScope ? activeOrganizationId : null,
  );
  const data = query.data;
  const me = data?.me ?? null;
  const meBelow = me && !data?.entries.some((entry) => entry.isMe) ? me : null;
  const { title, description } = standing(data);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow gap-5 px-5 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <HakgyoHero inSheet onClose={onClose} closeLabel="Tutup peringkat">
        <HeroMark
          done={me?.rank === 1}
          face={
            <HeroMarkValue
              value={me ? `#${me.rank.toLocaleString("id-ID")}` : "–"}
              label={
                me
                  ? `dari ${data?.participants.toLocaleString("id-ID")} murid`
                  : "belum ada XP"
              }
            />
          }
        />
        <HeroTitle
          eyebrow="Peringkat minggu ini"
          title={title}
          description={description}
        />
        {activeOrganizationId ? (
          <AppSegmentedControl
            values={[...SCOPES]}
            selectedIndex={scope}
            onIndexChange={setScope}
          />
        ) : null}
      </HakgyoHero>

      <Text className="-mt-2 text-xs leading-4 text-muted-foreground">
        {organizationScope
          ? `XP yang dikumpulkan di ${activeBrand.name} sejak Senin.`
          : "XP dari semua murid Hakgyo sejak Senin."}{" "}
        Peringkat mulai lagi dari nol setiap Senin pukul 00.00 WIB.
      </Text>

      <QueryState
        pending={query.isPending}
        pendingLabel="Memuat peringkat"
        error={data ? null : query.error}
        retry={() => void query.refetch()}
      />

      {data ? (
        data.entries.length ? (
          <View className="overflow-hidden rounded-2xl border border-border">
            {data.entries.map((entry, index) => (
              <View key={entry.rank}>
                {index > 0 ? <View className="ml-16 h-px bg-border" /> : null}
                <LeaderboardRow entry={entry} />
              </View>
            ))}
            {meBelow ? (
              <>
                <Text className="border-t border-border py-1 text-center text-muted-foreground">
                  ⋯
                </Text>
                <LeaderboardRow entry={meBelow} />
              </>
            ) : null}
          </View>
        ) : (
          <EmptyState title="Belum ada peringkat">
            Belum ada yang mengumpulkan XP minggu ini. Jadilah yang pertama!
          </EmptyState>
        )
      ) : null}
    </ScrollView>
  );
}
