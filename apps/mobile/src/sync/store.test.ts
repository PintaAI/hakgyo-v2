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
  type FakeDatabase = {
    execAsync: (source: string) => Promise<void>;
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
    },
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
    },
    withExclusiveTransactionAsync: async (task) => task(database),
  };
  return { database, executed, statements };
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

  test("migrates an existing install to failure counts and keyed dead letters", async () => {
    const { createMobileSyncStore } = await import("./store");
    const { database, executed } = fakeDatabase({
      operationColumns: CURRENT_COLUMNS.slice(0, 6),
      legacyDeadLetters: true,
    });
    const store = createMobileSyncStore(async () => database as never);

    await store.initialize();

    expect(executed).toHaveLength(2);
    const migration = executed[1]!;
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
});
