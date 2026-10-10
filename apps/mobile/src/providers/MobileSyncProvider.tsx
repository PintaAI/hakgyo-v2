import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { Image } from "expo-image";
import Storage from "expo-sqlite/kv-store";
import * as Updates from "expo-updates";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { apiUrl } from "../config";
import { authClient, getAuthCookie } from "../lib/auth-client";
import {
  applyVocabularyReward,
  localDateKey,
} from "../lib/optimistic-gamification";
import { api } from "../lib/trpc";
import {
  createMobileSyncEngine,
  upgradeRequiredFromError,
  type MobileSyncEngine,
  type RecordVocabularyAttemptInput,
} from "../sync/engine";
import { createAssetCache } from "../sync/asset-cache";
import {
  createAssetResolver,
  type AssetPrefetchProgress,
} from "../sync/asset-resolver";
import {
  clearAllDeviceAssetFiles,
  createDeviceAssetFileStore,
} from "../sync/asset-files";
import { createBundleFetcher } from "../sync/bundle-sync";
import {
  createOfflineDownloads,
  type OfflineDownloads,
  type OfflineDownloadState,
} from "../sync/offline-downloads";
import {
  persistAttempt,
  SyncDataContext,
  toBundle,
  type CourseItemAssessment,
  type LearnerAttempt,
  type SyncDataContextValue,
} from "../sync/hooks";
import { indexScope } from "../sync/query-keys";
import { sqliteMobileSyncStore, type LocalDataStats } from "../sync/store";
import type {
  AssessmentSyncAnswer,
  BundleTiming,
  LearnerIndex,
  MobileSyncEngineState,
  MobileSyncTransport,
  ResyncReport,
  SyncCheckpointResult,
  SyncUpdateResult,
  UpgradeRequired,
} from "../sync/types";

/**
 * Nothing learned on the device may outlive the session: without a signed-in
 * user, drop the sync store (queued progress included), downloaded media,
 * image caches, per-user key-value data and every cached query.
 */
async function clearSignedOutDeviceData(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await Promise.allSettled([
    sqliteMobileSyncStore.clearAllData(),
    Promise.resolve().then(clearAllDeviceAssetFiles),
    Storage.clearAsync(),
    Image.clearDiskCache(),
    Image.clearMemoryCache(),
  ]);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type MobileSyncStatusValue = {
  isHydrated: boolean;
  isSyncing: boolean;
  pendingCount: number;
  /** Operations the server permanently rejected (kept for diagnostics). */
  deadLetterCount: number;
  /** Set once the server rejects this client's protocol; polling stops. */
  upgradeRequired: UpgradeRequired | null;
  bundles: MobileSyncEngineState["bundles"] | null;
};

type MobileSyncActionsValue = {
  recordVocabularyAttempt: (
    input: RecordVocabularyAttemptInput,
  ) => Promise<void>;
  finishVocabularySession: (
    organizationId?: string,
  ) => Promise<SyncCheckpointResult>;
  completeContent: (input: {
    courseItemId: string;
    organizationId?: string;
  }) => Promise<SyncCheckpointResult>;
  completeAssessment: (input: {
    attemptId: string;
    answers: AssessmentSyncAnswer[];
    organizationId?: string;
  }) => Promise<SyncCheckpointResult>;
  /** Flushes the outbox and refreshes the index/bundles (pull-to-refresh). */
  syncNow: (organizationId?: string) => Promise<SyncUpdateResult>;
  /** Automatic poll: cheap manifest check, full refresh only when changed. */
  checkForUpdates: (organizationId?: string) => Promise<SyncUpdateResult>;
  checkpoint: (organizationId?: string) => Promise<SyncCheckpointResult>;
  /** Server-suggested poll delay from the last manifest, if any. */
  getNextCheckAfterMs: () => number | undefined;
  /** Persists a freshly started attempt so it resumes offline. */
  saveStartedAttempt: (input: {
    attempt: LearnerAttempt;
    assessmentDetail: CourseItemAssessment;
  }) => Promise<void>;
  /** Warms the lesson's (and the next lesson's) media into the asset cache. */
  prefetchLesson: (courseId: string, courseItemId: string) => void;
  /**
   * Downloads an assessment's images and audio to the device, reporting progress; resolves
   * with the final progress (failed ids load on demand later).
   */
  prefetchAssessmentMedia: (
    assetIds: readonly string[],
    onProgress?: (progress: AssetPrefetchProgress) => void,
  ) => Promise<AssetPrefetchProgress | null>;
  /** Background download of an open event's media from the local bundle (Wi-Fi only). */
  prefetchEventMedia: (courseId: string, courseItemId: string) => void;
  clearLocalDataAndResync: (organizationId?: string) => Promise<ResyncReport>;
  getLocalDataStats: () => Promise<LocalDataStats>;
};

type MobileSyncContextValue = MobileSyncStatusValue & MobileSyncActionsValue;

const MobileSyncStatusContext = createContext<MobileSyncStatusValue | null>(
  null,
);
const MobileSyncActionsContext = createContext<MobileSyncActionsValue | null>(
  null,
);
type OfflineMediaValue = {
  downloads: OfflineDownloads;
  /** Downloads the assets under `key` ("course:<id>" / "module:<id>") unless already running. */
  start: (
    key: string,
    assetIds: readonly string[],
  ) => Promise<OfflineDownloadState | undefined>;
  /** The ids among `assetIds` whose files are on the device. */
  onDevice: (assetIds: readonly string[]) => Promise<string[]>;
};

const OfflineMediaContext = createContext<OfflineMediaValue | null>(null);

const MobileAssetResolverContext = createContext<
  ((assetId: string) => Promise<string>) | null
>(null);

export function MobileSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const {
    data: session,
    error: sessionError,
    isPending: isSessionPending,
  } = authClient.useSession();
  const userId = session?.user.id;
  // Only the server can end a session (a check without a user, or a 401). A
  // failed check (offline, server down) still shows sign-in but keeps local
  // data and queued progress. False while signed in, so a failed refresh
  // that keeps the user never restarts the engine.
  const signOutConfirmed =
    !userId && (!sessionError || sessionError.status === 401);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [deadLetterCount, setDeadLetterCount] = useState(0);
  const [engineState, setEngineState] = useState<MobileSyncEngineState | null>(
    null,
  );
  const [transportUpgrade, setTransportUpgrade] =
    useState<UpgradeRequired | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [engine, setEngine] = useState<MobileSyncEngine | null>(null);
  const engineRef = useRef<MobileSyncEngine | null>(null);
  const practicedSetIds = useRef(new Set<string>());
  // Attempts already counted in the optimistic streak/XP (re-records and
  // retries reuse the attempt id).
  const rewardedAttemptIds = useRef(new Set<string>());
  const fileStore = useMemo(
    () => (userId ? createDeviceAssetFileStore(userId) : null),
    [userId],
  );
  const assetCache = useMemo(
    () => (fileStore ? createAssetCache(fileStore) : null),
    [fileStore],
  );
  // Batched signed URLs + local file cache; lesson prefetch reads the local
  // bundle and learner state through the engine.
  const assetResolver = useMemo(() => {
    if (!assetCache || !fileStore) return null;
    return createAssetResolver({
      assetCache,
      fileStore,
      createDownloadUrls: (assetIds) =>
        utils.client.storage.createDownloadUrls.mutate({
          assetIds,
          disposition: "inline",
        }),
      loadBundle: async (courseId) => {
        const data = engineRef.current?.localData;
        if (!data) return null;
        const [structure, content] = await Promise.all([
          data.loadBundleStructure(courseId),
          data.loadBundleContent(courseId),
        ]);
        return structure && content ? toBundle(structure, content) : null;
      },
      loadLearnerState: async () => {
        const data = engineRef.current?.localData;
        const record = await data?.loadIndex(
          indexScope(activeOrganizationIdRef.current),
        );
        return record?.index.learner ?? null;
      },
    });
  }, [assetCache, fileStore, utils.client.storage.createDownloadUrls]);
  useEffect(() => () => assetResolver?.dispose(), [assetResolver]);
  // Per user: a new account starts without the previous account's download state.
  const offlineDownloads = useMemo(() => {
    void userId;
    return createOfflineDownloads();
  }, [userId]);
  const offlineMedia = useMemo<OfflineMediaValue>(
    () => ({
      downloads: offlineDownloads,
      start: async (key, assetIds) => {
        if (!assetResolver) return undefined;
        return offlineDownloads.start(key, assetIds, (ids, onProgress) =>
          assetResolver.prefetchAssetsWithProgress(ids, onProgress),
        );
      },
      onDevice: async (assetIds) => {
        if (!fileStore) return [];
        const stored: string[] = [];
        for (const assetId of new Set(assetIds)) {
          if (await fileStore.getUri(assetId)) stored.push(assetId);
        }
        return stored;
      },
    }),
    [assetResolver, fileStore, offlineDownloads],
  );
  const activeOrganizationIdRef = useRef<string | null>(null);

  const resolveAssetUrl = useCallback(
    async (assetId: string) => {
      if (!assetResolver) throw new Error("Asset cache is not ready");
      return assetResolver.resolveAssetUrl(assetId);
    },
    [assetResolver],
  );

  // Mirror index sections into the tRPC keys a few leaf components still
  // read directly (profile summary, weekly streak).
  const applyIndex = useCallback(
    (_scope: string, index: LearnerIndex) => {
      activeOrganizationIdRef.current = index.organizationId;
      utils.gamification.getMySummary.setData(undefined, index.gamification);
    },
    [utils.gamification.getMySummary],
  );

  useEffect(() => {
    let active = true;
    const previous = engineRef.current;
    engineRef.current = null;
    setEngine(null);
    setEngineState(null);
    setTransportUpgrade(null);
    setSyncError(null);
    setHydratedUserId(undefined);
    setPendingCount(0);
    setDeadLetterCount(0);
    practicedSetIds.current.clear();
    rewardedAttemptIds.current.clear();
    const disposing = previous?.dispose().catch(() => undefined);

    if (isSessionPending) return;
    if (!userId) {
      if (!signOutConfirmed) {
        setHydratedUserId(null);
        return;
      }
      // Let the old engine finish its writes, then wipe before the sign-in
      // screen renders.
      void Promise.resolve(disposing)
        .then(() => clearSignedOutDeviceData(queryClient))
        .catch(() => undefined)
        .finally(() => {
          if (active) setHydratedUserId(null);
        });
      return () => {
        active = false;
      };
    }

    const v2 = utils.client.mobileSyncV2;
    // Next to the engine's own detection: any v2 call the server rejects for
    // an outdated protocol flips the forced-update gate.
    const guarded = async <T,>(work: () => Promise<T>) => {
      try {
        return await work();
      } catch (error) {
        const upgrade = upgradeRequiredFromError(error);
        if (upgrade && active) setTransportUpgrade(upgrade);
        throw error;
      }
    };
    const transport: MobileSyncTransport = {
      commit: (input) => guarded(() => v2.commit.mutate(input)),
      getManifest: (input) => guarded(() => v2.getManifest.query(input)),
      getIndex: (input) => guarded(() => v2.getIndex.query(input)),
      fetchBundle: createBundleFetcher({
        apiUrl,
        getCookie: getAuthCookie,
        runtime: Updates.runtimeVersion,
        update: Updates.updateId,
      }),
    };

    const next = createMobileSyncEngine({
      userId,
      queryClient,
      store: sqliteMobileSyncStore,
      transport,
      isOnline: async () => {
        const state = await Network.getNetworkStateAsync();
        return (
          state.isConnected !== false && state.isInternetReachable !== false
        );
      },
      onPendingCountChange: setPendingCount,
      onDeadLetterCountChange: setDeadLetterCount,
      onStateChange: (state) => {
        if (active) setEngineState(state);
      },
      onIndexApplied: applyIndex,
    });
    engineRef.current = next;
    void next.initialize().finally(() => {
      if (!active) return;
      setEngine(next);
      setEngineState(next.getState());
      setHydratedUserId(userId);
    });

    return () => {
      active = false;
      if (engineRef.current === next) engineRef.current = null;
      void next.dispose();
    };
  }, [
    applyIndex,
    isSessionPending,
    queryClient,
    signOutConfirmed,
    userId,
    utils.client,
  ]);

  const localData = engine?.localData ?? null;

  const applyCheckpointResults = useCallback(
    async (sync: SyncCheckpointResult) => {
      if (sync.state !== "synced" || !localData) return;
      for (const result of sync.result.results) {
        if (!result.assessment) continue;
        const attemptId = result.assessment.id;
        // Both caches: the local-first hook reads the persisted query; the
        // online fallback reads the tRPC cache.
        utils.assessment.getMyAttempt.setData({ attemptId }, result.assessment);
        if (result.assessmentDetail) {
          utils.assessment.getForCourseItem.setData(
            { attemptId, courseItemId: result.assessment.courseItemId },
            result.assessmentDetail,
          );
        }
        await persistAttempt(queryClient, localData, {
          attempt: result.assessment,
          assessmentDetail: result.assessmentDetail,
        });
      }
    },
    [localData, queryClient, utils.assessment],
  );

  const checkpoint = useCallback(
    async (organizationId?: string) => {
      const current = engineRef.current;
      if (!current) return { state: "queued", reason: "unavailable" } as const;
      setIsSyncing(true);
      try {
        const sync = await current.checkpoint(organizationId);
        await applyCheckpointResults(sync);
        if (sync.state === "synced") setSyncError(null);
        return sync;
      } catch (error) {
        setSyncError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [applyCheckpointResults],
  );

  const syncNow = useCallback(
    async (organizationId?: string) => {
      const current = engineRef.current;
      if (!current) return { state: "queued", reason: "unavailable" } as const;
      setIsSyncing(true);
      try {
        // User-initiated: always check the server, even within the poll throttle.
        const result = await current.checkForUpdates(organizationId, {
          manual: true,
        });
        if ("result" in result) await applyCheckpointResults(result);
        if (result.state !== "queued") setSyncError(null);
        return result;
      } catch (error) {
        setSyncError(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [applyCheckpointResults],
  );

  const clearLocalDataAndResync = useCallback(
    async (organizationId?: string): Promise<ResyncReport> => {
      const current = engineRef.current;
      if (!current || !userId)
        throw new Error("Sinkronisasi mobile belum siap.");
      setIsSyncing(true);
      const bundles: BundleTiming[] = [];
      const stopTiming = current.onBundleTiming((timing) => {
        bundles.push(timing);
      });
      try {
        const startedAt = Date.now();
        const flush = await current.checkpoint(organizationId);
        if (
          flush.state !== "synced" ||
          (await sqliteMobileSyncStore.countOperations(userId))
        ) {
          throw new Error(
            "Sinkronkan progres yang tertunda sebelum menghapus data lokal. Coba lagi saat online.",
          );
        }
        const flushedAt = Date.now();
        await current.clearLocalCache();
        await assetCache?.clear();
        await Image.clearDiskCache();
        await Image.clearMemoryCache();
        const clearedAt = Date.now();
        // Fetch every bundle right away (no background jitter) so the report
        // measures how fast the device repopulates.
        const refreshed = await current.refresh(organizationId, {
          force: true,
          immediateBundles: true,
        });
        if (refreshed.state === "queued") {
          throw new Error(
            "Data lokal sudah dihapus, tetapi sinkronisasi ulang gagal. Coba sinkronkan lagi saat online.",
          );
        }
        const indexedAt = Date.now();
        await current.whenBundlesIdle();
        const finishedAt = Date.now();
        const report: ResyncReport = {
          startedAt,
          totalMs: finishedAt - startedAt,
          flushMs: flushedAt - startedAt,
          clearMs: clearedAt - flushedAt,
          indexMs: indexedAt - clearedAt,
          bundlesMs: finishedAt - indexedAt,
          bundles,
          stats: await current.getLocalDataStats(),
        };
        return report;
      } finally {
        stopTiming();
        setIsSyncing(false);
      }
    },
    [assetCache, userId],
  );

  const getLocalDataStats = useCallback(async () => {
    const current = engineRef.current;
    if (!current) throw new Error("Sinkronisasi mobile belum siap.");
    return current.getLocalDataStats();
  }, []);

  const prefetchLesson = useCallback(
    (courseId: string, courseItemId: string) => {
      if (!assetResolver || !courseId || !courseItemId) return;
      void assetResolver
        .prefetchLesson(courseId, courseItemId)
        .then(() => assetResolver.prefetchNextLesson(courseId, courseItemId))
        .catch(() => undefined);
    },
    [assetResolver],
  );

  const prefetchAssessmentMedia = useCallback(
    async (
      assetIds: readonly string[],
      onProgress?: (progress: AssetPrefetchProgress) => void,
    ) => {
      if (!assetResolver || !assetIds.length) return null;
      return assetResolver.prefetchAssetsWithProgress(assetIds, onProgress);
    },
    [assetResolver],
  );

  const prefetchEventMedia = useCallback(
    (courseId: string, courseItemId: string) => {
      if (!assetResolver || !courseId || !courseItemId) return;
      void Network.getNetworkStateAsync()
        .then((state) => {
          // Large listening files are not fetched over cellular in the background.
          if (state.type !== Network.NetworkStateType.WIFI) return;
          return assetResolver.prefetchLesson(courseId, courseItemId);
        })
        .catch(() => undefined);
    },
    [assetResolver],
  );

  const actions = useMemo<MobileSyncActionsValue>(
    () => ({
      recordVocabularyAttempt: async (input) => {
        const current = engineRef.current;
        if (!current) throw new Error("Sinkronisasi mobile belum siap.");
        practicedSetIds.current.add(input.attempt.vocabularySetId);
        await current.recordVocabularyAttempt(input);
        // Optimistic: correct answers earn XP and a streak day on the server;
        // show them now instead of after the round checkpoint.
        const { attemptId, result } = input.attempt;
        if (
          result === "CORRECT" &&
          !rewardedAttemptIds.current.has(attemptId)
        ) {
          rewardedAttemptIds.current.add(attemptId);
          const todayKey = localDateKey(new Date(), input.timeZone);
          await current
            .patchGamification(
              indexScope(activeOrganizationIdRef.current),
              (gamification) => applyVocabularyReward(gamification, todayKey),
            )
            .catch(() => undefined);
        }
      },
      finishVocabularySession: async (organizationId) => {
        const practiced = [...practicedSetIds.current];
        practicedSetIds.current.clear();
        // Optimistic: requirements that need a practiced set unlock offline.
        if (practiced.length && localData) {
          await localData
            .patchLearnerState(indexScope(organizationId), {
              practicedVocabularySetIds: practiced,
            })
            .catch(() => undefined);
        }
        return checkpoint(organizationId);
      },
      completeContent: async ({ courseItemId, organizationId }) => {
        const current = engineRef.current;
        if (!current) return { state: "queued", reason: "unavailable" };
        await current.putOperation({
          id: `content:${courseItemId}`,
          kind: "CONTENT_COMPLETED",
          courseItemId,
        });
        // Optimistic: the composed outline unlocks the next step offline; the
        // server's learner patch replaces it at the next checkpoint.
        const now = new Date().toISOString();
        await localData
          ?.patchLearnerState(indexScope(organizationId), {
            contentProgress: {
              [courseItemId]: {
                status: "COMPLETED",
                startedAt: now,
                completedAt: now,
              },
            },
          })
          .catch(() => undefined);
        return checkpoint(organizationId);
      },
      completeAssessment: async ({ attemptId, answers, organizationId }) => {
        const current = engineRef.current;
        if (!current) return { state: "queued", reason: "unavailable" };
        await current.putOperation({
          id: `assessment:${attemptId}`,
          kind: "ASSESSMENT_COMPLETED",
          attemptId,
          answers,
        });
        return checkpoint(organizationId);
      },
      syncNow,
      checkForUpdates: async (organizationId) => {
        const current = engineRef.current;
        if (!current) return { state: "queued", reason: "unavailable" };
        try {
          const result = await current.checkForUpdates(organizationId);
          if ("result" in result) await applyCheckpointResults(result);
          if (result.state !== "queued") setSyncError(null);
          return result;
        } catch (error) {
          setSyncError(
            error instanceof Error ? error : new Error(String(error)),
          );
          throw error;
        }
      },
      checkpoint,
      getNextCheckAfterMs: () => {
        const state = engineRef.current?.getState();
        const value = state?.nextCheckAfterMs;
        return typeof value === "number" && value > 0 ? value : undefined;
      },
      saveStartedAttempt: async (input) => {
        utils.assessment.getMyAttempt.setData(
          { attemptId: input.attempt.id },
          input.attempt,
        );
        utils.assessment.getForCourseItem.setData(
          {
            courseItemId: input.attempt.courseItemId,
            attemptId: input.attempt.id,
          },
          input.assessmentDetail,
        );
        if (localData) await persistAttempt(queryClient, localData, input);
      },
      prefetchLesson,
      prefetchAssessmentMedia,
      prefetchEventMedia,
      clearLocalDataAndResync,
      getLocalDataStats,
    }),
    [
      applyCheckpointResults,
      checkpoint,
      clearLocalDataAndResync,
      getLocalDataStats,
      localData,
      prefetchAssessmentMedia,
      prefetchEventMedia,
      prefetchLesson,
      queryClient,
      syncNow,
      utils.assessment,
    ],
  );
  const status = useMemo<MobileSyncStatusValue>(
    () => ({
      isHydrated: !isSessionPending && hydratedUserId === (userId ?? null),
      isSyncing,
      pendingCount,
      deadLetterCount,
      upgradeRequired: engineState?.upgradeRequired ?? transportUpgrade,
      bundles: engineState?.bundles ?? null,
    }),
    [
      deadLetterCount,
      engineState,
      hydratedUserId,
      isSessionPending,
      isSyncing,
      pendingCount,
      transportUpgrade,
      userId,
    ],
  );
  const syncData = useMemo<SyncDataContextValue | null>(
    () => (localData ? { localData, isSyncing, syncError, syncNow } : null),
    [isSyncing, localData, syncError, syncNow],
  );

  if (!status.isHydrated) return null;
  return (
    <MobileAssetResolverContext.Provider value={resolveAssetUrl}>
      <OfflineMediaContext.Provider value={offlineMedia}>
        <MobileSyncActionsContext.Provider value={actions}>
          <MobileSyncStatusContext.Provider value={status}>
            <SyncDataContext.Provider value={syncData}>
              {children}
            </SyncDataContext.Provider>
          </MobileSyncStatusContext.Provider>
        </MobileSyncActionsContext.Provider>
      </OfflineMediaContext.Provider>
    </MobileAssetResolverContext.Provider>
  );
}

export function useMobileSync(): MobileSyncContextValue {
  const actions = useContext(MobileSyncActionsContext);
  const status = useContext(MobileSyncStatusContext);
  if (!actions || !status) {
    throw new Error("useMobileSync must be used within MobileSyncProvider");
  }
  return useMemo(() => ({ ...status, ...actions }), [actions, status]);
}

export function useMobileSyncActions() {
  const actions = useContext(MobileSyncActionsContext);
  if (!actions) {
    throw new Error(
      "useMobileSyncActions must be used within MobileSyncProvider",
    );
  }
  return actions;
}

export function useMobileAssetResolver() {
  const resolveAssetUrl = useContext(MobileAssetResolverContext);
  if (!resolveAssetUrl) {
    throw new Error(
      "useMobileAssetResolver must be used within MobileSyncProvider",
    );
  }
  return resolveAssetUrl;
}

export function useOfflineMedia() {
  const offline = useContext(OfflineMediaContext);
  if (!offline) {
    throw new Error("useOfflineMedia must be used within MobileSyncProvider");
  }
  return offline;
}

/** Progress of the offline download under `key`, if one ran this session. */
export function useOfflineDownload(key: string) {
  const { downloads } = useOfflineMedia();
  return useSyncExternalStore(downloads.subscribe, () => downloads.get(key));
}

/** Changes whenever an offline download stores files, to re-check badges. */
export function useOfflineRevision() {
  const { downloads } = useOfflineMedia();
  return useSyncExternalStore(downloads.subscribe, downloads.getRevision);
}
