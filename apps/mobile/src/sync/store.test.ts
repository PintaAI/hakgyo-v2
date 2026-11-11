import { describe, expect, mock, test } from "bun:test";

mock.module("expo-sqlite", () => ({
  openDatabaseAsync: async () => {
    throw new Error("The test must inject its database adapter");
  },
}));

function fakeDatabase({
  operationColumns,
  legacyDeadLetters,
}: {
  operationColumns: string[];
  legacyDeadLetters: boolean;
}) {
  const executed: string[] = [];
  const statements: string[] = [];
  /** `execAsync` and `runAsync` sources in the order they ran. */
  const log: string[] = [];
  type FakeDatabase = {
    execAsync: (source: string) => Promise<void>;
    isInTransactionAsync: () => Promise<boolean>;
    getAllAsync: (source: string) => Promise<Array<{ name: string }>>;
    getFirstAsync: (source: string) => Promise<{ name: string } | null>;
    runAsync: (source: string) => Promise<void>;
    withExclusiveTransactionAsync: (
      task: (transaction: FakeDatabase) => Promise<void>,
    ) => Promise<void>;
  };
  const database: FakeDatabase = {
    execAsync: async (source: string) => {
      executed.push(source);
      log.push(source);
    },
    isInTransactionAsync: async () => false,
    getAllAsync: async (source: string) =>
      source.startsWith("PRAGMA table_info")
        ? operationColumns.map((name) => ({ name }))
        : [],
    getFirstAsync: async (source: string) =>
      legacyDeadLetters && source.includes("sqlite_master")
        ? { name: "mobile_sync_dead_letter" }
        : null,
    runAsync: async (source: string) => {
      statements.push(source);
      log.push(source);
    },
    withExclusiveTransactionAsync: async (task) => task(database),
  };
  return { database, executed, statements, log };
}

const CURRENT_COLUMNS = [
  "id",
  "user_id",
  "kind",
  "payload",
  "created_at",
  "updated_at",
  "failure_count",
  "first_failed_at",
];

describe("mobile sync SQLite store", () => {
  test("initializes the database schema only once across operations", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, executed } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const store = createMobileSyncStore(async () => database as never);

    await store.initialize();
    await store.getMeta("user-1", "key");
    await store.setMeta("user-1", "key", "value");
    await store.countOperations("user-1");

    expect(executed).toHaveLength(1);
    // The protocol 1 whole-cache blob table is dropped to reclaim space.
    expect(executed[0]).toContain("DROP TABLE IF EXISTS mobile_sync_cache;");
  });

  test("ends a transaction a JS reload left open on the reused connection", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, executed } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const reused = { ...database, isInTransactionAsync: async () => true };
    const store = createMobileSyncStore(async () => reused as never);

    await store.initialize();

    expect(executed[0]).toBe("ROLLBACK");
    expect(executed[1]).toContain("CREATE TABLE IF NOT EXISTS");
  });

  test("migrates an existing install to failure counts and keyed dead letters", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, executed } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS.slice(0, 6),
      legacyDeadLetters: true,
    });
    const store = createMobileSyncStore(async () => database as never);

    await store.initialize();

    // Schema, then the migration in its own transaction.
    expect(executed).toHaveLength(4);
    expect(executed[0]).toContain("PRAGMA busy_timeout");
    expect(executed[1]).toBe("BEGIN IMMEDIATE");
    expect(executed[3]).toBe("COMMIT");
    const migration = executed[2]!;
    expect(migration).toContain("ADD COLUMN failure_count");
    expect(migration).toContain("ADD COLUMN first_failed_at");
    expect(migration).toContain("INSERT INTO mobile_sync_dead_letter_entry");
    expect(migration).toContain("DROP TABLE mobile_sync_dead_letter;");
  });

  test("appends dead letters instead of replacing an earlier one of the same operation", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, statements } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const store = createMobileSyncStore(async () => database as never);

    await store.deadLetterOperations("user-1", [
      {
        operation: {
          id: "vocabulary:session-1",
          kind: "CONTENT_COMPLETED",
          courseItemId: "item-1",
        },
        code: "FORBIDDEN",
        message: "Rejected",
        failedAt: 1,
      },
    ]);

    const insert = statements.find((statement) =>
      statement.includes("INSERT INTO mobile_sync_dead_letter_entry"),
    );
    expect(insert).toBeDefined();
    expect(insert).not.toContain("ON CONFLICT");
  });

  test("clears every user's rows, queued progress included", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, statements } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const store = createMobileSyncStore(async () => database as never);

    await store.clearAllData();

    expect(statements.sort()).toEqual(
      [
        "mobile_sync_course_bundle",
        "mobile_sync_dead_letter_entry",
        "mobile_sync_index",
        "mobile_sync_meta",
        "mobile_sync_notice",
        "mobile_sync_notice_baseline",
        "mobile_sync_operation",
        "mobile_sync_query",
      ].map((table) => `DELETE FROM ${table}`),
    );
  });

  test("saves a bundle with its notices and baseline in one transaction", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, log } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const store = createMobileSyncStore(async () => database as never);
    await store.initialize();
    log.length = 0;

    await store.saveBundle(
      "user-1",
      {
        courseId: "course-1",
        revision: "2",
        schema: 2,
        etag: null,
        structure: {} as never,
        content: {} as never,
        updatedAt: 1_000,
      },
      {
        baselines: [{ key: "bundle:course-1", value: "{}" }],
        notices: [
          {
            kind: "COURSE_ADDED",
            id: "course:course-1@added",
            group: "course:course-1",
            organizationId: "org-1",
            createdAt: 1_000,
            courseId: "course-1",
            courseTitle: "Korean 1",
          },
        ],
      },
    );

    const summary = log.map((statement) =>
      statement.trim().split(/\s+/).slice(0, 3).join(" "),
    );
    expect(summary).toEqual([
      "BEGIN IMMEDIATE",
      "INSERT INTO mobile_sync_course_bundle",
      "DELETE FROM mobile_sync_notice",
      "INSERT INTO mobile_sync_notice",
      "INSERT INTO mobile_sync_notice_baseline",
      "DELETE FROM mobile_sync_notice",
      "COMMIT",
    ]);
  });

  test("never runs two writes at once, and a failed write does not block the next", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, log } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    let active = 0;
    let maxActive = 0;
    const slow = {
      ...database,
      runAsync: async (source: string) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        if (source.includes("mobile_sync_query")) throw new Error("disk full");
        await database.runAsync(source);
      },
    };
    const store = createMobileSyncStore(async () => slow as never);
    await store.initialize();
    log.length = 0;

    const results = await Promise.allSettled([
      store.setMeta("user-1", "a", "1"),
      store.saveQuery("user-1", "query-1", "{}"),
      store.removeOperations("user-1", ["op-1", "op-2"]),
      store.setMeta("user-1", "b", "2"),
    ]);

    expect(maxActive).toBe(1);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
      "fulfilled",
    ]);
    const summary = log.map((statement) =>
      statement.trim().split(/\s+/).slice(0, 3).join(" "),
    );
    // In call order. The failed write is left out of the log; the queue
    // carried on with the transaction after it, which committed whole.
    expect(summary).toEqual([
      "INSERT INTO mobile_sync_meta",
      "BEGIN IMMEDIATE",
      "DELETE FROM mobile_sync_operation",
      "DELETE FROM mobile_sync_operation",
      "COMMIT",
      "INSERT INTO mobile_sync_meta",
    ]);
  });

  test("rolls a failed transaction back", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, log } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS,
      legacyDeadLetters: false,
    });
    const failing = {
      ...database,
      runAsync: async (source: string) => {
        await database.runAsync(source);
        throw new Error("constraint failed");
      },
    };
    const store = createMobileSyncStore(async () => failing as never);
    await store.initialize();
    log.length = 0;

    await expect(store.removeOperations("user-1", ["op-1"])).rejects.toThrow(
      "constraint failed",
    );
    expect(log.map((statement) => statement.trim().split(/\s+/)[0])).toEqual([
      "BEGIN",
      "DELETE",
      "ROLLBACK",
    ]);
  });

  test("memory store wipes operations, dead letters and cached data", async () => {
    const { createMemoryStore } = await import("./memory-store.testutil");
    const store = createMemoryStore();
    await store.setMeta("user-1", "key", "value");
    await store.setMeta("user-2", "key", "value");
    await store.putOperation("user-1", {
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    });

    await store.clearAllData();

    expect(await store.getMeta("user-1", "key")).toBeNull();
    expect(await store.getMeta("user-2", "key")).toBeNull();
    expect(await store.countOperations("user-1")).toBe(0);
  });
});
