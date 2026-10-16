import { describe, expect, test } from "bun:test";

import { routeVerificationLink } from "./verification-link";

const base = "https://hakgyo.id/api/auth/verify-email?token=abc";

function callbackOf(url: string) {
  return new URL(url).searchParams.get("callbackURL");
}

describe("routeVerificationLink", () => {
  test("keeps the destination, including its query", () => {
    const url = `${base}&callbackURL=${encodeURIComponent("/invite/x?ref=a b&y=1")}`;
    const routed = routeVerificationLink(url);

    expect(callbackOf(routed)).toBe(
      `/auth/verified?redirectTo=${encodeURIComponent("/invite/x?ref=a%20b&y=1")}`,
    );
    expect(new URL(routed).searchParams.get("token")).toBe("abc");
  });

  test("drops the default and unsafe destinations", () => {
    for (const callback of ["/", "//evil.example", "https://evil.example/x"]) {
      const url = `${base}&callbackURL=${encodeURIComponent(callback)}`;
      expect(callbackOf(routeVerificationLink(url))).toBe("/auth/verified");
    }
    expect(callbackOf(routeVerificationLink(base))).toBe("/auth/verified");
  });

  test("sends app requests back to the app instead of a web page", () => {
    const url = `${base}&callbackURL=${encodeURIComponent("hakgyo:///")}`;
    const request = new Request("https://hakgyo.id/api/auth/sign-up/email", {
      headers: { "expo-origin": "hakgyo://" },
    });

    expect(callbackOf(routeVerificationLink(url, request))).toBe(
      "/auth/verified?app=1",
    );
  });
});
