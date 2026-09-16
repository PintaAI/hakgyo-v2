import { describe, expect, test } from "bun:test";

import {
  createOrganizationLandingImageKey,
  getManagedOrganizationLandingImageKey,
  getOrganizationLandingImagePath,
  parseOrganizationLandingImageKey,
} from "./organization-landing-image";

const organizationId = "org/id";
const objectId = "123e4567-e89b-12d3-a456-426614174000";

describe("organization landing image keys", () => {
  test("round-trips scoped hero and social image keys", () => {
    for (const purpose of ["hero", "social"] as const) {
      const key = createOrganizationLandingImageKey(
        organizationId,
        purpose,
        2048,
        "image/webp",
        objectId,
      );
      expect(
        parseOrganizationLandingImageKey(key, organizationId, purpose),
      ).toEqual({
        contentType: "image/webp",
        fileName: `${objectId}-2048.webp`,
        purpose,
        size: 2048,
      });
      const url = getOrganizationLandingImagePath(
        organizationId,
        purpose,
        `${objectId}-2048.webp`,
      );
      expect(getManagedOrganizationLandingImageKey(url, organizationId)).toBe(
        key,
      );
    }
  });

  test("rejects another organization, purpose, or unsupported image", () => {
    const key = createOrganizationLandingImageKey(
      organizationId,
      "hero",
      2048,
      "image/png",
      objectId,
    );
    expect(parseOrganizationLandingImageKey(key, "another-org")).toBeNull();
    expect(
      parseOrganizationLandingImageKey(key, organizationId, "social"),
    ).toBeNull();
    expect(
      parseOrganizationLandingImageKey(
        key.replace(".png", ".svg"),
        organizationId,
      ),
    ).toBeNull();
  });
});
