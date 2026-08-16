import { withMcpAuth } from "mcp-handler";

import { verifyMcpToken } from "~/server/mcp/auth";
import {
  mcpPublicOrigin,
  mcpResource,
  mcpResourceMetadataPath,
  mcpScope,
} from "~/server/mcp/config";
import { mcpHandler } from "~/server/mcp/server";
import { validateMcpRequestBoundary } from "~/server/mcp/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const authenticatedHandler = withMcpAuth(mcpHandler, verifyMcpToken, {
  required: true,
  requiredScopes: [mcpScope],
  resourceMetadataPath: mcpResourceMetadataPath,
  resourceUrl: mcpPublicOrigin,
});

async function handler(request: Request) {
  const boundaryError = validateMcpRequestBoundary(request, mcpResource);
  if (boundaryError) return new Response(boundaryError, { status: 403 });

  return authenticatedHandler(request);
}

export { handler as GET, handler as POST };
