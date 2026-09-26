import SuperJSON from "superjson";

import type { MobileSyncEngine } from "./engine";
import type { LocalBundleRecord, LocalData } from "./local-data";
import type { MobileSyncStore, StoredBundle } from "./store";
import type { LearnerIndex } from "./types";

function record<T>(stored: StoredBundle<T>): LocalBundleRecord<T> {
  return {
    courseId: stored.courseId,
    revision: stored.revision,
    schema: stored.schema,
    updatedAt: stored.updatedAt,
    data: stored.data,
  };
}

/**
 * `LocalData` backed by the SQLite store and the sync engine. Every method
 * reads local state only; the engine downloads in the background.
 */
export function createLocalData({
  userId,
  store,
  engine,
}: {
  userId: string;
  store: MobileSyncStore;
  engine: Pick<
    MobileSyncEngine,
    "loadIndex" | "courseIdForItem" | "patchLearnerState" | "requestBundle"
  >;
}): LocalData<LearnerIndex> {
  return {
    loadIndex: (scope) => engine.loadIndex(scope),

    async loadBundleStructure(courseId) {
      const stored = await store.loadBundleStructure(userId, courseId);
      return stored ? record(stored) : null;
    },

    async loadBundleContent(courseId) {
      const stored = await store.loadBundleContent(userId, courseId);
      return stored ? record(stored) : null;
    },

    async courseIdForItem(courseItemId) {
      const known = engine.courseIdForItem(courseItemId);
      if (known) return known;
      // The in-memory map is seeded at initialize; fall back to SQLite for a
      // bundle stored by another engine instance.
      for (const structure of await store.listBundleStructures(userId)) {
        for (const module of structure.data.modules) {
          if (module.items.some((item) => item.id === courseItemId)) {
            return structure.courseId;
          }
        }
      }
      return null;
    },

    async loadQuery<T>(queryKey: string) {
      const stored = await store.loadQuery(userId, queryKey);
      if (!stored) return null;
      try {
        return SuperJSON.parse<T>(stored.payload);
      } catch {
        return null;
      }
    },

    async saveQuery<T>(queryKey: string, payload: T) {
      await store.saveQuery(userId, queryKey, SuperJSON.stringify(payload));
    },

    patchLearnerState: (scope, patch) => engine.patchLearnerState(scope, patch),

    requestBundle: (courseId) => engine.requestBundle(courseId),
  };
}
