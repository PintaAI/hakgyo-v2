import { describe, expect, test } from "bun:test";

import {
  OPERATION_UPCASTERS,
  OPERATION_VERSION,
  operationVersion,
  upcastOperation,
  type OperationUpcaster,
  type UpcastOperationResult,
} from "./operations";

// A made-up history: v1 → v2 renames `courseItemId` to `itemId`, v2 → v3
// wraps it in a `target` object.
const fakeUpcasters: Record<number, OperationUpcaster> = {
  1: ({ courseItemId, ...rest }) => ({ ...rest, itemId: courseItemId }),
  2: ({ itemId, ...rest }) => ({ ...rest, target: { itemId } }),
};

describe("upcastOperation", () => {
  test("treats an operation without v as version 1 and stamps the current version", () => {
    const raw = { id: "content:item-1", kind: "CONTENT_COMPLETED" };
    expect(upcastOperation(raw)).toEqual({
      status: "ok",
      operation: { ...raw, v: OPERATION_VERSION },
    });
    // The input is not mutated.
    expect(raw).toEqual({ id: "content:item-1", kind: "CONTENT_COMPLETED" });
  });

  test("keeps an operation of the current version unchanged", () => {
    const raw = {
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
      v: OPERATION_VERSION,
    };
    expect(upcastOperation(raw)).toEqual({ status: "ok", operation: raw });
  });

  test("chains upcasters one version at a time", () => {
    const options = { upcasters: fakeUpcasters, version: 3 };
    const legacy = {
      id: "content:item-1",
      kind: "CONTENT_COMPLETED",
      courseItemId: "item-1",
    };
    const expected: UpcastOperationResult = {
      status: "ok",
      operation: {
        id: "content:item-1",
        kind: "CONTENT_COMPLETED",
        target: { itemId: "item-1" },
        v: 3,
      },
    };
    expect(upcastOperation(legacy, options)).toEqual(expected);
    expect(upcastOperation({ ...legacy, v: 1 }, options)).toEqual(expected);
    // A version 2 operation only goes through the second step.
    expect(
      upcastOperation(
        {
          id: "content:item-1",
          kind: "CONTENT_COMPLETED",
          itemId: "item-1",
          v: 2,
        },
        options,
      ),
    ).toEqual(expected);
  });

  test("upcasters never see a stale v from the previous step", () => {
    const seen: unknown[] = [];
    const recording: Record<number, OperationUpcaster> = {
      1: (operation) => {
        seen.push(operation.v);
        return operation;
      },
      2: (operation) => {
        seen.push(operation.v);
        return operation;
      },
    };
    upcastOperation({ id: "op" }, { upcasters: recording, version: 3 });
    expect(seen).toEqual([undefined, 2]);
  });

  test("reports operations newer than the target version", () => {
    expect(
      upcastOperation(
        { id: "op", kind: "CONTENT_COMPLETED", v: 4 },
        {
          upcasters: fakeUpcasters,
          version: 3,
        },
      ),
    ).toEqual({ status: "too-new", version: 4 });
    expect(upcastOperation({ id: "op", v: OPERATION_VERSION + 1 })).toEqual({
      status: "too-new",
      version: OPERATION_VERSION + 1,
    });
  });

  test("rejects non-objects and malformed versions", () => {
    for (const raw of [null, undefined, "op", 1, []]) {
      expect(upcastOperation(raw).status).toBe("invalid");
    }
    for (const v of [0, -1, 1.5, "1", null, Number.NaN]) {
      expect(upcastOperation({ id: "op", v }).status).toBe("invalid");
    }
  });

  test("throws when the registry has a gap", () => {
    expect(() =>
      upcastOperation(
        { id: "op" },
        { upcasters: { 1: fakeUpcasters[1]! }, version: 3 },
      ),
    ).toThrow("Missing sync operation upcaster from version 2");
  });
});

describe("operation registry", () => {
  test("has an upcaster for every version below the current one", () => {
    for (let version = 1; version < OPERATION_VERSION; version += 1) {
      expect(OPERATION_UPCASTERS[version]).toBeFunction();
    }
    expect(
      Object.keys(OPERATION_UPCASTERS)
        .map(Number)
        .every((version) => version >= 1 && version < OPERATION_VERSION),
    ).toBe(true);
  });

  test("operationVersion defaults to 1", () => {
    expect(operationVersion({ id: "op" })).toBe(1);
    expect(operationVersion({ id: "op", v: 2 })).toBe(2);
    expect(operationVersion({ id: "op", v: "2" })).toBeNull();
  });
});
