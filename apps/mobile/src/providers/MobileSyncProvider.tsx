import { useQueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { Image } from "expo-image";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { authClient } from "../lib/auth-client";
import { api } from "../lib/trpc";
import { createMobileSyncEngine } from "../sync/engine";
import { createAssetCache } from "../sync/asset-cache";
import { createDeviceAssetFileStore } from "../sync/asset-files";
import { dashboardCacheEntries } from "../sync/dashboard-cache";
import { sqliteMobileSyncStore } from "../sync/store";
import type {
  AssessmentSyncAnswer,
  MobileDashboard,
  SyncCheckpointResult,
  VocabularySyncAttempt,
} from "../sync/types";

type MobileSyncContextValue = {
  isHydrated: boolean;
  isSyncing: boolean;
  pendingCount: number;
  cacheDashboard: (dashboard: MobileDashboard) => void;
  recordVocabularyAttempt: (input: {
    gameKey: string;
    sessionId: string;
    timeZone?: string;
    attempt: VocabularySyncAttempt;
  }) => Promise<void>;
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
  syncNow: (organizationId?: string) => Promise<SyncCheckpointResult>;
  clearLocalDataAndResync: (
    organizationId?: string,
  ) => Promise<SyncCheckpointResult>;
};

type MobileSyncStatusValue = Pick<
  MobileSyncContextValue,
  "isHydrated" | "isSyncing" | "pendingCount"
>;
type MobileSyncActionsValue = Omit<
  MobileSyncContextValue,
  keyof MobileSyncStatusValue
>;

const MobileSyncStatusContext = createContext<MobileSyncStatusValue | null>(
  null,
);
const MobileSyncActionsContext = createContext<MobileSyncActionsValue | null>(
  null,
);
const MobileAssetResolverContext = createContext<
  ((assetId: string) => Promise<string>) | null
>(null);

export function MobileSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const userId = session?.user.id;
  const [hydratedUserId, setHydratedUserId] = useState<string | null>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const engineRef = useRef<ReturnType<typeof createMobileSyncEngine> | null>(
    null,
  );
  const assetCache = useMemo(
    () =>
      userId ? createAssetCache(createDeviceAssetFileStore(userId)) : null,
    [userId],
  );

  const applyDashboard = useCallback(
    (dashboard: MobileDashboard) => {
      const scope = dashboard.organizationId
        ? { organizationId: dashboard.organizationId }
        : undefined;
      utils.mobileSync.getDashboard.setData(scope, dashboard);
      utils.learning.listMyCourses.setData(scope, dashboard.courses);
      utils.learning.listMyCohorts.setData(scope, dashboard.cohorts);
      utils.assessmentEvent.listForLearner.setData(scope, dashboard.events);
      utils.learning.listMyCohortMilestones.setData(
        scope,
        dashboard.milestones,
      );
      utils.assessment.listMyAttempts.setData(scope, dashboard.attempts);
      utils.gamification.getMySummary.setData(
        undefined,
        dashboard.gamification,
      );
      for (const entry of dashboardCacheEntries(dashboard)) {
        if (entry.procedure === "learning.getCourseOutline") {
          utils.learning.getCourseOutline.setData(
            entry.input as { courseId: string },
            entry.data as never,
          );
        } else if (entry.procedure === "learning.getCourseItem") {
          utils.learning.getCourseItem.setData(
            entry.input as { courseItemId: string },
            entry.data as never,
          );
        } else if (entry.procedure === "assessment.getForCourseItem") {
          utils.assessment.getForCourseItem.setData(
            entry.input as { courseItemId: string; attemptId?: string },
            entry.data as never,
          );
        } else if (entry.procedure === "assessment.getMyAttempt") {
          utils.assessment.getMyAttempt.setData(
            entry.input as { attemptId: string },
            entry.data as never,
          );
        } else if (entry.procedure === "assessmentEvent.getForLearner") {
          utils.assessmentEvent.getForLearner.setData(
            entry.input as { eventId: string },
            entry.data as never,
          );
        } else {
          utils.learning.getVocabularyPractice.setData(
            entry.input as {
              vocabularySetId: string;
              sourceCourseItemId: string;
            },
            entry.data as never,
          );
        }
      }
      if (assetCache) void assetCache.preload(dashboard.assetDownloads);
    },
    [assetCache, utils],
  );

  const resolveAssetUrl = useCallback(
    async (assetId: string) => {
      if (!assetCache) throw new Error("Asset cache is not ready");
      return assetCache.resolve(assetId, async () => {
        const result = await utils.client.storage.createDownloadUrl.mutate({
          assetId,
          disposition: "inline",
        });
        return {
          downloadUrl: result.downloadUrl,
          contentType: result.contentType,
          fileName: result.fileName,
        };
      });
    },
    [assetCache, utils.client.storage.createDownloadUrl],
  );

  useEffect(() => {
    let active = true;
    const previous = engineRef.current;
    engineRef.current = null;
    setHydratedUserId(undefined);
    setPendingCount(0);
    if (previous) void previous.dispose();

    if (isSessionPending) return;
    if (!userId) {
      setHydratedUserId(null);
      return;
    }

    const engine = createMobileSyncEngine({
      userId,
      queryClient,
      store: sqliteMobileSyncStore,
      transport: {
        commit: (input) => utils.client.mobileSync.commit.mutate(input),
      },
      isOnline: async () => {
        const state = await Network.getNetworkStateAsync();
        return (
          state.isConnected !== false && state.isInternetReachable !== false
        );
      },
      applyDashboard,
      onPendingCountChange: setPendingCount,
    });
    engineRef.current = engine;
    void engine.initialize().finally(() => {
      if (active) setHydratedUserId(userId);
    });

    return () => {
      active = false;
      if (engineRef.current === engine) engineRef.current = null;
      void engine.dispose();
    };
  }, [
    applyDashboard,
    isSessionPending,
    queryClient,
    userId,
    utils.client.mobileSync.commit,
  ]);

  const checkpoint = useCallback(
    async (organizationId?: string) => {
      const engine = engineRef.current;
      if (!engine) return { state: "queued", reason: "unavailable" } as const;
      setIsSyncing(true);
      try {
        const sync = await engine.checkpoint(organizationId);
        if (sync.state === "synced") {
          for (const result of sync.result.results) {
            if (!result.assessment) continue;
            const attemptId = result.id.startsWith("assessment:")
              ? result.id.slice("assessment:".length)
              : result.assessment.id;
            utils.assessment.getMyAttempt.setData(
              { attemptId },
              result.assessment,
            );
            if (result.assessmentDetail) {
              utils.assessment.getForCourseItem.setData(
                {
                  attemptId,
                  courseItemId: result.assessment.courseItemId,
                },
                result.assessmentDetail,
              );
              utils.assessment.getForCourseItem.setData(
                { courseItemId: result.assessment.courseItemId },
                result.assessmentDetail,
              );
            }
          }
        }
        return sync;
      } finally {
        setIsSyncing(false);
      }
    },
    [utils],
  );

  const clearLocalDataAndResync = useCallback(
    async (organizationId?: string) => {
      const engine = engineRef.current;
      if (!engine || !userId) throw new Error("Mobile sync is not ready.");
      setIsSyncing(true);
      try {
        const flush = await engine.checkpoint(organizationId);
        if (
          flush.state !== "synced" ||
          (await sqliteMobileSyncStore.countOperations(userId))
        ) {
          throw new Error(
            "Sync pending progress before clearing local data. Try again online.",
          );
        }
        await engine.clearLocalCache();
        await assetCache?.clear();
        await Image.clearDiskCache();
        await Image.clearMemoryCache();
        const result = await engine.checkpoint(organizationId);
        if (result.state !== "synced") {
          throw new Error(
            "Local data cleared, but resync failed. Try syncing again online.",
          );
        }
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [assetCache, userId],
  );

  const actions = useMemo<MobileSyncActionsValue>(
    () => ({
      cacheDashboard: applyDashboard,
      recordVocabularyAttempt: async (input) => {
        const engine = engineRef.current;
        if (!engine) throw new Error("Mobile sync is not ready");
        await engine.recordVocabularyAttempt(input);
      },
      finishVocabularySession: checkpoint,
      completeContent: async ({ courseItemId, organizationId }) => {
        const engine = engineRef.current;
        if (!engine) return { state: "queued", reason: "unavailable" };
        await engine.putOperation({
          id: `content:${courseItemId}`,
          kind: "CONTENT_COMPLETED",
          courseItemId,
        });
        return checkpoint(organizationId);
      },
      completeAssessment: async ({ attemptId, answers, organizationId }) => {
        const engine = engineRef.current;
        if (!engine) return { state: "queued", reason: "unavailable" };
        await engine.putOperation({
          id: `assessment:${attemptId}`,
          kind: "ASSESSMENT_COMPLETED",
          attemptId,
          answers,
        });
        return checkpoint(organizationId);
      },
      syncNow: checkpoint,
      clearLocalDataAndResync,
    }),
    [applyDashboard, checkpoint, clearLocalDataAndResync],
  );
  const status = useMemo<MobileSyncStatusValue>(
    () => ({
      isHydrated: !isSessionPending && hydratedUserId === (userId ?? null),
      isSyncing,
      pendingCount,
    }),
    [hydratedUserId, isSessionPending, isSyncing, pendingCount, userId],
  );

  if (!status.isHydrated) return null;
  return (
    <MobileAssetResolverContext.Provider value={resolveAssetUrl}>
      <MobileSyncActionsContext.Provider value={actions}>
        <MobileSyncStatusContext.Provider value={status}>
          {children}
        </MobileSyncStatusContext.Provider>
      </MobileSyncActionsContext.Provider>
    </MobileAssetResolverContext.Provider>
  );
}

export function useMobileSync() {
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
