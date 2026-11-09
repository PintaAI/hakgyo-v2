import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useSidebarIndicators } from "../lib/sidebar-indicators";
import { openAssessmentEvent } from "../lib/navigation";
import { dateLabel, timeLabel } from "../lib/study";
import {
  AGENDA_LIMIT,
  buildTodayAgenda,
  type AgendaItem,
} from "../lib/today-agenda";
import { useAppTheme } from "../providers/AppThemeProvider";
import type { LearnerIndex } from "../sync/hooks";
import {
  assessmentSourceBadge,
  closesLabel,
  openMeeting,
} from "./learn/cohort-card";
import { Chevron, Eyebrow, IconCircle } from "./learning-ui";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";

type Cohort = LearnerIndex["cohorts"][number];
type Meeting = Cohort["meetings"][number];
type Event = LearnerIndex["events"][number];
type Item = AgendaItem<Meeting, Event, Cohort>;

/** The clock, refreshed while Hari Ini is in view (meetings go live). */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 30_000);
      return () => clearInterval(timer);
    }, []),
  );
  return now;
}

function AgendaRow({
  icon,
  title,
  detail,
  live = false,
  pill,
  isLast,
  onPress,
}: {
  icon: SymbolName;
  title: string;
  detail: string;
  live?: boolean;
  pill?: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${isLast ? "" : "border-b border-border/60"}`}
      onPress={onPress}
    >
      <IconCircle tone={live ? "primary" : "muted"}>
        <SymbolIcon
          name={icon}
          size={15}
          tintColor={colors.primary}
          weight="semibold"
        />
      </IconCircle>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[15px] font-semibold text-foreground"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {live ? (
            <View className="size-1.5 rounded-full bg-destructive" />
          ) : null}
          <Text
            className={`min-w-0 flex-1 text-xs ${live ? "font-semibold text-destructive" : "text-muted-foreground"}`}
            numberOfLines={1}
          >
            {detail}
          </Text>
        </View>
      </View>
      {pill ? (
        <View className="rounded-full bg-primary px-3.5 py-1.5">
          <Text className="text-xs font-bold text-primary-foreground">
            {pill}
          </Text>
        </View>
      ) : (
        <Chevron />
      )}
    </Pressable>
  );
}

/**
 * Hari Ini's quick access to what is coming up in the learner's classes:
 * meetings (join with one tap when live) and Latihan or Tryout to do. Hidden
 * when nothing is coming up.
 */
export function TodayAgenda({ index }: { index: LearnerIndex }) {
  const now = useNow();
  const { markEntitySeen } = useSidebarIndicators();
  const items = buildTodayAgenda<Meeting, Cohort, Event>({
    cohorts: index.cohorts,
    events: index.events,
    now,
  });
  if (items.length === 0) return null;
  const shown = items.slice(0, AGENDA_LIMIT);
  const more = items.length - shown.length;

  const row = (item: Item, position: number) => {
    const isLast = position === shown.length - 1 && more === 0;
    if (item.kind === "meeting") {
      const { meeting, cohort, state } = item;
      const near = state !== "upcoming";
      return (
        <AgendaRow
          detail={
            state === "live"
              ? `Sedang live · ${cohort.name}`
              : state === "joining"
                ? `Mulai ${timeLabel(meeting.startsAt)} · ${cohort.name}`
                : `${dateLabel(meeting.startsAt)} · ${cohort.name}`
          }
          icon="video.fill"
          isLast={isLast}
          key={item.key}
          live={state === "live"}
          onPress={() => {
            markEntitySeen("MEETING", meeting.id);
            openMeeting(meeting);
          }}
          pill={near && meeting.joinUrl ? "Gabung" : undefined}
          title={meeting.title}
        />
      );
    }
    const { event, state } = item;
    const source = assessmentSourceBadge(event);
    return (
      <AgendaRow
        detail={
          state === "scheduled" && event.opensAt
            ? `${source} · dibuka ${dateLabel(event.opensAt)}`
            : state === "started"
              ? `${source} · sudah dimulai${event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}`
              : `${source} · ${event.course.title}${event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}`
        }
        icon={state === "scheduled" ? "calendar" : "timer"}
        isLast={isLast}
        key={item.key}
        onPress={() => {
          markEntitySeen("ASSESSMENT", event.id);
          openAssessmentEvent(event);
        }}
        pill={
          state === "started"
            ? "Lanjutkan"
            : state === "open"
              ? "Mulai"
              : undefined
        }
        title={event.title}
      />
    );
  };

  return (
    <View className="gap-1">
      <Eyebrow>Agenda</Eyebrow>
      <View>
        {shown.map(row)}
        {more > 0 ? (
          <Pressable
            accessibilityRole="button"
            className="py-3 active:opacity-60"
            onPress={() => router.navigate("/(home)/(tabs)/learn")}
          >
            <Text className="text-sm font-semibold text-primary">
              {more} lagi di Belajar
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
