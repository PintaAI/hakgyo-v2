import {
  getPublicR2Url,
  MAX_PROFILE_IMAGE_SIZE,
  profileImageContentTypes,
  type ProfileImageContentType,
} from "~/lib/profile-image";
import { getUrlPathname } from "~/lib/url";

export const MAX_ORGANIZATION_LOGO_SIZE = MAX_PROFILE_IMAGE_SIZE;
export const organizationLogoContentTypes = profileImageContentTypes;
export type OrganizationLogoContentType = ProfileImageContentType;

const extensions: Record<OrganizationLogoContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const contentTypesByExtension: Record<string, OrganizationLogoContentType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d+)\.(jpg|png|webp|gif)$/;

export function getOrganizationLogoPrefix(organizationId: string) {
  return `organization-logos/${encodeURIComponent(organizationId)}/`;
}

export function createOrganizationLogoKey(
  organizationId: string,
  fileSize: number,
  contentType: OrganizationLogoContentType,
  objectId = crypto.randomUUID(),
) {
  return `${getOrganizationLogoPrefix(organizationId)}${objectId}-${fileSize}.${extensions[contentType]}`;
}

export function parseOrganizationLogoKey(key: string, organizationId: string) {
  const prefix = getOrganizationLogoPrefix(organizationId);
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
    size > MAX_ORGANIZATION_LOGO_SIZE ||
    !contentType
  ) {
    return null;
  }

  return { contentType, fileName, size };
}

export function getOrganizationLogoPath(
  organizationId: string,
  fileName: string,
) {
  return getPublicR2Url(
    `${getOrganizationLogoPrefix(organizationId)}${fileName}`,
  );
}

export function getManagedOrganizationLogoKey(
  logoUrl: string | null | undefined,
  organizationId: string,
) {
  if (!logoUrl) return null;
  const pathname = getUrlPathname(logoUrl);
  if (!pathname) return null;
  const r2Prefix = `/organization-logos/${encodeURIComponent(organizationId)}/`;
  if (!pathname.startsWith(r2Prefix)) return null;

  const fileName = pathname.slice(r2Prefix.length);
  const key = `${getOrganizationLogoPrefix(organizationId)}${fileName}`;
  return parseOrganizationLogoKey(key, organizationId) ? key : null;
}
