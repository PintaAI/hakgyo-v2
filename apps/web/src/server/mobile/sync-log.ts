import type {
  SyncCourseKind,
  SyncRevision,
  SyncScope,
} from "@hakgyo/shared/mobile-sync";

import { Prisma } from "../../../generated/prisma/client";
import type { db } from "~/server/db";

type Db = Pick<typeof db, "$queryRaw">;

/** "0" means the scope never changed. */
export const ZERO_REVISION: SyncRevision = "0";

const COURSE_KINDS = ["structure", "content", "roster"] as const;

/**
 * Newest committed change per scope, restricted to transactions below the
 * reader's snapshot horizon (`pg_snapshot_xmin`). A transaction that is still
 * in flight when we read has a txid at or above the horizon, so its rows are
 * excluded even if they became visible between statements; once it commits,
 * the horizon moves past it and the revision rises. Revisions are therefore
 * monotonic per scope and a client can never skip an in-flight writer.
 */
function revisionQuery(scopes: readonly SyncScope[]) {
  const scopeTypes = scopes.map((scope) => scope.scopeType);
  const scopeIds = scopes.map((scope) => scope.scopeId);
  const kinds = scopes.map((scope) => scope.kind);
  return Prisma.sql`
    SELECT s."scopeType", s."scopeId", s."kind",
      (SELECT c."txid"::text FROM "MobileSyncChange" c
        WHERE c."scopeType" = s."scopeType"
          AND c."scopeId" = s."scopeId"
          AND c."kind" = s."kind"
          AND c."txid" < pg_snapshot_xmin(pg_current_snapshot())
        ORDER BY c."txid" DESC
        LIMIT 1) AS "revision"
    FROM unnest(${scopeTypes}::text[], ${scopeIds}::text[], ${kinds}::text[])
      AS s("scopeType", "scopeId", "kind")
  `;
}

type RevisionRow = {
  scopeType: SyncScope["scopeType"];
  scopeId: string;
  kind: SyncScope["kind"];
  revision: string | null;
};

/**
 * Reads the current revision of each scope from the `MobileSyncChange` log.
 * Scopes without any change report "0".
 */
export async function getScopeRevisions(
  db: Db,
  scopes: readonly SyncScope[],
): Promise<Map<string, SyncRevision>> {
  const revisions = new Map<string, SyncRevision>(
    scopes.map((scope) => [scopeKey(scope), ZERO_REVISION]),
  );
  if (scopes.length === 0) return revisions;
  const rows = await db.$queryRaw<RevisionRow[]>(revisionQuery(scopes));
  for (const row of rows) {
    revisions.set(scopeKey(row), row.revision ?? ZERO_REVISION);
  }
  return revisions;
}

export type CourseRevisions = Record<SyncCourseKind, SyncRevision> & {
  /** max(structure, content): the revision of the shared course bundle. */
  bundle: SyncRevision;
};

export async function getCourseRevisions(
  db: Db,
  courseIds: readonly string[],
): Promise<Map<string, CourseRevisions>> {
  const unique = [...new Set(courseIds)];
  const revisions = await getScopeRevisions(
    db,
    unique.flatMap((scopeId) =>
      COURSE_KINDS.map((kind) => ({
        scopeType: "course" as const,
        scopeId,
        kind,
      })),
    ),
  );
  const read = (scopeId: string, kind: SyncCourseKind) =>
    revisions.get(scopeKey({ scopeType: "course", scopeId, kind })) ??
    ZERO_REVISION;
  return new Map(
    unique.map((courseId) => {
      const structure = read(courseId, "structure");
      const content = read(courseId, "content");
      return [
        courseId,
        {
          structure,
          content,
          roster: read(courseId, "roster"),
          bundle: maxRevision(structure, content),
        },
      ];
    }),
  );
}

export async function getUserStateRevision(
  db: Db,
  userId: string,
): Promise<SyncRevision> {
  const scope = { scopeType: "user", scopeId: userId, kind: "state" } as const;
  const revisions = await getScopeRevisions(db, [scope]);
  return revisions.get(scopeKey(scope)) ?? ZERO_REVISION;
}

export async function getOrganizationMetaRevision(
  db: Db,
  organizationId: string,
): Promise<SyncRevision> {
  const scope = {
    scopeType: "organization",
    scopeId: organizationId,
    kind: "meta",
  } as const;
  const revisions = await getScopeRevisions(db, [scope]);
  return revisions.get(scopeKey(scope)) ?? ZERO_REVISION;
}

export function scopeKey(scope: SyncScope) {
  return `${scope.scopeType}:${scope.scopeId}:${scope.kind}`;
}

/** Revisions are decimal xid8 strings; compare numerically, never lexically. */
export function compareRevisions(a: SyncRevision, b: SyncRevision) {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function maxRevision(
  first: SyncRevision,
  ...rest: SyncRevision[]
): SyncRevision {
  let max = first;
  for (const revision of rest) {
    if (compareRevisions(revision, max) > 0) max = revision;
  }
  return max;
}

// ---------------------------------------------------------------------------
// Compaction
// ---------------------------------------------------------------------------

export const COMPACTION_RETENTION_DAYS = 14;
export const COMPACTION_BATCH_SIZE = 10_000;
/** Upper bound per run so a backlog cannot pin a serverless function forever. */
const MAX_BATCHES = 200;

export type CompactionResult = {
  deleted: number;
  batches: number;
  /** Highest txid removed from the log so far (null until the first removal). */
  floorTxid: string | null;
  compactedAt: string | null;
  complete: boolean;
};

/**
 * Deletes change rows older than the retention window that are not the newest
 * row of their (scopeType, scopeId, kind) group. Every group keeps its newest
 * txid so revisions never move backwards. Rows at or above the snapshot
 * horizon are never touched, and a group's "newest" candidate must itself be
 * below the horizon so an aborted in-flight writer cannot cause the real
 * newest row to be removed.
 */
export async function compactMobileSyncLog(
  db: Db,
  options: {
    retentionDays?: number;
    batchSize?: number;
    maxBatches?: number;
  } = {},
): Promise<CompactionResult> {
  const retentionDays = options.retentionDays ?? COMPACTION_RETENTION_DAYS;
  const batchSize = options.batchSize ?? COMPACTION_BATCH_SIZE;
  const maxBatches = options.maxBatches ?? MAX_BATCHES;
  let deleted = 0;
  let batches = 0;
  let floorTxid: bigint | null = null;
  let complete = false;

  while (batches < maxBatches) {
    const rows = await db.$queryRaw<
      { count: number; maxTxid: string | null }[]
    >(
      Prisma.sql`
        WITH horizon AS (
          SELECT pg_snapshot_xmin(pg_current_snapshot()) AS "txid"
        ), victims AS (
          SELECT c."id"
          FROM "MobileSyncChange" c, horizon
          WHERE c."createdAt" < now() - make_interval(days => ${retentionDays})
            AND c."txid" < horizon."txid"
            AND EXISTS (
              SELECT 1 FROM "MobileSyncChange" newer
              WHERE newer."scopeType" = c."scopeType"
                AND newer."scopeId" = c."scopeId"
                AND newer."kind" = c."kind"
                AND newer."txid" > c."txid"
                AND newer."txid" < horizon."txid"
            )
          LIMIT ${batchSize}
        ), removed AS (
          DELETE FROM "MobileSyncChange" c
          USING victims
          WHERE c."id" = victims."id"
          RETURNING c."txid"
        )
        SELECT count(*)::int AS "count", max("txid")::text AS "maxTxid" FROM removed
      `,
    );
    const batch = rows[0] ?? { count: 0, maxTxid: null };
    if (batch.count === 0) {
      complete = true;
      break;
    }
    batches += 1;
    deleted += batch.count;
    if (batch.maxTxid !== null) {
      const txid = BigInt(batch.maxTxid);
      if (floorTxid === null || txid > floorTxid) floorTxid = txid;
    }
    if (batch.count < batchSize) {
      complete = true;
      break;
    }
  }

  const state = await db.$queryRaw<
    { floorTxid: string | null; compactedAt: Date | null }[]
  >(Prisma.sql`
    INSERT INTO "MobileSyncCompaction" ("id", "floorTxid", "compactedAt")
    VALUES (1, ${floorTxid === null ? null : floorTxid.toString()}::xid8, now())
    ON CONFLICT ("id") DO UPDATE SET
      "floorTxid" = GREATEST(
        "MobileSyncCompaction"."floorTxid", EXCLUDED."floorTxid"),
      "compactedAt" = EXCLUDED."compactedAt"
    RETURNING "floorTxid"::text AS "floorTxid", "compactedAt"
  `);
  const row = state[0];
  return {
    deleted,
    batches,
    floorTxid: row?.floorTxid ?? null,
    compactedAt: row?.compactedAt?.toISOString() ?? null,
    complete,
  };
}
