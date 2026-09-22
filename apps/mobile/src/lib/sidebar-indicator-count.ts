export type SidebarIndicatorKind = "MODULE" | "ASSESSMENT" | "MEETING";

export const MAIN_SIDEBAR_INDICATOR_KINDS: ReadonlySet<SidebarIndicatorKind> =
  new Set(["ASSESSMENT", "MEETING"]);

export function countUnreadIndicators(
  items: ReadonlyArray<{ kind: SidebarIndicatorKind; unread: boolean }>,
  kinds?: ReadonlySet<SidebarIndicatorKind>,
) {
  return items.filter((item) => item.unread && (!kinds || kinds.has(item.kind)))
    .length;
}
