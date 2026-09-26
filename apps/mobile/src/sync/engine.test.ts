import { describe, expect, setSystemTime, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import SuperJSON from "superjson";
import {
  BUNDLE_SCHEMA,
  INDEX_SCHEMA,
  SYNC_PROTOCOL,
  UPGRADE_REQUIRED_MESSAGE,
  type CourseBundle,
} from "@hakgyo/shared/mobile-sync";

import {
  createMobileSyncEngine,
  DEAD_LETTER_MIN_AGE_MS,
  DEAD_LETTER_MIN_FAILURES,
  persistedQueryKey,
  upgradeRequiredFromError,
} from "./engine";
import { createMemoryStore } from "./memory-store";
import { syncQueryKeys } from "./query-keys";
import type {
  LearnerIndex,
  MobileSyncCommitResult,
  MobileSyncManifest,
  MobileSyncOperation,
  MobileSyncTransport,
} from "./types";

function memoryStore() {
  return createMemoryStore();
}

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
    budgetExhausted: false,
    patch: null,
  } as MobileSyncCommitResult;
}

function index(overrides: Partial<LearnerIndex> = {}): LearnerIndex {
  return {
    indexToken: "token-1",
    indexSchema: INDEX_SCHEMA,
    generatedAt: new Date().toISOString(),
    organizationId: null,
    validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    learner: {
      courseIds: ["course-1"],
      contentProgress: {},
      standaloneAttempts: {},
      passEvidence: {},
      practicedVocabularySetIds: [],
      eligibleCohortsByCourse: {},
    },
    organizations: [],
    courses: [],
    cohorts: [],
    events: [],
    milestones: [],
    attempts: [],
    gamification: { streak: 0 },
    practice: { vocabulary: [], assessment: [] },
    sidebarIndicators: { unreadCount: 0, items: [] },
    resumableAttempts: {},
    ...overrides,
  } as unknown as LearnerIndex;
}

function manifest(
  overrides: Partial<MobileSyncManifest> = {},
): MobileSyncManifest {
  return {
    protocol: SYNC_PROTOCOL,
    minProtocol: SYNC_PROTOCOL,
    bundleSchema: BUNDLE_SCHEMA,
    indexSchema: INDEX_SCHEMA,
    indexToken: "token-1",
    courses: [{ courseId: "course-1", organizationId: "org-1", revision: "3" }],
    checkAfterMs: 60_000,
    ...overrides,
  };
}

function bundle(courseId = "course-1", revision = "3"): CourseBundle {
  return {
    schema: BUNDLE_SCHEMA,
    courseId,
    organizationId: "org-1",
    revision,
    structure: {
      title: courseId,
      description: null,
      thumbnailUrl: null,
      status: "PUBLISHED",
      progressionMode: "OPEN",
      modules: [
        {
          id: `${courseId}-module`,
          title: "Module",
          description: null,
          position: 1,
          items: [
            {
              id: `${courseId}-item`,
              type: "MATERIAL",
              position: 1,
              title: "Lesson",
              materialId: "material-1",
              vocabularySetId: null,
              assessmentId: null,
              assessmentPassingScore: null,
            },
          ],
        },
      ],
    },
    content: {
      placements: {},
      materials: {},
      vocabularySets: {},
      assessments: {},
      pdfBooks: {},
      assets: {},
    },
  };
}

function transport(
  overrides: Partial<MobileSyncTransport> = {},
): MobileSyncTransport {
  return {
    commit: async ({ operations }) => commitResult(operations),
    getManifest: async () => manifest(),
    getIndex: async () => ({ status: "ok", index: index() }),
    fetchBundle: async ({ courseId }) => ({
      status: "ok",
      bundle: bundle(courseId),
      etag: null,
      revision: "3",
    }),
    ...overrides,
  };
}

function engineFor(
  input: {
    store?: ReturnType<typeof memoryStore>;
    queryClient?: QueryClient;
    transport?: Partial<MobileSyncTransport>;
    isOnline?: () => Promise<boolean>;
  } & Partial<
    Pick<
      Parameters<typeof createMobileSyncEngine>[0],
      "onPendingCountChange" | "onDeadLetterCountChange" | "onStateChange"
    >
  > = {},
) {
  const store = input.store ?? memoryStore();
  const queryClient = input.queryClient ?? new QueryClient();
  const engine = createMobileSyncEngine({
    userId: "user-1",
    queryClient,
    store,
    transport: transport(input.transport),
    isOnline: input.isOnline ?? (async () => true),
    onPendingCountChange: input.onPendingCountChange,
    onDeadLetterCountChange: input.onDeadLetterCountChange,
    onStateChange: input.onStateChange,
    bundleSync: { backgroundJitterMs: 0, backoffBaseMs: 1, random: () => 0 },
  });
  return { engine, store, queryClient };
}

describe("mobile sync engine outbox", () => {
  test("records many vocabulary interactions as one session operation", async () => {
    const sent: MobileSyncOperation[][] = [];
    const { engine, store } = engineFor({
      transport: {
        commit: async ({ operations }) => {
          sent.push(operations);
          return commitResult(operations);
        },
      },
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
    const { engine } = engineFor({
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
    let calls = 0;
    const { engine, store } = engineFor({
      transport: {
        commit: async ({ operations }) => {
          calls += 1;
          return commitResult(operations);
        },
      },
      isOnline: async () => false,
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
    let calls = 0;
    const { engine } = engineFor({
      transport: {
        commit: async ({ operations }) => {
          calls += 1;
          await Promise.resolve();
          return commitResult(operations);
        },
      },
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

  test("dead-letters a terminal failure only after repeated failures over a day", async () => {
    const deadLetterCounts: number[] = [];
    const { engine, store } = engineFor({
      transport: {
        commit: async ({ operations }) => ({
          ...commitResult(
            operations.filter((operation) => operation.id !== "content:item-2"),
          ),
          failures: operations
            .filter((operation) => operation.id === "content:item-2")
            .map((operation) => ({
              id: operation.id,
              kind: operation.kind,
              code: "PRECONDITION_FAILED",
              message: "Not accepted",
            })),
        }),
      },
      onDeadLetterCountChange: (count) => deadLetterCounts.push(count),
    });
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    try {
      setSystemTime(start);
      await engine.initialize();
      for (const courseItemId of ["item-1", "item-2"]) {
        await engine.putOperation({
          id: `content:${courseItemId}`,
          kind: "CONTENT_COMPLETED",
          courseItemId,
        });
      }

      // Five failures within minutes: not yet a day since the first.
      for (let minute = 0; minute < DEAD_LETTER_MIN_FAILURES; minute += 1) {
        setSystemTime(start + minute * 60_000);
        expect((await engine.checkpoint()).state).toBe("synced");
        expect(await store.countDeadLetters("user-1")).toBe(0);
        expect(
          (await store.listOperations("user-1")).map(({ id }) => id),
        ).toEqual(["content:item-2"]);
      }
      // Past both thresholds.
      setSystemTime(start + DEAD_LETTER_MIN_AGE_MS);
      await engine.checkpoint();
      expect(await store.countOperations("user-1")).toBe(0);
      const deadLetters = await store.listDeadLetters("user-1");
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0]).toMatchObject({
        operation: { id: "content:item-2" },
        code: "PRECONDITION_FAILED",
        message: "Not accepted",
      });
      expect(deadLetterCounts).toEqual([0, 1]);
    } finally {
      setSystemTime();
      await engine.dispose();
    }
  });

  test("restarts the failure count when a failing operation changes", async () => {
    const { engine, store } = engineFor({
      transport: {
        commit: async ({ operations }) => ({
          ...commitResult([]),
          failures: operations.map((operation) => ({
            id: operation.id,
            kind: operation.kind,
            code: "BAD_REQUEST",
            message: "Rejected",
          })),
        }),
      },
    });
    const record = (attemptId: string) =>
      engine.recordVocabularyAttempt({
        gameKey: "cards",
        sessionId: "session-1",
        attempt: {
          attemptId,
          entryId: attemptId,
          evidence: "RECALL",
          result: "CORRECT",
          sourceCourseItemId: "item-1",
          vocabularySetId: "set-1",
        },
      });
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    try {
      setSystemTime(start);
      await engine.initialize();
      await record("attempt-1");
      for (let failure = 0; failure < 4; failure += 1) {
        await engine.checkpoint();
      }
      await record("attempt-2");
      setSystemTime(start + DEAD_LETTER_MIN_AGE_MS + 1);
      await engine.checkpoint();

      expect(await store.countDeadLetters("user-1")).toBe(0);
      expect(await store.countOperations("user-1")).toBe(1);
    } finally {
      setSystemTime();
      await engine.dispose();
    }
  });

  test("stops at a transient failure without counting later terminal failures", async () => {
    const requests: string[][] = [];
    const { engine, store } = engineFor({
      transport: {
        // An older server that kept going after the transient failure.
        commit: async ({ operations }) => {
          requests.push(operations.map(({ id }) => id));
          const failures = operations.flatMap((operation) =>
            operation.id === "content:item-2"
              ? [
                  {
                    id: operation.id,
                    kind: operation.kind,
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database unavailable",
                  },
                ]
              : operation.id === "content:item-3"
                ? [
                    {
                      id: operation.id,
                      kind: operation.kind,
                      code: "FORBIDDEN",
                      message: "Module locked",
                    },
                  ]
                : [],
          );
          return {
            ...commitResult(
              operations.filter(
                (operation) =>
                  !failures.some((failure) => failure.id === operation.id),
              ),
            ),
            failures,
          } as MobileSyncCommitResult;
        },
      },
    });
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    try {
      setSystemTime(start);
      await engine.initialize();
      for (let index = 1; index <= 55; index += 1) {
        await engine.putOperation({
          id: `content:item-${index}`,
          kind: "CONTENT_COMPLETED",
          courseItemId: `item-${index}`,
        });
      }
      await engine.checkpoint();
      // The second batch is not sent after the transient failure.
      expect(requests).toHaveLength(1);
      for (let day = 1; day <= DEAD_LETTER_MIN_FAILURES; day += 1) {
        setSystemTime(start + day * DEAD_LETTER_MIN_AGE_MS);
        await engine.checkpoint();
      }
      expect(await store.countDeadLetters("user-1")).toBe(0);
      expect(
        (await store.listOperations("user-1")).map(({ id }) => id),
      ).toEqual(["content:item-2", "content:item-3"]);
    } finally {
      setSystemTime();
      await engine.dispose();
    }
  });

  test("re-records an attempt in whichever queued chunk holds it", async () => {
    const store = memoryStore();
    const attempt = (index: number, result: "CORRECT" | "INCORRECT") => ({
      attemptId: `session-1:${index}`,
      entryId: `entry-${index}`,
      evidence: "RECALL" as const,
      result,
      sourceCourseItemId: "item-1",
      vocabularySetId: "set-1",
    });
    // Chunk 2 already synced; chunks 1 and 3 are still queued.
    for (const [id, index] of [
      ["vocabulary:session-1", 1],
      ["vocabulary:session-1#3", 3],
    ] as const) {
      await store.putOperation("user-1", {
        id,
        kind: "VOCABULARY_SESSION_COMPLETED",
        gameKey: "cards",
        sessionId: "session-1",
        attempts: [attempt(index, "CORRECT")],
      });
    }
    // Another session whose id shares the prefix is left alone.
    await store.putOperation("user-1", {
      id: "vocabulary:session-10",
      kind: "VOCABULARY_SESSION_COMPLETED",
      gameKey: "cards",
      sessionId: "session-10",
      attempts: [attempt(3, "CORRECT")],
    });
    const { engine } = engineFor({ store });
    await engine.initialize();

    await engine.recordVocabularyAttempt({
      gameKey: "cards",
      sessionId: "session-1",
      attempt: attempt(3, "INCORRECT"),
    });

    const operations = await store.listOperations("user-1");
    expect(operations.map(({ id }) => id)).toEqual([
      "vocabulary:session-1",
      "vocabulary:session-1#3",
      "vocabulary:session-10",
    ]);
    const attemptsOf = (id: string) => {
      const operation = operations.find((entry) => entry.id === id);
      return operation?.kind === "VOCABULARY_SESSION_COMPLETED"
        ? operation.attempts.map(({ attemptId, result }) => [attemptId, result])
        : [];
    };
    expect(attemptsOf("vocabulary:session-1")).toEqual([
      ["session-1:1", "CORRECT"],
    ]);
    expect(attemptsOf("vocabulary:session-1#3")).toEqual([
      ["session-1:3", "INCORRECT"],
    ]);
    expect(attemptsOf("vocabulary:session-10")).toEqual([
      ["session-1:3", "CORRECT"],
    ]);
    await engine.dispose();
  });

  test("splits a vocabulary session into operations of at most 500 attempts", async () => {
    const { engine, store } = engineFor();
    await engine.initialize();
    const record = (index: number, result: "CORRECT" | "INCORRECT") =>
      engine.recordVocabularyAttempt({
        gameKey: "cards",
        sessionId: "session-1",
        attempt: {
          attemptId: `session-1:${index}`,
          entryId: `entry-${index}`,
          evidence: "RECALL",
          result,
          sourceCourseItemId: "item-1",
          vocabularySetId: "set-1",
        },
      });
    for (let index = 0; index < 502; index += 1) {
      await record(index, "CORRECT");
    }
    // Re-recording an attempt replaces it in the chunk that holds it.
    await record(3, "INCORRECT");
    await record(501, "INCORRECT");

    const operations = await store.listOperations("user-1");
    expect(operations.map((operation) => operation.id)).toEqual([
      "vocabulary:session-1",
      "vocabulary:session-1#2",
    ]);
    const [first, second] = operations;
    if (
      first?.kind !== "VOCABULARY_SESSION_COMPLETED" ||
      second?.kind !== "VOCABULARY_SESSION_COMPLETED"
    ) {
      throw new Error("Expected vocabulary operations");
    }
    expect(first.attempts).toHaveLength(500);
    expect(second.attempts).toHaveLength(2);
    expect(
      first.attempts.find((attempt) => attempt.attemptId === "session-1:3")
        ?.result,
    ).toBe("INCORRECT");
    expect(second.attempts.map((attempt) => attempt.result)).toEqual([
      "CORRECT",
      "INCORRECT",
    ]);
    await engine.dispose();
  });

  test("splits an oversized vocabulary operation from an older client before sending", async () => {
    const store = memoryStore();
    await store.putOperation("user-1", {
      id: "vocabulary:session-1",
      kind: "VOCABULARY_SESSION_COMPLETED",
      gameKey: "cards",
      sessionId: "session-1",
      attempts: Array.from({ length: 1001 }, (_, index) => ({
        attemptId: `session-1:${index}`,
        entryId: `entry-${index}`,
        evidence: "RECALL" as const,
        result: "CORRECT" as const,
        sourceCourseItemId: "item-1",
        vocabularySetId: "set-1",
      })),
    });
    await Bun.sleep(2);
    // Queued after the session: the split chunks must still go first.
    await store.putOperation("user-1", {
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    const sent: MobileSyncOperation[] = [];
    const { engine } = engineFor({
      store,
      transport: {
        commit: async ({ operations }) => {
          sent.push(...operations);
          return commitResult(operations);
        },
      },
    });
    await engine.initialize();

    expect((await engine.checkpoint()).state).toBe("synced");
    expect(
      sent.map((operation) =>
        operation.kind === "VOCABULARY_SESSION_COMPLETED"
          ? operation.attempts.length
          : operation.id,
      ),
    ).toEqual([500, 500, 1, "content:item-1"]);
    expect(await store.countOperations("user-1")).toBe(0);
    await engine.dispose();
  });

  test("commits in batches of 50 with the v2 protocol and no dashboard flag", async () => {
    const requests: Array<{ size: number; protocol: number; keys: string[] }> =
      [];
    const { engine, store } = engineFor({
      transport: {
        commit: async (input) => {
          requests.push({
            size: input.operations.length,
            protocol: input.protocol,
            keys: Object.keys(input).sort(),
          });
          return commitResult(input.operations);
        },
      },
    });
    await engine.initialize();
    for (let index = 0; index < 120; index += 1) {
      await engine.putOperation({
        id: `content:item-${index}`,
        kind: "CONTENT_COMPLETED",
        courseItemId: `item-${index}`,
      });
    }

    expect((await engine.checkpoint()).state).toBe("synced");
    expect(requests.map((request) => request.size)).toEqual([50, 50, 20]);
    expect(
      requests.every((request) => request.protocol === SYNC_PROTOCOL),
    ).toBe(true);
    expect(requests[0]?.keys).toEqual([
      "operations",
      "organizationId",
      "protocol",
    ]);
    expect(await store.countOperations("user-1")).toBe(0);
    await engine.dispose();
  });

  test("re-sends operations the server left unprocessed without failing them", async () => {
    const requests: string[][] = [];
    const { engine, store } = engineFor({
      transport: {
        commit: async ({ operations }) => {
          requests.push(operations.map((operation) => operation.id));
          // First request: the server's time budget runs out after one op.
          const processed =
            requests.length === 1 ? operations.slice(0, 1) : operations;
          return {
            ...commitResult(processed),
            budgetExhausted: requests.length === 1,
          } as MobileSyncCommitResult;
        },
      },
    });
    await engine.initialize();
    for (const courseItemId of ["item-1", "item-2", "item-3"]) {
      await engine.putOperation({
        id: `content:${courseItemId}`,
        kind: "CONTENT_COMPLETED",
        courseItemId,
      });
    }

    const result = await engine.checkpoint();
    expect(result.state).toBe("synced");
    expect(requests).toEqual([
      ["content:item-1", "content:item-2", "content:item-3"],
      ["content:item-2", "content:item-3"],
    ]);
    if (result.state === "synced") expect(result.result.failures).toEqual([]);
    expect(await store.countOperations("user-1")).toBe(0);
    expect(await store.countDeadLetters("user-1")).toBe(0);
    await engine.dispose();
  });

  test("keeps everything queued when the server makes no progress", async () => {
    let calls = 0;
    const { engine, store } = engineFor({
      transport: {
        commit: async () => {
          calls += 1;
          return {
            acknowledgedOperationIds: [],
            failures: [],
            results: [],
            budgetExhausted: false,
            patch: null,
          } as unknown as MobileSyncCommitResult;
        },
      },
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    expect(await engine.checkpoint()).toEqual({
      state: "queued",
      reason: "unavailable",
    });
    expect(calls).toBe(1);
    expect(await store.countOperations("user-1")).toBe(1);
    await engine.dispose();
  });

  test("queues another checkpoint when a new operation arrives during sync", async () => {
    const batches: string[][] = [];
    let releaseFirst: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const { engine } = engineFor({
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

describe("mobile sync engine index and bundles", () => {
  test("applies commit patches to the stored index and marks it stale", async () => {
    const { engine, store, queryClient } = engineFor({
      transport: {
        commit: async ({ operations }) => ({
          ...commitResult(operations),
          patch: {
            learner: {
              courseIds: ["course-1"],
              contentProgress: {
                "course-1-item": {
                  status: "COMPLETED",
                  startedAt: "2026-01-01T00:00:00.000Z",
                  completedAt: "2026-01-01T00:00:00.000Z",
                },
              },
              standaloneAttempts: {},
              passEvidence: {},
              practicedVocabularySetIds: ["set-1"],
              eligibleCohortsByCourse: {},
            },
            // Loose fixtures: the engine stores these sections verbatim.
            gamification: { streak: 3 } as never,
            attempts: [{ id: "attempt-1", status: "GRADED" }] as never,
          },
        }),
      },
    });
    await engine.initialize();
    expect((await engine.refresh()).state).toBe("refreshed");
    await engine.whenBundlesIdle();
    await engine.putOperation({
      id: "content:course-1-item",
      kind: "CONTENT_COMPLETED",
      courseItemId: "course-1-item",
    });

    expect((await engine.checkpoint()).state).toBe("synced");

    const record = queryClient.getQueryData<{
      index: LearnerIndex;
      stale: boolean;
    }>(syncQueryKeys.index("all"));
    expect(record?.stale).toBe(true);
    expect(record?.index.learner.contentProgress["course-1-item"]?.status).toBe(
      "COMPLETED",
    );
    expect(record?.index.learner.practicedVocabularySetIds).toEqual(["set-1"]);
    expect(record?.index.gamification as unknown).toEqual({ streak: 3 });
    expect(record?.index.attempts as unknown).toEqual([
      { id: "attempt-1", status: "GRADED" },
    ]);
    const stored = await store.loadIndex("user-1", "all");
    expect(stored?.stale).toBe(true);
    expect(
      SuperJSON.parse<LearnerIndex>(stored!.payload).learner.contentProgress,
    ).toHaveProperty("course-1-item");
    await engine.dispose();
  });

  test("refreshes the index only when the manifest token changes or it is stale", async () => {
    let token = "token-1";
    const indexCalls: Array<string | undefined> = [];
    const { engine, store } = engineFor({
      transport: {
        getManifest: async () => manifest({ indexToken: token, courses: [] }),
        getIndex: async ({ knownIndexToken }) => {
          indexCalls.push(knownIndexToken);
          return knownIndexToken === token
            ? { status: "unchanged", indexToken: token }
            : { status: "ok", index: index({ indexToken: token }) };
        },
      },
    });
    await engine.initialize();

    expect((await engine.refresh()).state).toBe("refreshed");
    expect((await engine.refresh()).state).toBe("current");
    expect(indexCalls).toEqual([undefined]);

    token = "token-2";
    expect((await engine.refresh()).state).toBe("refreshed");
    expect(indexCalls).toEqual([undefined, "token-1"]);
    expect((await store.loadIndex("user-1", "all"))?.token).toBe("token-2");

    // A stale index (after a commit) is fetched again even with the same token.
    await store.markIndexStale("user-1");
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    await engine.checkpoint();
    expect((await engine.refresh()).state).toBe("refreshed");
    expect(indexCalls).toHaveLength(3);
    expect(indexCalls[2]).toBeUndefined();
    await engine.dispose();
  });

  test("downloads changed bundles, keeps unchanged ones and prunes unenrolled courses", async () => {
    const fetched: Array<{ courseId: string; etag: string | null }> = [];
    let courses = manifest().courses;
    const { engine, store, queryClient } = engineFor({
      transport: {
        getManifest: async () => manifest({ courses }),
        fetchBundle: async ({ courseId, etag }) => {
          fetched.push({ courseId, etag });
          if (etag) return { status: "not-modified" };
          return {
            status: "ok",
            bundle: bundle(courseId, "0"),
            etag: `"etag-${courseId}"`,
            revision: "3",
          };
        },
      },
    });
    await engine.initialize();
    await engine.refresh();
    await engine.whenBundlesIdle();

    expect(fetched).toEqual([{ courseId: "course-1", etag: null }]);
    const stored = await store.loadBundleStructure("user-1", "course-1");
    // The revision comes from the response header, not the body.
    expect(stored?.revision).toBe("3");
    expect(stored?.etag).toBe('"etag-course-1"');
    expect(
      queryClient.getQueryData(syncQueryKeys.bundleStructure("course-1")),
    ).toMatchObject({ courseId: "course-1", revision: "3" });
    expect(
      queryClient.getQueryData<unknown>(syncQueryKeys.itemCourseMap()),
    ).toEqual({
      "course-1-item": "course-1",
    });
    expect(engine.courseIdForItem("course-1-item")).toBe("course-1");

    // Same revision: nothing is fetched.
    expect((await engine.refresh()).state).toBe("current");
    expect(fetched).toHaveLength(1);

    // New revision: a conditional request confirms the stored copy.
    courses = [
      { courseId: "course-1", organizationId: "org-1", revision: "4" },
    ];
    await engine.refresh();
    await engine.whenBundlesIdle();
    expect(fetched[1]).toEqual({
      courseId: "course-1",
      etag: '"etag-course-1"',
    });

    // Unenrolled: the bundle is pruned.
    courses = [];
    expect((await engine.refresh()).state).toBe("refreshed");
    expect(await store.loadBundleStructure("user-1", "course-1")).toBeNull();
    expect(engine.courseIdForItem("course-1-item")).toBeNull();
    await engine.dispose();
  });

  test("treats UPGRADE_REQUIRED as queued without counting failures and stops polling", async () => {
    const states: Array<{ minProtocol: number } | null> = [];
    let manifestCalls = 0;
    const { engine, store } = engineFor({
      transport: {
        commit: async () => {
          throw Object.assign(new Error(UPGRADE_REQUIRED_MESSAGE), {
            data: {
              code: "PRECONDITION_FAILED",
              upgradeRequired: { minProtocol: 3 },
            },
          });
        },
        getManifest: async () => {
          manifestCalls += 1;
          return manifest();
        },
      },
      onStateChange: (state) => states.push(state.upgradeRequired),
    });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    expect(await engine.checkpoint()).toEqual({
      state: "queued",
      reason: "upgrade-required",
    });
    expect(engine.getState().upgradeRequired).toEqual({ minProtocol: 3 });
    expect(states.at(-1)).toEqual({ minProtocol: 3 });
    expect(await store.countOperations("user-1")).toBe(1);
    expect(await store.countDeadLetters("user-1")).toBe(0);
    expect(await engine.checkForUpdates(undefined, { force: true })).toEqual({
      state: "queued",
      reason: "upgrade-required",
    });
    expect(manifestCalls).toBe(0);
    expect(
      upgradeRequiredFromError(new Error(UPGRADE_REQUIRED_MESSAGE)),
    ).toEqual({ minProtocol: SYNC_PROTOCOL + 1 });
    await engine.dispose();
  });

  test("checkForUpdates flushes the outbox then honours checkAfterMs", async () => {
    let manifestCalls = 0;
    const { engine } = engineFor({
      transport: {
        getManifest: async () => {
          manifestCalls += 1;
          return manifest({ courses: [], checkAfterMs: 5 * 60_000 });
        },
      },
    });
    await engine.initialize();
    expect((await engine.checkForUpdates()).state).toBe("refreshed");
    expect((await engine.checkForUpdates()).state).toBe("current");
    expect(manifestCalls).toBe(1);
    expect(engine.getState().nextCheckAfterMs).toBe(5 * 60_000);

    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    // A pending operation is flushed and the stale index refreshed at once.
    const result = await engine.checkForUpdates();
    expect(result.state).toBe("refreshed");
    expect(manifestCalls).toBe(2);
    await engine.dispose();
  });

  test("persists whitelisted queries only and hydrates them on the next launch", async () => {
    const store = memoryStore();
    const queryClient = new QueryClient();
    const { engine } = engineFor({ store, queryClient });
    await engine.initialize();
    const attemptKey = [
      ["assessment", "getMyAttempt"],
      { input: { attemptId: "attempt-1" }, type: "query" },
    ];
    queryClient.setQueryData(attemptKey, { id: "attempt-1" });
    queryClient.setQueryData(
      [
        ["learning", "getCourseOutline"],
        { input: { courseId: "c" }, type: "query" },
      ],
      { id: "c" },
    );
    await Bun.sleep(300);

    expect([...store.queries.keys()]).toEqual([
      `user-1:trpc:${persistedQueryKey(["assessment", "getMyAttempt"], { attemptId: "attempt-1" })}`,
    ]);
    await engine.dispose();

    const next = new QueryClient();
    const { engine: relaunched } = engineFor({ store, queryClient: next });
    await relaunched.initialize();
    expect(next.getQueryData<unknown>(attemptKey)).toEqual({ id: "attempt-1" });
    await relaunched.dispose();
  });

  test("patches learner state locally and keeps it after clearing only the outbox", async () => {
    const { engine, queryClient } = engineFor();
    await engine.initialize();
    await engine.refresh();
    await engine.localData.patchLearnerState("all", {
      contentProgress: {
        "course-1-item": {
          status: "COMPLETED",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        },
      },
      practicedVocabularySetIds: ["set-9"],
    });
    const record = queryClient.getQueryData<{
      index: LearnerIndex;
      stale: boolean;
    }>(syncQueryKeys.index("all"));
    expect(record?.index.learner.contentProgress["course-1-item"]?.status).toBe(
      "COMPLETED",
    );
    expect(record?.index.learner.practicedVocabularySetIds).toEqual(["set-9"]);
    expect(record?.stale).toBe(true);
    expect(await engine.localData.loadIndex("all")).toMatchObject({
      stale: true,
    });
    await engine.dispose();
  });

  test("refuses to clear local data while operations are pending", async () => {
    const { engine, store } = engineFor({ isOnline: async () => false });
    await engine.initialize();
    await engine.putOperation({
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });
    await expect(engine.clearLocalCache()).rejects.toThrow(
      "Pending learning progress must sync before clearing local data.",
    );
    expect(await store.countOperations("user-1")).toBe(1);
    await engine.dispose();
  });
});
