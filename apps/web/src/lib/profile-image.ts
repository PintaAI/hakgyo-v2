import { defineManagedImage, getPublicR2Url } from "~/lib/managed-image";

export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

export const profileImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileImageContentType = (typeof profileImageContentTypes)[number];

const profileImage = defineManagedImage({
  contentTypes: profileImageContentTypes,
  maxSize: MAX_PROFILE_IMAGE_SIZE,
});

export function getProfileImagePrefix(userId: string) {
  return `profile-images/${encodeURIComponent(userId)}/`;
}

export function createProfileImageKey(
  userId: string,
  fileSize: number,
  contentType: ProfileImageContentType,
  objectId?: string,
) {
  return profileImage.createKey(
    getProfileImagePrefix(userId),
    fileSize,
    contentType,
    objectId,
  );
}

export function parseProfileImageKey(key: string, userId: string) {
  return profileImage.parseKey(key, getProfileImagePrefix(userId));
}

export function getProfileImagePath(userId: string, fileName: string) {
  return getPublicR2Url(`${getProfileImagePrefix(userId)}${fileName}`);
}

export function getManagedProfileImageKey(
  imageUrl: string | null | undefined,
  userId: string,
) {
  return profileImage.getManagedKey(imageUrl, getProfileImagePrefix(userId));
}
