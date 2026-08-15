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
    expect(isProtectedRoute("/docs/courses-id")).toBe(true);
    expect(isProtectedRoute("/workspace/acme-school/dashboard")).toBe(true);
    expect(isProtectedRoute("/invite/token.with.dot")).toBe(true);
    expect(isProtectedRoute("/learning-resources")).toBe(false);
    expect(isProtectedRoute("/catalog")).toBe(false);
  });

  test("maps restricted workspace sections to manager roles", () => {
    expect(
      getWorkspaceRoute("/workspace/acme-school/settings/general"),
    ).toEqual({
      organizationSlug: "acme-school",
      allowedRoles: ["OWNER", "ADMIN"],
    });
    expect(getWorkspaceRoute("/workspace/acme-school/courses")).toEqual({
      organizationSlug: "acme-school",
      allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
    });
  });

  test("provides role-specific workspace destinations", () => {
    expect(getWorkspaceFallback("acme-school", "OWNER")).toBe(
      "/workspace/acme-school/dashboard",
    );
    expect(getWorkspaceFallback("acme-school", "TEACHER")).toBe(
      "/workspace/acme-school/courses",
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
    expect(getSafeRedirectPath("/catalog", ["/catalog"])).toBeNull();
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
