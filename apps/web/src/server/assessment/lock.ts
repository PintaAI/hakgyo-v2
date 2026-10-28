import type { Prisma } from "../../../generated/prisma/client";

/** Locks an assessment row so layout changes (sections, groups, positions) run one at a time. */
export async function lockAssessment(
  tx: Prisma.TransactionClient,
  assessmentId: string,
) {
  await tx.$queryRaw`
    SELECT "id" FROM "Assessment" WHERE "id" = ${assessmentId} FOR UPDATE
  `;
}
