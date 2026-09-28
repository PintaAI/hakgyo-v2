import { defineManagedImage, getPublicR2Url } from "~/lib/managed-image";
import {
  MAX_PROFILE_IMAGE_SIZE,
  profileImageContentTypes,
  type ProfileImageContentType,
} from "~/lib/profile-image";

export const MAX_ORGANIZATION_LOGO_SIZE = MAX_PROFILE_IMAGE_SIZE;
export const organizationLogoContentTypes = profileImageContentTypes;
export type OrganizationLogoContentType = ProfileImageContentType;

const organizationLogo = defineManagedImage({
  contentTypes: organizationLogoContentTypes,
  maxSize: MAX_ORGANIZATION_LOGO_SIZE,
});

export function getOrganizationLogoPrefix(organizationId: string) {
  return `organization-logos/${encodeURIComponent(organizationId)}/`;
}

export function createOrganizationLogoKey(
  organizationId: string,
  fileSize: number,
  contentType: OrganizationLogoContentType,
  objectId?: string,
) {
  return organizationLogo.createKey(
    getOrganizationLogoPrefix(organizationId),
    fileSize,
    contentType,
    objectId,
  );
}

export function parseOrganizationLogoKey(key: string, organizationId: string) {
  return organizationLogo.parseKey(
    key,
    getOrganizationLogoPrefix(organizationId),
  );
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
  return organizationLogo.getManagedKey(
    logoUrl,
    getOrganizationLogoPrefix(organizationId),
  );
}
