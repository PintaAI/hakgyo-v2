import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { createAuthClient } from "better-auth/client";
import type { AuthInfo } from "@modelcontextprotocol/server";

import { env } from "~/env";
import { auth } from "~/server/better-auth";
import { mcpIssuer, mcpResource, mcpScope } from "./config";

const resourceClient = createAuthClient({
  baseURL: env.APP_URL,
  plugins: [oauthProviderResourceClient(auth)],
});

function tokenScopes(scope: unknown) {
  if (typeof scope === "string") return scope.split(" ").filter(Boolean);
  if (Array.isArray(scope) && scope.every((item) => typeof item === "string")) {
    return scope;
  }
  return [];
}

export async function verifyMcpToken(
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  try {
    const payload = await resourceClient.verifyAccessTokenRequest(request, {
      verifyOptions: {
        audience: mcpResource,
        issuer: mcpIssuer,
      },
      jwksUrl: `${mcpIssuer}/jwks`,
      scopes: [mcpScope],
    });
    const userId = typeof payload.sub === "string" ? payload.sub : undefined;
    const clientId = typeof payload.azp === "string" ? payload.azp : undefined;
    const expiresAt = typeof payload.exp === "number" ? payload.exp : undefined;

    if (!userId || !clientId || !expiresAt) return undefined;

    return {
      token: bearerToken,
      clientId,
      scopes: tokenScopes(payload.scope),
      expiresAt,
      resource: new URL(mcpResource),
      extra: { userId },
    };
  } catch (error) {
    if (env.NODE_ENV === "development") {
      console.error(
        "MCP token verification failed",
        error instanceof Error ? error.message : "Unknown verification error",
      );
    }
    return undefined;
  }
}

export function requireMcpUserId(authInfo: AuthInfo | undefined) {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Authenticated Hakgyo user is required");
  }
  return userId;
}
