import type { RouterOutputs } from "@hakgyo/api";
import { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";
import { router } from "expo-router";
import { Image } from "expo-image";
import {
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
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
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { glassTint, withOpacity } from "../../theme/colors";
import { DoodleBackground } from "../doodle-background";
import { authClient } from "../../lib/auth-client";
import {
  claimBadge,
  courseCompletedAt,
  medalGlyph,
  useBadgeClaims,
} from "../../lib/badge-claims";
import { useSyncIndex } from "../../sync/hooks";
import { AppSegmentedControl } from "../app-segmented-control";
import { BadgeClaimCard } from "./badge-claim";
import { GlassBox } from "../GlassBox";
import {
  Badge,
  Chevron,
  Eyebrow,
  IconCircle,
  ProgressBar,
  QueryState,
} from "../learning-ui";
import { HeroTile, type HeroTileContent } from "../hero-tile";
import { CourseOutlineList } from "./course-outline-list";
import {
  CohortMilestoneTimeline,
  type CohortMilestoneGroup,
} from "./milestone-section";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
import { openAssessmentEvent, openCourseItem } from "../../lib/navigation";
import { SymbolIcon } from "../ui/symbol-icon";
import type { SymbolName } from "../ui/symbol-names";
import { TourTarget } from "../../tour/tour-target";

type CourseOutline = RouterOutputs["learning"]["getCourseOutline"];
type OutlineModule = CourseOutline["modules"][number];

// Official brand assets (see apps/mobile/assets/brands/README.md for sources).
// Used unmodified for Zoom meetings and WhatsApp invitations.
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
  provider: "ZOOM" | "GOOGLE_MEET";
  module: { id: string; title: string } | null;
  joinUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  /** The curriculum's Kelas Mandiri; missing from indexes cached before. */
  selfPaced?: boolean;
};

export type CohortEvent = {
  id: string;
  title: string;
  type: string;
  status?: string | null;
  opensAt?: Date | null;
  cohort?: { id: string; name: string } | null;
  closesAt: Date | null;
  closedAt?: Date | null;
  course: { id: string; title: string };
  /** Null when the event runs an assessment from the organization's library. */
  courseItem: { id: string } | null;
  entry: { destination: "DETAIL" | "ATTEMPT" };
  attempts: {
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
    score: number | null;
    maxScore: number | null;
  }[];
};

export function assessmentSourceBadge(event: { type: string }) {
  return event.type === "TRYOUT" ? "Tryout" : "Latihan";
}

/** A scheduled event that cannot be started yet: only its opening time shows. */
function isUpcomingEvent(event: CohortEvent, now: number) {
  return (
    event.status === "SCHEDULED" &&
    !!event.opensAt &&
    event.opensAt.getTime() > now
  );
}

async function openExternalLink(
  value: string,
  kind: "zoom" | "googleMeet" | "whatsapp",
) {
  const url = safeExternalUrl(value, kind);
  if (!url) {
    Alert.alert(
      "Link tidak tersedia",
      "Minta link terbaru kepada pengajar kamu.",
    );
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Link tidak dapat dibuka",
      "Pastikan aplikasinya atau browser tersedia, lalu coba lagi.",
    );
  }
}

export function openMeeting(
  meeting: Pick<CohortMeeting, "joinUrl" | "provider">,
) {
  if (meeting.joinUrl) {
    void openExternalLink(
      meeting.joinUrl,
      meeting.provider === "GOOGLE_MEET" ? "googleMeet" : "zoom",
    );
    return;
  }
  Alert.alert(
    "Link belum tersedia",
    "Pengajar belum membagikan link pertemuan ini. Link akan muncul di sini sebelum kelas dimulai.",
  );
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
  if (diff <= 0) return `ditutup ${dateLabel(closesAt)}`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `ditutup dalam ${Math.max(hours, 1)} jam`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ditutup dalam ${days} hari`;
  return `ditutup ${dateLabel(closesAt)}`;
}

function dueLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `Tenggat ${Math.max(hours, 1)} jam lagi`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Tenggat ${days} hari lagi`;
  return `Tenggat ${dayLabel(closesAt)}`;
}

// One corner family for the whole card: card-level surfaces share
// SURFACE_RADIUS so sibling tiles read as a set. Chips and pills stay
// fully round.
const SURFACE_RADIUS = 20;

// The card answers "what should I do now?" with exactly one hero, chosen by
// urgency: a live/starting class beats an expiring assessment, which beats
// the next lesson. Everything else is demoted to quiet plate rows.
export type CohortHero = HeroTileContent & {
  kind: "class" | "assessment" | "learning" | "caught-up";
};

type PlateRow = {
  key: string;
  icon: SymbolName;
  brandIcon?: ImageSourcePropType;
  title: string;
  detail: string;
  onPress?: () => void;
};

/** A class card's hero, on the shared start tile. */
function HeroBlock({ hero }: { hero: CohortHero }) {
  const { kind, ...content } = hero;
  return (
    <HeroTile
      {...content}
      accessibilityHint={hero.onPress ? hero.title : undefined}
      compact={kind === "assessment"}
    />
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
      <IconCircle tone="muted">
        <SymbolIcon
          name={row.icon}
          size={15}
          tintColor={colors.primary}
          weight="semibold"
        />
      </IconCircle>
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
              cachePolicy="memory-disk"
              contentFit="contain"
              source={row.brandIcon}
              style={{ width: 14, height: 14 }}
              transition={0}
            />
            <Text className="text-xs font-semibold text-foreground">Zoom</Text>
            <SymbolIcon
              name="arrow.up.right"
              size={13}
              tintColor={colors.mutedForeground}
              weight="semibold"
            />
          </View>
        </GlassBox>
      ) : row.onPress ? (
        <Chevron />
      ) : null}
    </Pressable>
  );
}

function GlassChip({
  accessibilityLabel,
  icon,
  label,
  onPress,
  tint,
}: {
  accessibilityLabel?: string;
  icon: ReactNode;
  /** Omitted for an icon-only chip, which then needs `accessibilityLabel`. */
  label?: string;
  onPress: () => void;
  tint: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
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
        <View
          className={`h-9 flex-row items-center gap-1.5 ${label ? "px-3.5" : "w-9 justify-center"}`}
        >
          {icon}
          {label ? (
            <Text className="text-xs font-semibold text-foreground">
              {label}
            </Text>
          ) : null}
        </View>
      </GlassBox>
    </Pressable>
  );
}

/** Asks before moving the class under Diarsipkan on Belajar. */
function confirmArchive(title: string, onArchive: () => void) {
  const message =
    "Kelas pindah ke Diarsipkan di bawah. Tugas dan jadwalnya tetap muncul di Hari Ini dan Latihan.";
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: ["Arsipkan kelas", "Batal"],
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) onArchive();
      },
    );
    return;
  }
  Alert.alert("Arsipkan kelas?", message, [
    { text: "Batal", style: "cancel" },
    { text: "Arsipkan", onPress: onArchive },
  ]);
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
  tourTarget = false,
  onArchive,
  onBadgeClaimed,
}: {
  cohort: LearnCohort;
  thumbnailUrl?: string | null;
  events: CohortEvent[];
  eventsPending: boolean;
  eventsError?: { message: string } | null;
  onRetryEvents: () => void;
  now: number;
  milestoneGroup?: CohortMilestoneGroup;
  outline?: CourseOutline;
  isFirst?: boolean;
  /** This card is the one the Belajar tour points at. */
  tourTarget?: boolean;
  /** Moves the class under Diarsipkan (the card's "⋯" button). */
  onArchive?: () => void;
  /** The learner claimed this course's badge (Belajar opens Diarsipkan). */
  onBadgeClaimed?: () => void;
}) {
  const [curriculumSegment, setCurriculumSegment] = useState(0);
  // A broken thumbnail falls back to the doodle header.
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  // Stable, like `openOutlineItem`, for the memoized outline.
  const showCompleted = useCallback(() => setCurriculumSegment(1), []);
  const { markEntitySeen } = useSidebarIndicators();
  const upcoming = cohort.meetings
    .filter((meeting) => meetingState(meeting, now) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const next = upcoming[0];
  const nextState = next
    ? (meetingState(next, now) as "live" | "joining" | "upcoming")
    : null;
  const upcomingEvent = events
    .filter((event) => isUpcomingEvent(event, now))
    .sort(
      (a, b) => (a.opensAt?.getTime() ?? 0) - (b.opensAt?.getTime() ?? 0),
    )[0];
  const visibleEvents = events.filter(
    (event) =>
      !isStaleClosedOnDemandAssessment(event, now) &&
      !isUpcomingEvent(event, now),
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
    markEntitySeen("ASSESSMENT", featured.id);
    openAssessmentEvent(featured);
  };
  // Derived once per outline, not on every clock tick.
  const { totalCount, completedCount, nextOutlineItem } = useMemo(() => {
    let total = 0;
    let completed = 0;
    let nextItem:
      | (OutlineModule["items"][number] & {
          moduleId: string;
          moduleTitle: string;
        })
      | undefined;
    for (const module of outline?.modules ?? []) {
      const available = canOpenModule(module.access);
      for (const item of module.items) {
        total += 1;
        if (item.isCompleted) completed += 1;
        else if (available && !nextItem) {
          nextItem = {
            ...item,
            moduleId: module.id,
            moduleTitle: module.title,
          };
        }
      }
    }
    return {
      totalCount: total,
      completedCount: completed,
      nextOutlineItem: nextItem,
    };
  }, [outline]);
  const hasProgress = totalCount > 0;

  // Every lesson done: the Bab list ends in the course badge to claim.
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const { activeOrganizationId } = useAppTheme();
  const learner = useSyncIndex(activeOrganizationId).data?.learner;
  const claim = useBadgeClaims(userId)[cohort.course.id];
  const allLessonsDone = hasProgress && completedCount === totalCount;
  const courseTitle = cohort.course.title;
  const claimCourseId = cohort.course.id;
  const completedAt = useMemo(
    () => (allLessonsDone ? courseCompletedAt(outline, learner) : null),
    [allLessonsDone, learner, outline],
  );
  const handleClaim = useCallback(() => {
    if (!userId) return;
    claimBadge(userId, claimCourseId, { title: courseTitle, completedAt });
    onBadgeClaimed?.();
  }, [claimCourseId, completedAt, courseTitle, onBadgeClaimed, userId]);
  // Memoized so the clock re-renders leave the outline list alone.
  const badgeSlot = useMemo(
    () =>
      allLessonsDone ? (
        <BadgeClaimCard
          courseTitle={courseTitle}
          glyph={medalGlyph(
            courseTitle,
            claimCourseId === HANGEUL_MASTERY_COURSE_ID,
          )}
          claim={claim}
          completedAt={completedAt}
          onClaim={handleClaim}
        />
      ) : undefined,
    [
      allLessonsDone,
      claim,
      claimCourseId,
      completedAt,
      courseTitle,
      handleClaim,
    ],
  );
  const nextTypeLabel = nextOutlineItem
    ? getLearningItemTypeMeta(nextOutlineItem.type).label
    : null;
  const { colors, colorScheme } = useAppTheme();
  const tint = glassTint(colors, colorScheme);
  const insets = useSafeAreaInsets();
  // Full-bleed first card sits under the transparent native header: keep
  // the image bleeding but push the titles below the toolbar + breathing
  // room. ~56pt native bar; swap for useHeaderHeight() if this drifts.
  const headerTopPadding = isFirst ? insets.top + 64 : 16;

  // Stable, so the memoized outline skips the card's clock re-renders.
  const courseId = cohort.course.id;
  const openOutlineItem = useCallback<
    ComponentProps<typeof CourseOutlineList>["onOpenItem"]
  >(
    (item, attempt) => {
      openCourseItem({ courseId, courseItemId: item.id, attempt });
    },
    [courseId],
  );
  const openNextItem =
    nextOutlineItem && nextTypeLabel
      ? () => {
          markEntitySeen("MODULE", nextOutlineItem.moduleId);
          openCourseItem({
            courseId: cohort.course.id,
            courseItemId: nextOutlineItem.id,
            attempt: nextOutlineItem.attempt,
          });
        }
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
      eyebrow: nextState === "live" ? "Sedang live" : "Segera dimulai",
      live: nextState === "live",
      title: next.title,
      meta:
        nextState === "live"
          ? `Berakhir ${timeLabel(endsAt)} · ${next.durationMinutes} menit${next.module ? ` · ${next.module.title}` : ""}`
          : `Mulai ${timeLabel(next.startsAt)} · ${next.durationMinutes} menit${next.module ? ` · ${next.module.title}` : ""}`,
      pill: joinUrl ? "Gabung" : "Info",
      pillIcon: joinUrl && next.provider === "ZOOM" ? zoomBrandIcon : undefined,
      onPress: () => {
        markEntitySeen("MEETING", next.id);
        openMeeting(next);
      },
    };
  } else if (featured && featuredActionable && featuredUrgent) {
    hero = {
      kind: "assessment",
      eyebrow:
        (featured.closesAt ? dueLabel(featured.closesAt, now) : null) ??
        assessmentSourceBadge(featured),
      title: featured.title,
      meta: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}`,
      pill: featuredAttempt ? "Lanjutkan" : "Mulai",
      onPress: openFeaturedAssessment,
    };
  } else if (nextOutlineItem && nextTypeLabel && openNextItem) {
    hero = {
      kind: "learning",
      eyebrow: completedCount > 0 ? "Lanjutkan belajar" : "Mulai belajar",
      title: nextOutlineItem.title,
      meta: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      pill: completedCount > 0 ? "Lanjutkan" : "Mulai",
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
      eyebrow: "Semua beres",
      title: "Tidak ada tenggat saat ini",
      meta: cohort.selfPaced
        ? "Materi baru akan muncul di sini"
        : "Kelas dan aktivitas baru akan muncul di sini",
    };
  }

  // Everything pending that isn't the hero becomes a quiet row.
  const plateRows: PlateRow[] = [];
  if (next && nextState === "upcoming") {
    const joinUrl = next.joinUrl;
    plateRows.push({
      key: "next-class",
      icon: "calendar",
      brandIcon: next.provider === "ZOOM" ? zoomBrandIcon : undefined,
      title: next.title,
      detail: joinUrl
        ? `${dateLabel(next.startsAt)} · ${next.durationMinutes} menit${next.module ? ` · ${next.module.title}` : ""} · Ketuk untuk bergabung`
        : `${dateLabel(next.startsAt)} · ${next.durationMinutes} menit · Link menyusul`,
      onPress: () => {
        markEntitySeen("MEETING", next.id);
        openMeeting(next);
      },
    });
  }
  if (featured && hero?.kind !== "assessment") {
    plateRows.push({
      key: "featured-assessment",
      icon: "doc.text",
      title: featured.title,
      detail: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}${featured.closesAt ? ` · ${closesLabel(featured.closesAt, now)}` : ""}`,
      onPress: openFeaturedAssessment,
    });
  }
  if (upcomingEvent?.opensAt) {
    const upcomingId = upcomingEvent.id;
    plateRows.push({
      key: "upcoming-assessment",
      icon: "calendar",
      title: upcomingEvent.title,
      detail: `${assessmentSourceBadge(upcomingEvent)} · dibuka ${dateLabel(upcomingEvent.opensAt)}`,
      onPress: () =>
        router.push({
          pathname: "/events/[eventId]",
          params: { eventId: upcomingId },
        }),
    });
  }
  if (nextOutlineItem && nextTypeLabel && hero?.kind !== "learning") {
    plateRows.push({
      key: "next-lesson",
      icon: "book.closed",
      title: nextOutlineItem.title,
      detail: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      onPress: openNextItem,
    });
  }
  if (remaining > 0) {
    plateRows.push({
      key: "more-assessments",
      icon: "tray.full",
      title: `${remaining} lagi di Latihan`,
      detail: `${open.length} terbuka secara keseluruhan`,
      onPress: () => router.navigate("/(home)/(tabs)/assessments"),
    });
  }

  return (
    <View style={styles.card}>
      <TourTarget
        id="learn.cohort"
        enabled={tourTarget}
        className="relative justify-end overflow-hidden"
      >
        {thumbnailUrl && !thumbnailFailed ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              blurRadius={3}
              cachePolicy="memory-disk"
              className="absolute inset-0 z-0 size-full"
              contentFit="cover"
              onError={() => setThumbnailFailed(true)}
              source={{ uri: thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              transition={0}
            />
            <View
              className="absolute inset-0 z-10"
              style={{
                backgroundColor: withOpacity(colors.background, 0.72),
              }}
            />
          </>
        ) : (
          // No thumbnail, or it failed to load: Hakgyo's doodles on a wash of
          // the brand colour, as on the course item pages.
          <View className="absolute inset-0 z-0" pointerEvents="none">
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.primary, colorScheme === "dark" ? 0.22 : 0.12)}, ${withOpacity(colors.primary, 0)})`,
                },
              ]}
            />
            <DoodleBackground tile={160} />
          </View>
        )}
        {/* The header's lower part fades into the page behind the card, so
            it has no hard bottom edge. */}
        <View
          className="absolute inset-0 z-10"
          pointerEvents="none"
          style={{
            experimental_backgroundImage: `linear-gradient(to bottom, ${withOpacity(colors.background, 0)} 45%, ${colors.background} 100%)`,
          }}
        />
        <View
          className="relative z-20 flex-row items-end gap-2 p-4"
          style={{ paddingTop: headerTopPadding }}
        >
          <View className="min-w-0 flex-1 gap-1.5">
            <View className="flex-row items-center gap-2">
              {/* A Kelas Mandiri is named after its curriculum. */}
              {cohort.selfPaced ? (
                <View className="flex-1 flex-row">
                  <Badge size="sm">Kelas Mandiri</Badge>
                </View>
              ) : (
                <Eyebrow size="md" className="flex-1" numberOfLines={1}>
                  {cohort.course.title}
                </Eyebrow>
              )}
              {hasProgress ? (
                <Text className="text-xs font-semibold text-muted-foreground">
                  {completedCount}/{totalCount}
                </Text>
              ) : null}
            </View>
            <Text
              className="text-2xl font-black leading-7 tracking-tight text-foreground"
              numberOfLines={2}
            >
              {cohort.selfPaced ? cohort.course.title : cohort.name}
            </Text>
            {cohort.facilitators.length > 0 ? (
              <Text
                className="text-xs font-semibold text-muted-foreground"
                numberOfLines={1}
              >
                Pengajar: {cohort.facilitators.map((f) => f.name).join(", ")}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {cohort.whatsappGroupUrl ? (
              <GlassChip
                icon={
                  <Image
                    accessibilityIgnoresInvertColors
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    source={whatsappBrandIcon}
                    style={{ width: 14, height: 14 }}
                    transition={0}
                  />
                }
                label="Group"
                onPress={() =>
                  cohort.whatsappGroupUrl &&
                  void openExternalLink(cohort.whatsappGroupUrl, "whatsapp")
                }
                tint={tint}
              />
            ) : null}
            {onArchive ? (
              <GlassChip
                accessibilityLabel="Pilihan kelas"
                icon={
                  <SymbolIcon
                    name="ellipsis"
                    size={15}
                    weight="semibold"
                    tintColor={colors.foreground}
                  />
                }
                onPress={() =>
                  confirmArchive(
                    cohort.selfPaced ? cohort.course.title : cohort.name,
                    onArchive,
                  )
                }
                tint={tint}
              />
            ) : null}
          </View>
        </View>
        {hasProgress ? (
          <ProgressBar
            size="sm"
            square
            className="absolute bottom-0 left-0 right-0 z-30"
            value={completedCount}
            max={totalCount}
          />
        ) : null}
      </TourTarget>

      <View className="gap-4 p-4">
        {hero ? (
          <TourTarget id="learn.next" enabled={tourTarget}>
            <HeroBlock hero={hero} />
          </TourTarget>
        ) : null}

        <QueryState
          pending={eventsPending}
          error={eventsError}
          retry={onRetryEvents}
        />

        {plateRows.length > 0 ? (
          <View className="gap-2">
            <Eyebrow>Perlu dikerjakan</Eyebrow>
            <View>
              {plateRows.map((row, index) => (
                <PlateRowView
                  isLast={index === plateRows.length - 1}
                  key={row.key}
                  row={row}
                  tint={tint}
                />
              ))}
            </View>
          </View>
        ) : null}

        {outline || milestoneGroup ? (
          <View className="gap-3">
            <Eyebrow>Materi kurikulum</Eyebrow>
            <AppSegmentedControl
              values={["Belum selesai", "Semua"]}
              selectedIndex={curriculumSegment}
              onIndexChange={setCurriculumSegment}
            />
            {curriculumSegment === 0 ? (
              <CourseOutlineList
                courseId={cohort.course.id}
                outline={outline}
                collapsible
                hideCompleted
                onShowCompleted={showCompleted}
                completionSlot={badgeSlot}
                showActiveState={false}
                showHeader={false}
                onOpenItem={openOutlineItem}
              />
            ) : outline ? (
              // The whole curriculum, to look back at: finished lessons
              // carry their check, the chapter in progress opens first.
              <CourseOutlineList
                courseId={cohort.course.id}
                outline={outline}
                collapsible
                showActiveState={false}
                showHeader={false}
                onOpenItem={openOutlineItem}
              />
            ) : milestoneGroup && milestoneGroup.milestones.length > 0 ? (
              <CohortMilestoneTimeline
                courseId={cohort.course.id}
                milestones={milestoneGroup.milestones}
              />
            ) : (
              <Text className="py-4 text-center text-sm text-muted-foreground">
                Belum ada aktivitas yang selesai.
              </Text>
            )}
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
  chipGlass: {
    borderRadius: 999,
  },
});
