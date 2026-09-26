import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

function describeCause(cause: unknown) {
  // tRPC wraps non-Error causes, so anything else carries no useful detail.
  if (!(cause instanceof Error)) return undefined;
  return {
    name: cause.name,
    code: "code" in cause ? cause.code : undefined,
    message: cause.message,
    stack: cause.stack,
  };
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, type, error }) => {
      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
        return;
      }
      // Production: log server faults only. Expected client errors
      // (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, CONFLICT, ...) are
      // part of normal traffic. Never log inputs: they may hold user content.
      if (getHTTPStatusCodeFromError(error) < 500) return;
      console.error("tRPC server error", {
        path: path ?? "<no-path>",
        type,
        code: error.code,
        message: error.message,
        cause: describeCause(error.cause),
      });
    },
  });

export { handler as GET, handler as POST };
