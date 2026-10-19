import { describe, expect, mock, test } from "bun:test";
import { OPERATION_VERSION } from "@hakgyo/shared/mobile-sync";

import {
  applySyncOperations,
  looseSyncOperation,
  storedAnswersMatch,
  syncOperation,
  TERMINAL_FAILURE_CODES,
  UNSUPPORTED_OPERATION_VERSION,
  type LearnerContext,
} from "./apply-operations";

function answersDb(
  stored: Array<{
    questionId: string;
    content: string | null;
    selectedOptions: Array<{ optionId: string }>;
  }>,
) {
  const findMany = mock(() => Promise.resolve(stored));
  return { db: { assessmentAnswer: { findMany } } as never, findMany };
}

describe("looseSyncOperation", () => {
  test("accepts any envelope with an id and a known kind", () => {
    expect(
      looseSyncOperation.safeParse({ id: "op", kind: "CONTENT_COMPLETED" })
        .success,
    ).toBe(true);
    expect(
      looseSyncOperation.safeParse({ id: "op", kind: "UNKNOWN" }).success,
    ).toBe(false);
    expect(
      looseSyncOperation.safeParse({ kind: "CONTENT_COMPLETED" }).success,
    ).toBe(false);
  });

  test("the strict schema rejects the same envelope without its payload", () => {
    expect(
      syncOperation.safeParse({ id: "op", kind: "CONTENT_COMPLETED" }).success,
    ).toBe(false);
    expect(
      syncOperation.safeParse({
        id: "op",
        kind: "CONTENT_COMPLETED",
        courseItemId: "item",
      }).success,
    ).toBe(true);
  });
});

describe("TERMINAL_FAILURE_CODES", () => {
  test("marks client-side failures terminal and server failures transient", () => {
    for (const code of [
      "BAD_REQUEST",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "PRECONDITION_FAILED",
    ]) {
      expect(TERMINAL_FAILURE_CODES.has(code)).toBe(true);
    }
    expect(TERMINAL_FAILURE_CODES.has("INTERNAL_SERVER_ERROR")).toBe(false);
    expect(TERMINAL_FAILURE_CODES.has("TIMEOUT")).toBe(false);
    expect(TERMINAL_FAILURE_CODES.has(UNSUPPORTED_OPERATION_VERSION)).toBe(
      false,
    );
  });
});

describe("applySyncOperations versions", () => {
  // Neither operation below may reach the database.
  const ctx = { db: {}, actorUserId: "user-1" } as unknown as LearnerContext;
  const content = (id: string, v?: number) => ({
    id,
    kind: "CONTENT_COMPLETED" as const,
    courseItemId: id,
    ...(v === undefined ? {} : { v }),
  });

  test("stops at an operation from a newer client without processing later ones", async () => {
    const result = await applySyncOperations(ctx, {
      operations: [
        content("content:item-1", OPERATION_VERSION + 1),
        content("content:item-2"),
      ],
    });
    expect(result.acknowledgedOperationIds).toEqual([]);
    expect(
      result.failures.map(({ id, kind, code }) => [id, kind, code]),
    ).toEqual([
      ["content:item-1", "CONTENT_COMPLETED", UNSUPPORTED_OPERATION_VERSION],
    ]);
    expect(result.failures[0]?.message).toContain("newer than this server");
    expect(result.affectedCourseItemIds).toEqual([]);
  });

  test("continues after a malformed operation but stops at a too-new one", async () => {
    const result = await applySyncOperations(ctx, {
      operations: [
        { id: "content:bad", kind: "CONTENT_COMPLETED" } as never,
        content("content:item-1", OPERATION_VERSION + 1),
        content("content:item-2"),
      ],
    });
    expect(result.failures.map(({ id, code }) => [id, code])).toEqual([
      ["content:bad", "BAD_REQUEST"],
      ["content:item-1", UNSUPPORTED_OPERATION_VERSION],
    ]);
    expect(result.acknowledgedOperationIds).toEqual([]);
  });
});

describe("storedAnswersMatch", () => {
  test("is true without answers and skips the query", async () => {
    const { db, findMany } = answersDb([]);
    expect(await storedAnswersMatch({ db }, "attempt", [])).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  test("compares selected options as sets and blank written answers as null", async () => {
    const { db } = answersDb([
      {
        questionId: "q1",
        content: null,
        selectedOptions: [{ optionId: "a" }, { optionId: "b" }],
      },
      { questionId: "q2", content: null, selectedOptions: [] },
      { questionId: "q3", content: "kept", selectedOptions: [] },
    ]);
    expect(
      await storedAnswersMatch({ db }, "attempt", [
        { questionId: "q1", optionIds: ["b", "a"] },
        { questionId: "q2", optionIds: [], content: "" },
        // Omitted content keeps the stored content.
        { questionId: "q3", optionIds: [] },
      ]),
    ).toBe(true);
    expect(
      await storedAnswersMatch({ db }, "attempt", [
        { questionId: "q1", optionIds: ["a"] },
      ]),
    ).toBe(false);
    expect(
      await storedAnswersMatch({ db }, "attempt", [
        { questionId: "q3", optionIds: [], content: "changed" },
      ]),
    ).toBe(false);
  });

  test("treats unsaved blank answers as stored and unsaved real answers as missing", async () => {
    const { db } = answersDb([]);
    expect(
      await storedAnswersMatch({ db }, "attempt", [
        { questionId: "q9", optionIds: [] },
      ]),
    ).toBe(true);
    expect(
      await storedAnswersMatch({ db }, "attempt", [
        { questionId: "q9", optionIds: ["a"] },
      ]),
    ).toBe(false);
  });
});
