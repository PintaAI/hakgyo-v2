import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";

/** Row locks and the edit rule shared by the bank services (bank, images, audio). */

type Transaction = Prisma.TransactionClient;

/** Locks a bank question row for the rest of the transaction; NOT_FOUND when it doesn't exist. */
export async function lockQuestion(tx: Transaction, questionId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BankQuestion" WHERE "id" = ${questionId} FOR UPDATE
  `;
  if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
}

export async function lockGroup(tx: Transaction, groupId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BankGroup" WHERE "id" = ${groupId} FOR UPDATE
  `;
  if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
}

/**
 * Records a content edit: a LIVE question goes back to REVIEW (the generator must not pick an
 * unreviewed change), and `updatedAt` moves for edits made on options or the group.
 */
export async function markBankQuestionsEdited(
  tx: Transaction,
  questionIds: readonly string[],
) {
  if (!questionIds.length) return;
  const ids = [...questionIds];
  await tx.bankQuestion.updateMany({
    where: { id: { in: ids }, status: "LIVE" },
    data: { status: "REVIEW" },
  });
  await tx.bankQuestion.updateMany({
    where: { id: { in: ids } },
    data: { updatedAt: new Date() },
  });
}
