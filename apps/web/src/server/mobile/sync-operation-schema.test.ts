import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { OPERATION_VERSION, upcastOperation } from "@hakgyo/shared/mobile-sync";

import {
  looseSyncOperation,
  parseSyncOperation,
  syncOperation,
  UNSUPPORTED_OPERATION_VERSION,
} from "./sync-operation-schema";

/**
 * Frozen fixtures: operations exactly as each client version queues them.
 * Old files are never edited or deleted, so these tests prove that operations
 * still sitting in old outboxes keep upcasting and validating.
 */
const FIXTURES_DIR = join(import.meta.dir, "__fixtures__", "sync-operations");

type Fixture = { name: string; operation: Record<string, unknown> };

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .flatMap((file) => {
    const match = /^v(\d+)\.json$/.exec(file);
    if (!match) return [];
    const { operations } = JSON.parse(
      readFileSync(join(FIXTURES_DIR, file), "utf8"),
    ) as { operations: Fixture[] };
    return [{ file, version: Number(match[1]), operations }];
  })
  .sort((left, right) => left.version - right.version);

const kinds = syncOperation.options.map((option) => option.shape.kind.value);

describe("sync operation fixtures", () => {
  test("there is one fixture file per operation version, up to the current one", () => {
    expect(fixtureFiles.map(({ version }) => version)).toEqual(
      Array.from({ length: OPERATION_VERSION }, (_, index) => index + 1),
    );
  });

  test("the newest fixture file covers every operation kind", () => {
    const newest = fixtureFiles.at(-1)!;
    const covered = new Set(
      newest.operations.map(({ operation }) => operation.kind),
    );
    for (const kind of kinds) {
      expect({ file: newest.file, kind, covered: covered.has(kind) }).toEqual({
        file: newest.file,
        kind,
        covered: true,
      });
    }
  });

  for (const { file, version, operations } of fixtureFiles) {
    describe(file, () => {
      test("has fixtures", () => {
        expect(operations.length).toBeGreaterThan(0);
      });

      for (const { name, operation } of operations) {
        test(name, () => {
          // Only version 1 operations may lack `v` (clients before versioning).
          if (version > 1 || operation.v !== undefined) {
            expect(operation.v).toBe(version);
          }
          expect(looseSyncOperation.safeParse(operation).success).toBe(true);

          const upcasted = upcastOperation(operation);
          if (upcasted.status !== "ok") {
            throw new Error(`${name}: upcast ${upcasted.status}`);
          }
          expect(upcasted.operation.v).toBe(OPERATION_VERSION);
          const parsed = syncOperation.safeParse(upcasted.operation);
          if (!parsed.success) throw parsed.error;

          expect(parseSyncOperation(operation)).toEqual({
            ok: true,
            operation: parsed.data,
          });
        });
      }
    });
  }
});

describe("parseSyncOperation", () => {
  const content = {
    id: "content:item-1",
    kind: "CONTENT_COMPLETED",
    courseItemId: "item-1",
  };

  test("stamps the current version on operations without v", () => {
    expect(parseSyncOperation(content)).toEqual({
      ok: true,
      operation: { ...content, v: OPERATION_VERSION },
    } as never);
  });

  test("fails an operation from a newer client with a transient code", () => {
    const tooNew = { ...content, v: OPERATION_VERSION + 1 };
    // The commit envelope accepts it, so it fails alone instead of
    // rejecting the batch.
    expect(looseSyncOperation.safeParse(tooNew).success).toBe(true);
    expect(parseSyncOperation(tooNew)).toMatchObject({
      ok: false,
      code: UNSUPPORTED_OPERATION_VERSION,
    });
  });

  test("fails malformed operations and versions with BAD_REQUEST", () => {
    expect(parseSyncOperation({ ...content, v: 0 })).toMatchObject({
      ok: false,
      code: "BAD_REQUEST",
    });
    expect(parseSyncOperation({ ...content, v: "1" })).toMatchObject({
      ok: false,
      code: "BAD_REQUEST",
    });
    expect(
      parseSyncOperation({ id: "content:item-1", kind: "CONTENT_COMPLETED" }),
    ).toMatchObject({ ok: false, code: "BAD_REQUEST" });
  });
});
