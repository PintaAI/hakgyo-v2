/**
 * Local-first screen hooks for sync protocol v2.
 *
 * Every hook reads from React Query keys the sync engine writes
 * (`syncQueryKeys`), loading from SQLite through `LocalData` on a cache miss,
 * and composes the screen shape on-device with `@hakgyo/shared/mobile-sync`.
 * Only when the local data is missing (not enrolled, first bundle not
 * downloaded yet) does a hook enable the existing online tRPC procedure, and
 * it asks the engine to download the bundle so the next open works offline.
 */
import type { RouterOutputs } from "@hakgyo/api";
import {
  composeCourseItem,
  composeCourseOutline,
  composeLearnerAssessment,
  composeVocabularyPractice,
  type BundleContent,
  type BundleStructure,
  type CourseBundle,
  type LearnerState,
} from "@hakgyo/shared/mobile-sync";
import { useQueries, useQuery, type QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import { api } from "../lib/trpc";
import { useAppTheme } from "../providers/AppThemeProvider";
import type {
  LocalBundleRecord,
  LocalData,
  LocalIndexRecord,
} from "./local-data";
import { indexScope, syncQueryKeys } from "./query-keys";
import type { LearnerIndex } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { LearnerIndex } from "./types";
export type SyncLocalData = LocalData<LearnerIndex>;

export type CourseOutline = RouterOutputs["learning"]["getCourseOutline"];
export type CourseItemDetail = RouterOutputs["learning"]["getCourseItem"];
export type CourseItemAssessment =
  RouterOutputs["assessment"]["getForCourseItem"];
export type VocabularyPractice =
  RouterOutputs["learning"]["getVocabularyPractice"];
export type LearnerAttempt = RouterOutputs["assessment"]["getMyAttempt"];
export type LearnerEvent = RouterOutputs["assessmentEvent"]["getForLearner"];

/** Persisted-query keys (see `LocalData.saveQuery`) for attempts started or graded on this device. */
export const attemptQueryKey = (attemptId: string) => `attempt:${attemptId}`;
export const attemptAssessmentQueryKey = (attemptId: string) =>
  `attempt-assessment:${attemptId}`;

// ---------------------------------------------------------------------------
// Compose helpers
// ---------------------------------------------------------------------------

/** Runs a compose function; a throw or null result means "not available locally". */
export function composeSafely<T>(
  run: () => T | null | undefined,
): T | undefined {
  try {
    return run() ?? undefined;
  } catch {
    return undefined;
  }
}

const EMPTY_CONTENT: BundleContent = {
  placements: {},
  materials: {},
  vocabularySets: {},
  assessments: {},
  pdfBooks: {},
  assets: {},
};

/**
 * Builds the `CourseBundle` the compose helpers take from the locally stored
 * structure and (optionally) content records. Outline composition does not
 * read content, so it runs with an empty content placeholder.
 */
export function toBundle(
  structure: LocalBundleRecord<BundleStructure>,
  content?: LocalBundleRecord<BundleContent> | null,
  organizationId = "",
): CourseBundle {
  return {
    schema: structure.schema,
    courseId: structure.courseId,
    organizationId,
    revision: structure.revision,
    structure: structure.data,
    content: content?.data ?? EMPTY_CONTENT,
  };
}

function organizationFor(index: LearnerIndex | undefined, courseId: string) {
  return index?.courses.find((course) => course.id === courseId)?.organization;
}

function composeOutline(
  structure: LocalBundleRecord<BundleStructure>,
  index: LearnerIndex,
): CourseOutline | undefined {
  const organization = organizationFor(index, structure.courseId);
  return composeSafely(() =>
    composeCourseOutline(
      toBundle(structure, null, organization?.id),
      index.learner,
      { organization },
    ),
  );
}

// ---------------------------------------------------------------------------
// Local-first resolution (pure, unit tested)
// ---------------------------------------------------------------------------

export type OnlineState<T, E> = {
  data: T | undefined;
  isPending: boolean;
  error: E | null;
};

export type LocalFirstResult<T, E> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: E | null;
  /** True once the local lookup settled without data: the online query is enabled. */
  needsOnline: boolean;
  source: "local" | "online" | "none";
};

/**
 * Decides what a hook exposes: local data wins; the online query only counts
 * once the local lookup has settled empty (`needsOnline`), and it is never
 * consulted while the local lookup is still running.
 */
export function resolveLocalFirst<T, E>(input: {
  enabled: boolean;
  local: T | undefined;
  localResolved: boolean;
  online: OnlineState<T, E>;
}): LocalFirstResult<T, E> {
  if (!input.enabled) {
    return {
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      needsOnline: false,
      source: "none",
    };
  }
  if (input.local !== undefined) {
    return {
      data: input.local,
      isPending: false,
      isError: false,
      error: null,
      needsOnline: false,
      source: "local",
    };
  }
  if (!input.localResolved) {
    return {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      needsOnline: false,
      source: "none",
    };
  }
  return {
    data: input.online.data,
    isPending: input.online.isPending,
    isError: input.online.error !== null,
    error: input.online.error,
    needsOnline: true,
    source: input.online.data !== undefined ? "online" : "none",
  };
}

// ---------------------------------------------------------------------------
// Context (provided by MobileSyncProvider)
// ---------------------------------------------------------------------------

export type SyncDataContextValue = {
  localData: SyncLocalData;
  isSyncing: boolean;
  /** Last sync failure, surfaced while no index exists yet. */
  syncError: Error | null;
  syncNow: (organizationId?: string) => Promise<unknown>;
};

export const SyncDataContext = createContext<SyncDataContextValue | null>(null);

export function useSyncData() {
  const value = useContext(SyncDataContext);
  if (!value) {
    throw new Error("Sync hooks must be used within MobileSyncProvider");
  }
  return value;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export function useSyncIndex(organizationId?: string | null) {
  const { localData, isSyncing, syncError, syncNow } = useSyncData();
  const scope = indexScope(organizationId);
  const query = useQuery({
    queryKey: syncQueryKeys.index(scope),
    queryFn: () => localData.loadIndex(scope),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const record = query.data ?? undefined;
  const data = record?.index;
  const refetch = useCallback(
    () => syncNow(organizationId ?? undefined),
    [organizationId, syncNow],
  );
  const error = (query.error ??
    (data === undefined ? syncError : null)) as Error | null;
  return {
    data,
    stale: record?.stale ?? false,
    /** True while loading from SQLite, or while the first sync runs. */
    isPending: query.isPending || (data === undefined && isSyncing),
    isRefetching: isSyncing,
    isError: error !== null,
    error,
    refetch,
  };
}

// ---------------------------------------------------------------------------
// Bundles
// ---------------------------------------------------------------------------

const CONTENT_GC_TIME_MS = 5 * 60_000;

function useBundleStructure(courseId: string | undefined, enabled = true) {
  const { localData } = useSyncData();
  return useQuery({
    queryKey: syncQueryKeys.bundleStructure(courseId ?? ""),
    queryFn: () => localData.loadBundleStructure(courseId!),
    enabled: enabled && Boolean(courseId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

function useBundleContent(courseId: string | undefined, enabled = true) {
  const { localData } = useSyncData();
  return useQuery({
    queryKey: syncQueryKeys.bundleContent(courseId ?? ""),
    queryFn: () => localData.loadBundleContent(courseId!),
    enabled: enabled && Boolean(courseId),
    staleTime: Infinity,
    gcTime: CONTENT_GC_TIME_MS,
  });
}

const itemCourseKey = (courseItemId: string) =>
  ["mobileSync", "itemCourse", courseItemId] as const;

/** Resolves the local course of a course item when the caller has none. */
function useCourseIdForItem(
  courseId: string | undefined,
  courseItemId: string,
) {
  const { localData } = useSyncData();
  const map = useQuery({
    queryKey: syncQueryKeys.itemCourseMap(),
    // The engine pushes the full map with setQueryData; an empty map on a
    // cache miss simply defers to the per-item SQLite lookup below.
    queryFn: () => ({}) as Record<string, string>,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const mapped = map.data?.[courseItemId];
  const lookup = useQuery({
    queryKey: itemCourseKey(courseItemId),
    queryFn: () => localData.courseIdForItem(courseItemId),
    enabled: Boolean(courseItemId) && !courseId && !mapped,
    staleTime: Infinity,
  });
  const resolved = courseId || mapped || lookup.data || undefined;
  return {
    courseId: resolved,
    resolved:
      Boolean(resolved) ||
      !courseItemId ||
      (!map.isPending && !lookup.isPending),
  };
}

function useRequestBundle(courseId: string | undefined, missing: boolean) {
  const { localData } = useSyncData();
  useEffect(() => {
    if (missing && courseId) localData.requestBundle(courseId);
  }, [courseId, localData, missing]);
}

// ---------------------------------------------------------------------------
// Course outline
// ---------------------------------------------------------------------------

export function useCourseOutline(
  courseId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(courseId);
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const structure = useBundleStructure(courseId, enabled);
  const local = useMemo(
    () =>
      structure.data && index.data
        ? composeOutline(structure.data, index.data)
        : undefined,
    [index.data, structure.data],
  );
  const localResolved = !index.isPending && !structure.isPending;
  const needsOnline = enabled && localResolved && local === undefined;
  const online = api.learning.getCourseOutline.useQuery(
    { courseId },
    { enabled: needsOnline, retry: false },
  );
  useRequestBundle(courseId, needsOnline);
  const result = resolveLocalFirst({
    enabled,
    local,
    localResolved,
    online,
  });
  return { ...result, refetch: online.refetch };
}

/**
 * `useQueries` combiner for a variable number of queries. Module-level so its
 * reference is stable: TanStack only re-runs it (and returns new arrays) when a
 * query result changes, which keeps the arrays safe as memo dependencies.
 */
function combineQueryData<TData>(
  results: readonly { data: TData | undefined; isPending: boolean }[],
) {
  return {
    data: results.map((result) => result.data),
    pending: results.map((result) => result.isPending),
    anyPending: results.some((result) => result.isPending),
  };
}

/** Composes outlines for several courses (cohort cards, practice hub). */
export function useCourseOutlines(courseIds: string[]) {
  const { localData } = useSyncData();
  const utils = api.useUtils();
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const idsKey = [...new Set(courseIds)].join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);
  const structures = useQueries({
    queries: ids.map((courseId) => ({
      queryKey: syncQueryKeys.bundleStructure(courseId),
      queryFn: () => localData.loadBundleStructure(courseId),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
    combine: combineQueryData,
  });
  const localResolved = !index.isPending && !structures.anyPending;
  const locals = useMemo(
    () =>
      structures.data.map((record) =>
        record && index.data ? composeOutline(record, index.data) : undefined,
      ),
    [index.data, structures.data],
  );
  const missingKey = ids
    .filter((_, position) => localResolved && locals[position] === undefined)
    .join("|");
  const onlines = useQueries({
    queries: ids.map((courseId, position) => ({
      queryKey: getQueryKey(
        api.learning.getCourseOutline,
        { courseId },
        "query",
      ),
      queryFn: () => utils.client.learning.getCourseOutline.query({ courseId }),
      enabled: localResolved && locals[position] === undefined,
      staleTime: Infinity,
      retry: false,
    })),
    combine: combineQueryData,
  });
  useEffect(() => {
    for (const courseId of missingKey ? missingKey.split("|") : []) {
      localData.requestBundle(courseId);
    }
  }, [localData, missingKey]);
  const onlineData = onlines.data;
  const outlines = useMemo(() => {
    const map: Record<string, CourseOutline> = {};
    ids.forEach((courseId, position) => {
      const outline = locals[position] ?? onlineData[position];
      if (outline) map[courseId] = outline;
    });
    return map;
  }, [ids, locals, onlineData]);
  return {
    outlines,
    isPending:
      !localResolved ||
      onlines.pending.some(
        (pending, position) => locals[position] === undefined && pending,
      ),
  };
}

/**
 * Synchronous read of a course outline from the query cache (local compose
 * first, then the online procedure's cache). Used by imperative flows such as
 * "complete & continue" that need the outline right after a checkpoint.
 */
export function readCourseOutline(
  queryClient: QueryClient,
  courseId: string,
  organizationId?: string | null,
): CourseOutline | undefined {
  const record =
    queryClient.getQueryData<LocalIndexRecord<LearnerIndex> | null>(
      syncQueryKeys.index(indexScope(organizationId)),
    );
  const structure =
    queryClient.getQueryData<LocalBundleRecord<BundleStructure> | null>(
      syncQueryKeys.bundleStructure(courseId),
    );
  const local =
    record?.index && structure
      ? composeOutline(structure, record.index)
      : undefined;
  return (
    local ??
    queryClient.getQueryData<CourseOutline>(
      getQueryKey(api.learning.getCourseOutline, { courseId }, "query"),
    )
  );
}

// ---------------------------------------------------------------------------
// Course item / assessment / vocabulary practice
// ---------------------------------------------------------------------------

function useLocalCourseContent(courseId: string | undefined, enabled: boolean) {
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const structure = useBundleStructure(courseId, enabled);
  const content = useBundleContent(
    courseId,
    enabled && Boolean(structure.data),
  );
  const bundle = useMemo(
    () =>
      structure.data && content.data
        ? toBundle(
            structure.data,
            content.data,
            organizationFor(index.data, structure.data.courseId)?.id,
          )
        : undefined,
    [content.data, index.data, structure.data],
  );
  const resolved =
    !enabled ||
    (!index.isPending &&
      !structure.isPending &&
      (!structure.data || !content.isPending));
  return { bundle, learner: index.data?.learner, resolved };
}

function useComposedItem<T>(
  courseId: string | undefined,
  courseItemId: string,
  enabled: boolean,
  run: (bundle: CourseBundle, learner: LearnerState) => T | null | undefined,
) {
  const course = useCourseIdForItem(courseId, courseItemId);
  const { bundle, learner, resolved } = useLocalCourseContent(
    course.courseId,
    enabled && course.resolved,
  );
  const local = useMemo(
    () =>
      bundle && learner ? composeSafely(() => run(bundle, learner)) : undefined,
    // `run` is a fresh closure each render; its inputs are the deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bundle, courseItemId, learner],
  );
  const localResolved = course.resolved && resolved;
  const needsOnline = enabled && localResolved && local === undefined;
  useRequestBundle(course.courseId, needsOnline);
  return { courseId: course.courseId, local, localResolved, needsOnline };
}

export function useCourseItem(
  courseId: string | undefined,
  courseItemId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(courseItemId);
  const composed = useComposedItem<CourseItemDetail>(
    courseId,
    courseItemId,
    enabled,
    (bundle, learner) => composeCourseItem(bundle, learner, courseItemId),
  );
  const online = api.learning.getCourseItem.useQuery(
    { courseItemId },
    { enabled: composed.needsOnline, retry: false },
  );
  const result = resolveLocalFirst({
    enabled,
    local: composed.local,
    localResolved: composed.localResolved,
    online,
  });
  return {
    ...result,
    courseId: composed.courseId ?? result.data?.module.courseId,
    refetch: online.refetch,
  };
}

export function useItemAssessment(
  courseId: string | undefined,
  courseItemId: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(courseItemId);
  const composed = useComposedItem<CourseItemAssessment>(
    courseId,
    courseItemId,
    enabled,
    (bundle, learner) =>
      composeLearnerAssessment(bundle, learner, courseItemId),
  );
  const online = api.assessment.getForCourseItem.useQuery(
    { courseItemId },
    { enabled: composed.needsOnline, retry: false },
  );
  const result = resolveLocalFirst({
    enabled,
    local: composed.local,
    localResolved: composed.localResolved,
    online,
  });
  return { ...result, refetch: online.refetch };
}

export function useVocabularyPractice(
  vocabularySetId: string,
  sourceCourseItemId: string,
  options: { courseId?: string; enabled?: boolean } = {},
) {
  const enabled =
    (options.enabled ?? true) && Boolean(vocabularySetId && sourceCourseItemId);
  const composed = useComposedItem<VocabularyPractice>(
    options.courseId,
    sourceCourseItemId,
    enabled,
    (bundle, learner) =>
      composeVocabularyPractice(
        bundle,
        learner,
        vocabularySetId,
        sourceCourseItemId,
      ),
  );
  const online = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    { enabled: composed.needsOnline, retry: false },
  );
  const result = resolveLocalFirst({
    enabled,
    local: composed.local,
    localResolved: composed.localResolved,
    online,
  });
  return { ...result, refetch: online.refetch };
}

// ---------------------------------------------------------------------------
// Attempts and events (index sections + persisted small queries)
// ---------------------------------------------------------------------------

/**
 * An attempt with its assessment detail. Local sources, in order:
 * `index.resumableAttempts`, then the small queries persisted when the
 * attempt was started or graded on this device. Online otherwise.
 */
export function useLearnerAttempt(attemptId: string, courseItemId: string) {
  const { localData } = useSyncData();
  const { activeOrganizationId } = useAppTheme();
  const index = useSyncIndex(activeOrganizationId);
  const enabled = Boolean(attemptId);
  const resumable = index.data?.resumableAttempts?.[attemptId];
  const savedAttempt = useQuery({
    queryKey: syncQueryKeys.query(attemptQueryKey(attemptId)),
    queryFn: () =>
      localData.loadQuery<LearnerAttempt>(attemptQueryKey(attemptId)),
    enabled: enabled && !resumable,
    staleTime: Infinity,
  });
  const savedAssessment = useQuery({
    queryKey: syncQueryKeys.query(attemptAssessmentQueryKey(attemptId)),
    queryFn: () =>
      localData.loadQuery<CourseItemAssessment>(
        attemptAssessmentQueryKey(attemptId),
      ),
    enabled: enabled && !resumable,
    staleTime: Infinity,
  });
  const localAttempt = resumable?.attempt ?? savedAttempt.data ?? undefined;
  const localAssessment =
    resumable?.assessmentDetail ?? savedAssessment.data ?? undefined;
  const localResolved =
    !index.isPending &&
    (Boolean(resumable) ||
      (!savedAttempt.isPending && !savedAssessment.isPending));
  const needsOnline =
    enabled &&
    localResolved &&
    (localAttempt === undefined || localAssessment === undefined);
  const onlineAttempt = api.assessment.getMyAttempt.useQuery(
    { attemptId },
    { enabled: needsOnline && localAttempt === undefined, retry: false },
  );
  const onlineAssessment = api.assessment.getForCourseItem.useQuery(
    { courseItemId, attemptId },
    {
      enabled:
        needsOnline && localAssessment === undefined && Boolean(courseItemId),
      retry: false,
    },
  );
  const attempt = resolveLocalFirst({
    enabled,
    local: localAttempt,
    localResolved,
    online: onlineAttempt,
  });
  const assessment = resolveLocalFirst({
    enabled,
    local: localAssessment,
    localResolved,
    online: onlineAssessment,
  });
  return {
    attempt: { ...attempt, refetch: onlineAttempt.refetch },
    assessment: { ...assessment, refetch: onlineAssessment.refetch },
  };
}

/** Persists a started/graded attempt so it can be resumed or reviewed offline. */
export async function persistAttempt(
  queryClient: QueryClient,
  localData: SyncLocalData,
  input: {
    attempt: LearnerAttempt;
    assessmentDetail?: CourseItemAssessment | null;
  },
) {
  const attemptId = input.attempt.id;
  queryClient.setQueryData(
    syncQueryKeys.query(attemptQueryKey(attemptId)),
    input.attempt,
  );
  await localData.saveQuery(attemptQueryKey(attemptId), input.attempt);
  if (input.assessmentDetail) {
    queryClient.setQueryData(
      syncQueryKeys.query(attemptAssessmentQueryKey(attemptId)),
      input.assessmentDetail,
    );
    await localData.saveQuery(
      attemptAssessmentQueryKey(attemptId),
      input.assessmentDetail,
    );
  }
}

/**
 * Event detail (`assessmentEvent.getForLearner`, with the leaderboard). The
 * index only carries the `listForLearner` summary, so the detail is read
 * online; the engine persists it (`PERSISTED_QUERY_PATHS`) and hydrates it at
 * start-up, so an event opened once before still renders offline.
 */
export function useLearnerEvent(eventId: string) {
  const query = api.assessmentEvent.getForLearner.useQuery(
    { eventId },
    // Refreshed on every open; offline, the persisted detail keeps showing.
    { enabled: Boolean(eventId), retry: false, refetchOnMount: "always" },
  );
  return {
    data: query.data,
    isPending: query.isPending,
    isRefetching: query.isRefetching,
    // A failed background refresh is not an error while a copy is shown.
    error: query.data === undefined ? query.error : null,
    refetch: query.refetch,
  };
}

// ---------------------------------------------------------------------------
// Lesson prefetch helper (pure, unit tested)
// ---------------------------------------------------------------------------

/** The item plus the next one in reading order (module, then item position). */
export function lessonItemIds(
  structure: BundleStructure,
  courseItemId: string,
) {
  const items = [...structure.modules]
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      [...module.items].sort((a, b) => a.position - b.position),
    );
  const index = items.findIndex((item) => item.id === courseItemId);
  if (index === -1) return [];
  return items.slice(index, index + 2).map((item) => item.id);
}
