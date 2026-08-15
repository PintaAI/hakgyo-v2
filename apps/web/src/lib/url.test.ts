import { describe, expect, test } from "bun:test";

import { getUrlPathname } from "./url";

describe("getUrlPathname", () => {
  test("reads relative and absolute URL paths without a deployment origin", () => {
    expect(getUrlPathname("/learn/courses?tab=active#lesson")).toBe(
      "/learn/courses",
    );
    expect(
      getUrlPathname(
        "https://another-domain.example/api/profile-images/user/a",
      ),
    ).toBe("/api/profile-images/user/a");
  });

  test("rejects values that are neither absolute nor root-relative URLs", () => {
    expect(getUrlPathname("learn/courses")).toBeNull();
  });
});
