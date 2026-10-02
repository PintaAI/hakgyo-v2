import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { parsePaymentProofKey } from "~/lib/payments/payment";
import { lockPayment, submitPaymentProof } from "./lifecycle";

type Database = Pick<Prisma.DefaultPrismaClient, "$transaction" | "payment">;
type ProofInput = Parameters<typeof submitPaymentProof>[1];

export type PaymentProofStorage = {
  validateImageObject: (
    key: string,
    expected: { size: number; contentType: string },
    label: string,
  ) => Promise<void>;
  removeObject: (key: string, reason: string) => Promise<void>;
};

/** Check and remove an unreferenced object while excluding proof submissions. */
async function removeUnusedProof(
  db: Database,
  input: ProofInput,
  key: string,
  storage: PaymentProofStorage,
) {
  await db.$transaction(
    async (tx) => {
      const payment = await lockPayment(tx, input.paymentId);
      if (payment.userId === input.userId && payment.proofKey !== key) {
        await storage.removeObject(key, "unused payment proof");
      }
    },
    { timeout: 15_000 },
  );
}

/** Serialize validation and cleanup with all payment changes for this learner. */
export async function submitPaymentProofUpload(
  db: Database,
  input: ProofInput,
  storage: PaymentProofStorage,
) {
  const parsed = parsePaymentProofKey(input.proofKey, input.paymentId);
  if (!parsed) throw new TRPCError({ code: "BAD_REQUEST" });
  const owned = await db.payment.findFirst({
    where: { id: input.paymentId, userId: input.userId },
    select: { id: true },
  });
  if (!owned) throw new TRPCError({ code: "NOT_FOUND" });

  const result = await db
    .$transaction(
      async (tx) => {
        // This checks ownership and the transition and holds the learner/cohort lock.
        // Validation failures roll back the new proof reference before cleanup.
        const submitted = await submitPaymentProof(tx, input);
        await storage.validateImageObject(
          input.proofKey,
          parsed,
          "payment proof",
        );
        return submitted;
      },
      { timeout: 15_000 },
    )
    .catch(async (error: unknown) => {
      try {
        await removeUnusedProof(db, input, input.proofKey, storage);
      } catch (cleanupError) {
        console.error("Failed to clean unused payment proof", cleanupError);
      }
      throw error;
    });

  if (result.previousProofKey) {
    try {
      await removeUnusedProof(db, input, result.previousProofKey, storage);
    } catch (cleanupError) {
      console.error("Failed to clean replaced payment proof", cleanupError);
    }
  }
}
