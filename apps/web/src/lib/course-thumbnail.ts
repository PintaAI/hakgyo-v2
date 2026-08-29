import { getPublicR2Url } from "~/lib/profile-image";

export const MAX_COURSE_THUMBNAIL_SIZE = 5 * 1024 * 1024;
export const courseThumbnailContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type CourseThumbnailContentType =
  (typeof courseThumbnailContentTypes)[number];

const extensions: Record<CourseThumbnailContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const contentTypesByExtension: Record<
  string,
  CourseThumbnailContentType
> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d+)\.(jpg|png|webp|gif)$/;

export function getCourseThumbnailPrefix(courseId: string) {
  return `course-thumbnails/${encodeURIComponent(courseId)}/`;
}

export function createCourseThumbnailKey(
  courseId: string,
  fileSize: number,
  contentType: CourseThumbnailContentType,
  objectId = crypto.randomUUID(),
) {
  return `${getCourseThumbnailPrefix(courseId)}${objectId}-${fileSize}.${extensions[contentType]}`;
}

export function parseCourseThumbnailKey(key: string, courseId: string) {
  const prefix = getCourseThumbnailPrefix(courseId);
  if (!key.startsWith(prefix)) return null;
  const match = fileNamePattern.exec(key.slice(prefix.length));
  const size = Number(match?.[1]);
  const extension = match?.[2];
  const contentType = extension
    ? contentTypesByExtension[extension]
    : undefined;
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_COURSE_THUMBNAIL_SIZE ||
    !contentType
  ) {
    return null;
  }
  return { contentType, fileName: match?.[0] ?? "", size };
}

export function getCourseThumbnailPath(
  courseId: string,
  fileName: string,
) {
  return getPublicR2Url(`${getCourseThumbnailPrefix(courseId)}${fileName}`);
}

export function getManagedCourseThumbnailKey(
  thumbnailUrl: string | null | undefined,
  courseId: string,
) {
  if (!thumbnailUrl) return null;
  try {
    const pathname = new URL(thumbnailUrl).pathname;
    const prefix = `/${getCourseThumbnailPrefix(courseId)}`;
    if (!pathname.startsWith(prefix)) return null;
    const key = `${getCourseThumbnailPrefix(courseId)}${pathname.slice(prefix.length)}`;
    return parseCourseThumbnailKey(key, courseId) ? key : null;
  } catch {
    return null;
  }
}
