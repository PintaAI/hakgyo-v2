import { formatScoreOutOf } from "@hakgyo/shared";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { agoLabel } from "../../lib/relative-time";
import { Action, Card, Eyebrow } from "../learning-ui";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
};

/** Rows before "Lihat semua peringkat". */
const TOP_ROWS = 5;
/** How often "Diperbarui … lalu" re-renders (a local timer, no requests). */
const AGO_TICK_MS = 30_000;

/**
 * A latihan or tryout's ranking under the learner's result: the top five,
 * the learner's own row when it falls below them, and the rest on request.
 * Provisional while the event is open, since only graded attempts count.
 */
export function EventLeaderboard({
  entries,
  userId,
  final,
  updatedAt,
  eventLabel,
}: {
  entries: readonly Entry[];
  /** "latihan" or "tryout", for the note. */
  eventLabel: string;
  userId: string | undefined;
  /** The event is closed: the ranking no longer changes. */
  final: boolean;
  /** When the ranking was fetched, for "Diperbarui … lalu". */
  updatedAt: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (final) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), AGO_TICK_MS);
    return () => clearInterval(timer);
  }, [final, updatedAt]);

  const own = entries.find((entry) => entry.userId === userId);
  const shown = expanded ? entries : entries.slice(0, TOP_ROWS);
  const ownBelow = !expanded && own && !shown.includes(own);

  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-baseline justify-between gap-3">
        <Eyebrow size="xs">
          {final ? "Peringkat akhir" : "Peringkat sementara"}
        </Eyebrow>
        {final ? null : (
          <Text className="text-xs text-muted-foreground">
            Diperbarui {agoLabel(updatedAt, now)}
          </Text>
        )}
      </View>
      {entries.length ? (
        <View>
          {shown.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              own={entry === own}
            />
          ))}
          {ownBelow ? (
            <>
              <Text
                accessibilityElementsHidden
                className="py-1 text-center text-xs text-muted-foreground"
              >
                ⋯
              </Text>
              <LeaderboardRow entry={own} own />
            </>
          ) : null}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">
          Belum ada hasil yang sudah dinilai.
        </Text>
      )}
      {entries.length > TOP_ROWS ? (
        <Action
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((value) => !value)}
        >
          {expanded
            ? "Tampilkan 5 teratas"
            : `Lihat semua peringkat (${entries.length})`}
        </Action>
      ) : null}
      <Text className="text-xs leading-4 text-muted-foreground">
        {final
          ? "Percobaan terbaik tiap peserta yang dihitung. Nilai seri ditentukan oleh waktu penyelesaian."
          : `Peringkat bisa berubah sampai ${eventLabel} ditutup. Jawaban tertulis dihitung setelah dinilai pengajar.`}
      </Text>
    </Card>
  );
}

function LeaderboardRow({ entry, own }: { entry: Entry; own: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`Peringkat ${entry.rank}, ${own ? "kamu" : entry.name}, ${entry.percentage}%`}
      className={`flex-row items-center gap-3 rounded-xl px-2 py-2 ${own ? "bg-primary/10" : ""}`}
    >
      <Text
        className={`w-8 text-sm font-black tabular-nums ${entry.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}
      >
        #{entry.rank}
      </Text>
      <Text
        className={`min-w-0 flex-1 text-sm text-foreground ${own ? "font-black" : "font-semibold"}`}
        numberOfLines={1}
      >
        {own ? `${entry.name} (kamu)` : entry.name}
      </Text>
      <Text className="text-xs tabular-nums text-muted-foreground">
        {formatScoreOutOf(entry.score, entry.maxScore, " / ")}
      </Text>
      <Text className="w-11 text-right text-sm font-bold tabular-nums text-foreground">
        {entry.percentage}%
      </Text>
    </View>
  );
}
