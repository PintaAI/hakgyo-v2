import { describe, expect, test } from "bun:test";

import { isTransientTransactionError, withTransactionRetry } from "./db-retry";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the promise to reject");
}

const adapterError = (code: string, sqlState: string) => ({
  code,
  meta: { driverAdapterError: { cause: { originalCode: sqlState } } },
});

describe("isTransientTransactionError", () => {
  test("detects serialization failures and deadlocks", () => {
    expect(isTransientTransactionError({ code: "P2034" })).toBe(true);
    expect(isTransientTransactionError(adapterError("P2010", "40001"))).toBe(
      true,
    );
    expect(isTransientTransactionError(adapterError("P2039", "40P01"))).toBe(
      true,
    );
  });

  test("ignores other errors", () => {
    expect(isTransientTransactionError({ code: "P2002" })).toBe(false);
    expect(isTransientTransactionError(adapterError("P2010", "23505"))).toBe(
      false,
    );
    expect(isTransientTransactionError(new Error("boom"))).toBe(false);
  });
});

describe("withTransactionRetry", () => {
  test("retries transient failures until success", async () => {
    let calls = 0;
    const result = await withTransactionRetry(async () => {
      calls += 1;
      if (calls < 3) throw prismaError("P2034");
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  test("rethrows non-transient errors immediately", async () => {
    let calls = 0;
    const error = await rejection(
      withTransactionRetry(async () => {
        calls += 1;
        throw prismaError("P2002");
      }),
    );
    expect(error).toMatchObject({ code: "P2002" });
    expect(calls).toBe(1);
  });

  test("gives up after the retry budget", async () => {
    let calls = 0;
    const error = await rejection(
      withTransactionRetry(
        async () => {
          calls += 1;
          throw prismaError("P2034");
        },
        { retries: 2 },
      ),
    );
    expect(error).toMatchObject({ code: "P2034" });
    expect(calls).toBe(3);
  });
});
