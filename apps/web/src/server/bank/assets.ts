import { collectMaterialAssetIds } from "~/lib/blocknote/material-assets";
import type { Prisma } from "../../../generated/prisma/client";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";

/**
 * Bank media are files of the Hakgyo system organization, referenced from bank content (BlockNote
 * JSON) rather than through a link table. These helpers keep them safe to delete and readable.
 */

type Client = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

/**
 * Whether any bank question, option or group still shows the file. Content is JSON, so it is
 * searched as text; the bank is small enough for that.
 */
export async function bankContentUses(db: Client, assetId: string) {
  const pattern = `%${assetId}%`;
  const [row] = await db.$queryRaw<[{ used: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM "BankQuestion"
      WHERE "prompt"::text LIKE ${pattern} OR "explanation"::text LIKE ${pattern}
      UNION ALL
      SELECT 1 FROM "BankOption" WHERE "content"::text LIKE ${pattern}
      UNION ALL
      SELECT 1 FROM "BankGroup"
      WHERE "instructions"::text LIKE ${pattern} OR "stimulus"::text LIKE ${pattern}
    ) AS "used"
  `;
  return row.used;
}

/**
 * Marks the system-organization files these documents show as shared, so every superadmin (and
 * later every set that copies the content) can load them. Uploads stay private until bank
 * content uses them, so starter-course files of the same organization are not shared.
 */
export async function shareBankMedia(
  db: Client,
  documents: readonly unknown[],
) {
  const ids = new Set<string>();
  for (const document of documents) {
    for (const id of collectMaterialAssetIds(document)) ids.add(id);
  }
  if (!ids.size) return;
  await db.asset.updateMany({
    where: {
      id: { in: [...ids] },
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      sharedAt: null,
    },
    data: { sharedAt: new Date() },
  });
}
