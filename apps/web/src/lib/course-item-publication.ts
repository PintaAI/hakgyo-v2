export type CoursePublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export function defaultCourseItemPublished(status: CoursePublicationStatus) {
  return status === "PUBLISHED";
}
