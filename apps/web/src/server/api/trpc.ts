/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/better-auth";
import type { Session } from "~/server/better-auth/config";
import { db } from "~/server/db";
import {
  createRequestCache,
  runWithRequestCache,
  type RequestCache,
} from "~/server/request-cache";
import { hasAuthenticatedActor } from "~/server/api/trpc-principal";
import { getSuperadminUser } from "~/server/authorization/superadmin";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  /** Pre-resolved session (RSC reuses the request-cached lookup). */
  authSession?: Session | null;
}) => {
  const authSession =
    opts.authSession !== undefined
      ? opts.authSession
      : await auth.api.getSession({ headers: opts.headers });
  const session =
    authSession && !authSession.user.suspendedAt && !authSession.user.deletedAt
      ? authSession
      : null;
  return {
    db,
    session,
    headers: opts.headers,
    actorKind: "session" as const,
    actorUserId: session?.user.id ?? null,
    requestCache: createRequestCache(),
  };
};

export type TRPCContext =
  | Awaited<ReturnType<typeof createTRPCContext>>
  | {
      actorKind: "mcp";
      actorUserId: string;
      db: typeof db;
      headers: Headers;
      session: null;
      requestCache: RequestCache;
    };

function isUpgradeRequiredCause(
  cause: unknown,
): cause is Error & { minProtocol: number } {
  return (
    cause instanceof Error &&
    cause.name === "UpgradeRequiredError" &&
    "minProtocol" in cause &&
    typeof cause.minProtocol === "number"
  );
}

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Mobile clients older than MIN_SYNC_PROTOCOL (see
        // `~/server/mobile/protocol`). Matched by name instead of an import,
        // which would make that module and this one depend on each other.
        upgradeRequired: isUpgradeRequiredCause(error.cause)
          ? { minProtocol: error.cause.minProtocol }
          : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

const SLOW_PROCEDURE_MS = 1_000;

/**
 * Binds the per-request read cache for queries (see `~/server/request-cache`) and logs procedures
 * in development or when they are slow.
 */
const timingMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();

  const result = await runWithRequestCache(
    type === "query" ? ctx.requestCache : undefined,
    () => next(),
  );

  const elapsed = Date.now() - start;
  if (t._config.isDev || elapsed >= SLOW_PROCEDURE_MS) {
    console.log(`[TRPC] ${path} took ${elapsed}ms to execute`);
  }

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (
      !ctx.actorUserId ||
      !hasAuthenticatedActor({
        actorKind: ctx.actorKind,
        actorUserId: ctx.actorUserId,
        sessionUserId: ctx.session?.user.id,
      })
    ) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        actorUserId: ctx.actorUserId,
      },
    });
  });

export const superadminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const user = await getSuperadminUser(ctx.actorUserId, ctx.session?.user);
    return next({ ctx: { superadmin: user } });
  },
);
