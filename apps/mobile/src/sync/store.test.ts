import { describe, expect, mock, test } from "bun:test";

mock.module("expo-sqlite", () => ({
  openDatabaseAsync: async () => {
    throw new Error("The test must inject its database adapter");
  },
}));

describe("mobile sync SQLite store", () => {
  test("initializes the database schema only once across operations", async () => {
    const { createMobileSyncStore } = await import("./store");
    let schemaRuns = 0;
    const database = {
      execAsync: async () => {
        schemaRuns += 1;
      },
      getFirstAsync: async () => null,
      runAsync: async () => undefined,
    };
    const store = createMobileSyncStore(async () => database as never);

    await store.initialize();
    await store.loadCache("user-1");
    await store.saveCache("user-1", "payload");
    await store.countOperations("user-1");

    expect(schemaRuns).toBe(1);
  });
});
