import { accountRouter } from "~/server/api/routers/account";
import { assessmentRouter } from "~/server/api/routers/assessment";
import { cohortRouter } from "~/server/api/routers/cohort";
import { contentRouter } from "~/server/api/routers/content";
import { courseRouter } from "~/server/api/routers/course";
import { enrollmentRouter } from "~/server/api/routers/enrollment";
import { learningRouter } from "~/server/api/routers/learning";
import { organizationRouter } from "~/server/api/routers/organization";
import { storageRouter } from "~/server/api/routers/storage";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { db } from "~/server/db";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  account: accountRouter,
  assessment: assessmentRouter,
  cohort: cohortRouter,
  content: contentRouter,
  course: courseRouter,
  enrollment: enrollmentRouter,
  learning: learningRouter,
  organization: organizationRouter,
  storage: storageRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 */
export const createCaller = createCallerFactory(appRouter);

export const createMcpCaller = (actorUserId: string) =>
  createCaller({
    actorKind: "mcp",
    actorUserId,
    db,
    headers: new Headers(),
    session: null,
  });
