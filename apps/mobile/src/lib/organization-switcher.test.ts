import { describe, expect, test } from "bun:test";

import { getOrganizationSwitcherOptions } from "./organization-switcher";

const hakgyo = {
  organizationId: null,
  name: "Hakgyo",
  logoUrl: null,
  isThemed: false,
};

const academy = {
  organizationId: "academy",
  name: "Hakgyo Academy",
  logoUrl: null,
  isThemed: true,
};

describe("getOrganizationSwitcherOptions", () => {
  test("keeps the active fallback visible while organizations are unavailable", () => {
    expect(getOrganizationSwitcherOptions(hakgyo, [])).toEqual([hakgyo]);
  });

  test("does not duplicate an active organization already in the list", () => {
    expect(getOrganizationSwitcherOptions(academy, [academy])).toEqual([
      academy,
    ]);
  });

  test("replaces the fallback once real organizations are available", () => {
    expect(getOrganizationSwitcherOptions(hakgyo, [academy])).toEqual([
      academy,
    ]);
  });

  test("keeps a route-scoped active organization visible when it is absent", () => {
    expect(getOrganizationSwitcherOptions(academy, [])).toEqual([academy]);
  });
});
