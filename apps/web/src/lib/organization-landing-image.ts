import { defineManagedImage, getPublicR2Url } from "~/lib/managed-image";

export const MAX_ORGANIZATION_LANDING_IMAGE_SIZE = 10 * 1024 * 1024;

export const organizationLandingImagePurposes = ["hero", "social"] as const;
export type OrganizationLandingImagePurpose =
  (typeof organizationLandingImagePurposes)[number];

export const organizationLandingImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type OrganizationLandingImageContentType =
  (typeof organizationLandingImageContentTypes)[number];

const landingImage = defineManagedImage({
  contentTypes: organizationLandingImageContentTypes,
  maxSize: MAX_ORGANIZATION_LANDING_IMAGE_SIZE,
});

export function getOrganizationLandingImagePrefix(
  organizationId: string,
  purpose: OrganizationLandingImagePurpose,
) {
  return `organization-landing-images/${encodeURIComponent(organizationId)}/${purpose}/`;
}

export function createOrganizationLandingImageKey(
  organizationId: string,
  purpose: OrganizationLandingImagePurpose,
  fileSize: number,
  contentType: OrganizationLandingImageContentType,
  objectId?: string,
) {
  return landingImage.createKey(
    getOrganizationLandingImagePrefix(organizationId, purpose),
    fileSize,
    contentType,
    objectId,
  );
}

/** Parses a landing image key; without `purpose`, any purpose is accepted. */
export function parseOrganizationLandingImageKey(
  key: string,
  organizationId: string,
  purpose?: OrganizationLandingImagePurpose,
) {
  for (const candidate of purpose
    ? [purpose]
    : organizationLandingImagePurposes) {
    const parsed = landingImage.parseKey(
      key,
      getOrganizationLandingImagePrefix(organizationId, candidate),
    );
    if (parsed) return { ...parsed, purpose: candidate };
  }
  return null;
}

export function getOrganizationLandingImagePath(
  organizationId: string,
  purpose: OrganizationLandingImagePurpose,
  fileName: string,
) {
  return getPublicR2Url(
    `${getOrganizationLandingImagePrefix(organizationId, purpose)}${fileName}`,
  );
}

export function getManagedOrganizationLandingImageKey(
  imageUrl: string | null | undefined,
  organizationId: string,
) {
  for (const purpose of organizationLandingImagePurposes) {
    const key = landingImage.getManagedKey(
      imageUrl,
      getOrganizationLandingImagePrefix(organizationId, purpose),
    );
    if (key) return key;
  }
  return null;
}
