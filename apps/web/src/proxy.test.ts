import { describe, expect, test } from "bun:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";

import { config, proxy } from "./proxy";

const matchesProxy = (url: string) =>
  unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });

describe("proxy matcher", () => {
  test("matches protected dynamic paths containing dots", () => {
    expect(matchesProxy("https://hakgyo.test/invite/token.with.dot")).toBe(
      false,
    );
    expect(
      matchesProxy("https://hakgyo.test/workspace/org.with.dot/courses"),
    ).toBe(true);
    expect(matchesProxy("https://hakgyo.test/onboarding")).toBe(true);
    expect(matchesProxy("https://hakgyo.test/organizations/new")).toBe(true);
  });

  test("skips API and framework asset paths", () => {
    expect(matchesProxy("https://hakgyo.test/api/trpc/course.list")).toBe(
      false,
    );
    expect(matchesProxy("https://hakgyo.test/_next/static/chunk.js")).toBe(
      false,
    );
    expect(matchesProxy("https://hakgyo.test/favicon.ico")).toBe(false);
    expect(matchesProxy("https://hakgyo.test/catalog")).toBe(false);
  });

  test("redirects missing cookies but leaves validation to protected routes", () => {
    const missingCookie = proxy(
      new NextRequest("https://hakgyo.test/workspace/org-1/courses"),
    );
    expect(missingCookie.status).toBe(307);
    expect(missingCookie.headers.get("location")).toBe(
      "https://hakgyo.test/auth?redirectTo=%2Fworkspace%2Forg-1%2Fcourses",
    );

    const requestWithCookie = new NextRequest(
      "https://hakgyo.test/workspace/org-1/courses",
      { headers: { cookie: "better-auth.session_token=optimistic-only" } },
    );
    expect(proxy(requestWithCookie).headers.get("x-middleware-next")).toBe("1");
  });
});
