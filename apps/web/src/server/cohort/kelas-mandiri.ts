import { TRPCError } from "@trpc/server";

import { Prisma } from "../../../generated/prisma/client";
import { kelasMandiriData } from "~/server/enrollment/default-cohort";

// A curriculum's Kelas Mandiri is a normal class with two rules of its own:
// it has no dates, and a curriculum has at most one. Both are checked here
// for every caller (web, MCP); the forms only mirror them.

export const kelasMandiriExistsMessage =
  "Kurikulum ini sudah punya Kelas Mandiri. Satu kurikulum hanya punya satu Kelas Mandiri; buka yang sudah ada di tab Kelas.";

/** Rejects start and end dates, which a Kelas Mandiri does not have. */
export function assertKelasMandiriFields(fields: {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}) {
  if (fields.startsAt || fields.endsAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Kelas Mandiri tidak punya tanggal mulai atau selesai. Murid belajar kapan saja.",
    });
  }
}

/**
 * Creates the course's Kelas Mandiri from the same row `ensureDefaultCohort`
 * makes (open, no join mode of its own, no staff), with the staff's own
 * fields on top. CONFLICT when the course already has one.
 */
export async function createKelasMandiri(
  db: Pick<Prisma.TransactionClient, "cohort">,
  course: { id: string; organizationId: string },
  fields: Omit<
    Prisma.CohortUncheckedCreateInput,
    "courseId" | "organizationId" | "defaultForCourseId" | "name"
  > & { name?: string },
) {
  assertKelasMandiriFields(fields);
  const base = kelasMandiriData(course);
  const name = fields.name?.trim();
  try {
    return await db.cohort.create({
      data: {
        ...base,
        ...fields,
        // An omitted field must not override the Kelas Mandiri defaults.
        status: fields.status ?? base.status,
        name: base.name,
        ...(name ? { name } : {}),
      },
    });
  } catch (error) {
    // The unique `defaultForCourseId` index allows one per course.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: kelasMandiriExistsMessage,
      });
    }
    throw error;
  }
}
