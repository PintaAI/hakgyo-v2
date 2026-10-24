import { z } from "zod";

import { findBlockNoteDocumentIssues } from "~/lib/blocknote/document-validation";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * Editor JSON as sent by the client. SuperJSON keeps `undefined`, which
 * BlockNote puts in arrays (a table's `columnWidths` is `[undefined, …]`
 * until a column is resized) and Prisma rejects, so values go through a JSON
 * round trip like `JSON.stringify` would apply.
 */
export const serializedJson = z.unknown().transform(toPrismaJsonValue);

export const blockNoteDocument = z
  .array(z.record(z.string(), z.unknown()))
  .min(1)
  .max(5000)
  .superRefine((document, ctx) => {
    for (const issue of findBlockNoteDocumentIssues(document)) {
      ctx.addIssue({ code: "custom", ...issue });
    }
  })
  .transform(toPrismaJsonValue);
