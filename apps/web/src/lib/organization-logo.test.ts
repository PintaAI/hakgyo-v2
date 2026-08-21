import { describe, expect, test } from "bun:test";

import {
  createOrganizationLogoKey,
  getManagedOrganizationLogoKey,
  parseOrganizationLogoKey,
} from "./organization-logo";

const objectId = "123e4567-e89b-12d3-a456-426614174000";

describe("organization logo keys", () => {
  test("creates and parses an organization-owned key", () => {
    const key = createOrganizationLogoKey(
      "organization/1",
      1024,
      "image/webp",
      objectId,
    );

    expect(key).toBe(
      "organization-logos/organization%2F1/123e4567-e89b-12d3-a456-426614174000-1024.webp",
    );
    expect(parseOrganizationLogoKey(key, "organization/1")).toEqual({
      contentType: "image/webp",
      fileName: "123e4567-e89b-12d3-a456-426614174000-1024.webp",
      size: 1024,
    });
    expect(parseOrganizationLogoKey(key, "another-organization")).toBeNull();
  });

  test("rejects malformed and oversized keys", () => {
    expect(
      parseOrganizationLogoKey("organization-logos/org/logo.svg", "org"),
    ).toBeNull();
    expect(
      parseOrganizationLogoKey(
        `organization-logos/org/${objectId}-${5 * 1024 * 1024 + 1}.png`,
        "org",
      ),
    ).toBeNull();
  });

  test("extracts only managed logo URLs for the same organization", () => {
    const fileName = `${objectId}-2048.jpg`;
    expect(
      getManagedOrganizationLogoKey(
        `https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/organization-logos/org/${fileName}`,
        "org",
      ),
    ).toBe(`organization-logos/org/${fileName}`);
    expect(
      getManagedOrganizationLogoKey(
        `https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev/organization-logos/other/${fileName}`,
        "org",
      ),
    ).toBeNull();
    expect(
      getManagedOrganizationLogoKey(
        "https://images.example.com/logo.jpg",
        "org",
      ),
    ).toBeNull();
    expect(
      getManagedOrganizationLogoKey(`/api/organization-logos/org/${fileName}`, "org"),
    ).toBeNull();
  });
});
