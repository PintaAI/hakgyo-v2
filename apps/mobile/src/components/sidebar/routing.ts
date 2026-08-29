import type { AppArea, SidebarItem } from "./types";

export function getCurrentAppArea(): AppArea {
  return "main";
}

export function isSidebarItemActive(
  pathname: string,
  item: SidebarItem,
  sectionArea: AppArea,
  currentArea: AppArea,
): boolean {
  if (sectionArea !== currentArea) return false;

  if (item.activePaths) {
    return item.activePaths.some((path) => {
      if (path.endsWith("/*")) {
        const base = path.slice(0, -2);
        return pathname === base || pathname.startsWith(`${base}/`);
      }
      return pathname === path;
    });
  }

  const route =
    typeof item.route === "string" ? item.route : String(item.route);
  return pathname === route || pathname.startsWith(`${route}/`);
}
