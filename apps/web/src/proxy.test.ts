import { describe, expect, test } from "bun:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { config } from "./proxy";

const matchesProxy = (url: string) =>
  unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });

describe("proxy matcher", () => {
  test("matches protected dynamic paths containing dots", () => {
    expect(matchesProxy("https://hakgyo.test/invite/token.with.dot")).toBe(
      true,
    );
    expect(
      matchesProxy("https://hakgyo.test/workspace/org.with.dot/courses"),
    ).toBe(true);
  });

  test("skips API and framework asset paths", () => {
    expect(matchesProxy("https://hakgyo.test/api/trpc/course.list")).toBe(
      false,
    );
    expect(matchesProxy("https://hakgyo.test/_next/static/chunk.js")).toBe(
      false,
    );
    expect(matchesProxy("https://hakgyo.test/favicon.ico")).toBe(false);
  });
});
