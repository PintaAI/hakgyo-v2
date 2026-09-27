import { describe, expect, test } from "bun:test";

import {
  androidCourseIntent,
  appCourseDeepLink,
  appHandoffPath,
  detectHandoffPlatform,
} from "~/lib/mobile-app";

describe("mobile app links", () => {
  test("builds the handoff page and deep link for a course", () => {
    expect(appHandoffPath("course 1")).toBe("/open/courses/course%201");
    expect(appCourseDeepLink("course 1")).toBe("hakgyo://courses/course%201");
  });

  test("builds an Android intent that falls back to the web", () => {
    expect(
      androidCourseIntent(
        "c1",
        "https://hakgyo.test/open/courses/c1?app=missing",
      ),
    ).toBe(
      "intent://courses/c1#Intent;scheme=hakgyo;S.browser_fallback_url=https%3A%2F%2Fhakgyo.test%2Fopen%2Fcourses%2Fc1%3Fapp%3Dmissing;end",
    );
  });

  test("detects the handoff platform", () => {
    expect(
      detectHandoffPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8)"),
    ).toBe("android");
    expect(
      detectHandoffPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      ),
    ).toBe("ios");
    expect(
      detectHandoffPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        5,
      ),
    ).toBe("ios");
    expect(
      detectHandoffPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    ).toBe("desktop");
    expect(
      detectHandoffPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
    ).toBe("desktop");
  });
});
