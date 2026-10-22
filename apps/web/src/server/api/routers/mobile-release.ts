import { releaseNotesAfter } from "@hakgyo/shared/release-notes";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const mobileReleaseRouter = createTRPCRouter({
  /**
   * What a newer store build adds, for the mobile update gate of a binary that
   * no EAS Update can fix (docs/mobile-releases.md). Public and not gated on
   * the sync protocol, because the clients asking are the outdated ones.
   */
  storeNotes: publicProcedure
    .input(z.object({ version: z.string().min(1).max(32) }))
    .query(({ input }) => releaseNotesAfter(input.version)),
});
