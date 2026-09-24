import { describe, expect, test } from "bun:test";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import SuperJSON from "superjson";

import { createMobileSyncEngine } from "./engine";
import type { MobileSyncStore } from "./store";
import type {
  MobileDashboard,
  MobileSyncCommitResult,
  MobileSyncOperation,
} from "./types";

function memoryStore(): MobileSyncStore {
  const caches = new Map<string, string>();
  const operations = new Map<string, MobileSyncOperation>();
  const key = (userId: string, id: string) => `${userId}:${id}`;
  return {
    initialize: async () => undefined,
    loadCache: async (userId) => caches.get(userId) ?? null,
    saveCache: async (userId, payload) => {
      caches.set(userId, payload);
    },
    clearCache: async (userId) => {
      caches.delete(userId);
    },
    getOperation: async (userId, id) => operations.get(key(userId, id)) ?? null,
    putOperation: async (userId, operation) => {
      operations.set(key(userId, operation.id), structuredClone(operation));
    },
    listOperations: async (userId) =>
      [...operations.entries()]
        .filter(([operationKey]) => operationKey.startsWith(`${userId}:`))
        .map(([, operation]) => structuredClone(operation)),
    removeOperations: async (userId, ids) => {
      for (const id of ids) operations.delete(key(userId, id));
    },
    countOperations: async (userId) =>
      [...operations.keys()].filter((operationKey) =>
        operationKey.startsWith(`${userId}:`),
      ).length,
  };
}

function countingStore() {
  const store = memoryStore();
  let cacheWrites = 0;
  return {
    store: {
      ...store,
      saveCache: async (userId: string, payload: string) => {
        cacheWrites += 1;
        await store.saveCache(userId, payload);
      },
    } satisfies MobileSyncStore,
    get cacheWrites() {
      return cacheWrites;
    },
  };
}

const dashboard = {
  organizationId: "organization-1",
  outlines: {},
} as MobileDashboard;

function commitResult(
  operations: MobileSyncOperation[],
): MobileSyncCommitResult {
  return {
    acknowledgedOperationIds: operations.map((operation) => operation.id),
    failures: [],
    results: operations.map((operation) => ({
      id: operation.id,
      kind: operation.kind,
    })),
    dashboard,
  } as MobileSyncCommitResult;
}

describe("mobile sync engine", () => {
  test("clears only cached queries after pending operations have synced", async () => {
    const store = memoryStore();
    const client = new QueryClient();
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: client,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();
    client.setQueryData(["old-course"], { title: "Old" });
    await store.saveCache("user-1", "stale cache");
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    await expect(engine.clearLocalCache()).rejects.toThrow(
      "Pending learning progress",
    );
    expect(client.getQueryData<{ title: string }>(["old-course"])).toEqual({
      title: "Old",
    });
    await engine.checkpoint("organization-1");
    await engine.clearLocalCache();
    expect(client.getQueryData(["old-course"])).toBeUndefined();
    expect(await store.loadCache("user-1")).toBeNull();
    await engine.dispose();
  });
  test("ignores an unversioned cache from the incomplete sync schema", async () => {
    const store = memoryStore();
    const legacyClient = new QueryClient();
    legacyClient.setQueryData(["mobileSync", "getDashboard"], {
      outlines: {},
    });
    await store.saveCache(
      "user-1",
      SuperJSON.stringify(dehydrate(legacyClient)),
    );
    const queryClient = new QueryClient();
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });

    await engine.initialize();

    expect(
      queryClient.getQueryData(["mobileSync", "getDashboard"]),
    ).toBeUndefined();
    await engine.dispose();
  });

  test("clears another user's in-memory queries before hydration", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["profile"], { email: "first@example.com" });
    const engine = createMobileSyncEngine({
      userId: "user-2",
      queryClient,
      store: memoryStore(),
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });

    await engine.initialize();

    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
    await engine.dispose();
  });

  test("does not persist the full cache for observer-only events", async () => {
    const counted = countingStore();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["course", "course-1"], { title: "Korean" });
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient,
      store: counted.store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();

    const observer = queryClient.getQueryCache().find({
      queryKey: ["course", "course-1"],
    });
    queryClient.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: observer!,
      observer: {} as never,
    });
    await Bun.sleep(300);

    expect(counted.cacheWrites).toBe(0);
    await engine.dispose();
  });

  test("persists and hydrates successful query data", async () => {
    const store = memoryStore();
    const firstClient = new QueryClient();
    const first = createMobileSyncEngine({
      userId: "user-1",
      queryClient: firstClient,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await first.initialize();
    firstClient.setQueryData(["course", "course-1"], { title: "Korean" });
    await first.dispose();

    const secondClient = new QueryClient();
    const second = createMobileSyncEngine({
      userId: "user-1",
      queryClient: secondClient,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await second.initialize();

    expect(
      secondClient.getQueryData<{ title: string }>(["course", "course-1"]),
    ).toEqual({ title: "Korean" });
    await second.dispose();
  });

  test("captures the departing user's cache before asynchronous disposal", async () => {
    const baseStore = memoryStore();
    let releaseWrite: (() => void) | undefined;
    let markWriteStarted: (() => void) | undefined;
    const writeStarted = new Promise<void>((resolve) => {
      markWriteStarted = resolve;
    });
    const writeRelease = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const store = {
      ...baseStore,
      putOperation: async (userId: string, operation: MobileSyncOperation) => {
        markWriteStarted?.();
        await writeRelease;
        await baseStore.putOperation(userId, operation);
      },
    } satisfies MobileSyncStore;
    const sharedClient = new QueryClient();
    const first = createMobileSyncEngine({
      userId: "user-1",
      queryClient: sharedClient,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await first.initialize();
    sharedClient.setQueryData(["profile"], { email: "first@example.com" });
    const pendingWrite = first.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    await writeStarted;

    const disposing = first.dispose();
    sharedClient.clear();
    sharedClient.setQueryData(["profile"], { email: "second@example.com" });
    releaseWrite?.();
    await pendingWrite;
    await disposing;

    const restoredClient = new QueryClient();
    const restored = createMobileSyncEngine({
      userId: "user-1",
      queryClient: restoredClient,
      store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await restored.initialize();
    expect(restoredClient.getQueryData<{ email: string }>(["profile"])).toEqual(
      { email: "first@example.com" },
    );
    await restored.dispose();
  });

  test("records many vocabulary interactions as one session operation", async () => {
    const store = memoryStore();
    const sent: MobileSyncOperation[][] = [];
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store,
      transport: {
        commit: async ({ operations }) => {
          sent.push(operations);
          return commitResult(operations);
        },
      },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();

    for (const entryId of ["entry-1", "entry-2"]) {
      await engine.recordVocabularyAttempt({
        gameKey: "cards",
        sessionId: "session-1",
        attempt: {
          attemptId: `session-1:${entryId}`,
          entryId,
          evidence: "RECALL",
          result: "CORRECT",
          sourceCourseItemId: "item-1",
          vocabularySetId: "set-1",
        },
      });
    }

    expect(sent).toHaveLength(0);
    const result = await engine.checkpoint("organization-1");
    expect(result.state).toBe("synced");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toHaveLength(1);
    expect(sent[0]?.[0]?.kind).toBe("VOCABULARY_SESSION_COMPLETED");
    if (sent[0]?.[0]?.kind === "VOCABULARY_SESSION_COMPLETED") {
      expect(sent[0][0].attempts).toHaveLength(2);
    }
    expect(await store.countOperations("user-1")).toBe(0);
    await engine.dispose();
  });

  test("does not publish an unchanged pending count for every vocabulary answer", async () => {
    const pendingCounts: number[] = [];
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store: memoryStore(),
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: () => undefined,
      onPendingCountChange: (count) => pendingCounts.push(count),
    });
    await engine.initialize();

    for (const entryId of ["entry-1", "entry-2"]) {
      await engine.recordVocabularyAttempt({
        gameKey: "cards",
        sessionId: "session-1",
        attempt: {
          attemptId: `session-1:${entryId}`,
          entryId,
          evidence: "RECALL",
          result: "CORRECT",
          sourceCourseItemId: "item-1",
          vocabularySetId: "set-1",
        },
      });
    }

    expect(pendingCounts).toEqual([0, 1]);
    await engine.dispose();
  });

  test("keeps operations queued while offline", async () => {
    const store = memoryStore();
    let calls = 0;
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store,
      transport: {
        commit: async ({ operations }) => {
          calls += 1;
          return commitResult(operations);
        },
      },
      isOnline: async () => false,
      applyDashboard: () => undefined,
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    expect(await engine.checkpoint("organization-1")).toEqual({
      state: "queued",
      reason: "offline",
    });
    expect(calls).toBe(0);
    expect(await store.countOperations("user-1")).toBe(1);
    await engine.dispose();
  });

  test("coalesces concurrent checkpoints for the same organization", async () => {
    const store = memoryStore();
    let calls = 0;
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store,
      transport: {
        commit: async ({ operations }) => {
          calls += 1;
          await Promise.resolve();
          return commitResult(operations);
        },
      },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    const [first, second] = await Promise.all([
      engine.checkpoint("organization-1"),
      engine.checkpoint("organization-1"),
    ]);

    expect(first).toEqual(second);
    expect(calls).toBe(1);
    await engine.dispose();
  });

  test("persists an applied dashboard only once per checkpoint", async () => {
    const counted = countingStore();
    const queryClient = new QueryClient();
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient,
      store: counted.store,
      transport: { commit: async ({ operations }) => commitResult(operations) },
      isOnline: async () => true,
      applyDashboard: (nextDashboard) => {
        queryClient.setQueryData(["dashboard"], nextDashboard);
        queryClient.setQueryData(["courses"], []);
        queryClient.setQueryData(["events"], []);
      },
    });
    await engine.initialize();

    await engine.checkpoint("organization-1");
    await Bun.sleep(300);

    expect(counted.cacheWrites).toBe(1);
    await engine.dispose();
  });

  test("removes acknowledged operations and retains isolated failures", async () => {
    const store = memoryStore();
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store,
      transport: {
        commit: async ({ operations }) => ({
          ...commitResult(operations.slice(0, 1)),
          failures: [
            {
              id: operations[1]!.id,
              kind: operations[1]!.kind,
              code: "PRECONDITION_FAILED",
              message: "Not accepted",
            },
          ],
        }),
      },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    await engine.putOperation({
      id: "content:item-2",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-2",
    });

    expect((await engine.checkpoint()).state).toBe("synced");
    expect(await store.listOperations("user-1")).toEqual([
      {
        id: "content:item-2",
        kind: "CONTENT_COMPLETED",
        courseItemId: "item-2",
      },
    ]);
    await engine.dispose();
  });

  test("queues another checkpoint when a new operation arrives during sync", async () => {
    const store = memoryStore();
    const batches: string[][] = [];
    let releaseFirst: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const engine = createMobileSyncEngine({
      userId: "user-1",
      queryClient: new QueryClient(),
      store,
      transport: {
        commit: async ({ operations }) => {
          batches.push(operations.map((operation) => operation.id));
          if (batches.length === 1) {
            markStarted?.();
            await firstRelease;
          }
          return commitResult(operations);
        },
      },
      isOnline: async () => true,
      applyDashboard: () => undefined,
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    const first = engine.checkpoint();
    await firstStarted;
    await engine.putOperation({
      id: "content:item-2",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-2",
    });
    const second = engine.checkpoint();
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(batches).toEqual([["content:item-1"], ["content:item-2"]]);
    await engine.dispose();
  });
});
