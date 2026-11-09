import {
  memo,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";

import {
  assessmentAttemptPresentation,
  latestStandaloneAttemptsByItem,
} from "../../lib/assessment-state";
import { getCourseResumeItem } from "../../lib/course-learning-path";
import { authClient } from "../../lib/auth-client";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { useSidebarIndicators } from "../../lib/sidebar-indicators";
import {
  useCourseOutline,
  useSyncIndex,
  type CourseOfflineMedia,
  type CourseOutline,
  type LearnerIndex,
} from "../../sync/hooks";
import {
  Badge,
  EmptyState,
  Eyebrow,
  QueryState,
  SectionHeader,
} from "../learning-ui";
import { ModuleOfflineBadge } from "../offline-download";
import { LearningItemRow } from "./learning-item-row";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";
import { SymbolIcon } from "../ui/symbol-icon";

type OutlineModule = CourseOutline["modules"][number];
type OutlineItem = OutlineModule["items"][number];
type OutlineAttempt = LearnerIndex["attempts"][number];

type OpenItem = (
  item: { id: string },
  attempt:
    | {
        id: string;
        status: "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
      }
    | undefined,
) => void;

type OpenOutlineItem = (
  moduleId: string,
  item: OutlineItem,
  attempt: OutlineAttempt | undefined,
) => void;

const NO_ASSET_IDS: readonly string[] = [];

/**
 * The chapters and activities of a course. Memoized, and every chapter and
 * row below it too, so a parent re-rendering (the Belajar clock ticks every
 * 30 seconds) leaves a long outline alone; only a changed outline, attempt or
 * indicator re-renders the rows it touches.
 */
export const CourseOutlineList = memo(function CourseOutlineList({
  courseId,
  outline,
  currentItemId,
  onOpenItem,
  showHeader = true,
  showActiveState = true,
  collapsible = false,
  hideCompleted = false,
  onShowCompleted,
  completionSlot,
  offlineMedia,
}: {
  courseId: string;
  /**
   * The composed outline when the parent already has it (Belajar composes
   * every cohort's outline at once); otherwise the list loads its own.
   */
  outline?: CourseOutline;
  currentItemId?: string;
  onOpenItem: OpenItem;
  showHeader?: boolean;
  showActiveState?: boolean;
  /**
   * Chapters fold to their header row, with only the chapter of the current
   * (or next) activity open, so a long curriculum mounts a few rows.
   */
  collapsible?: boolean;
  /**
   * Leaves out finished chapters and finished activities, so the list shows
   * what is left; finished chapters fold into one row that calls
   * `onShowCompleted`.
   */
  hideCompleted?: boolean;
  onShowCompleted?: () => void;
  /**
   * With `hideCompleted`, shown in place of the chapters once every one is
   * finished (Belajar's badge claim).
   */
  completionSlot?: ReactNode;
  /** Shows each open chapter's offline state and a download button. */
  offlineMedia?: CourseOfflineMedia | null;
}) {
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const { items: indicators, markEntitySeen } = useSidebarIndicators();
  const dashboard = useSyncIndex(activeOrganizationId);
  const outlineQuery = useCourseOutline(courseId, {
    enabled: Boolean(session && courseId) && !outline,
  });
  const course = outline ?? outlineQuery.data;
  const resumeItemId = useMemo(
    () => (course ? getCourseResumeItem(course)?.id : undefined),
    [course],
  );
  const attempts = dashboard.data?.attempts;
  const attemptByItem = useMemo(
    () => latestStandaloneAttemptsByItem(attempts),
    [attempts],
  );
  const unreadModuleIds = useMemo(
    () =>
      new Set(
        indicators
          .filter((item) => item.kind === "MODULE" && item.unread)
          .map((item) => item.entityId),
      ),
    [indicators],
  );
  const moduleAssetIds = useMemo(
    () =>
      new Map(
        offlineMedia?.modules.map((entry) => [entry.moduleId, entry.assetIds]),
      ),
    [offlineMedia],
  );

  // One stable callback for every row, reading the latest handlers, so the
  // memoized rows survive parents that pass a new `onOpenItem` each render.
  const handlers = useRef({ markEntitySeen, onOpenItem });
  useLayoutEffect(() => {
    handlers.current = { markEntitySeen, onOpenItem };
  });
  const openItem = useCallback<OpenOutlineItem>((moduleId, item, attempt) => {
    handlers.current.markEntitySeen("MODULE", moduleId);
    handlers.current.onOpenItem(item, attempt);
  }, []);

  // Chapters the learner folded or unfolded against the default, which keeps
  // following the current activity as it moves on.
  const [toggledModuleIds, setToggledModuleIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleModule = useCallback((moduleId: string) => {
    setToggledModuleIds((current) => {
      const next = new Set(current);
      if (!next.delete(moduleId)) next.add(moduleId);
      return next;
    });
  }, []);
  const focusItemId = currentItemId ?? resumeItemId;
  const focusModuleId = useMemo(
    () =>
      focusItemId
        ? course?.modules.find((module) =>
            module.items.some((item) => item.id === focusItemId),
          )?.id
        : undefined,
    [course, focusItemId],
  );

  const shownModules = useMemo(
    () =>
      (course?.modules ?? []).flatMap((module, moduleIndex) =>
        hideCompleted && module.isCompleted ? [] : [{ module, moduleIndex }],
      ),
    [course, hideCompleted],
  );

  if (!course) {
    return (
      <QueryState
        pending={outlineQuery.isPending}
        error={outlineQuery.error}
        retry={() => {
          void dashboard.refetch();
          void outlineQuery.refetch();
        }}
      />
    );
  }

  return (
    <View className={collapsible ? "gap-4" : "gap-5"}>
      {showHeader ? (
        <SectionHeader
          title="Materi kurikulum"
          trailing={
            <Text className="text-xs font-semibold text-muted-foreground">
              {course.modules.length} bab
            </Text>
          }
        />
      ) : null}

      {course.modules.length === 0 ? (
        <EmptyState title="Belum ada materi" variant="flush">
          Bab yang dipublikasikan akan muncul di sini.
        </EmptyState>
      ) : (
        shownModules.map(({ module, moduleIndex }, position) => (
          <OutlineModuleSection
            key={module.id}
            module={module}
            moduleIndex={moduleIndex}
            separated={position > 0}
            hideCompleted={hideCompleted}
            unread={unreadModuleIds.has(module.id)}
            open={
              !collapsible ||
              (module.id === focusModuleId) !== toggledModuleIds.has(module.id)
            }
            collapsible={collapsible}
            onToggle={toggleModule}
            attemptByItem={attemptByItem}
            currentItemId={currentItemId}
            resumeItemId={currentItemId ? undefined : resumeItemId}
            showActiveState={showActiveState}
            onOpenItem={openItem}
            offlineSizes={offlineMedia?.sizes}
            offlineAssetIds={moduleAssetIds.get(module.id) ?? NO_ASSET_IDS}
          />
        ))
      )}
      {hideCompleted &&
      course.modules.length > 0 &&
      shownModules.length === 0 &&
      completionSlot
        ? completionSlot
        : null}
      {course.modules.length > shownModules.length ? (
        <FinishedChaptersRow
          count={course.modules.length - shownModules.length}
          separated={shownModules.length > 0 || !!completionSlot}
          onPress={onShowCompleted}
        />
      ) : null}
    </View>
  );
});

function FinishedChaptersRow({
  count,
  separated,
  onPress,
}: {
  count: number;
  separated: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityHint={onPress ? "Lihat semua bab" : undefined}
      className={`flex-row items-center gap-3 ${separated ? "border-t border-border pt-4" : ""} ${onPress ? "active:opacity-60" : ""}`}
      disabled={!onPress}
      onPress={onPress}
    >
      <View className="size-9 items-center justify-center rounded-md border border-primary bg-primary">
        <SymbolIcon
          name="checkmark"
          size={14}
          weight="bold"
          tintColor={colors.primaryForeground}
        />
      </View>
      <Text className="min-w-0 flex-1 text-base font-bold text-foreground">
        {separated ? `${count} bab selesai` : "Semua bab selesai"}
      </Text>
      {onPress ? (
        <SymbolIcon
          name="chevron.right"
          size={14}
          weight="semibold"
          tintColor={colors.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}

const OutlineModuleSection = memo(function OutlineModuleSection({
  module,
  moduleIndex,
  separated,
  hideCompleted,
  unread,
  open,
  collapsible,
  onToggle,
  attemptByItem,
  currentItemId,
  resumeItemId,
  showActiveState,
  onOpenItem,
  offlineSizes,
  offlineAssetIds,
}: {
  module: OutlineModule;
  moduleIndex: number;
  /** Not the first chapter shown: draws the divider above. */
  separated: boolean;
  /** Lists only the chapter's unfinished activities. */
  hideCompleted: boolean;
  unread: boolean;
  open: boolean;
  collapsible: boolean;
  onToggle: (moduleId: string) => void;
  attemptByItem: ReadonlyMap<string, OutlineAttempt>;
  currentItemId?: string;
  resumeItemId?: string;
  showActiveState: boolean;
  onOpenItem: OpenOutlineItem;
  /** Set when the outline shows offline state (the course page). */
  offlineSizes?: ReadonlyMap<string, number>;
  offlineAssetIds: readonly string[];
}) {
  const { colors } = useAppTheme();
  const locked = module.access === "LOCKED";
  const hasSubtitle = locked || !!module.description;
  const completedItems = module.items.filter((item) => item.isCompleted).length;
  const items = hideCompleted
    ? module.items.filter((item) => !item.isCompleted)
    : module.items;
  const separator = separated
    ? collapsible
      ? "border-t border-border pt-4"
      : "border-t border-border pt-6"
    : "";

  const header = (
    <View
      className={`flex-row gap-3 ${hasSubtitle ? "items-start" : "items-center"}`}
    >
      <View
        className={`size-9 items-center justify-center rounded-md border ${module.isCompleted ? "border-primary bg-primary" : "border-border bg-background"}`}
      >
        <Text
          className={`text-xs font-bold tabular-nums ${module.isCompleted ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {String(moduleIndex + 1).padStart(2, "0")}
        </Text>
      </View>
      <View className={`min-w-0 flex-1 ${hasSubtitle ? "gap-1" : ""}`}>
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {module.title}
        </Text>
        {/* One line only, so long descriptions never push the row. */}
        {hasSubtitle ? (
          <Text
            className="text-sm leading-5 text-muted-foreground"
            numberOfLines={1}
          >
            {locked ? "Selesaikan bab sebelumnya dulu." : module.description}
          </Text>
        ) : null}
      </View>
      <View className={`${hasSubtitle ? "pt-1" : ""} items-end gap-1`}>
        {unread ? (
          <Badge tone="destructive" size="sm">
            Baru
          </Badge>
        ) : null}
        {locked ? (
          <SymbolIcon
            accessibilityLabel="Terkunci"
            name="lock.fill"
            size={14}
            tintColor={colors.mutedForeground}
          />
        ) : (
          <Eyebrow size="xs">
            {module.isCompleted
              ? "Selesai"
              : `${completedItems}/${module.items.length} selesai`}
          </Eyebrow>
        )}
        {!locked && offlineSizes ? (
          <ModuleOfflineBadge
            moduleId={module.id}
            assetIds={offlineAssetIds}
            sizes={offlineSizes}
          />
        ) : null}
      </View>
      {collapsible ? (
        <View
          accessibilityElementsHidden
          className={`justify-center ${hasSubtitle ? "pt-1" : ""}`}
          importantForAccessibility="no-hide-descendants"
          style={open ? { transform: [{ rotate: "180deg" }] } : undefined}
        >
          <SymbolIcon
            name="chevron.down"
            size={14}
            weight="semibold"
            tintColor={colors.mutedForeground}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View className={`${separator} ${locked ? "opacity-60" : ""}`}>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityHint={open ? "Tutup isi bab" : "Lihat isi bab"}
          className="active:opacity-60"
          onPress={() => onToggle(module.id)}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}

      {!open ? null : items.length === 0 ? (
        <Text className="py-5 pl-12 text-sm text-muted-foreground">
          Belum ada aktivitas di bab ini.
        </Text>
      ) : (
        <View className="relative ml-3 mt-6">
          <View className="absolute -left-1 -top-6 h-10 w-2 rounded-bl-lg border-b-2 border-l-2 border-border" />
          {items.map((item, itemIndex) => (
            <OutlineItemRow
              key={item.id}
              item={item}
              moduleId={module.id}
              locked={locked}
              attempt={
                item.type === "ASSESSMENT"
                  ? attemptByItem.get(item.id)
                  : undefined
              }
              isLast={itemIndex === items.length - 1}
              isCurrent={item.id === currentItemId}
              isNext={item.id === resumeItemId}
              showActiveState={showActiveState}
              onOpenItem={onOpenItem}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const OutlineItemRow = memo(function OutlineItemRow({
  item,
  moduleId,
  locked,
  attempt,
  isLast,
  isCurrent,
  isNext,
  showActiveState,
  onOpenItem,
}: {
  item: OutlineItem;
  moduleId: string;
  locked: boolean;
  attempt: OutlineAttempt | undefined;
  isLast: boolean;
  isCurrent: boolean;
  isNext: boolean;
  showActiveState: boolean;
  onOpenItem: OpenOutlineItem;
}) {
  const assessmentState =
    item.type === "ASSESSMENT"
      ? assessmentAttemptPresentation(attempt)
      : undefined;
  // Locked rows already show a lock, so they carry no status.
  const status = locked
    ? undefined
    : (assessmentState?.detail ??
      (item.isCompleted ? "Selesai" : isNext ? "Berikutnya" : "Siap"));

  return (
    <LearningItemRow
      title={item.title}
      type={item.type}
      typeLabel={getLearningItemTypeMeta(item.type).label}
      statusText={
        status &&
        `${status}${attempt && assessmentState?.action ? ` · ${assessmentState.action}` : ""}`
      }
      completed={item.isCompleted}
      locked={locked}
      highlighted={Boolean(showActiveState && (isCurrent || isNext))}
      isLast={isLast}
      showChevron={!locked && !isCurrent}
      onPress={() => onOpenItem(moduleId, item, attempt)}
      disabled={locked}
      accessibilityHint={assessmentState?.action}
    />
  );
});
