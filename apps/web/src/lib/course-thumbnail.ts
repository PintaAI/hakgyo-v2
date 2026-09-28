import { defineManagedImage, getPublicR2Url } from "~/lib/managed-image";

export const MAX_COURSE_THUMBNAIL_SIZE = 5 * 1024 * 1024;
export const courseThumbnailContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type CourseThumbnailContentType =
  (typeof courseThumbnailContentTypes)[number];

const courseThumbnail = defineManagedImage({
  contentTypes: courseThumbnailContentTypes,
  maxSize: MAX_COURSE_THUMBNAIL_SIZE,
});

export function getCourseThumbnailPrefix(courseId: string) {
  return `course-thumbnails/${encodeURIComponent(courseId)}/`;
}

export function createCourseThumbnailKey(
  courseId: string,
  fileSize: number,
  contentType: CourseThumbnailContentType,
  objectId?: string,
) {
  return courseThumbnail.createKey(
    getCourseThumbnailPrefix(courseId),
    fileSize,
    contentType,
    objectId,
  );
}

export function parseCourseThumbnailKey(key: string, courseId: string) {
  return courseThumbnail.parseKey(key, getCourseThumbnailPrefix(courseId));
}

export function getCourseThumbnailPath(courseId: string, fileName: string) {
  return getPublicR2Url(`${getCourseThumbnailPrefix(courseId)}${fileName}`);
}

export function getManagedCourseThumbnailKey(
  thumbnailUrl: string | null | undefined,
  courseId: string,
) {
  return courseThumbnail.getManagedKey(
    thumbnailUrl,
    getCourseThumbnailPrefix(courseId),
  );
}
