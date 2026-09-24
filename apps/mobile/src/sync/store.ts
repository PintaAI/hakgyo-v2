import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { MobileSyncOperation } from "./types";

const DATABASE_NAME = "hakgyo-sync.db";

export type MobileSyncStore = {
  initialize: () => Promise<void>;
  loadCache: (userId: string) => Promise<string | null>;
  saveCache: (userId: string, payload: string) => Promise<void>;
  clearCache: (userId: string) => Promise<void>;
  getOperation: (
    userId: string,
    id: string,
  ) => Promise<MobileSyncOperation | null>;
  putOperation: (
    userId: string,
    operation: MobileSyncOperation,
  ) => Promise<void>;
  listOperations: (userId: string) => Promise<MobileSyncOperation[]>;
  removeOperations: (userId: string, ids: string[]) => Promise<void>;
  countOperations: (userId: string) => Promise<number>;
};

type OperationRow = { payload: string };
type CacheRow = { payload: string };
type CountRow = { count: number };

export function createMobileSyncStore(
  openDatabase: () => Promise<SQLiteDatabase> = () =>
    openDatabaseAsync(DATABASE_NAME),
): MobileSyncStore {
  let databasePromise: Promise<SQLiteDatabase> | undefined;
  let initializationPromise: Promise<void> | undefined;

  function database() {
    databasePromise ??= openDatabase();
    return databasePromise;
  }

  function initialize() {
    initializationPromise ??= database()
      .then((db) =>
        db.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
          CREATE TABLE IF NOT EXISTS mobile_sync_cache (
            user_id TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS mobile_sync_operation (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, id)
          );
          CREATE INDEX IF NOT EXISTS mobile_sync_operation_user_created
            ON mobile_sync_operation(user_id, created_at);
        `),
      )
      .catch((error: unknown) => {
        initializationPromise = undefined;
        throw error;
      });
    return initializationPromise;
  }

  return {
    initialize,

    async loadCache(userId) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<CacheRow>(
        "SELECT payload FROM mobile_sync_cache WHERE user_id = ?",
        userId,
      );
      return row?.payload ?? null;
    },

    async saveCache(userId, payload) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_cache (user_id, payload, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
        userId,
        payload,
        Date.now(),
      );
    },

    async clearCache(userId) {
      await initialize();
      await (
        await database()
      ).runAsync("DELETE FROM mobile_sync_cache WHERE user_id = ?", userId);
    },

    async getOperation(userId, id) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<OperationRow>(
        "SELECT payload FROM mobile_sync_operation WHERE user_id = ? AND id = ?",
        userId,
        id,
      );
      return row ? (JSON.parse(row.payload) as MobileSyncOperation) : null;
    },

    async putOperation(userId, operation) {
      await initialize();
      const now = Date.now();
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_operation
           (id, user_id, kind, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           kind = excluded.kind,
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
        operation.id,
        userId,
        operation.kind,
        JSON.stringify(operation),
        now,
        now,
      );
    },

    async listOperations(userId) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<OperationRow>(
        `SELECT payload FROM mobile_sync_operation
         WHERE user_id = ? ORDER BY created_at ASC`,
        userId,
      );
      return rows.map((row) => JSON.parse(row.payload) as MobileSyncOperation);
    },

    async removeOperations(userId, ids) {
      if (!ids.length) return;
      await initialize();
      const db = await database();
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const id of ids) {
          await transaction.runAsync(
            "DELETE FROM mobile_sync_operation WHERE user_id = ? AND id = ?",
            userId,
            id,
          );
        }
      });
    },

    async countOperations(userId) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count FROM mobile_sync_operation
         WHERE user_id = ?`,
        userId,
      );
      return row?.count ?? 0;
    },
  };
}

export const sqliteMobileSyncStore = createMobileSyncStore();
