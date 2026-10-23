import { join } from "node:path";

import type { CourseContent } from "./content-types";

export const DEFAULT_CONTENT_PATH = join(import.meta.dir, "content/index.ts");

function isCourseContent(value: unknown): value is CourseContent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CourseContent).title === "string" &&
    Array.isArray((value as CourseContent).modules)
  );
}

/** The course from a content module: its default export or the first export shaped like a CourseContent. */
export async function loadContent(
  path = DEFAULT_CONTENT_PATH,
): Promise<CourseContent> {
  const loaded = (await import(path)) as Record<string, unknown>;
  const content = [loaded.default, ...Object.values(loaded)].find(
    isCourseContent,
  );
  if (!content) throw new Error(`${path} exports no CourseContent`);
  return content;
}
