import { describe, expect, test } from "bun:test";

import {
  getPostSignInPath,
  getSafeRedirectPath,
  getWorkspaceFallback,
  getWorkspaceRoute,
  isOrganizationRole,
  isProtectedRoute,
} from "./access";

describe("route access", () => {
  test("identifies protected route segments without matching similar names", () => {
    expect(isProtectedRoute("/learn/courses")).toBe(true);
    expect(isProtectedRoute("/workspace/org-1/dashboard")).toBe(true);
    expect(isProtectedRoute("/invite/token.with.dot")).toBe(true);
    expect(isProtectedRoute("/learning-resources")).toBe(false);
    expect(isProtectedRoute("/catalog")).toBe(false);
  });

  test("maps restricted workspace sections to manager roles", () => {
    expect(getWorkspaceRoute("/workspace/org-1/settings/general")).toEqual({
      organizationId: "org-1",
      allowedRoles: ["OWNER", "ADMIN"],
    });
    expect(getWorkspaceRoute("/workspace/org-1/courses")).toEqual({
      organizationId: "org-1",
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
    });
  });

  test("provides role-specific workspace destinations", () => {
    expect(getWorkspaceFallback("org-1", "OWNER")).toBe(
      "/workspace/org-1/dashboard",
    );
    expect(getWorkspaceFallback("org-1", "TEACHER")).toBe(
      "/workspace/org-1/courses",
    );
  });

  test("only accepts same-origin relative redirect paths", () => {
    expect(getSafeRedirectPath("/learn/courses?tab=active")).toBe(
      "/learn/courses?tab=active",
    );
    expect(getSafeRedirectPath("https://example.com")).toBeNull();
    expect(getSafeRedirectPath("//example.com")).toBeNull();
    expect(getSafeRedirectPath("/\\example.com")).toBeNull();
    expect(getSafeRedirectPath("/%5Cexample.com")).toBeNull();
    expect(getSafeRedirectPath("/learn/\nexample")).toBeNull();
    expect(getSafeRedirectPath("/learn/../catalog")).toBe("/catalog");
    expect(getSafeRedirectPath("/account", ["/account"])).toBeNull();
    expect(getSafeRedirectPath(`/learn/${"x".repeat(4096)}`)).toBeNull();
    expect(getPostSignInPath("https://example.com")).toBe("/auth/continue");
  });

  test("only accepts known organization roles", () => {
    expect(isOrganizationRole("OWNER")).toBe(true);
    expect(isOrganizationRole("TEACHER")).toBe(true);
    expect(isOrganizationRole("STUDENT")).toBe(false);
    expect(isOrganizationRole(null)).toBe(false);
  });
});
