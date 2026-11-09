import type { RouterOutputs } from "@hakgyo/api";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { openAssessmentEvent, openCourseItem } from "../lib/navigation";
import { canOpenModule } from "../lib/study";
import { isGameKey, type GameKey } from "../games/catalog";
import { useAppTheme } from "../providers/AppThemeProvider";
import { dateLabel } from "../lib/study";
import { closesLabel } from "./learn/cohort-card";
import { LearningItemRow } from "./learn/learning-item-row";
import {
  Action,
  Chevron,
  Chip,
  Empty,
  Eyebrow,
  GlassInput,
  QueryState,
} from "./learning-ui";
import { StudyGlass } from "./study-glass";
import { SymbolIcon } from "./ui/symbol-icon";
import type { SymbolName } from "./ui/symbol-names";
import { TourTarget } from "../tour/tour-target";

export type Course = RouterOutputs["learning"]["listMyCourses"][number];
export type Event = RouterOutputs["assessmentEvent"]["listForLearner"][number];
type CourseOutline = RouterOutputs["learning"]["getCourseOutline"];
export type PracticeFilter = "VOCABULARY_SET" | "ASSESSMENT";

export type PreselectedVocabularySource = {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId?: string;
  title?: string;
};

type HubProps = {
  coursesPending: boolean;
  coursesError?: { message: string } | null;
  onRetryCourses: () => void;
  preselectedSource?: PreselectedVocabularySource;
  /** Leaves out the "Penguasaan Hangeul" games while Hangeul is archived. */
  hangeulHidden?: boolean;
};

export type Tool = {
  key: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  unavailableLabel?: string;
  icon: SymbolName;
  /** Text drawn in place of the symbol when `textIcon` is set. */
  fallback?: string;
  textIcon?: boolean;
  resource: PracticeFilter;
  available: boolean;
  // Contextual disable, distinct from available=false ("Soon", not built).
  // The tile keeps its source badge but is not interactive while set.
  disabledHint?: string;
};

export const tools: Tool[] = [
  {
    key: "cards",
    title: "Kartu",
    subtitle: "Balik & ingat",
    sourceLabel: "Kosakata",
    icon: "rectangle.stack.fill",
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "assessment",
    title: "Quiz",
    subtitle: "Uji dirimu",
    sourceLabel: "Tugas",
    icon: "checkmark.circle.fill",
    resource: "ASSESSMENT",
    available: true,
  },
  {
    key: "word-fall",
    title: "Hujan Kata",
    subtitle: "Ketik sebelum jatuh",
    sourceLabel: "Kosakata",
    icon: "arrow.down.circle.fill",
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "sentences",
    title: "Susun makna",
    subtitle: "Susun contoh kalimat",
    sourceLabel: "Kosakata",
    icon: "text.word.spacing",
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "match",
    title: "Cocokkan",
    subtitle: "Hubungkan pasangannya",
    sourceLabel: "Kosakata",
    icon: "square.grid.2x2.fill",
    resource: "VOCABULARY_SET",
    available: true,
  },
];

const hangeulTools: Tool[] = [
  {
    key: "stroke-master",
    title: "Hangeul",
    subtitle: "Pelajari huruf Hangeul",
    sourceLabel: "한글",
    unavailableLabel: "한글",
    icon: "pencil",
    fallback: "한",
    textIcon: true,
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "syllable-forge",
    title: "Susun 한글",
    subtitle: "Susun suku kata Hangeul",
    sourceLabel: "한글",
    unavailableLabel: "한글",
    icon: "character.book.closed.fill",
    fallback: "글",
    textIcon: true,
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "word-builder",
    title: "Susun kata",
    subtitle: "Susun kata dari suku kata",
    sourceLabel: "한글",
    unavailableLabel: "한글",
    icon: "text.word.spacing",
    resource: "VOCABULARY_SET",
    available: true,
  },
];

// One corner family for the whole hub, shared with cohort-card so the two
// tabs read as a set. Chips and icon circles stay fully round.
const SURFACE_RADIUS = 20;

export function selectedTool(key: string | null | undefined) {
  if (!key) return undefined;
  return tools.find((tool) => tool.key === key);
}

export function GameIcon({
  tool,
  selected = false,
  size = 44,
}: {
  tool: Tool;
  selected?: boolean;
  size?: number;
}) {
  const { colors } = useAppTheme();
  const glyph = selected
    ? colors.primaryForeground
    : tool.available
      ? colors.primary
      : colors.mutedForeground;
  return (
    <View
      className={`items-center justify-center rounded-full ${selected ? "bg-primary" : tool.available ? "bg-primary/10" : "bg-muted"}`}
      style={{ width: size, height: size }}
    >
      {tool.textIcon ? (
        <Text className="text-base font-black" style={{ color: glyph }}>
          {tool.fallback}
        </Text>
      ) : (
        <SymbolIcon
          name={tool.icon}
          size={Math.round(size * 0.42)}
          tintColor={glyph}
          weight="bold"
        />
      )}
    </View>
  );
}

function GameTile({
  tool,
  selected,
  onSelect,
  fullWidth = false,
}: {
  tool: Tool;
  selected: boolean;
  onSelect: (key: string) => void;
  fullWidth?: boolean;
}) {
  // A game can replace the default "Soon" badge with a domain label.
  // The badge turns primary when the tile is selected.
  const badgeLabel = tool.available
    ? tool.sourceLabel
    : (tool.unavailableLabel ?? "Segera");
  const disabled = !tool.available || !!tool.disabledHint;
  const badge = (
    <View
      className={`rounded-full px-2 py-1 ${selected ? "bg-primary" : "bg-muted"}`}
    >
      <Text
        className={`text-[9px] font-black uppercase tracking-[1px] ${selected ? "text-primary-foreground" : "text-muted-foreground"}`}
      >
        {badgeLabel}
      </Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole={disabled ? undefined : "button"}
      accessibilityState={{ disabled, selected }}
      accessibilityHint={tool.disabledHint}
      className="active:scale-[0.98] active:opacity-80"
      disabled={disabled}
      onPress={() => onSelect(tool.key)}
      style={{
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? "100%" : "48%",
      }}
    >
      {/* Plain glass like the cohort "Continue learning" hero: tint only, no
          border. Selection reads from the icon + pill. */}
      <StudyGlass
        bordered={false}
        contentClassName={
          fullWidth
            ? "flex-row items-center gap-3 p-4"
            : "min-h-28 justify-between gap-3 p-4"
        }
        isInteractive={!disabled}
        radius={SURFACE_RADIUS}
        tinted={selected}
      >
        {fullWidth ? (
          <>
            <GameIcon selected={selected} size={44} tool={tool} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text
                className="text-[15px] font-bold text-foreground"
                numberOfLines={1}
              >
                {tool.title}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {tool.subtitle}
              </Text>
            </View>
            {badge}
          </>
        ) : (
          <>
            <View className="flex-row items-start justify-between gap-2">
              <GameIcon selected={selected} size={44} tool={tool} />
              {badge}
            </View>
            <View className="gap-0.5">
              <Text
                className="text-[15px] font-bold text-foreground"
                numberOfLines={1}
              >
                {tool.title}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {tool.subtitle}
              </Text>
            </View>
          </>
        )}
      </StudyGlass>
    </Pressable>
  );
}

function GamePicker({
  tools,
  selectedKey,
  onSelect,
}: {
  tools: Tool[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  // With an odd tile count the orphan stretches full-width as a compact
  // horizontal row instead of leaving a gap in the 2-column grid.
  const orphanKey =
    tools.length % 2 === 1 ? tools[tools.length - 1]!.key : null;
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {tools.map((tool) => (
        <GameTile
          key={tool.key}
          fullWidth={tool.key === orphanKey}
          onSelect={onSelect}
          selected={selectedKey === tool.key}
          tool={tool}
        />
      ))}
    </View>
  );
}

export function AssessmentQueue({
  events,
  now,
  onOpen = openAssessmentEvent,
}: {
  events: Event[];
  now: number;
  onOpen?: (event: Event) => void;
}) {
  if (events.length === 0) return null;
  return (
    <StudyGlass
      bordered={false}
      contentClassName="px-4"
      radius={SURFACE_RADIUS}
    >
      {events.map((event, index) => (
        <Pressable
          key={event.id}
          accessibilityHint={`Membuka ${event.title}`}
          accessibilityRole="button"
          className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${index === events.length - 1 ? "" : "border-b border-primary/20"}`}
          onPress={() => onOpen(event)}
        >
          <GameIcon size={36} tool={tools[1]!} />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={1}
            >
              {event.title}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {event.course.title}
              {event.status === "SCHEDULED" &&
              event.opensAt &&
              event.opensAt.getTime() > now
                ? ` · dibuka ${dateLabel(event.opensAt)}`
                : event.closesAt
                  ? ` · ${closesLabel(event.closesAt, now)}`
                  : ""}
            </Text>
          </View>
          <Chevron />
        </Pressable>
      ))}
    </StudyGlass>
  );
}

// One flat entry in the global practice library: the course grouping is
// gone, so each item carries its own course + module context.
export type LibraryItem = {
  key: string;
  courseId: string;
  courseTitle: string;
  id: string;
  type: PracticeFilter;
  title: string;
  moduleId: string;
  moduleTitle: string;
  isCompleted: boolean;
  attempt: { id: string; status: string } | null;
};

/**
 * Every vocabulary set or quiz the learner can open, across their courses,
 * each with its course and chapter.
 */
export function practiceLibraryItems(
  courses: Course[],
  outlines: Record<string, CourseOutline>,
  filter: PracticeFilter,
): LibraryItem[] {
  return courses.flatMap((course) =>
    (outlines[course.id]?.modules ?? []).flatMap((module) =>
      canOpenModule(module.access)
        ? module.items
            .filter((item) => item.type === filter)
            .map((item) => ({
              key: `${course.id}:${item.id}`,
              courseId: course.id,
              courseTitle: course.title,
              id: item.id,
              type: filter,
              title: item.title,
              moduleId: module.id,
              moduleTitle: module.title,
              isCompleted: item.isCompleted,
              attempt:
                item.type === "ASSESSMENT" && item.attempt
                  ? { id: item.attempt.id, status: item.attempt.status }
                  : null,
            }))
        : [],
    ),
  );
}

export function openLibraryItem(item: LibraryItem, gameKey?: GameKey) {
  if (gameKey && item.type === "VOCABULARY_SET") {
    router.push({
      pathname: "/games/[gameKey]",
      // Outlines expose the course item ID, not the vocabulary set ID.
      // The game host resolves the set through this source item.
      params: {
        gameKey,
        courseId: item.courseId,
        sourceCourseItemId: item.id,
      },
    });
    return;
  }
  openCourseItem({
    courseId: item.courseId,
    courseItemId: item.id,
    attempt: item.type === "ASSESSMENT" ? item.attempt : null,
  });
}

// Thin wrapper over the shared learning-item row: the practice library
// always shows the rail + type highlight, single-line detail, chevron.
export function LibraryRow({
  item,
  isLast,
  onOpen,
}: {
  item: LibraryItem;
  isLast: boolean;
  onOpen: (item: LibraryItem) => void;
}) {
  return (
    <LearningItemRow
      title={item.title}
      type={item.type}
      statusText={`${item.courseTitle} · ${item.moduleTitle}`}
      completed={item.isCompleted}
      isLast={isLast}
      detailLines={1}
      onPress={() => onOpen(item)}
    />
  );
}

type StatusFilter = "all" | "todo" | "done";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "todo", label: "Belum dilatih" },
  { key: "done", label: "Sudah dilatih" },
];

// Global practice library in course-learning-footer DNA: footer header
// (eyebrow + 28px title + description + rounded progress), search + filter,
// then one flat footer-style list across every available course.
export function ResourceLibrary({
  courses,
  filter,
  sourceLabel,
  gameKey,
  onRetry,
  outlines,
  onOpenItem,
}: {
  courses: Course[];
  filter: PracticeFilter;
  sourceLabel: string;
  gameKey?: GameKey;
  onRetry: () => void;
  outlines: Record<string, CourseOutline>;
  /** Replaces opening the item directly (the source sheet closes first). */
  onOpenItem?: (item: LibraryItem) => void;
}) {
  const { colors } = useAppTheme();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string | null>(null);

  // Search + status reset when the game tab changes. Dashboard outlines stay
  // namespaced per course, so switching tabs never wipes warm cached results.
  useEffect(() => {
    setQuery("");
    setStatus("all");
  }, [filter]);

  const allItems = useMemo(
    () => practiceLibraryItems(courses, outlines, filter),
    [courses, filter, outlines],
  );
  const missingOutlineCount = courses.filter(
    (course) => !outlines[course.id],
  ).length;

  const normalized = query.trim().toLowerCase();
  const visible = allItems.filter((item) => {
    if (courseFilter && item.courseId !== courseFilter) return false;
    if (status === "todo" && item.isCompleted) return false;
    if (status === "done" && !item.isCompleted) return false;
    if (!normalized) return true;
    return `${item.title} ${item.moduleTitle} ${item.courseTitle}`
      .toLowerCase()
      .includes(normalized);
  });
  const upNext =
    !normalized && status === "all"
      ? visible.find((item) => !item.isCompleted)
      : undefined;
  const rest = upNext
    ? visible.filter((item) => item.key !== upNext.key)
    : visible;
  const activeFilter = statusFilters.find((option) => option.key === status)!;
  const open =
    onOpenItem ?? ((item: LibraryItem) => openLibraryItem(item, gameKey));

  if (courses.length === 0) {
    return <Empty>Ikuti kurikulum untuk membuka latihan.</Empty>;
  }

  return (
    <View className="gap-4">
      <View className="gap-1.5 pt-1">
        <Eyebrow tone="primary">{sourceLabel}</Eyebrow>
      </View>
      <View className="flex-row items-center gap-2">
        <GlassInput
          accessibilityLabel="Cari latihan"
          autoCapitalize="none"
          autoCorrect={false}
          height={48}
          onChangeText={setQuery}
          placeholder={
            filter === "ASSESSMENT" ? "Cari quiz…" : "Cari set kosakata…"
          }
          returnKeyType="search"
          value={query}
          leading={
            <View
              pointerEvents="none"
              className="size-10 items-center justify-center"
            >
              <SymbolIcon
                name="magnifyingglass"
                size={20}
                tintColor={colors.primary}
                weight="bold"
              />
            </View>
          }
          trailing={
            query.length > 0 ? (
              <Pressable
                accessibilityLabel="Hapus pencarian"
                accessibilityRole="button"
                onPress={() => setQuery("")}
                className="rounded-full active:opacity-75"
              >
                <View className="size-10 items-center justify-center">
                  <SymbolIcon
                    name="xmark.circle.fill"
                    size={20}
                    tintColor={colors.primary}
                    weight="bold"
                  />
                </View>
              </Pressable>
            ) : undefined
          }
        />
        <Pressable
          accessibilityLabel={`Filter: ${activeFilter.label}. Ketuk untuk mengubah.`}
          accessibilityRole="button"
          className="active:opacity-70"
          onPress={() => {
            const index = statusFilters.findIndex(
              (option) => option.key === status,
            );
            setStatus(statusFilters[(index + 1) % statusFilters.length]!.key);
          }}
        >
          <View className="min-h-12 flex-row items-center gap-1.5 rounded-full bg-muted px-4">
            <SymbolIcon
              name="line.3.horizontal.decrease.circle"
              size={16}
              tintColor={colors.foreground}
              weight="semibold"
            />
            <Text className="text-sm font-bold text-foreground">
              {activeFilter.label}
            </Text>
          </View>
        </Pressable>
      </View>
      {courses.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label="Semua kurikulum"
            selected={courseFilter === null}
            onPress={() => setCourseFilter(null)}
          />
          {courses.map((course) => {
            const selected = courseFilter === course.id;
            return (
              <Chip
                key={course.id}
                label={course.title}
                selected={selected}
                onPress={() => setCourseFilter(selected ? null : course.id)}
              />
            );
          })}
        </ScrollView>
      ) : null}
      {missingOutlineCount === courses.length ? (
        <View className="gap-3 py-4">
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            Bahan latihan kamu tidak dapat dimuat.
          </Text>
          <Action variant="secondary" onPress={onRetry}>
            Coba lagi
          </Action>
        </View>
      ) : visible.length === 0 ? (
        <Empty>
          {normalized
            ? "Tidak ada latihan yang cocok dengan pencarian."
            : status === "done"
              ? "Belum ada yang dilatih."
              : "Tidak ada lagi yang perlu dilatih."}
        </Empty>
      ) : (
        <View>
          {upNext ? (
            <LibraryRow
              isLast={rest.length === 0}
              item={upNext}
              onOpen={open}
            />
          ) : null}
          {rest.map((item, index) => (
            <LibraryRow
              key={item.key}
              isLast={index === rest.length - 1}
              item={item}
              onOpen={open}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function PracticeHub(props: HubProps) {
  const { colors } = useAppTheme();
  const [sourceDismissed, setSourceDismissed] = useState(false);
  const preselectedKey = props.preselectedSource
    ? `${props.preselectedSource.courseId}:${props.preselectedSource.sourceCourseItemId}`
    : null;
  useEffect(() => {
    setSourceDismissed(false);
  }, [preselectedKey]);
  const activeSource =
    !sourceDismissed && preselectedKey ? props.preselectedSource : undefined;
  // While a vocab set is preselected, Quiz has nothing to run on, so it
  // reads disabled (keeping its "Tugas" badge) instead of dropping context
  // into the generic assessment list.
  const displayTools = useMemo(
    () =>
      activeSource
        ? tools.map((candidate) =>
            candidate.resource === "ASSESSMENT"
              ? {
                  ...candidate,
                  disabledHint:
                    "Quiz membutuhkan tugas kelas dan tidak bisa memakai set ini",
                }
              : candidate,
          )
        : tools,
    [activeSource],
  );

  const handleSelect = useCallback(
    (key: string) => {
      const nextTool =
        displayTools.find((candidate) => candidate.key === key) ??
        selectedTool(key);
      if (!nextTool || nextTool.disabledHint || !nextTool.available) return;
      // Deep link: a vocab set arrived with context, so choosing a vocab
      // game launches it immediately instead of asking for a source again.
      if (
        activeSource &&
        nextTool.resource === "VOCABULARY_SET" &&
        isGameKey(nextTool.key)
      ) {
        router.push({
          pathname: "/games/[gameKey]",
          params: {
            gameKey: nextTool.key,
            courseId: activeSource.courseId,
            sourceCourseItemId: activeSource.sourceCourseItemId,
          },
        });
        return;
      }
      // Otherwise the source (a vocabulary set or a tugas) is picked in a
      // sheet, which keeps Latihan a short menu.
      router.push({ pathname: "/practice-source", params: { tool: key } });
    },
    [activeSource, displayTools],
  );

  return (
    <>
      {props.hangeulHidden ? null : (
        <TourTarget id="practice.hangeul" className="gap-3 pt-1">
          <Eyebrow>Penguasaan Hangeul</Eyebrow>
          <GamePicker
            tools={hangeulTools}
            onSelect={(key) => {
              if (!isGameKey(key)) return;
              router.push({
                pathname: "/games/[gameKey]",
                params: { gameKey: key },
              });
            }}
            selectedKey={null}
          />
        </TourTarget>
      )}
      <QueryState
        error={props.coursesError}
        pending={props.coursesPending}
        retry={props.onRetryCourses}
      />
      {!props.coursesPending && !props.coursesError ? (
        <>
          {activeSource ? (
            <StudyGlass
              bordered={false}
              contentClassName="flex-row items-center gap-2 p-4"
              radius={SURFACE_RADIUS}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Buka detail ${activeSource.title ?? "set kosakata"}`}
                accessibilityHint="Membuka layar detail set kosakata"
                className="min-w-0 flex-1 active:opacity-70"
                onPress={() =>
                  openCourseItem({
                    courseId: activeSource.courseId,
                    courseItemId: activeSource.sourceCourseItemId,
                  })
                }
              >
                <View className="gap-0.5">
                  <Eyebrow tone="primary">Sedang dilatih</Eyebrow>
                  <Text
                    className="text-[15px] font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {activeSource.title ?? "Set kosakata terpilih"}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    Ketuk untuk melihat set · Pilih game untuk mulai
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus pilihan set kosakata"
                accessibilityHint="Menampilkan semua set kosakata lagi"
                className="size-8 items-center justify-center rounded-full active:opacity-60"
                onPress={() => setSourceDismissed(true)}
              >
                <SymbolIcon
                  name="xmark"
                  size={14}
                  tintColor={colors.mutedForeground}
                  weight="bold"
                />
              </Pressable>
            </StudyGlass>
          ) : null}
          <TourTarget id="practice.games" className="gap-3 pt-1">
            <Eyebrow>Pilih game</Eyebrow>
            <GamePicker
              tools={displayTools}
              onSelect={handleSelect}
              selectedKey={null}
            />
            {activeSource ? (
              <Text className="text-xs leading-4 text-muted-foreground">
                Quiz memakai tugas kelas, bukan set kosakata. Ketuk × di atas
                untuk melihat semua set dan quiz.
              </Text>
            ) : null}
          </TourTarget>
        </>
      ) : null}
    </>
  );
}
