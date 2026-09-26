import { describe, expect, test } from "bun:test";

import type { PrismaClient } from "../../../generated/prisma/client";
import {
  createVocabularyProgressService,
  type VocabularyAttemptInput,
} from "./progress-service";

const SET_ID = "set-1";
const ITEM_ID = "item-1";

function fakeDb(entries: Array<{ id: string; vocabularySetId: string }>) {
  const created: Array<{ id: string; entryId: string }> = [];
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
    vocabularyPracticeAttempt: {
      findMany: async () => [],
      createMany: async ({
        data,
      }: {
        data: Array<{ id: string; entryId: string }>;
      }) => {
        created.push(...data);
        return { count: data.length };
      },
    },
    vocabularyEntry: {
      findMany: async ({ where }: { where: { id?: { in: string[] } } }) =>
        entries
          .filter((entry) => !where.id || where.id.in.includes(entry.id))
          .map((entry) => ({
            ...entry,
            term: entry.id,
            definition: entry.id,
            progress: [],
          })),
    },
    vocabularyProgress: { findMany: async () => [] },
    contentProgress: {
      createMany: async () => ({ count: 0 }),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const db = {
    courseItem: {
      findUnique: async () => ({
        organizationId: "organization-1",
        moduleId: "module-1",
        isPublished: true,
        type: "VOCABULARY_SET",
        vocabularySetId: SET_ID,
        material: null,
      }),
    },
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
  };
  return { db: db as unknown as PrismaClient, created };
}

function attempt(attemptId: string, entryId: string): VocabularyAttemptInput {
  return {
    attemptId,
    sessionId: "session-1",
    sourceCourseItemId: ITEM_ID,
    vocabularySetId: SET_ID,
    entryId,
    gameKey: "cards",
    evidence: "RECALL",
    // Incorrect answers record no gamification activity.
    result: "INCORRECT",
  };
}

describe("vocabulary progress service", () => {
  test("skips attempts whose entry was deleted and records the rest", async () => {
    const { db, created } = fakeDb([
      { id: "entry-1", vocabularySetId: SET_ID },
    ]);
    const authorized: string[] = [];
    const service = createVocabularyProgressService(db, async (access) => {
      authorized.push(access.courseItemId);
    });

    const result = await service.recordAttempts("user-1", [
      attempt("a-1", "deleted-entry"),
      attempt("a-2", "entry-1"),
    ]);

    expect(result).toMatchObject({ accepted: 1, duplicates: 0, skipped: 1 });
    expect(created.map((row) => row.id)).toEqual(["a-2"]);
    expect(authorized).toEqual([ITEM_ID]);
  });

  test("still rejects an entry of a set the source does not authorize", async () => {
    const { db, created } = fakeDb([
      { id: "entry-1", vocabularySetId: "other-set" },
    ]);
    const service = createVocabularyProgressService(db, async () => undefined);

    const error = await service
      .recordAttempts("user-1", [attempt("a-1", "entry-1")])
      .catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code: "NOT_FOUND" });
    expect(created).toEqual([]);
  });

  test("does not skip authorization when every entry is missing", async () => {
    const { db } = fakeDb([]);
    const service = createVocabularyProgressService(db, async () => {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    });

    const error = await service
      .recordAttempts("user-1", [attempt("a-1", "deleted-entry")])
      .catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code: "FORBIDDEN" });
  });
});
