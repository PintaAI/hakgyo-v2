import type { RouterOutputs } from "@hakgyo/api";
import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { canOpenModule } from "../lib/study";
import { isGameKey, type GameKey } from "../games/catalog";
import { useAppTheme } from "../providers/AppThemeProvider";
import { withOpacity } from "../theme/colors";
import { GlassBox } from "./GlassBox";
import { closesLabel } from "./learn/cohort-card";
import { LearningItemRow } from "./learn/learning-item-row";
import { Action, Empty, Eyebrow, QueryState } from "./learning-ui";

export type Course = RouterOutputs["learning"]["listMyCourses"][number];
type Event = RouterOutputs["assessmentEvent"]["listForLearner"][number];
type PracticeFilter = "VOCABULARY_SET" | "ASSESSMENT";

export type PreselectedVocabularySource = {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId?: string;
  title?: string;
};

type HubProps = {
  courses: Course[];
  coursesPending: boolean;
  coursesError?: { message: string } | null;
  events: Event[];
  eventsPending: boolean;
  eventsError?: { message: string } | null;
  now: number;
  onRetryCourses: () => void;
  onRetryEvents: () => void;
  outlines: RouterOutputs["mobileSync"]["getDashboard"]["outlines"];
  onResourceFocus?: (offsetY: number) => void;
  preselectedSource?: PreselectedVocabularySource;
};

type Tool = {
  key: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  unavailableLabel?: string;
  icon: SymbolViewProps["name"];
  fallback: string;
  textIcon?: boolean;
  resource: PracticeFilter;
  available: boolean;
  // Contextual disable, distinct from available=false ("Soon", not built).
  // The tile keeps its source badge but is not interactive while set.
  disabledHint?: string;
};

const tools: Tool[] = [
  {
    key: "cards",
    title: "Cards",
    subtitle: "Flip & recall",
    sourceLabel: "Kosa-kata",
    icon: "rectangle.stack.fill",
    fallback: "Aa",
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "assessment",
    title: "Quiz",
    subtitle: "Test yourself",
    sourceLabel: "Tugas",
    icon: "checkmark.circle.fill",
    fallback: "✓",
    resource: "ASSESSMENT",
    available: true,
  },
  {
    key: "word-fall",
    title: "Word Fall",
    subtitle: "Type before impact",
    sourceLabel: "Kosa-kata",
    icon: "arrow.down.circle.fill",
    fallback: "↓",
    resource: "VOCABULARY_SET",
    available: true,
  },
  {
    key: "sentences",
    title: "Sentences",
    subtitle: "Build meaning",
    sourceLabel: "Kosa-kata",
    icon: "text.word.spacing",
    fallback: "↔",
    resource: "VOCABULARY_SET",
    available: false,
  },
  {
    key: "match",
    title: "Match",
    subtitle: "Connect the pairs",
    sourceLabel: "Kosa-kata",
    icon: "square.grid.2x2.fill",
    fallback: "⊞",
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
    sourceLabel: "Hangeul",
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
    sourceLabel: "Hangeul",
    unavailableLabel: "한글",
    icon: "text.word.spacing",
    fallback: "가나",
    resource: "VOCABULARY_SET",
    available: true,
  },
];

// One corner family for the whole hub, shared with cohort-card so the two
// tabs read as a set. Chips and icon circles stay fully round.
const SURFACE_RADIUS = 20;

function selectedTool(key: string | null | undefined) {
  if (!key) return undefined;
  return tools.find((tool) => tool.key === key);
}

function GameIcon({
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
        <SymbolView
          fallback={
            <Text className="text-base font-black" style={{ color: glyph }}>
              {tool.fallback}
            </Text>
          }
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
  const { colors, colorScheme } = useAppTheme();
  // Plain glass like the cohort "Continue learning" hero: tint only, no
  // border or solid card background. Selection reads from the icon + pill.
  const glassTint = withOpacity(
    colors.primary,
    colorScheme === "dark" ? 0.35 : 0.18,
  );
  // A game can replace the default "Soon" badge with a domain label.
  // The badge turns primary when the tile is selected.
  const badgeLabel = tool.available
    ? tool.sourceLabel
    : (tool.unavailableLabel ?? "Soon");
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
      <GlassBox
        isInteractive={!disabled}
        tintColor={selected ? glassTint : undefined}
        glassEffectStyle="clear"
        style={styles.tile}
      >
        {fullWidth ? (
          <View className="flex-row items-center gap-3 p-4">
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
          </View>
        ) : (
          <View className="min-h-28 justify-between gap-3 p-4">
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
          </View>
        )}
      </GlassBox>
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

function openEvent(event: Event) {
  const attempt = event.attempts[0];
  if (event.entry.destination === "ATTEMPT" && attempt) {
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: {
        courseId: event.course.id,
        courseItemId: event.courseItem.id,
        attemptId: attempt.id,
      },
    });
    return;
  }
  router.push({ pathname: "/events/[eventId]", params: { eventId: event.id } });
}

function AssessmentQueue({ events, now }: { events: Event[]; now: number }) {
  const { colors, colorScheme } = useAppTheme();
  if (events.length === 0) return null;
  return (
    <GlassBox
      isInteractive={false}
      tintColor={withOpacity(
        colors.primary,
        colorScheme === "dark" ? 0.35 : 0.18,
      )}
      glassEffectStyle="clear"
      style={styles.surface}
    >
      <View className="px-4">
        {events.map((event, index) => (
          <Pressable
            key={event.id}
            accessibilityHint={`Opens ${event.title}`}
            accessibilityRole="button"
            className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${index === events.length - 1 ? "" : "border-b border-primary/20"}`}
            onPress={() => openEvent(event)}
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
                {event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}
              </Text>
            </View>
            <Text className="text-lg text-muted-foreground">›</Text>
          </Pressable>
        ))}
      </View>
    </GlassBox>
  );
}

function AssessmentEvents({ props }: { props: HubProps }) {
  return (
    <>
      <QueryState
        error={props.eventsError}
        pending={props.eventsPending}
        retry={props.onRetryEvents}
      />
      <AssessmentQueue events={props.events} now={props.now} />
    </>
  );
}

// One flat entry in the global practice library: the course grouping is
// gone, so each item carries its own course + module context.
type LibraryItem = {
  key: string;
  courseId: string;
  courseTitle: string;
  id: string;
  type: PracticeFilter;
  title: string;
  moduleTitle: string;
  isCompleted: boolean;
  attempt: { id: string; status: string } | null;
};

function openLibraryItem(item: LibraryItem, gameKey?: GameKey) {
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
  if (item.type === "ASSESSMENT" && item.attempt?.status === "IN_PROGRESS") {
    router.push({
      pathname: "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
      params: {
        courseId: item.courseId,
        courseItemId: item.id,
        attemptId: item.attempt.id,
      },
    });
    return;
  }
  router.push({
    pathname: "/courses/[courseId]/items/[courseItemId]",
    params: { courseId: item.courseId, courseItemId: item.id },
  });
}

// Thin wrapper over the shared learning-item row: the practice library
// always shows the rail + type highlight, single-line detail, chevron.
function LibraryRow({
  item,
  isLast,
  gameKey,
}: {
  item: LibraryItem;
  isLast: boolean;
  gameKey?: GameKey;
}) {
  return (
    <LearningItemRow
      title={item.title}
      type={item.type}
      statusText={`${item.courseTitle} · ${item.moduleTitle}`}
      completed={item.isCompleted}
      isLast={isLast}
      detailLines={1}
      onPress={() => openLibraryItem(item, gameKey)}
    />
  );
}

type StatusFilter = "all" | "todo" | "done";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To practice" },
  { key: "done", label: "Practiced" },
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
}: {
  courses: Course[];
  filter: PracticeFilter;
  sourceLabel: string;
  gameKey?: GameKey;
  onRetry: () => void;
  outlines: RouterOutputs["mobileSync"]["getDashboard"]["outlines"];
}) {
  const { colors, colorScheme } = useAppTheme();
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
    () =>
      courses.flatMap((course) =>
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
                  moduleTitle: module.title,
                  isCompleted: item.isCompleted,
                  attempt:
                    item.type === "ASSESSMENT" && item.attempt
                      ? { id: item.attempt.id, status: item.attempt.status }
                      : null,
                }))
            : [],
        ),
      ),
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

  if (courses.length === 0) {
    return <Empty>Join a course to unlock practice.</Empty>;
  }

  return (
    <View className="gap-4">
      <View className="gap-1.5 pt-1">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
          {sourceLabel}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <GlassBox
          isInteractive
          tintColor={withOpacity(
            colors.primary,
            colorScheme === "dark" ? 0.35 : 0.18,
          )}
          glassEffectStyle="clear"
          style={{ borderRadius: 9999, flex: 1, height: 48 }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 2,
              top: 4,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView
              fallback={
                <Text className="text-base" style={{ color: colors.primary }}>
                  ⌕
                </Text>
              }
              name="magnifyingglass"
              size={20}
              tintColor={colors.primary}
              weight="bold"
            />
          </View>
          {query.length === 0 ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center px-14"
            >
              <Text
                className="text-center text-base"
                numberOfLines={1}
                style={{ color: colors.mutedForeground }}
              >
                {filter === "ASSESSMENT"
                  ? "Search quizzes…"
                  : "Search vocabulary sets…"}
              </Text>
            </View>
          ) : null}
          <TextInput
            accessibilityLabel="Search practice"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            returnKeyType="search"
            selectionColor={colors.primary}
            value={query}
            style={{
              color: colors.foreground,
              fontSize: 16,
              height: 48,
              includeFontPadding: false,
              paddingHorizontal: 48,
              paddingVertical: 0,
              textAlign: "center",
              textAlignVertical: "center",
              width: "100%",
            }}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              onPress={() => setQuery("")}
              className="rounded-full active:opacity-75"
              style={{ position: "absolute", right: 4, top: 4 }}
            >
              <View className="size-10 items-center justify-center">
                <SymbolView
                  fallback={
                    <Text
                      className="text-base"
                      style={{ color: colors.primary }}
                    >
                      ×
                    </Text>
                  }
                  name="xmark.circle.fill"
                  size={20}
                  tintColor={colors.primary}
                  weight="bold"
                />
              </View>
            </Pressable>
          ) : null}
        </GlassBox>
        <Pressable
          accessibilityLabel={`Filter: ${activeFilter.label}. Activate to change.`}
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
            <SymbolView
              fallback={
                <Text className="text-sm font-black text-foreground">☰</Text>
              }
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: courseFilter === null }}
            className="active:opacity-70"
            onPress={() => setCourseFilter(null)}
          >
            <View
              className={`min-h-9 items-center justify-center rounded-full px-3.5 ${courseFilter === null ? "bg-primary" : "bg-muted"}`}
            >
              <Text
                className={`text-xs font-bold ${courseFilter === null ? "text-primary-foreground" : "text-foreground"}`}
              >
                All courses
              </Text>
            </View>
          </Pressable>
          {courses.map((course) => {
            const selected = courseFilter === course.id;
            return (
              <Pressable
                key={course.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="active:opacity-70"
                onPress={() => setCourseFilter(selected ? null : course.id)}
              >
                <View
                  className={`min-h-9 max-w-52 items-center justify-center rounded-full px-3.5 ${selected ? "bg-primary" : "bg-muted"}`}
                >
                  <Text
                    className={`text-xs font-bold ${selected ? "text-primary-foreground" : "text-foreground"}`}
                    numberOfLines={1}
                  >
                    {course.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {missingOutlineCount === courses.length ? (
        <View className="gap-3 py-4">
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            We couldn’t load your practice materials.
          </Text>
          <Action secondary onPress={onRetry}>
            Try again
          </Action>
        </View>
      ) : visible.length === 0 ? (
        <Empty>
          {normalized
            ? "No practice matches your search."
            : status === "done"
              ? "Nothing practiced yet."
              : "Nothing left to practice."}
        </Empty>
      ) : (
        <View>
          {upNext ? (
            <LibraryRow
              gameKey={gameKey}
              isLast={rest.length === 0}
              item={upNext}
            />
          ) : null}
          {rest.map((item, index) => (
            <LibraryRow
              key={item.key}
              gameKey={gameKey}
              isLast={index === rest.length - 1}
              item={item}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ModeResources({ props, tool }: { props: HubProps; tool: Tool }) {
  return (
    <View className="gap-3">
      {tool.resource === "ASSESSMENT" ? (
        <AssessmentEvents props={props} />
      ) : null}
      <ResourceLibrary
        courses={props.courses}
        filter={tool.resource}
        gameKey={isGameKey(tool.key) ? tool.key : undefined}
        onRetry={props.onRetryCourses}
        outlines={props.outlines}
        sourceLabel={tool.sourceLabel}
      />
    </View>
  );
}

export function PracticeHub(props: HubProps) {
  const { colors, colorScheme } = useAppTheme();
  const [toolKey, setToolKey] = useState<string | null>(null);
  const tool = selectedTool(toolKey);
  const resourceOffset = useRef(0);
  const resourceHighlight = useSharedValue(0);
  const resourceHighlightStyle = useAnimatedStyle(() => ({
    opacity: resourceHighlight.value,
  }));
  const [sourceDismissed, setSourceDismissed] = useState(false);
  const preselectedKey = props.preselectedSource
    ? `${props.preselectedSource.courseId}:${props.preselectedSource.sourceCourseItemId}`
    : null;
  useEffect(() => {
    setSourceDismissed(false);
    // No default game: the learner picks one, which then reveals resources.
    // (Quiz still cannot practice a preselected vocabulary set.)
    setToolKey(null);
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
                    "Quiz needs a class assessment and can't practice this set",
                }
              : candidate,
          )
        : tools,
    [activeSource],
  );

  const handleResourceLayout = useCallback((event: LayoutChangeEvent) => {
    resourceOffset.current = event.nativeEvent.layout.y;
  }, []);

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
        nextTool.available &&
        isGameKey(nextTool.key)
      ) {
        setToolKey(key);
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
      setToolKey(key);
      resourceHighlight.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withDelay(
          900,
          withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) }),
        ),
      );
      requestAnimationFrame(() => {
        props.onResourceFocus?.(resourceOffset.current);
      });
    },
    [activeSource, displayTools, props.onResourceFocus, resourceHighlight],
  );

  return (
    <>
      <View className="gap-3 pt-1">
        <Eyebrow>Hangeul Mastery</Eyebrow>
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
      </View>
      <QueryState
        error={props.coursesError}
        pending={props.coursesPending}
        retry={props.onRetryCourses}
      />
      {!props.coursesPending && !props.coursesError ? (
        <>
          {activeSource ? (
            <GlassBox
              isInteractive={false}
              tintColor={withOpacity(
                colors.primary,
                colorScheme === "dark" ? 0.35 : 0.18,
              )}
              glassEffectStyle="clear"
              style={styles.surface}
            >
              <View className="flex-row items-center gap-2 p-4">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${activeSource.title ?? "vocabulary set"} details`}
                  accessibilityHint="Opens the vocabulary set detail screen"
                  className="min-w-0 flex-1 active:opacity-70"
                  onPress={() =>
                    router.push({
                      pathname: "/courses/[courseId]/items/[courseItemId]",
                      params: {
                        courseId: activeSource.courseId,
                        courseItemId: activeSource.sourceCourseItemId,
                      },
                    })
                  }
                >
                  <View className="gap-0.5">
                    <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
                      Practicing
                    </Text>
                    <Text
                      className="text-[15px] font-bold text-foreground"
                      numberOfLines={1}
                    >
                      {activeSource.title ?? "Selected vocabulary set"}
                    </Text>
                    <Text
                      className="text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      Tap to view set · Choose a game to start
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected vocabulary set"
                  accessibilityHint="Shows all vocabulary sets again"
                  className="size-8 items-center justify-center rounded-full active:opacity-60"
                  onPress={() => setSourceDismissed(true)}
                >
                  <SymbolView
                    fallback={
                      <Text
                        className="text-base font-black"
                        style={{ color: colors.mutedForeground }}
                      >
                        ×
                      </Text>
                    }
                    name="xmark"
                    size={14}
                    tintColor={colors.mutedForeground}
                    weight="bold"
                  />
                </Pressable>
              </View>
            </GlassBox>
          ) : null}
          <View className="gap-3 pt-1">
            <Eyebrow>Choose a game</Eyebrow>
            <GamePicker
              tools={displayTools}
              onSelect={handleSelect}
              selectedKey={toolKey}
            />
            {activeSource ? (
              <Text className="text-xs leading-4 text-muted-foreground">
                Quiz runs on class assessments, not vocabulary sets. Tap × above
                to browse all sets and quizzes.
              </Text>
            ) : null}
          </View>
          {tool ? (
            <View
              className="gap-3"
              onLayout={handleResourceLayout}
              style={styles.resourceSection}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.resourceHighlight,
                  {
                    backgroundColor: withOpacity(
                      colors.primary,
                      colorScheme === "dark" ? 0.12 : 0.06,
                    ),
                  },
                  resourceHighlightStyle,
                ]}
              />
              <ModeResources props={props} tool={tool} />
            </View>
          ) : null}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: SURFACE_RADIUS,
    overflow: "hidden",
  },
  tile: {
    borderRadius: SURFACE_RADIUS,
    overflow: "hidden",
  },
  resourceSection: {
    borderRadius: SURFACE_RADIUS,
    padding: 8,
    position: "relative",
  },
  resourceHighlight: {
    bottom: 0,
    borderRadius: SURFACE_RADIUS,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
