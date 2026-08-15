import { getUrlPathname } from "~/lib/url";

export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

export const profileImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProfileImageContentType = (typeof profileImageContentTypes)[number];

const extensions: Record<ProfileImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const contentTypesByExtension: Record<string, ProfileImageContentType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d+)\.(jpg|png|webp|gif)$/;

export function getProfileImagePrefix(userId: string) {
  return `profile-images/${encodeURIComponent(userId)}/`;
}

export function createProfileImageKey(
  userId: string,
  fileSize: number,
  contentType: ProfileImageContentType,
  objectId = crypto.randomUUID(),
) {
  return `${getProfileImagePrefix(userId)}${objectId}-${fileSize}.${extensions[contentType]}`;
}

export function parseProfileImageKey(key: string, userId: string) {
  const prefix = getProfileImagePrefix(userId);
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
    size > MAX_PROFILE_IMAGE_SIZE ||
    !contentType
  ) {
    return null;
  }

  return { contentType, fileName, size };
}

export function getProfileImagePath(userId: string, fileName: string) {
  return `/api/profile-images/${encodeURIComponent(userId)}/${fileName}`;
}

export function getManagedProfileImageKey(
  imageUrl: string | null | undefined,
  userId: string,
) {
  if (!imageUrl) return null;
  const pathname = getUrlPathname(imageUrl);
  const pathPrefix = `/api/profile-images/${encodeURIComponent(userId)}/`;
  if (!pathname?.startsWith(pathPrefix)) return null;

  const fileName = pathname.slice(pathPrefix.length);
  const key = `${getProfileImagePrefix(userId)}${fileName}`;
  return parseProfileImageKey(key, userId) ? key : null;
}
