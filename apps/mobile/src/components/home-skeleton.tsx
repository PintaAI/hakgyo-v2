import { View } from "react-native";

import {
  DECK_CARD_HEIGHT,
  DECK_TOP_SPACE,
} from "../lib/vocabulary-deck-motion";
import { useMobileSync } from "../providers/MobileSyncProvider";
import { PREPARING_DETAIL, PREPARING_TITLE } from "../sync/activity";
import { Skeleton } from "./ui/skeleton";

/** Matches the answer field and language switch under the deck. */
const CONTROL_SIZE = 44;

/**
 * The Hari Ini tab before its first sync: the weekly streak, today's
 * vocabulary deck and the question challenge, in their real sizes. Shown
 * while the local index loads or the first sync runs.
 *
 * It reads the sync phase itself: sync status changes many times a sync, and
 * subscribing here keeps those renders out of the Home screen and its deck.
 */
export function HomeSkeleton({ pending }: { pending: boolean }) {
  const { refreshPhase } = useMobileSync();
  if (!pending && !refreshPhase) return null;
  const label = refreshPhase
    ? `${PREPARING_TITLE}. ${PREPARING_DETAIL[refreshPhase]}`
    : `${PREPARING_TITLE}…`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className="gap-6"
    >
      {/* WeeklyStreak */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </View>
        <View className="flex-row">
          {Array.from({ length: 7 }, (_, day) => (
            <View className="flex-1 items-center gap-1.5" key={day}>
              <Skeleton className="h-2.5 w-5 rounded" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </View>
          ))}
        </View>
      </View>

      {/* TodayVocabularyPractice */}
      <View className="gap-3">
        <View className="items-center">
          <Skeleton className="h-3 w-48 rounded" />
        </View>
        <Skeleton
          className="mx-4 rounded-[20px]"
          style={{ marginTop: DECK_TOP_SPACE, height: DECK_CARD_HEIGHT }}
        />
        <View className="flex-row items-center gap-2">
          <Skeleton
            className="flex-1 rounded-full"
            style={{ height: CONTROL_SIZE }}
          />
          <Skeleton
            className="rounded-full"
            style={{ width: CONTROL_SIZE, height: CONTROL_SIZE }}
          />
        </View>
      </View>

      {/* TodayAssessmentPractice */}
      <View className="gap-4">
        <View className="items-center gap-4">
          <Skeleton className="h-5 w-52 rounded-md" />
          <Skeleton className="h-3 w-40 rounded" />
          {/* Page dots */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-1.5 w-7 rounded-full" />
            {Array.from({ length: 4 }, (_, dot) => (
              <Skeleton className="h-1.5 w-2 rounded-full" key={dot} />
            ))}
          </View>
        </View>
        {/* The question card: header, progress, prompt. */}
        <View className="gap-4 rounded-2xl border border-border p-5">
          <View className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </View>
            <Skeleton className="h-2 rounded-full" />
          </View>
          <View className="gap-2">
            <Skeleton className="h-4 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </View>
        </View>
        {Array.from({ length: 3 }, (_, option) => (
          <Skeleton className="h-16 rounded-[20px]" key={option} />
        ))}
      </View>
    </View>
  );
}
