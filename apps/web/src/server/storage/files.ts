import type { Prisma } from "../../../generated/prisma/client";
import { pageArgs, pageResult } from "~/server/api/pagination";
import { requireOrganizationPermission } from "~/server/authorization";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export type OrganizationFileKind = "image" | "audio" | "all";

/**
 * Lists the organization's uploaded files, newest first. Owners and admins see
 * every file; teachers see their own uploads, matching who may download them.
 * PDF book page images are left out.
 */
export async function listOrganizationFiles(
  db: DatabaseClient,
  input: {
    actorUserId: string;
    organizationId: string;
    kind: OrganizationFileKind;
    query?: string;
    limit: number;
    cursor?: string;
  },
) {
  const membership = await requireOrganizationPermission({
    organizationId: input.organizationId,
    permission: "asset.create",
    userId: input.actorUserId,
  });
  const query = input.query?.trim();
  const rows = await db.asset.findMany({
    where: {
      organizationId: input.organizationId,
      confirmedAt: { not: null },
      deletedAt: null,
      pdfBookPage: { is: null },
      pdfBookThumbnail: { is: null },
      ...(membership.role === "TEACHER"
        ? { uploadedByUserId: input.actorUserId }
        : {}),
      ...(input.kind === "all"
        ? {}
        : { contentType: { startsWith: `${input.kind}/` } }),
      ...(query
        ? { fileName: { contains: query, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...pageArgs(input),
    select: {
      id: true,
      fileName: true,
      contentType: true,
      size: true,
      createdAt: true,
    },
  });
  return pageResult(rows, input.limit);
}
