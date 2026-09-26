import type {
  BundleContent,
  BundleStructure,
  LearnerState,
} from "@hakgyo/shared/mobile-sync";

/**
 * Read-side contract between the sync engine/store (implementation) and the
 * screen hooks (consumers). The implementation lives in `local-data-impl.ts`
 * and is provided through `MobileSyncProvider`.
 *
 * All methods resolve from local SQLite only; they never hit the network.
 * Hooks fall back to the online tRPC procedures when a method returns null.
 */
export type LocalIndexRecord<TIndex> = {
  index: TIndex;
  /** True once the engine marked the index stale after an outbox flush. */
  stale: boolean;
};

export type LocalBundleRecord<T> = {
  courseId: string;
  revision: string;
  schema: number;
  updatedAt: number;
  data: T;
};

export type LocalData<TIndex> = {
  loadIndex(scope: string): Promise<LocalIndexRecord<TIndex> | null>;
  loadBundleStructure(
    courseId: string,
  ): Promise<LocalBundleRecord<BundleStructure> | null>;
  loadBundleContent(
    courseId: string,
  ): Promise<LocalBundleRecord<BundleContent> | null>;
  /** Resolves which local course a course item belongs to. */
  courseIdForItem(courseItemId: string): Promise<string | null>;
  /** Persisted small tRPC results by whitelisted key (see store). */
  loadQuery<T>(queryKey: string): Promise<T | null>;
  saveQuery<T>(queryKey: string, payload: T): Promise<void>;
  /**
   * Apply an optimistic learner-state change locally (e.g. content completed
   * while offline). Merged into the stored index and pushed to React Query.
   */
  patchLearnerState(
    scope: string,
    patch: Partial<Pick<LearnerState, "contentProgress">> & {
      practicedVocabularySetIds?: string[];
    },
  ): Promise<void>;
  /** Asks the engine to download/refresh a course bundle with top priority. */
  requestBundle(courseId: string): void;
};
