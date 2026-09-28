import { requireMcpAuth } from "@better-auth/mcp";

import { auth } from "~/server/better-auth";
import { isActiveUserId } from "~/server/better-auth/active-user";
import { createMcpAuthInfo, requireMcpUserId } from "~/server/mcp/auth";
import { mcpResource, mcpScope } from "~/server/mcp/config";
import { mcpHandler } from "~/server/mcp/server";
import { validateMcpRequestBoundary } from "~/server/mcp/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const authenticatedHandler = requireMcpAuth(
  auth,
  async (request, claims) => {
    const authInfo = createMcpAuthInfo(request, claims);
    // Access tokens are self-contained JWTs, so a token issued before the
    // account was suspended or deleted still verifies until it expires.
    if (!(await isActiveUserId(requireMcpUserId(authInfo)))) {
      return new Response("This account is not active", {
        status: 401,
        headers: {
          "WWW-Authenticate":
            'Bearer error="invalid_token", error_description="This account is not active"',
        },
      });
    }
    return mcpHandler.fetch(request, { authInfo });
  },
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
