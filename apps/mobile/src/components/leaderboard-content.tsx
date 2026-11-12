import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import {
  formatXp,
  useWeeklyLeaderboard,
  type WeeklyLeaderboard,
} from "../lib/leaderboard";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { AppSegmentedControl } from "./app-segmented-control";
import { Avatar, EmptyState, QueryState, SectionHeader } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";

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

/** Where the learner stands and what the next rank takes. */
function MyStanding({ data }: { data: WeeklyLeaderboard }) {
  const { me, participants } = data;
  if (!me) {
    return (
      <View className="gap-1">
        <Text className="text-lg font-black text-foreground">
          Belum ada XP minggu ini
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          Selesaikan satu materi, permainan, atau latihan untuk masuk peringkat.
        </Text>
      </View>
    );
  }
  return (
    <View className="gap-1">
      <Text className="text-3xl font-black tabular-nums text-foreground">
        #{me.rank.toLocaleString("id-ID")}
        <Text className="text-base font-bold text-muted-foreground">
          {` dari ${participants.toLocaleString("id-ID")} murid`}
        </Text>
      </Text>
      <Text className="text-sm leading-5 text-muted-foreground">
        {me.xpToNextRank === null
          ? `Kamu di puncak dengan ${formatXp(me.xp)}. Pertahankan sampai Minggu!`
          : `${formatXp(me.xpToNextRank)} lagi untuk naik ke #${(me.rank - 1).toLocaleString("id-ID")}.`}
      </Text>
    </View>
  );
}

/**
 * This week's XP ranking (Monday to Sunday, WIB), for everyone or the active
 * organization: the learner's standing, the top 100, and the learner's own
 * row below them when they rank lower.
 */
export function LeaderboardContent({ onClose }: { onClose: () => void }) {
  const { activeBrand, activeOrganizationId, colors } = useAppTheme();
  const [scope, setScope] = useState(0);
  const organizationScope = SCOPES[scope] === "Lembaga" && activeOrganizationId;
  const query = useWeeklyLeaderboard(
    organizationScope ? activeOrganizationId : null,
  );
  const data = query.data;
  const meBelow =
    data?.me && !data.entries.some((entry) => entry.isMe) ? data.me : null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow gap-5 px-5 pb-8 pt-4"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {Platform.OS !== "ios" ? (
        <SectionHeader
          title="Peringkat minggu ini"
          trailing={
            <Pressable
              accessibilityLabel="Tutup peringkat"
              accessibilityRole="button"
              className="rounded-full px-3 py-2 active:opacity-60"
              onPress={onClose}
            >
              <SymbolIcon name="xmark" size={20} tintColor={colors.primary} />
            </Pressable>
          }
        />
      ) : null}

      {activeOrganizationId ? (
        <AppSegmentedControl
          values={[...SCOPES]}
          selectedIndex={scope}
          onIndexChange={setScope}
        />
      ) : null}

      <Text className="text-xs leading-4 text-muted-foreground">
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
        <>
          <MyStanding data={data} />
          {data.entries.length ? (
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
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
