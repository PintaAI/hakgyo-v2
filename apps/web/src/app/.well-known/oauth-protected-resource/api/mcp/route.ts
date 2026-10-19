import { auth } from "~/server/better-auth";
import { guardRoute } from "~/server/maintenance";

// OAuth metadata for MCP clients; unavailable with the rest of the API in
// `full` maintenance.
export const GET = guardRoute("read", auth.handler);
