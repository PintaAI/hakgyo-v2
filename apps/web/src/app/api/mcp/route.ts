import { requireMcpAuth } from "@better-auth/mcp";

import { auth } from "~/server/better-auth";
import { createMcpAuthInfo } from "~/server/mcp/auth";
import { mcpResource, mcpScope } from "~/server/mcp/config";
import { mcpHandler } from "~/server/mcp/server";
import { validateMcpRequestBoundary } from "~/server/mcp/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const authenticatedHandler = requireMcpAuth(
  auth,
  (request, claims) =>
    mcpHandler.fetch(request, {
      authInfo: createMcpAuthInfo(request, claims),
    }),
  {
    resource: mcpResource,
    requiredScopes: [mcpScope],
  },
);

async function handler(request: Request) {
  const boundaryError = validateMcpRequestBoundary(request, mcpResource);
  if (boundaryError) return new Response(boundaryError, { status: 403 });

  return authenticatedHandler(request);
}

export { handler as POST };
