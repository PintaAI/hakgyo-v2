import { describe, expect, test } from "bun:test";
import { DEFAULT_ORGANIZATION_THEME } from "@hakgyo/shared";

import { resolveActiveBrand } from "./active-brand";

const defaultBrand = {
  organizationId: null,
  name: "Hakgyo",
  slug: null,
  logoUrl: null,
  theme: null,
  themeEnabled: false,
  isThemed: false,
  source: "default" as const,
};

function organization(organizationId: string, primary: string) {
  return {
    organizationId,
    name: organizationId,
    slug: organizationId,
    logoUrl: null,
    theme: { ...DEFAULT_ORGANIZATION_THEME, primary },
    themeEnabled: true,
    isThemed: true,
    source: "organization" as const,
  };
}

describe("resolveActiveBrand", () => {
  test("uses refreshed branding on a course detail route", () => {
    const current = organization("org-1", "#222222");
    const staleRoute = organization("org-1", "#111111");

    expect(
      resolveActiveBrand({
        availableOrganizations: [current],
        defaultBrand,
        routeBrand: staleRoute,
        selectedOrganizationId: "org-1",
      }).theme,
    ).toEqual(current.theme);
  });

  test("keeps the route organization when it differs from the selected one", () => {
    const selected = organization("org-1", "#111111");
    const route = organization("org-2", "#222222");

    expect(
      resolveActiveBrand({
        availableOrganizations: [selected, route],
        defaultBrand,
        routeBrand: route,
        selectedOrganizationId: "org-1",
      }).organizationId,
    ).toBe("org-2");
  });

  test("removes an old route theme when the owner disables branding", () => {
    const current = {
      ...organization("org-1", "#222222"),
      theme: null,
      themeEnabled: false,
      isThemed: false,
    };

    expect(
      resolveActiveBrand({
        availableOrganizations: [current],
        defaultBrand,
        routeBrand: organization("org-1", "#111111"),
        selectedOrganizationId: "org-1",
      }).theme,
    ).toBeNull();
  });

  test("uses a route context when its organization is absent from the list", () => {
    const route = organization("org-2", "#222222");

    expect(
      resolveActiveBrand({
        availableOrganizations: [organization("org-1", "#111111")],
        defaultBrand,
        routeBrand: route,
        selectedOrganizationId: "org-1",
      }),
    ).toBe(route);
  });
});
