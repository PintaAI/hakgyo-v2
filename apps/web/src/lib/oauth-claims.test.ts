import { describe, expect, test } from "bun:test";

import { getRequestedUserInfoClaims } from "./oauth-claims";

describe("getRequestedUserInfoClaims", () => {
  test("returns requested userinfo claim names", () => {
    expect(
      getRequestedUserInfoClaims(
        JSON.stringify({ userinfo: { email: null, locale: null } }),
      ),
    ).toEqual(["email", "locale"]);
  });

  test("ignores malformed and unrelated claims", () => {
    expect(getRequestedUserInfoClaims("invalid-json")).toEqual([]);
    expect(
      getRequestedUserInfoClaims(JSON.stringify({ id_token: { email: null } })),
    ).toEqual([]);
  });
});
