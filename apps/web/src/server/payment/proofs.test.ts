import { describe, expect, test } from "bun:test";
import type { Prisma } from "../../../generated/prisma/client";
import { createPaymentProofKey } from "~/lib/payments/payment";
import { submitPaymentProofUpload } from "./proofs";

const now = new Date("2026-10-02T00:00:00Z");

async function submissionError(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error("Expected submission to fail");
  } catch (error) {
    return error;
  }
}

function fixture(status: "PAID" | "SUBMITTED" = "SUBMITTED") {
  const key = createPaymentProofKey("payment", 100, "image/png");
  const payment = {
    id: "payment",
    cohortId: "cohort",
    userId: "learner",
    reference: "HKG-TEST",
    status: status as string,
    proofKey: key,
  };
  const objects = new Set([key]);
  const removed: string[] = [];
  const validated: string[] = [];
  let tail = Promise.resolve();
  const tx = {
    $executeRaw: async () => 1,
    payment: {
      findUnique: async () => ({ ...payment }),
      findUniqueOrThrow: async () => ({ ...payment }),
      update: async ({ data }: { data: Partial<typeof payment> }) =>
        Object.assign(payment, data),
      count: async () => 0,
    },
  } as unknown as Prisma.TransactionClient;
  const db = {
    payment: {
      findFirst: async ({ where }: { where: { userId: string } }) =>
        where.userId === payment.userId ? { ...payment } : null,
    },
    $transaction: (
      operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) => {
      const result = tail.then(async () => {
        const snapshot = { ...payment };
        try {
          return await operation(tx);
        } catch (error) {
          Object.assign(payment, snapshot);
          throw error;
        }
      });
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  } as unknown as Prisma.DefaultPrismaClient;
  const storage = {
    validateImageObject: async (objectKey: string) => {
      validated.push(objectKey);
      if (!objects.has(objectKey)) throw new Error("Object was removed");
    },
    removeObject: async (objectKey: string) => {
      removed.push(objectKey);
      objects.delete(objectKey);
    },
  };
  const submit = (proofKey = key, userId = "learner") =>
    submitPaymentProofUpload(
      db,
      {
        paymentId: "payment",
        userId,
        proofKey,
        payerName: null,
        payerNote: null,
        now,
      },
      storage,
    );
  return { key, payment, objects, removed, validated, storage, submit };
}

describe("payment proof storage", () => {
  test("keeps approved evidence after a delayed retry", async () => {
    const f = fixture("PAID");
    expect(await submissionError(f.submit())).toMatchObject({
      code: "CONFLICT",
    });
    expect(f.objects.has(f.payment.proofKey)).toBe(true);
    expect(f.removed).toEqual([]);
  });
  test("cleans a new unused upload when an approved payment rejects it", async () => {
    const f = fixture("PAID");
    const replacement = createPaymentProofKey("payment", 100, "image/png");
    f.objects.add(replacement);
    expect(await submissionError(f.submit(replacement))).toMatchObject({
      code: "CONFLICT",
    });
    expect(f.objects.has(f.key)).toBe(true);
    expect(f.objects.has(replacement)).toBe(false);
  });
  test("cleans replaced evidence after committing the new proof", async () => {
    const f = fixture();
    const replacement = createPaymentProofKey("payment", 100, "image/png");
    f.objects.add(replacement);
    await f.submit(replacement);
    expect(f.payment.proofKey).toBe(replacement);
    expect(f.objects.has(replacement)).toBe(true);
    expect(f.objects.has(f.key)).toBe(false);
  });
  test("rolls back an invalid replacement and preserves the previous evidence", async () => {
    const f = fixture();
    const replacement = createPaymentProofKey("payment", 100, "image/png");
    f.objects.add(replacement);
    f.storage.validateImageObject = async () => {
      throw new Error("Invalid proof");
    };
    expect(await submissionError(f.submit(replacement))).toMatchObject({
      message: "Invalid proof",
    });
    expect(f.payment.proofKey).toBe(f.key);
    expect(f.objects.has(f.key)).toBe(true);
    expect(f.objects.has(replacement)).toBe(false);
  });
  test("keeps the current proof when repeat validation fails", async () => {
    const f = fixture();
    f.storage.validateImageObject = async () => {
      throw new Error("Validation unavailable");
    };
    expect(await submissionError(f.submit())).toMatchObject({
      message: "Validation unavailable",
    });
    expect(f.objects.has(f.key)).toBe(true);
    expect(f.removed).toEqual([]);
  });
  test("does not touch evidence when another learner tries to submit it", async () => {
    const f = fixture();
    expect(
      await submissionError(f.submit(f.key, "another-learner")),
    ).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(f.objects.has(f.key)).toBe(true);
    expect(f.validated).toEqual([]);
    expect(f.removed).toEqual([]);
  });
  test("concurrent proof changes leave the current object available", async () => {
    const f = fixture();
    const replacement = createPaymentProofKey("payment", 100, "image/png");
    f.objects.add(replacement);
    await Promise.allSettled([f.submit(replacement), f.submit(f.key)]);
    expect(f.objects.has(f.payment.proofKey)).toBe(true);
  });
});
