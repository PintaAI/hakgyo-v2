import { describe, expect, test } from "bun:test";

import { validateMcpRequestBoundary } from "./security";

const resource = "https://hakgyo.example/api/mcp";

describe("validateMcpRequestBoundary", () => {
  test("accepts the canonical host without a browser origin", () => {
    const request = new Request(resource, { method: "POST" });
    expect(validateMcpRequestBoundary(request, resource)).toBeNull();
  });

  test("accepts the canonical browser origin", () => {
    const request = new Request(resource, {
      headers: { origin: "https://hakgyo.example" },
      method: "POST",
    });
    expect(validateMcpRequestBoundary(request, resource)).toBeNull();
  });

  test("accepts the canonical forwarded host from the deployment proxy", () => {
    const request = new Request("http://localhost:3000/api/mcp", {
      headers: { "x-forwarded-host": "hakgyo.example" },
      method: "POST",
    });
    expect(validateMcpRequestBoundary(request, resource)).toBeNull();
  });

  test("rejects another host", () => {
    const request = new Request("https://attacker.example/api/mcp", {
      method: "POST",
    });
    expect(validateMcpRequestBoundary(request, resource)).toBe("Invalid host");
  });

  test("rejects another browser origin", () => {
    const request = new Request(resource, {
      headers: { origin: "https://attacker.example" },
      method: "POST",
    });
    expect(validateMcpRequestBoundary(request, resource)).toBe(
      "Invalid origin",
    );
  });
});
