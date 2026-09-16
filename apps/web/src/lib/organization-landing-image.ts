import { getPublicR2Url } from "~/lib/profile-image";
import { getUrlPathname } from "~/lib/url";

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

const extensions: Record<OrganizationLandingImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const contentTypesByExtension: Record<
  string,
  OrganizationLandingImageContentType
> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d+)\.(jpg|png|webp)$/;

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
  objectId = crypto.randomUUID(),
) {
  return `${getOrganizationLandingImagePrefix(organizationId, purpose)}${objectId}-${fileSize}.${extensions[contentType]}`;
}

export function parseOrganizationLandingImageKey(
  key: string,
  organizationId: string,
  purpose?: OrganizationLandingImagePurpose,
) {
  const matchedPurpose =
    purpose ??
    organizationLandingImagePurposes.find((candidate) =>
      key.startsWith(
        getOrganizationLandingImagePrefix(organizationId, candidate),
      ),
    );
  if (!matchedPurpose) return null;

  const prefix = getOrganizationLandingImagePrefix(
    organizationId,
    matchedPurpose,
  );
  if (!key.startsWith(prefix)) return null;
  const fileName = key.slice(prefix.length);
  const match = fileNamePattern.exec(fileName);
  const size = Number(match?.[1]);
  const extension = match?.[2];
  const contentType = extension
    ? contentTypesByExtension[extension]
    : undefined;
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_ORGANIZATION_LANDING_IMAGE_SIZE ||
    !contentType
  ) {
    return null;
  }
  return { contentType, fileName, purpose: matchedPurpose, size };
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
  if (!imageUrl) return null;
  const pathname = getUrlPathname(imageUrl);
  if (!pathname) return null;

  for (const purpose of organizationLandingImagePurposes) {
    const prefix = `/${getOrganizationLandingImagePrefix(organizationId, purpose)}`;
    if (!pathname.startsWith(prefix)) continue;
    const key = `${getOrganizationLandingImagePrefix(organizationId, purpose)}${pathname.slice(prefix.length)}`;
    return parseOrganizationLandingImageKey(key, organizationId, purpose)
      ? key
      : null;
  }
  return null;
}
