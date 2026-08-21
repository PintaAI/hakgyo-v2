import { describe, expect, test } from "bun:test";

import { createMcpAuthInfo, requireMcpUserId } from "./auth";
import { mcpResource } from "./config";

describe("MCP auth mapping", () => {
  test("maps verified OAuth claims to SDK auth info", () => {
    const request = new Request(mcpResource, {
      headers: { authorization: "Bearer access-token" },
    });

    const authInfo = createMcpAuthInfo(request, {
      azp: "https://client.example/metadata.json",
      exp: 2_000_000_000,
      scope: "openid hakgyo:mcp",
      sub: "user-1",
    });

    expect(authInfo).toEqual({
      token: "access-token",
      clientId: "https://client.example/metadata.json",
      scopes: ["openid", "hakgyo:mcp"],
      expiresAt: 2_000_000_000,
      resource: new URL(mcpResource),
      extra: { userId: "user-1" },
    });
    expect(requireMcpUserId(authInfo)).toBe("user-1");
  });

  test("rejects verified tokens without delegated user claims", () => {
    const request = new Request(mcpResource, {
      headers: { authorization: "Bearer access-token" },
    });

    expect(() =>
      createMcpAuthInfo(request, {
        azp: "https://client.example/metadata.json",
        exp: 2_000_000_000,
        scope: ["hakgyo:mcp"],
      }),
    ).toThrow("Verified MCP token is missing required claims");
  });
});
