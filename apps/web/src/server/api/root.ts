import { lazy } from "@trpc/server";

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { db } from "~/server/db";
import { createRequestCache } from "~/server/request-cache";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here. They load
 * lazily: a cold start evaluates only the routers (with their input schemas
 * and services) that the request actually calls.
 */
export const appRouter = createTRPCRouter({
  account: lazy(() =>
    import("~/server/api/routers/account").then((m) => m.accountRouter),
  ),
  analytics: lazy(() =>
    import("~/server/api/routers/analytics").then((m) => m.analyticsRouter),
  ),
  assessment: lazy(() =>
    import("~/server/api/routers/assessment").then((m) => m.assessmentRouter),
  ),
  assessmentEvent: lazy(() =>
    import("~/server/api/routers/assessment-event").then(
      (m) => m.assessmentEventRouter,
    ),
  ),
  assessmentImport: lazy(() =>
    import("~/server/api/routers/assessment-import").then(
      (m) => m.assessmentImportRouter,
    ),
  ),
  brand: lazy(() =>
    import("~/server/api/routers/brand").then((m) => m.brandRouter),
  ),
  cohort: lazy(() =>
    import("~/server/api/routers/cohort").then((m) => m.cohortRouter),
  ),
  content: lazy(() =>
    import("~/server/api/routers/content").then((m) => m.contentRouter),
  ),
  course: lazy(() =>
    import("~/server/api/routers/course").then((m) => m.courseRouter),
  ),
  enrollment: lazy(() =>
    import("~/server/api/routers/enrollment").then((m) => m.enrollmentRouter),
  ),
  gamification: lazy(() =>
    import("~/server/api/routers/gamification").then(
      (m) => m.gamificationRouter,
    ),
  ),
  learning: lazy(() =>
    import("~/server/api/routers/learning").then((m) => m.learningRouter),
  ),
  mobileRelease: lazy(() =>
    import("~/server/api/routers/mobile-release").then(
      (m) => m.mobileReleaseRouter,
    ),
  ),
  mobileSyncV2: lazy(() =>
    import("~/server/api/routers/mobile-sync-v2").then(
      (m) => m.mobileSyncV2Router,
    ),
  ),
  invite: lazy(() =>
    import("~/server/api/routers/invite").then((m) => m.inviteRouter),
  ),
  notification: lazy(() =>
    import("~/server/api/routers/notification").then(
      (m) => m.notificationRouter,
    ),
  ),
  organization: lazy(() =>
    import("~/server/api/routers/organization").then(
      (m) => m.organizationRouter,
    ),
  ),
  organizationLanding: lazy(() =>
    import("~/server/api/routers/organization-landing").then(
      (m) => m.organizationLandingRouter,
    ),
  ),
  payment: lazy(() =>
    import("~/server/api/routers/payment").then((m) => m.paymentRouter),
  ),
  pdfBook: lazy(() =>
    import("~/server/api/routers/pdf-book").then((m) => m.pdfBookRouter),
  ),
  practice: lazy(() =>
    import("~/server/api/routers/practice").then((m) => m.practiceRouter),
  ),
  publicQuiz: lazy(() =>
    import("~/server/api/routers/public-quiz").then((m) => m.publicQuizRouter),
  ),
  storage: lazy(() =>
    import("~/server/api/routers/storage").then((m) => m.storageRouter),
  ),
  superadmin: lazy(() =>
    import("~/server/api/routers/superadmin").then((m) => m.superadminRouter),
  ),
  whatsapp: lazy(() =>
    import("~/server/api/routers/whatsapp").then((m) => m.whatsappRouter),
  ),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Loads every lazy router. Calls load routers on demand; code that reads
 * procedure definitions directly (the MCP tool schemas) must load them first.
 */
export async function loadAllRouters() {
  await Promise.all(
    Object.values(appRouter._def.lazy).map((router) => router.load()),
  );
}

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
    requestCache: createRequestCache(),
  });
