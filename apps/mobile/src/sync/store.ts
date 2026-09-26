import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type {
  BundleContent,
  BundleStructure,
} from "@hakgyo/shared/mobile-sync";

import type { MobileSyncOperation } from "./types";

const DATABASE_NAME = "hakgyo-sync.db";
/** Dead-lettered operations kept per user; older entries are dropped. */
export const MAX_DEAD_LETTERS = 50;

export type MobileSyncDeadLetter = {
  operation: MobileSyncOperation;
  code: string;
  message: string;
  failedAt: number;
};

export type MobileSyncOperationFailure = {
  id: string;
  /** Consecutive terminal failures of the current payload. */
  failureCount: number;
  firstFailedAt: number;
};

export type StoredIndex = {
  scope: string;
  token: string;
  /** SuperJSON-serialized learner index. */
  payload: string;
  validUntil: number;
  stale: boolean;
  updatedAt: number;
};

export type StoredBundleMeta = {
  courseId: string;
  revision: string;
  schema: number;
  etag: string | null;
  bytes: number;
  updatedAt: number;
  openedAt: number | null;
};

export type StoredBundle<T> = StoredBundleMeta & { data: T };

export type StoredQuery = {
  queryKey: string;
  /** SuperJSON-serialized payload. */
  payload: string;
  updatedAt: number;
};

export type MobileSyncStore = {
  initialize: () => Promise<void>;
  getMeta: (userId: string, key: string) => Promise<string | null>;
  setMeta: (userId: string, key: string, value: string) => Promise<void>;

  loadIndex: (userId: string, scope: string) => Promise<StoredIndex | null>;
  saveIndex: (
    userId: string,
    index: Omit<StoredIndex, "updatedAt"> & { updatedAt?: number },
  ) => Promise<void>;
  markIndexStale: (userId: string, scope?: string) => Promise<void>;

  listBundleRevisions: (userId: string) => Promise<StoredBundleMeta[]>;
  loadBundleStructure: (
    userId: string,
    courseId: string,
  ) => Promise<StoredBundle<BundleStructure> | null>;
  loadBundleContent: (
    userId: string,
    courseId: string,
  ) => Promise<StoredBundle<BundleContent> | null>;
  /** Every stored structure (small); used to build the item → course map. */
  listBundleStructures: (
    userId: string,
  ) => Promise<StoredBundle<BundleStructure>[]>;
  saveBundle: (
    userId: string,
    bundle: {
      courseId: string;
      revision: string;
      schema: number;
      etag: string | null;
      structure: BundleStructure;
      content: BundleContent;
      bytes?: number;
      updatedAt?: number;
    },
  ) => Promise<void>;
  /** Refreshes `updated_at` after the server confirmed the bundle unchanged. */
  touchBundleChecked: (
    userId: string,
    courseId: string,
    checkedAt?: number,
  ) => Promise<void>;
  touchBundleOpened: (
    userId: string,
    courseId: string,
    openedAt?: number,
  ) => Promise<void>;
  /** Deletes every bundle of the user not listed in `keepCourseIds`; returns the removed ids. */
  pruneBundles: (userId: string, keepCourseIds: string[]) => Promise<string[]>;

  loadQuery: (userId: string, queryKey: string) => Promise<StoredQuery | null>;
  listQueries: (userId: string) => Promise<StoredQuery[]>;
  saveQuery: (
    userId: string,
    queryKey: string,
    payload: string,
    updatedAt?: number,
  ) => Promise<void>;
  deleteQuery: (userId: string, queryKey: string) => Promise<void>;
  clearQueries: (userId: string) => Promise<void>;
  /** Removes the user's index, bundles, queries and meta (never the outbox). */
  clearLocalData: (userId: string) => Promise<void>;
  getOperation: (
    userId: string,
    id: string,
  ) => Promise<MobileSyncOperation | null>;
  /** Inserts or replaces an operation; a changed payload resets its failures. */
  putOperation: (
    userId: string,
    operation: MobileSyncOperation,
  ) => Promise<void>;
  /**
   * Atomically replaces an operation with `chunks` (the first keeps the
   * original id). The chunks keep the original's position in the queue.
   */
  splitOperation: (
    userId: string,
    chunks: MobileSyncOperation[],
  ) => Promise<void>;
  /** Oldest first. */
  listOperations: (
    userId: string,
    limit?: number,
  ) => Promise<MobileSyncOperation[]>;
  /** Operations whose id starts with `prefix`, oldest first. */
  listOperationsByIdPrefix: (
    userId: string,
    prefix: string,
  ) => Promise<MobileSyncOperation[]>;
  /**
   * Counts one more terminal failure for each listed operation that still
   * exists and returns the updated totals.
   */
  recordOperationFailures: (
    userId: string,
    ids: string[],
    failedAt: number,
  ) => Promise<MobileSyncOperationFailure[]>;
  removeOperations: (userId: string, ids: string[]) => Promise<void>;
  countOperations: (userId: string) => Promise<number>;
  /**
   * Atomically removes permanently rejected operations from the outbox and
   * records them in a bounded dead-letter list (newest MAX_DEAD_LETTERS).
   * Every entry is kept separately, also for a reused operation id.
   */
  deadLetterOperations: (
    userId: string,
    entries: MobileSyncDeadLetter[],
  ) => Promise<void>;
  listDeadLetters: (userId: string) => Promise<MobileSyncDeadLetter[]>;
  countDeadLetters: (userId: string) => Promise<number>;
};

type OperationRow = { payload: string };
type MetaRow = { value: string };
type IndexRow = {
  scope: string;
  token: string;
  payload: string;
  valid_until: number;
  stale: number;
  updated_at: number;
};
type BundleMetaRow = {
  course_id: string;
  revision: string;
  schema: number;
  etag: string | null;
  bytes: number;
  updated_at: number;
  opened_at: number | null;
};
type BundleStructureRow = BundleMetaRow & { structure: string };
type BundleContentRow = BundleMetaRow & { content: string };
type QueryRow = { query_key: string; payload: string; updated_at: number };
type CountRow = { count: number };
type ColumnRow = { name: string };
type FailureRow = {
  id: string;
  failure_count: number;
  first_failed_at: number;
};
type DeadLetterRow = {
  payload: string;
  code: string;
  message: string;
  failed_at: number;
};

function bundleMeta(row: BundleMetaRow): StoredBundleMeta {
  return {
    courseId: row.course_id,
    revision: row.revision,
    schema: row.schema,
    etag: row.etag,
    bytes: row.bytes,
    updatedAt: row.updated_at,
    openedAt: row.opened_at,
  };
}

function queryRecord(row: QueryRow): StoredQuery {
  return {
    queryKey: row.query_key,
    payload: row.payload,
    updatedAt: row.updated_at,
  };
}

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

  async function migrate(db: SQLiteDatabase) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      DROP TABLE IF EXISTS mobile_sync_cache;
      CREATE TABLE IF NOT EXISTS mobile_sync_operation (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        failure_count INTEGER NOT NULL DEFAULT 0,
        first_failed_at INTEGER,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS mobile_sync_operation_user_created
        ON mobile_sync_operation(user_id, created_at);
      CREATE TABLE IF NOT EXISTS mobile_sync_dead_letter_entry (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        code TEXT NOT NULL,
        message TEXT NOT NULL,
        failed_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS mobile_sync_dead_letter_entry_user_failed
        ON mobile_sync_dead_letter_entry(user_id, failed_at);
      CREATE TABLE IF NOT EXISTS mobile_sync_meta (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      );
      CREATE TABLE IF NOT EXISTS mobile_sync_index (
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        token TEXT NOT NULL,
        payload TEXT NOT NULL,
        valid_until INTEGER NOT NULL,
        stale INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, scope)
      );
      CREATE TABLE IF NOT EXISTS mobile_sync_course_bundle (
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        revision TEXT NOT NULL,
        schema INTEGER NOT NULL,
        etag TEXT,
        structure TEXT NOT NULL,
        content TEXT NOT NULL,
        bytes INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        opened_at INTEGER,
        PRIMARY KEY (user_id, course_id)
      );
      CREATE TABLE IF NOT EXISTS mobile_sync_query (
        user_id TEXT NOT NULL,
        query_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, query_key)
      );
    `);
    // Installs created before the failure columns / keyed dead-letter list.
    const migrations: string[] = [];
    const columns = new Set(
      (
        await db.getAllAsync<ColumnRow>(
          "PRAGMA table_info(mobile_sync_operation)",
        )
      ).map((column) => column.name),
    );
    if (!columns.has("failure_count")) {
      migrations.push(
        "ALTER TABLE mobile_sync_operation ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;",
      );
    }
    if (!columns.has("first_failed_at")) {
      migrations.push(
        "ALTER TABLE mobile_sync_operation ADD COLUMN first_failed_at INTEGER;",
      );
    }
    const legacyDeadLetters = await db.getFirstAsync<ColumnRow>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = 'mobile_sync_dead_letter'`,
    );
    if (legacyDeadLetters) {
      migrations.push(`
        INSERT INTO mobile_sync_dead_letter_entry
          (user_id, operation_id, payload, code, message, failed_at)
        SELECT user_id, id, payload, code, message, failed_at
        FROM mobile_sync_dead_letter ORDER BY failed_at ASC;
        DROP TABLE mobile_sync_dead_letter;
      `);
    }
    if (migrations.length) {
      await db.withExclusiveTransactionAsync((transaction) =>
        transaction.execAsync(migrations.join("\n")),
      );
    }
  }

  function initialize() {
    initializationPromise ??= database()
      .then(migrate)
      .catch((error: unknown) => {
        initializationPromise = undefined;
        throw error;
      });
    return initializationPromise;
  }

  return {
    initialize,

    async getMeta(userId, key) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<MetaRow>(
        "SELECT value FROM mobile_sync_meta WHERE user_id = ? AND key = ?",
        userId,
        key,
      );
      return row?.value ?? null;
    },

    async setMeta(userId, key, value) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_meta (user_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
        userId,
        key,
        value,
      );
    },

    async loadIndex(userId, scope) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<IndexRow>(
        `SELECT scope, token, payload, valid_until, stale, updated_at
         FROM mobile_sync_index WHERE user_id = ? AND scope = ?`,
        userId,
        scope,
      );
      return row
        ? {
            scope: row.scope,
            token: row.token,
            payload: row.payload,
            validUntil: row.valid_until,
            stale: row.stale !== 0,
            updatedAt: row.updated_at,
          }
        : null;
    },

    async saveIndex(userId, index) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_index
           (user_id, scope, token, payload, valid_until, stale, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, scope) DO UPDATE SET
           token = excluded.token,
           payload = excluded.payload,
           valid_until = excluded.valid_until,
           stale = excluded.stale,
           updated_at = excluded.updated_at`,
        userId,
        index.scope,
        index.token,
        index.payload,
        index.validUntil,
        index.stale ? 1 : 0,
        index.updatedAt ?? Date.now(),
      );
    },

    async markIndexStale(userId, scope) {
      await initialize();
      const db = await database();
      if (scope === undefined) {
        await db.runAsync(
          "UPDATE mobile_sync_index SET stale = 1 WHERE user_id = ?",
          userId,
        );
      } else {
        await db.runAsync(
          "UPDATE mobile_sync_index SET stale = 1 WHERE user_id = ? AND scope = ?",
          userId,
          scope,
        );
      }
    },

    async listBundleRevisions(userId) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<BundleMetaRow>(
        `SELECT course_id, revision, schema, etag, bytes, updated_at, opened_at
         FROM mobile_sync_course_bundle WHERE user_id = ?`,
        userId,
      );
      return rows.map(bundleMeta);
    },

    async loadBundleStructure(userId, courseId) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<BundleStructureRow>(
        `SELECT course_id, revision, schema, etag, bytes, updated_at, opened_at,
                structure
         FROM mobile_sync_course_bundle WHERE user_id = ? AND course_id = ?`,
        userId,
        courseId,
      );
      return row
        ? {
            ...bundleMeta(row),
            data: JSON.parse(row.structure) as BundleStructure,
          }
        : null;
    },

    async loadBundleContent(userId, courseId) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<BundleContentRow>(
        `SELECT course_id, revision, schema, etag, bytes, updated_at, opened_at,
                content
         FROM mobile_sync_course_bundle WHERE user_id = ? AND course_id = ?`,
        userId,
        courseId,
      );
      return row
        ? { ...bundleMeta(row), data: JSON.parse(row.content) as BundleContent }
        : null;
    },

    async listBundleStructures(userId) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<BundleStructureRow>(
        `SELECT course_id, revision, schema, etag, bytes, updated_at, opened_at,
                structure
         FROM mobile_sync_course_bundle WHERE user_id = ?`,
        userId,
      );
      return rows.map((row) => ({
        ...bundleMeta(row),
        data: JSON.parse(row.structure) as BundleStructure,
      }));
    },

    async saveBundle(userId, bundle) {
      await initialize();
      const structure = JSON.stringify(bundle.structure);
      const content = JSON.stringify(bundle.content);
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_course_bundle
           (user_id, course_id, revision, schema, etag, structure, content,
            bytes, updated_at, opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(user_id, course_id) DO UPDATE SET
           revision = excluded.revision,
           schema = excluded.schema,
           etag = excluded.etag,
           structure = excluded.structure,
           content = excluded.content,
           bytes = excluded.bytes,
           updated_at = excluded.updated_at`,
        userId,
        bundle.courseId,
        bundle.revision,
        bundle.schema,
        bundle.etag,
        structure,
        content,
        bundle.bytes ?? structure.length + content.length,
        bundle.updatedAt ?? Date.now(),
      );
    },

    async touchBundleChecked(userId, courseId, checkedAt = Date.now()) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `UPDATE mobile_sync_course_bundle SET updated_at = ?
         WHERE user_id = ? AND course_id = ?`,
        checkedAt,
        userId,
        courseId,
      );
    },

    async touchBundleOpened(userId, courseId, openedAt = Date.now()) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `UPDATE mobile_sync_course_bundle SET opened_at = ?
         WHERE user_id = ? AND course_id = ?`,
        openedAt,
        userId,
        courseId,
      );
    },

    async pruneBundles(userId, keepCourseIds) {
      await initialize();
      const db = await database();
      const keep = new Set(keepCourseIds);
      const rows = await db.getAllAsync<{ course_id: string }>(
        "SELECT course_id FROM mobile_sync_course_bundle WHERE user_id = ?",
        userId,
      );
      const removed = rows
        .map((row) => row.course_id)
        .filter((courseId) => !keep.has(courseId));
      if (!removed.length) return [];
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const courseId of removed) {
          await transaction.runAsync(
            `DELETE FROM mobile_sync_course_bundle
             WHERE user_id = ? AND course_id = ?`,
            userId,
            courseId,
          );
        }
      });
      return removed;
    },

    async loadQuery(userId, queryKey) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<QueryRow>(
        `SELECT query_key, payload, updated_at FROM mobile_sync_query
         WHERE user_id = ? AND query_key = ?`,
        userId,
        queryKey,
      );
      return row ? queryRecord(row) : null;
    },

    async listQueries(userId) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<QueryRow>(
        `SELECT query_key, payload, updated_at FROM mobile_sync_query
         WHERE user_id = ?`,
        userId,
      );
      return rows.map(queryRecord);
    },

    async saveQuery(userId, queryKey, payload, updatedAt = Date.now()) {
      await initialize();
      await (
        await database()
      ).runAsync(
        `INSERT INTO mobile_sync_query (user_id, query_key, payload, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, query_key) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
        userId,
        queryKey,
        payload,
        updatedAt,
      );
    },

    async deleteQuery(userId, queryKey) {
      await initialize();
      await (
        await database()
      ).runAsync(
        "DELETE FROM mobile_sync_query WHERE user_id = ? AND query_key = ?",
        userId,
        queryKey,
      );
    },

    async clearQueries(userId) {
      await initialize();
      await (
        await database()
      ).runAsync("DELETE FROM mobile_sync_query WHERE user_id = ?", userId);
    },

    async clearLocalData(userId) {
      await initialize();
      const db = await database();
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const table of [
          "mobile_sync_index",
          "mobile_sync_course_bundle",
          "mobile_sync_query",
          "mobile_sync_meta",
        ]) {
          await transaction.runAsync(
            `DELETE FROM ${table} WHERE user_id = ?`,
            userId,
          );
        }
      });
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
           updated_at = excluded.updated_at,
           failure_count = CASE
             WHEN mobile_sync_operation.payload = excluded.payload
               THEN mobile_sync_operation.failure_count
             ELSE 0
           END,
           first_failed_at = CASE
             WHEN mobile_sync_operation.payload = excluded.payload
               THEN mobile_sync_operation.first_failed_at
             ELSE NULL
           END`,
        operation.id,
        userId,
        operation.kind,
        JSON.stringify(operation),
        now,
        now,
      );
    },

    async splitOperation(userId, chunks) {
      const [first, ...rest] = chunks;
      if (!first) return;
      await initialize();
      const db = await database();
      const now = Date.now();
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const original = await transaction.getFirstAsync<{
          created_at: number;
        }>(
          `SELECT created_at FROM mobile_sync_operation
           WHERE user_id = ? AND id = ?`,
          userId,
          first.id,
        );
        const createdAt = original?.created_at ?? now;
        // Same created_at as the original; the later rowid orders the new
        // chunks right after it.
        for (const chunk of rest) {
          await transaction.runAsync(
            `INSERT INTO mobile_sync_operation
               (id, user_id, kind, payload, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, id) DO UPDATE SET
               kind = excluded.kind,
               payload = excluded.payload,
               created_at = excluded.created_at,
               updated_at = excluded.updated_at,
               failure_count = 0,
               first_failed_at = NULL`,
            chunk.id,
            userId,
            chunk.kind,
            JSON.stringify(chunk),
            createdAt,
            now,
          );
        }
        await transaction.runAsync(
          `INSERT INTO mobile_sync_operation
             (id, user_id, kind, payload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, id) DO UPDATE SET
             kind = excluded.kind,
             payload = excluded.payload,
             updated_at = excluded.updated_at,
             failure_count = 0,
             first_failed_at = NULL`,
          first.id,
          userId,
          first.kind,
          JSON.stringify(first),
          createdAt,
          now,
        );
      });
    },

    async listOperations(userId, limit = 5000) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<OperationRow>(
        `SELECT payload FROM mobile_sync_operation
         WHERE user_id = ? ORDER BY created_at ASC, rowid ASC LIMIT ?`,
        userId,
        limit,
      );
      return rows.map((row) => JSON.parse(row.payload) as MobileSyncOperation);
    },

    async listOperationsByIdPrefix(userId, prefix) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<OperationRow>(
        `SELECT payload FROM mobile_sync_operation
         WHERE user_id = ? AND instr(id, ?) = 1
         ORDER BY created_at ASC, rowid ASC`,
        userId,
        prefix,
      );
      return rows.map((row) => JSON.parse(row.payload) as MobileSyncOperation);
    },

    async recordOperationFailures(userId, ids, failedAt) {
      if (!ids.length) return [];
      await initialize();
      const db = await database();
      const failures: MobileSyncOperationFailure[] = [];
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const id of ids) {
          await transaction.runAsync(
            `UPDATE mobile_sync_operation SET
               failure_count = failure_count + 1,
               first_failed_at = COALESCE(first_failed_at, ?)
             WHERE user_id = ? AND id = ?`,
            failedAt,
            userId,
            id,
          );
          const row = await transaction.getFirstAsync<FailureRow>(
            `SELECT id, failure_count, first_failed_at
             FROM mobile_sync_operation WHERE user_id = ? AND id = ?`,
            userId,
            id,
          );
          if (row) {
            failures.push({
              id: row.id,
              failureCount: row.failure_count,
              firstFailedAt: row.first_failed_at,
            });
          }
        }
      });
      return failures;
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

    async deadLetterOperations(userId, entries) {
      if (!entries.length) return;
      await initialize();
      const db = await database();
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const entry of entries) {
          await transaction.runAsync(
            "DELETE FROM mobile_sync_operation WHERE user_id = ? AND id = ?",
            userId,
            entry.operation.id,
          );
          await transaction.runAsync(
            `INSERT INTO mobile_sync_dead_letter_entry
               (user_id, operation_id, payload, code, message, failed_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            userId,
            entry.operation.id,
            JSON.stringify(entry.operation),
            entry.code,
            entry.message,
            entry.failedAt,
          );
        }
        await transaction.runAsync(
          `DELETE FROM mobile_sync_dead_letter_entry
           WHERE user_id = ? AND sequence NOT IN (
             SELECT sequence FROM mobile_sync_dead_letter_entry
             WHERE user_id = ? ORDER BY failed_at DESC, sequence DESC LIMIT ?
           )`,
          userId,
          userId,
          MAX_DEAD_LETTERS,
        );
      });
    },

    async listDeadLetters(userId) {
      await initialize();
      const rows = await (
        await database()
      ).getAllAsync<DeadLetterRow>(
        `SELECT payload, code, message, failed_at
         FROM mobile_sync_dead_letter_entry
         WHERE user_id = ? ORDER BY failed_at DESC, sequence DESC`,
        userId,
      );
      return rows.map((row) => ({
        operation: JSON.parse(row.payload) as MobileSyncOperation,
        code: row.code,
        message: row.message,
        failedAt: row.failed_at,
      }));
    },

    async countDeadLetters(userId) {
      await initialize();
      const row = await (
        await database()
      ).getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count FROM mobile_sync_dead_letter_entry
         WHERE user_id = ?`,
        userId,
      );
      return row?.count ?? 0;
    },
  };
}

export const sqliteMobileSyncStore = createMobileSyncStore();
