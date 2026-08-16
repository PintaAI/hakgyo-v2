import { env } from "~/env";

export const mcpScope = "hakgyo:mcp";
export const mcpPublicOrigin = env.APP_URL;
export const mcpResource = `${env.APP_URL}/api/mcp`;
export const mcpIssuer = `${env.APP_URL}/api/auth`;
export const mcpResourceMetadataPath =
  "/.well-known/oauth-protected-resource/api/mcp";
