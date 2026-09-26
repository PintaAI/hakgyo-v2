/**
 * Integration tests for the MobileSyncChange log: trigger emission matrix,
 * lock-free concurrent writers, snapshot-horizon revision reads and
 * compaction.
 *
 * Triggers and transaction ids need real commits, so these tests run against
 * a throwaway PostgreSQL (all migrations applied) with real commits and
 * explicit cleanup. Run with:
 *
 *   MOBILE_SYNC_INTEGRATION=1 DATABASE_URL=postgresql://... bun test sync-log
 *
 * The app's Prisma client only speaks to Neon over WebSockets, so the tests
 * talk to the database through Bun's built-in Postgres client and adapt
 * `Prisma.sql` queries for the functions under test.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL } from "bun";

import type { Prisma } from "../../../generated/prisma/client";
import {
  compactMobileSyncLog,
  compareRevisions,
  getCourseRevisions,
  getOrganizationMetaRevision,
  getScopeRevisions,
  getUserStateRevision,
} from "./sync-log";

const enabled =
  process.env.MOBILE_SYNC_INTEGRATION === "1" && !!process.env.DATABASE_URL;

type Row = Record<string, unknown>;

let sql: SQL;

function encodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return `{${value.map((entry) => JSON.stringify(String(entry))).join(",")}}`;
  }
  return value;
}

async function run<T extends Row = Row>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const rows: T[] = await sql.unsafe(text, values.map(encodeValue));
  return [...rows];
}

/** Minimal stand-in for `db.$queryRaw` backed by Bun's Postgres client. */
const db = {
  $queryRaw: <T = unknown>(query: Prisma.Sql) =>
    run(query.text, query.values) as Promise<T>,
} as unknown as Parameters<typeof getScopeRevisions>[0];

const id = () => crypto.randomUUID();

async function insert(table: string, row: Row) {
  const columns = Object.keys(row);
  await run(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")})
     VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
    columns.map((column) => row[column]),
  );
}

type Change = { kind: string; entityType: string; entityId: string };

async function changes(scopeType: string, scopeId: string): Promise<Change[]> {
  return run<Change>(
    `SELECT "kind", "entityType", "entityId" FROM "MobileSyncChange"
     WHERE "scopeType" = $1 AND "scopeId" = $2
     ORDER BY "txid", "kind", "entityType", "entityId"`,
    [scopeType, scopeId],
  );
}

/** Rows emitted by `action` for the scope, independent of earlier rows. */
async function emitted(
  scopeType: string,
  scopeId: string,
  action: () => Promise<unknown>,
) {
  const before = (await changes(scopeType, scopeId)).length;
  await action();
  return (await changes(scopeType, scopeId)).slice(before);
}

async function countAll() {
  const rows = await run<{ count: number }>(
    `SELECT count(*)::int AS "count" FROM "MobileSyncChange"`,
  );
  return rows[0]!.count;
}

async function createFixture(options: { courseStatus?: string } = {}) {
  const now = new Date();
  const userId = id();
  const organizationId = id();
  const memberId = id();
  const courseId = id();
  const moduleId = id();
  await insert("user", {
    id: userId,
    name: "Sync test",
    email: `${userId}@test.invalid`,
    updatedAt: now,
  });
  await insert("Organization", {
    id: organizationId,
    name: "Sync test",
    slug: organizationId,
    updatedAt: now,
  });
  await insert("OrganizationMember", {
    id: memberId,
    organizationId,
    userId,
    role: "OWNER",
    updatedAt: now,
  });
  await insert("Course", {
    id: courseId,
    organizationId,
    ownerMembershipId: memberId,
    title: "Course",
    slug: courseId,
    status: options.courseStatus ?? "PUBLISHED",
    updatedAt: now,
  });
  await insert("CourseModule", {
    id: moduleId,
    courseId,
    organizationId,
    title: "Module",
    position: 0,
    updatedAt: now,
  });
  let position = 0;
  const assetIds: string[] = [];
  const fixture = {
    userId,
    organizationId,
    memberId,
    courseId,
    moduleId,
    assetIds,
    async material(isPublished: boolean, moduleOverride = moduleId) {
      const materialId = id();
      const itemId = id();
      await insert("Material", {
        id: materialId,
        organizationId,
        createdByMembershipId: memberId,
        title: "Material",
        content: "{}",
        updatedAt: now,
      });
      await insert("CourseItem", {
        id: itemId,
        moduleId: moduleOverride,
        organizationId,
        type: "MATERIAL",
        position: position++,
        materialId,
        isPublished,
        updatedAt: now,
      });
      return { materialId, itemId };
    },
    async asset() {
      const assetId = id();
      assetIds.push(assetId);
      await insert("Asset", {
        id: assetId,
        organizationId,
        objectKey: assetId,
        fileName: "file.png",
        contentType: "image/png",
        size: 1,
        updatedAt: now,
      });
      return assetId;
    },
    async cleanup() {
      await run(`DELETE FROM "ContentProgress" WHERE "userId" = $1`, [userId]);
      await run(`DELETE FROM "CourseEnrollment" WHERE "userId" = $1`, [userId]);
      await run(`DELETE FROM "CourseItem" WHERE "organizationId" = $1`, [
        organizationId,
      ]);
      await run(`DELETE FROM "MaterialAsset" WHERE "organizationId" = $1`, [
        organizationId,
      ]);
      await run(`DELETE FROM "Material" WHERE "organizationId" = $1`, [
        organizationId,
      ]);
      await run(`DELETE FROM "Asset" WHERE "organizationId" = $1`, [
        organizationId,
      ]);
      await run(`DELETE FROM "Organization" WHERE "id" = $1`, [organizationId]);
      await run(`DELETE FROM "user" WHERE "id" = $1`, [userId]);
      await run(
        `DELETE FROM "MobileSyncChange" WHERE "scopeId" IN ($1, $2, $3)`,
        [userId, organizationId, courseId],
      );
    },
  };
  return fixture;
}

describe.skipIf(!enabled)("mobile sync change log", () => {
  beforeAll(() => {
    sql = new SQL(process.env.DATABASE_URL!);
  });
  afterAll(async () => {
    await sql?.close();
  });

  test("published material edits emit content; draft edits emit nothing", async () => {
    const fixture = await createFixture();
    const draftCourse = await createFixture({ courseStatus: "DRAFT" });
    try {
      const { courseId } = fixture;
      const published = await fixture.material(true);
      const draftItem = await fixture.material(false);
      const draftCourseMaterial = await draftCourse.material(true);
      // Fixture creation: the PUBLISHED course insert (structure + roster),
      // the module insert (structure) and the published item (structure with
      // the item entity). Materials and the unpublished item emit nothing.
      expect(await changes("course", courseId)).toEqual([
        { kind: "roster", entityType: "", entityId: "" },
        { kind: "structure", entityType: "", entityId: "" },
        { kind: "structure", entityType: "", entityId: "" },
        { kind: "structure", entityType: "item", entityId: published.itemId },
      ]);

      // Unpublished item in a published course: nothing.
      expect(
        await emitted("course", courseId, () =>
          run(`UPDATE "Material" SET "content" = '{"v":1}' WHERE "id" = $1`, [
            draftItem.materialId,
          ]),
        ),
      ).toEqual([]);
      // Published item in a DRAFT course: nothing.
      expect(
        await emitted("course", draftCourse.courseId, () =>
          run(`UPDATE "Material" SET "content" = '{"v":1}' WHERE "id" = $1`, [
            draftCourseMaterial.materialId,
          ]),
        ),
      ).toEqual([]);
      expect(await changes("organization", fixture.organizationId)).toEqual([
        { kind: "meta", entityType: "", entityId: "" },
      ]);

      // Published material content edit: content only.
      expect(
        await emitted("course", courseId, () =>
          run(`UPDATE "Material" SET "content" = '{"v":2}' WHERE "id" = $1`, [
            published.materialId,
          ]),
        ),
      ).toEqual([
        {
          kind: "content",
          entityType: "material",
          entityId: published.materialId,
        },
      ]);

      // Title change: structure too.
      expect(
        await emitted("course", courseId, () =>
          run(`UPDATE "Material" SET "title" = 'Renamed' WHERE "id" = $1`, [
            published.materialId,
          ]),
        ),
      ).toEqual([
        {
          kind: "content",
          entityType: "material",
          entityId: published.materialId,
        },
        {
          kind: "structure",
          entityType: "material",
          entityId: published.materialId,
        },
      ]);

      // Publish toggle on the item: structure with the item entity, both ways.
      for (const isPublished of [true, false]) {
        expect(
          await emitted("course", courseId, () =>
            run(`UPDATE "CourseItem" SET "isPublished" = $2 WHERE "id" = $1`, [
              draftItem.itemId,
              isPublished,
            ]),
          ),
        ).toEqual([
          { kind: "structure", entityType: "item", entityId: draftItem.itemId },
        ]);
      }

      // Requirement rows follow the material.
      const vocabularySetId = id();
      await insert("VocabularySet", {
        id: vocabularySetId,
        organizationId: fixture.organizationId,
        createdByMembershipId: fixture.memberId,
        title: "Words",
        updatedAt: new Date(),
      });
      expect(
        await emitted("course", courseId, () =>
          insert("MaterialRequirement", {
            id: id(),
            materialId: published.materialId,
            organizationId: fixture.organizationId,
            type: "VOCABULARY_SET",
            vocabularySetId,
            position: 0,
          }),
        ),
      ).toEqual([
        {
          kind: "content",
          entityType: "material",
          entityId: published.materialId,
        },
      ]);

      const revisions = await getCourseRevisions(db, [
        courseId,
        draftCourse.courseId,
      ]);
      const course = revisions.get(courseId)!;
      expect(compareRevisions(course.content, "0")).toBe(1);
      expect(compareRevisions(course.structure, "0")).toBe(1);
      expect(compareRevisions(course.roster, "0")).toBe(1);
      expect(course.bundle).toBe(
        compareRevisions(course.structure, course.content) >= 0
          ? course.structure
          : course.content,
      );
      expect(revisions.get(draftCourse.courseId)).toEqual({
        structure: "0",
        content: "0",
        roster: "0",
        bundle: "0",
      });
    } finally {
      await draftCourse.cleanup();
      await fixture.cleanup();
    }
  });

  test("assets emit only once linked to published content", async () => {
    const fixture = await createFixture();
    try {
      const { courseId } = fixture;
      const published = await fixture.material(true);
      const total = await countAll();
      const assetId = await fixture.asset();
      // Unlinked upload and confirmation: nothing anywhere.
      await run(`UPDATE "Asset" SET "confirmedAt" = now() WHERE "id" = $1`, [
        assetId,
      ]);
      expect(await countAll()).toBe(total);

      // Linking emits content for the material.
      expect(
        await emitted("course", courseId, () =>
          insert("MaterialAsset", {
            materialId: published.materialId,
            assetId,
            organizationId: fixture.organizationId,
          }),
        ),
      ).toEqual([
        {
          kind: "content",
          entityType: "material",
          entityId: published.materialId,
        },
      ]);

      // Learner-visible asset column changes emit the asset entity...
      expect(
        await emitted("course", courseId, () =>
          run(`UPDATE "Asset" SET "deletedAt" = now() WHERE "id" = $1`, [
            assetId,
          ]),
        ),
      ).toEqual([{ kind: "content", entityType: "asset", entityId: assetId }]);
      // ...but bookkeeping columns do not.
      expect(
        await emitted("course", courseId, () =>
          run(`UPDATE "Asset" SET "etag" = 'x' WHERE "id" = $1`, [assetId]),
        ),
      ).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("learner rows emit user/state; course status changes bump the organization", async () => {
    const fixture = await createFixture();
    try {
      const { userId, courseId, organizationId } = fixture;
      const published = await fixture.material(true);
      // The OWNER membership from the fixture already emitted user/state.
      expect(await changes("user", userId)).toEqual([
        { kind: "state", entityType: "", entityId: "" },
      ]);
      const before = await getUserStateRevision(db, userId);

      expect(
        await emitted("user", userId, () =>
          insert("CourseEnrollment", {
            id: id(),
            courseId,
            userId,
            status: "ACTIVE",
            source: "MANUAL",
          }),
        ),
      ).toEqual([{ kind: "state", entityType: "", entityId: "" }]);
      expect(
        await emitted("user", userId, () =>
          insert("ContentProgress", {
            id: id(),
            courseItemId: published.itemId,
            userId,
            updatedAt: new Date(),
          }),
        ),
      ).toEqual([{ kind: "state", entityType: "", entityId: "" }]);
      // Learner state never touches course scopes.
      expect(
        (await changes("course", courseId)).filter(
          (change) => change.kind === "roster",
        ),
      ).toHaveLength(1);
      const after = await getUserStateRevision(db, userId);
      expect(compareRevisions(after, before)).toBe(1);

      // Unpublishing: course structure + roster only; the course drops out of
      // learners' manifests, so no organization row is needed.
      const meta0 = await getOrganizationMetaRevision(db, organizationId);
      expect(
        await emitted("organization", organizationId, () =>
          run(`UPDATE "Course" SET "status" = 'DRAFT' WHERE "id" = $1`, [
            courseId,
          ]),
        ),
      ).toEqual([]);
      expect((await changes("course", courseId)).slice(-2)).toEqual([
        { kind: "roster", entityType: "", entityId: "" },
        { kind: "structure", entityType: "", entityId: "" },
      ]);
      expect(await getOrganizationMetaRevision(db, organizationId)).toBe(meta0);

      // Republishing is a plain course change too.
      expect(
        await emitted("organization", organizationId, () =>
          run(`UPDATE "Course" SET "status" = 'PUBLISHED' WHERE "id" = $1`, [
            courseId,
          ]),
        ),
      ).toEqual([]);

      // Unknown scopes read as "0".
      const unknown = await getScopeRevisions(db, [
        { scopeType: "course", scopeId: "missing", kind: "content" },
      ]);
      expect(unknown.get("course:missing:content")).toBe("0");
    } finally {
      await fixture.cleanup();
    }
  });

  test("PDF-import-shaped bulk insert into unpublished items emits nothing", async () => {
    const fixture = await createFixture();
    try {
      const total = await countAll();
      const conn = await sql.reserve();
      try {
        await conn.unsafe("BEGIN");
        const materialIds: string[] = [];
        const values: unknown[] = [];
        for (let index = 0; index < 20; index++) {
          const materialId = id();
          materialIds.push(materialId);
          values.push(materialId, fixture.organizationId, fixture.memberId);
        }
        await conn.unsafe(
          `INSERT INTO "Material" ("id", "organizationId", "createdByMembershipId", "title", "content", "updatedAt")
           SELECT m.id, m.org, m.member, 'Page', '{}', now()
           FROM unnest($1::text[], $2::text[], $3::text[]) AS m(id, org, member)`,
          [
            encodeValue(materialIds),
            encodeValue(materialIds.map(() => fixture.organizationId)),
            encodeValue(materialIds.map(() => fixture.memberId)),
          ],
        );
        await conn.unsafe(
          `INSERT INTO "CourseItem" ("id", "moduleId", "organizationId", "type", "position", "materialId", "isPublished", "updatedAt")
           SELECT gen_random_uuid()::text, $2, $3, 'MATERIAL', 100 + ordinality, m.id, false, now()
           FROM unnest($1::text[]) WITH ORDINALITY AS m(id, ordinality)`,
          [encodeValue(materialIds), fixture.moduleId, fixture.organizationId],
        );
        const assetIds = materialIds.map(() => id());
        await conn.unsafe(
          `INSERT INTO "Asset" ("id", "organizationId", "objectKey", "fileName", "contentType", "size", "confirmedAt", "updatedAt")
           SELECT a.id, $2, a.id, 'page.png', 'image/png', 1, now(), now()
           FROM unnest($1::text[]) AS a(id)`,
          [encodeValue(assetIds), fixture.organizationId],
        );
        await conn.unsafe(
          `INSERT INTO "MaterialAsset" ("materialId", "assetId", "organizationId")
           SELECT x.mid, x.aid, $3 FROM unnest($1::text[], $2::text[]) AS x(mid, aid)`,
          [
            encodeValue(materialIds),
            encodeValue(assetIds),
            fixture.organizationId,
          ],
        );
        await conn.unsafe(
          `UPDATE "Asset" SET "size" = 2 WHERE "id" = ANY($1::text[])`,
          [encodeValue(assetIds)],
        );
        await conn.unsafe("COMMIT");
      } finally {
        conn.release();
      }
      expect(await countAll()).toBe(total);
    } finally {
      await fixture.cleanup();
    }
  });

  test("concurrent writers in one organization do not block each other", async () => {
    const fixture = await createFixture();
    try {
      const otherCourseId = id();
      const otherModuleId = id();
      await insert("Course", {
        id: otherCourseId,
        organizationId: fixture.organizationId,
        ownerMembershipId: fixture.memberId,
        title: "Other",
        slug: otherCourseId,
        status: "PUBLISHED",
        updatedAt: new Date(),
      });
      await insert("CourseModule", {
        id: otherModuleId,
        courseId: otherCourseId,
        organizationId: fixture.organizationId,
        title: "Module",
        position: 0,
        updatedAt: new Date(),
      });
      const first = await fixture.material(true);
      const second = await fixture.material(true, otherModuleId);

      const a = await sql.reserve();
      const b = await sql.reserve();
      try {
        await a.unsafe("BEGIN");
        await a.unsafe("SET LOCAL lock_timeout = '1s'");
        await b.unsafe("BEGIN");
        await b.unsafe("SET LOCAL lock_timeout = '1s'");
        await a.unsafe(
          `UPDATE "Material" SET "content" = '{"a":1}' WHERE "id" = $1`,
          [first.materialId],
        );
        await b.unsafe(
          `UPDATE "Material" SET "content" = '{"b":1}' WHERE "id" = $1`,
          [second.materialId],
        );
        // Under the old counter design B would now wait for A's org row lock.
        await b.unsafe("COMMIT");
        await a.unsafe("COMMIT");
      } finally {
        a.release();
        b.release();
      }
      const revisions = await getCourseRevisions(db, [
        fixture.courseId,
        otherCourseId,
      ]);
      expect(
        compareRevisions(
          revisions.get(fixture.courseId)!.content,
          revisions.get(otherCourseId)!.content,
        ),
      ).not.toBe(0);
      await run(`DELETE FROM "MobileSyncChange" WHERE "scopeId" = $1`, [
        otherCourseId,
      ]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("revision excludes in-flight writers until they commit", async () => {
    const fixture = await createFixture();
    try {
      const { courseId } = fixture;
      const first = await fixture.material(true);
      const second = await fixture.material(true);
      const scope = {
        scopeType: "course",
        scopeId: courseId,
        kind: "content",
      } as const;
      const read = async () =>
        (await getScopeRevisions(db, [scope])).get(
          `course:${courseId}:content`,
        )!;
      const initial = await read();
      expect(initial).toBe("0");

      const a = await sql.reserve();
      try {
        await a.unsafe("BEGIN");
        const rowsA: { txid: string }[] = await a.unsafe(
          `UPDATE "Material" SET "content" = '{"a":1}' WHERE "id" = $1
           RETURNING pg_current_xact_id()::text AS "txid"`,
          [first.materialId],
        );
        const txidA = rowsA[0]!.txid;
        const rowsB = await run<{ txid: string }>(
          `UPDATE "Material" SET "content" = '{"b":1}' WHERE "id" = $1
           RETURNING pg_current_xact_id()::text AS "txid"`,
          [second.materialId],
        );
        const txidB = rowsB[0]!.txid;
        expect(BigInt(txidB) > BigInt(txidA)).toBe(true);
        // B committed but A (older txid) is still open: neither is reported.
        expect(await read()).toBe(initial);
        await a.unsafe("COMMIT");
        expect(await read()).toBe(txidB);
      } finally {
        a.release();
      }
    } finally {
      await fixture.cleanup();
    }
  });

  test("compaction keeps the newest row of every group", async () => {
    const group = (suffix: string) => `compaction-${suffix}-${id()}`;
    const oldest = group("old");
    const single = group("single");
    const mixed = group("mixed");
    const insertChange = (
      scopeId: string,
      txid: number,
      age: string,
      entityId = "",
    ) =>
      run(
        `INSERT INTO "MobileSyncChange" ("txid", "scopeType", "scopeId", "kind", "entityType", "entityId", "createdAt")
         VALUES ($1::xid8, 'course', $2, 'content', 'material', $3, now() - $4::interval)`,
        [String(txid), scopeId, entityId, age],
      );
    try {
      await insertChange(oldest, 11, "30 days");
      await insertChange(oldest, 12, "30 days");
      await insertChange(oldest, 13, "30 days", "a");
      await insertChange(oldest, 13, "30 days", "b");
      await insertChange(single, 21, "30 days");
      await insertChange(mixed, 31, "30 days");
      await insertChange(mixed, 32, "1 day");

      const result = await compactMobileSyncLog(db, { batchSize: 2 });
      expect(result).toMatchObject({
        deleted: 3,
        batches: 2,
        floorTxid: "31",
        complete: true,
      });
      expect(result.compactedAt).not.toBeNull();

      const remaining = async (scopeId: string) =>
        (
          await run<{ txid: string }>(
            `SELECT "txid"::text AS "txid" FROM "MobileSyncChange" WHERE "scopeId" = $1 ORDER BY "txid", "entityId"`,
            [scopeId],
          )
        ).map((row) => row.txid);
      expect(await remaining(oldest)).toEqual(["13", "13"]);
      expect(await remaining(single)).toEqual(["21"]);
      expect(await remaining(mixed)).toEqual(["32"]);

      const [state] = await run<{ floorTxid: string; count: number }>(
        `SELECT "floorTxid"::text AS "floorTxid", (SELECT count(*)::int FROM "MobileSyncCompaction") AS "count"
         FROM "MobileSyncCompaction" WHERE "id" = 1`,
      );
      expect(state).toEqual({ floorTxid: "31", count: 1 });

      // A second run with nothing to do keeps the floor.
      const again = await compactMobileSyncLog(db);
      expect(again).toMatchObject({ deleted: 0, batches: 0, floorTxid: "31" });
    } finally {
      await run(
        `DELETE FROM "MobileSyncChange" WHERE "scopeId" IN ($1, $2, $3)`,
        [oldest, single, mixed],
      );
    }
  });
});
