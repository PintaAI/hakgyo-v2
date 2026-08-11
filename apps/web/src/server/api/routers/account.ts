import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const accountRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ctx.session.user),
});
