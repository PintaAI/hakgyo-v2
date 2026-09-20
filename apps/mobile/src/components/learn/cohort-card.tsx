import type { RouterOutputs } from "@hakgyo/api";
import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  assessmentAttemptPresentation,
  isStaleClosedOnDemandAssessment,
} from "../../lib/assessment-state";
import {
  canOpenModule,
  dateLabel,
  dayLabel,
  meetingState,
  safeExternalUrl,
  timeLabel,
} from "../../lib/study";
import { apiUrl } from "../../config";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { GlassBox } from "../GlassBox";
import { Eyebrow, QueryState } from "../learning-ui";
import {
  CohortMilestoneTimeline,
  type CohortMilestoneGroup,
} from "./milestone-section";

// Official brand assets (see apps/mobile/assets/brands/README.md for sources).
// Used unmodified; Zoom opens the cohort's meeting URL, WhatsApp opens the
// cohort's discussion room invite.
const zoomBrandIcon = require("../../../assets/brands/zoom.png");
const whatsappBrandIcon = require("../../../assets/brands/whatsapp.png");

export type CohortMeeting = {
  id: string;
  title: string;
  agenda: string | null;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  status: string;
  joinUrl: string | null;
};

export type LearnCohort = {
  id: string;
  name: string;
  description: string | null;
  whatsappGroupUrl: string | null;
  course: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    progressionMode: string;
  };
  meetings: CohortMeeting[];
  learnerCount: number;
  facilitators: { name: string; image: string | null }[];
};

export type CohortEvent = {
  id: string;
  title: string;
  type: string;
  scope?: string | null;
  status?: string | null;
  cohort?: { id: string; name: string } | null;
  closesAt: Date | null;
  closedAt?: Date | null;
  course: { id: string; title: string };
  courseItem: { id: string };
  entry: { destination: "DETAIL" | "ATTEMPT" };
  attempts: {
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
    score: number | null;
    maxScore: number | null;
  }[];
};

export function assessmentSourceBadge(event: {
  type: string;
  scope?: string | null;
}) {
  if (event.type === "TRYOUT") return "Tryout";
  if (event.scope === "COHORT") return "Cohort assessment";
  return "Assessment";
}

export async function openExternalLink(
  value: string,
  kind: "zoom" | "whatsapp",
) {
  const url = safeExternalUrl(value, kind);
  if (!url) {
    Alert.alert(
      "Link unavailable",
      "Ask your course contact for an updated link.",
    );
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn’t open the link",
      "Check that the app or a browser is available, then try again.",
    );
  }
}

export async function openMeetingOnWeb(courseId: string) {
  const url = `${apiUrl}/learn/${encodeURIComponent(courseId)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Couldn’t open the link",
      "Check that a browser is available, then try again.",
    );
  }
}

export function openMeeting(
  meeting: Pick<CohortMeeting, "joinUrl">,
  courseId: string,
) {
  if (meeting.joinUrl) {
    void openExternalLink(meeting.joinUrl, "zoom");
    return;
  }
  void openMeetingOnWeb(courseId);
}

function eventSummary(events: CohortEvent[]) {
  const open = events.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  return { open, total: events.length };
}

export function closesLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return `closed ${dateLabel(closesAt)}`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `closes in ${Math.max(hours, 1)}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `closes in ${days}d`;
  return `closes ${dateLabel(closesAt)}`;
}

function dueLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `Due in ${Math.max(hours, 1)}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Due in ${days}d`;
  return `Due ${dayLabel(closesAt)}`;
}

// One corner family for the whole card: card-level surfaces share
// SURFACE_RADIUS so sibling tiles read as a set. Chips and pills stay
// fully round.
const SURFACE_RADIUS = 20;

// The card answers "what should I do now?" with exactly one hero, chosen by
// urgency: a live/starting class beats an expiring assessment, which beats
// the next lesson. Everything else is demoted to quiet plate rows.
type CohortHero = {
  kind: "class" | "assessment" | "learning" | "caught-up";
  eyebrow: string;
  live?: boolean;
  title: string;
  meta: string;
  pill?: string;
  pillIcon?: ImageSourcePropType;
  onPress?: () => void;
};

type PlateRow = {
  key: string;
  icon: SymbolViewProps["name"];
  brandIcon?: ImageSourcePropType;
  fallback: string;
  title: string;
  detail: string;
  onPress?: () => void;
};

function HeroCopy({
  hero,
  compact = false,
  truncateTitle = false,
}: {
  hero: CohortHero;
  compact?: boolean;
  truncateTitle?: boolean;
}) {
  return (
    <>
      <View className="flex-row items-center gap-1.5">
        {hero.live ? (
          <View className="size-2 rounded-full bg-destructive" />
        ) : null}
        <Text
          className={`text-[11px] font-bold uppercase tracking-[1.5px] ${hero.live ? "text-destructive" : "text-primary"}`}
        >
          {hero.eyebrow}
        </Text>
      </View>
      <Text
        className={
          compact
            ? "text-lg font-black leading-6 text-foreground"
            : "text-xl font-black leading-7 text-foreground"
        }
        ellipsizeMode="tail"
        numberOfLines={truncateTitle ? 1 : 2}
      >
        {hero.title}
      </Text>
      <Text
        className="text-xs font-semibold text-muted-foreground"
        numberOfLines={1}
      >
        {hero.meta}
      </Text>
    </>
  );
}

function HeroPill({ hero }: { hero: CohortHero }) {
  if (!hero.pill || !hero.onPress) return null;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-2">
      {hero.pillIcon ? (
        <Image
          accessibilityIgnoresInvertColors
          source={hero.pillIcon}
          style={{ width: 14, height: 14 }}
        />
      ) : null}
      <Text className="text-sm font-bold text-primary-foreground">
        {hero.pill}
      </Text>
    </View>
  );
}

function HeroBlock({ hero, tint }: { hero: CohortHero; tint: string }) {
  // Heroes with an action stay on one row: copy left (flex-1, truncates),
  // pill pinned right so a long title never pushes the button down.
  const compact = hero.kind === "assessment";
  const hasAction = !!hero.pill && !!hero.onPress;
  return (
    <Pressable
      accessibilityHint={hero.onPress ? hero.title : undefined}
      accessibilityRole={hero.onPress ? "button" : undefined}
      className={hero.onPress ? "active:opacity-80" : ""}
      disabled={!hero.onPress}
      onPress={hero.onPress}
    >
      <GlassBox
        isInteractive={!!hero.onPress}
        tintColor={tint}
        glassEffectStyle="clear"
        style={styles.heroGlass}
      >
        {hasAction ? (
          <View
            className={`flex-row items-center gap-3 px-5 ${compact ? "py-4" : "py-5"}`}
          >
            <View className="min-w-0 flex-1 gap-1">
              <HeroCopy
                compact={compact}
                truncateTitle={!compact}
                hero={hero}
              />
            </View>
            <View className="shrink-0">
              <HeroPill hero={hero} />
            </View>
          </View>
        ) : (
          <View className="gap-1.5 px-5 py-5">
            <HeroCopy hero={hero} />
          </View>
        )}
      </GlassBox>
    </Pressable>
  );
}

function PlateRowView({
  row,
  isLast,
  tint,
}: {
  row: PlateRow;
  isLast: boolean;
  tint?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole={row.onPress ? "button" : undefined}
      className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-border/60"} ${row.onPress ? "active:opacity-60" : ""}`}
      disabled={!row.onPress}
      onPress={row.onPress}
    >
      <View className="size-9 items-center justify-center rounded-full bg-muted">
        <SymbolView
          fallback={
            <Text className="text-xs font-black text-primary">
              {row.fallback}
            </Text>
          }
          name={row.icon}
          size={15}
          tintColor={colors.primary}
          weight="semibold"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          {row.title}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {row.detail}
        </Text>
      </View>
      {row.brandIcon ? (
        <GlassBox
          isInteractive={!!row.onPress}
          tintColor={tint}
          glassEffectStyle="clear"
          style={styles.chipGlass}
        >
          <View className="h-9 flex-row items-center gap-1.5 px-3.5">
            <Image
              accessibilityIgnoresInvertColors
              source={row.brandIcon}
              style={{ width: 14, height: 14 }}
            />
            <Text className="text-xs font-semibold text-foreground">Zoom</Text>
            <SymbolView
              fallback={
                <Text className="text-xs text-muted-foreground">↗</Text>
              }
              name="arrow.up.right"
              size={13}
              tintColor={colors.mutedForeground}
              weight="semibold"
            />
          </View>
        </GlassBox>
      ) : row.onPress ? (
        <Text className="text-lg text-muted-foreground">›</Text>
      ) : null}
    </Pressable>
  );
}

function GlassChip({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  tint: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="active:opacity-70"
      onPress={onPress}
    >
      <GlassBox
        isInteractive
        tintColor={tint}
        glassEffectStyle="clear"
        style={styles.chipGlass}
      >
        <View className="h-9 flex-row items-center gap-1.5 px-3.5">
          {icon}
          <Text className="text-xs font-semibold text-foreground">{label}</Text>
        </View>
      </GlassBox>
    </Pressable>
  );
}

export function CohortCard({
  cohort,
  thumbnailUrl,
  events,
  eventsPending,
  eventsError,
  onRetryEvents,
  now,
  milestoneGroup,
  outline,
  isFirst = false,
}: {
  cohort: LearnCohort;
  thumbnailUrl?: string | null;
  events: CohortEvent[];
  eventsPending: boolean;
  eventsError?: { message: string } | null;
  onRetryEvents: () => void;
  now: number;
  milestoneGroup?: CohortMilestoneGroup;
  outline?: RouterOutputs["learning"]["getCourseOutline"];
  isFirst?: boolean;
}) {
  const upcoming = cohort.meetings
    .filter((meeting) => meetingState(meeting, now) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const next = upcoming[0];
  const nextState = next
    ? (meetingState(next, now) as "live" | "joining" | "upcoming")
    : null;
  const visibleEvents = events.filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const { open, total } = eventSummary(visibleEvents);
  const featured = open[0] ?? visibleEvents[0];
  const remaining = featured ? total - 1 : 0;
  const featuredAttempt = featured?.attempts[0];
  const featuredActionable =
    !!featured &&
    (!featuredAttempt || featuredAttempt.status === "IN_PROGRESS");
  const featuredUrgent =
    !!featured?.closesAt &&
    featured.closesAt.getTime() - now < 48 * 3_600_000 &&
    featuredActionable;

  const openFeaturedAssessment = () => {
    if (!featured) return;
    const attempt = featured.attempts[0];
    if (featured.entry.destination === "ATTEMPT" && attempt) {
      router.push({
        pathname:
          "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
        params: {
          courseId: featured.course.id,
          courseItemId: featured.courseItem.id,
          attemptId: attempt.id,
        },
      });
      return;
    }
    router.push({
      pathname: "/events/[eventId]",
      params: { eventId: featured.id },
    });
  };
  const outlineItems = outline?.modules.flatMap((module) => module.items) ?? [];
  const completedCount = outlineItems.filter((item) => item.isCompleted).length;
  const progress = outlineItems.length
    ? Math.round((completedCount / outlineItems.length) * 100)
    : null;
  const nextOutlineItem = outline?.modules
    .flatMap((module) =>
      module.items.map((item) => ({
        ...item,
        available: canOpenModule(module.access),
        moduleTitle: module.title,
      })),
    )
    .find((item) => item.available && !item.isCompleted);
  const nextTypeLabel = !nextOutlineItem
    ? null
    : nextOutlineItem.type === "VOCABULARY_SET"
      ? "Vocabulary"
      : nextOutlineItem.type === "ASSESSMENT"
        ? "Assessment"
        : "Lesson";
  const { colors, colorScheme } = useAppTheme();
  const glassTint = withOpacity(
    colors.primary,
    colorScheme === "dark" ? 0.35 : 0.18,
  );
  const insets = useSafeAreaInsets();
  // Full-bleed first card sits under the transparent native header: keep
  // the image bleeding but push the titles below the toolbar + breathing
  // room. ~56pt native bar; swap for useHeaderHeight() if this drifts.
  const headerTopPadding = isFirst ? insets.top + 64 : 16;

  const openCourse = () =>
    router.push({
      pathname: "/courses/[courseId]",
      params: { courseId: cohort.course.id },
    });
  const openNextItem =
    nextOutlineItem && nextTypeLabel
      ? () =>
          nextOutlineItem.type === "ASSESSMENT" &&
          nextOutlineItem.attempt?.status === "IN_PROGRESS"
            ? router.push({
                pathname:
                  "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                params: {
                  courseId: cohort.course.id,
                  courseItemId: nextOutlineItem.id,
                  attemptId: nextOutlineItem.attempt.id,
                },
              })
            : router.push({
                pathname: "/courses/[courseId]/items/[courseItemId]",
                params: {
                  courseId: cohort.course.id,
                  courseItemId: nextOutlineItem.id,
                },
              })
      : undefined;

  // Pick the single hero by urgency.
  let hero: CohortHero | null = null;
  if (next && nextState && nextState !== "upcoming") {
    const joinUrl = next.joinUrl;
    const endsAt = new Date(
      next.startsAt.getTime() + next.durationMinutes * 60_000,
    );
    hero = {
      kind: "class",
      eyebrow: nextState === "live" ? "Live now" : "Starting soon",
      live: nextState === "live",
      title: next.title,
      meta:
        nextState === "live"
          ? `Ends ${timeLabel(endsAt)} · ${next.durationMinutes} min`
          : `Starts ${timeLabel(next.startsAt)} · ${next.durationMinutes} min`,
      pill: joinUrl ? "Join" : "Details",
      pillIcon: joinUrl ? zoomBrandIcon : undefined,
      onPress: () => openMeeting(next, cohort.course.id),
    };
  } else if (featured && featuredActionable && featuredUrgent) {
    hero = {
      kind: "assessment",
      eyebrow:
        (featured.closesAt ? dueLabel(featured.closesAt, now) : null) ??
        assessmentSourceBadge(featured),
      title: featured.title,
      meta: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}`,
      pill: featuredAttempt ? "Resume" : "Start",
      onPress: openFeaturedAssessment,
    };
  } else if (nextOutlineItem && nextTypeLabel && openNextItem) {
    hero = {
      kind: "learning",
      eyebrow: completedCount > 0 ? "Continue learning" : "Start learning",
      title: nextOutlineItem.title,
      meta: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      pill: completedCount > 0 ? "Continue" : "Start",
      onPress: openNextItem,
    };
  } else if (
    !featuredActionable &&
    !eventsPending &&
    !eventsError &&
    outline &&
    !nextOutlineItem
  ) {
    hero = {
      kind: "caught-up",
      eyebrow: "All caught up",
      title: "Nothing due right now",
      meta: "New classes and activities will appear here",
    };
  }

  // Everything pending that isn't the hero becomes a quiet row.
  const plateRows: PlateRow[] = [];
  if (next && nextState === "upcoming") {
    const joinUrl = next.joinUrl;
    plateRows.push({
      key: "next-class",
      icon: "calendar",
      brandIcon: zoomBrandIcon,
      fallback: "◷",
      title: next.title,
      detail: joinUrl
        ? `${dateLabel(next.startsAt)} · ${next.durationMinutes} min · Tap to join`
        : `${dateLabel(next.startsAt)} · ${next.durationMinutes} min · Details on web`,
      onPress: () => openMeeting(next, cohort.course.id),
    });
  }
  if (featured && hero?.kind !== "assessment") {
    plateRows.push({
      key: "featured-assessment",
      icon: "doc.text",
      fallback: "✎",
      title: featured.title,
      detail: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}${featured.closesAt ? ` · ${closesLabel(featured.closesAt, now)}` : ""}`,
      onPress: openFeaturedAssessment,
    });
  }
  if (nextOutlineItem && nextTypeLabel && hero?.kind !== "learning") {
    plateRows.push({
      key: "next-lesson",
      icon: "book.closed",
      fallback: "Aa",
      title: nextOutlineItem.title,
      detail: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      onPress: openNextItem,
    });
  }
  if (remaining > 0) {
    plateRows.push({
      key: "more-assessments",
      icon: "tray.full",
      fallback: "+",
      title: `${remaining} more in Practice`,
      detail: `${open.length} open overall`,
      onPress: () => router.navigate("/(home)/(tabs)/assessments"),
    });
  }

  return (
    <View className="bg-background" style={styles.card}>
      <View className="relative justify-end bg-muted">
        {thumbnailUrl ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              blurRadius={3}
              className="absolute inset-0 z-0 size-full"
              resizeMode="cover"
              source={{ uri: thumbnailUrl }}
            />
            <View
              className="absolute inset-0 z-10"
              style={{
                backgroundColor: withOpacity(colors.background, 0.72),
              }}
            />
          </>
        ) : null}
        <View
          className="relative z-20 flex-row items-end gap-2 p-4"
          style={{ paddingTop: headerTopPadding }}
        >
          <View className="min-w-0 flex-1 gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text
                className="flex-1 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground"
                numberOfLines={1}
              >
                {cohort.course.title}
              </Text>
              {progress !== null ? (
                <Text className="text-xs font-semibold text-muted-foreground">
                  {completedCount}/{outlineItems.length}
                </Text>
              ) : null}
            </View>
            <Text
              className="text-2xl font-black leading-7 tracking-tight text-foreground"
              numberOfLines={2}
            >
              {cohort.name}
            </Text>
            {cohort.facilitators.length > 0 ? (
              <Text
                className="text-xs font-semibold text-muted-foreground"
                numberOfLines={1}
              >
                Mentored by {cohort.facilitators.map((f) => f.name).join(", ")}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {cohort.whatsappGroupUrl ? (
              <GlassChip
                icon={
                  <Image
                    accessibilityIgnoresInvertColors
                    source={whatsappBrandIcon}
                    style={{ width: 14, height: 14 }}
                  />
                }
                label="Group"
                onPress={() =>
                  cohort.whatsappGroupUrl &&
                  void openExternalLink(cohort.whatsappGroupUrl, "whatsapp")
                }
                tint={glassTint}
              />
            ) : null}
            <GlassChip
              icon={
                <SymbolView
                  fallback={<View />}
                  name="book.closed"
                  size={13}
                  tintColor={colors.foreground}
                />
              }
              label="Buka bab"
              onPress={openCourse}
              tint={glassTint}
            />
          </View>
        </View>
        {progress !== null ? (
          <View className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-muted">
            <View
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-4 p-4">
        {hero ? <HeroBlock hero={hero} tint={glassTint} /> : null}

        <QueryState
          pending={eventsPending}
          error={eventsError}
          retry={onRetryEvents}
        />

        {plateRows.length > 0 ? (
          <View className="gap-2">
            <Eyebrow>On your plate</Eyebrow>
            <View>
              {plateRows.map((row, index) => (
                <PlateRowView
                  isLast={index === plateRows.length - 1}
                  key={row.key}
                  row={row}
                  tint={glassTint}
                />
              ))}
            </View>
          </View>
        ) : null}

        {milestoneGroup && milestoneGroup.milestones.length > 0 ? (
          <View className="gap-2">
            <Eyebrow>{`Completed (${milestoneGroup.completedCount})`}</Eyebrow>
            <CohortMilestoneTimeline
              courseId={cohort.course.id}
              milestones={milestoneGroup.milestones}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SURFACE_RADIUS,
    overflow: "hidden",
  },
  surface: {
    borderRadius: SURFACE_RADIUS,
  },
  // No overflow here: the docs only put borderRadius on the glass view
  // (the native side rounds the effect itself), and our padded content
  // never bleeds to the edge. Clipping the glass view can cut its edge
  // highlight and make the shape sit off against native glass.
  heroGlass: {
    borderRadius: SURFACE_RADIUS,
  },
  chipGlass: {
    borderRadius: 999,
  },
});
