import { describe, expect, mock, test } from "bun:test";

import {
  looseSyncOperation,
  storedAnswersMatch,
  syncOperation,
  TERMINAL_FAILURE_CODES,
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
