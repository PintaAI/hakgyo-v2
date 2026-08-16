import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

import { mcpIssuer, mcpResource } from "~/server/mcp/config";

export const GET = protectedResourceHandler({
  authServerUrls: [mcpIssuer],
  resourceUrl: mcpResource,
});
export const OPTIONS = metadataCorsOptionsRequestHandler();
