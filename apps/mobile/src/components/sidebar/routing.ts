import type { AppArea } from "./types";

export function getCurrentAppArea(
  pathname?: string,
  courseId?: string,
): AppArea {
  if (courseId) return "course";
  if (pathname?.includes("/courses/")) return "course";
  return "main";
}
