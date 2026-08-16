import { describe, expect, test } from "bun:test";

import { hasAuthenticatedActor } from "./trpc-principal";

describe("tRPC actor authentication", () => {
  test("accepts an explicit MCP actor", () => {
    expect(
      hasAuthenticatedActor({ actorKind: "mcp", actorUserId: "mcp-user" }),
    ).toBe(true);
  });

  test("requires a browser actor to match the session", () => {
    expect(
      hasAuthenticatedActor({
        actorKind: "session",
        actorUserId: "claimed-user",
        sessionUserId: "session-user",
      }),
    ).toBe(false);
    expect(
      hasAuthenticatedActor({
        actorKind: "session",
        actorUserId: "session-user",
        sessionUserId: "session-user",
      }),
    ).toBe(true);
  });
});
