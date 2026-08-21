import type { AuthInfo } from "@modelcontextprotocol/server";

import { mcpResource } from "./config";

function tokenScopes(scope: unknown) {
  if (typeof scope === "string") return scope.split(" ").filter(Boolean);
  if (Array.isArray(scope) && scope.every((item) => typeof item === "string")) {
    return scope;
  }
  return [];
}

export function createMcpAuthInfo(
  request: Request,
  claims: { azp?: unknown; exp?: unknown; scope?: unknown; sub?: unknown },
): AuthInfo {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
  const userId = typeof claims.sub === "string" ? claims.sub : undefined;
  const clientId = typeof claims.azp === "string" ? claims.azp : undefined;
  const expiresAt = typeof claims.exp === "number" ? claims.exp : undefined;

  if (!token || !userId || !clientId || !expiresAt) {
    throw new Error("Verified MCP token is missing required claims");
  }

  return {
    token,
    clientId,
    scopes: tokenScopes(claims.scope),
    expiresAt,
    resource: new URL(mcpResource),
    extra: { userId },
  };
}

export function requireMcpUserId(authInfo: AuthInfo | undefined) {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Authenticated Hakgyo user is required");
  }
  return userId;
}
