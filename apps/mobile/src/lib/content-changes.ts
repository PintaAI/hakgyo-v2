import type { SyncNotice } from "../sync/notices";

/**
 * "Baru" and "Diperbarui" marks in a course outline: the chapters and
 * activities that changed since the learner last opened them.
 *
 * What changed comes from the course-content sync notices (new chapters, new
 * activities, activities whose material, vocabulary or questions changed),
 * read or not: reading the update in Pembaruan does not clear a mark, opening
 * the activity does (see `use-content-changes.ts`).
 */

export type ContentChange = "NEW" | "UPDATED";

/** When this device last saw an activity opened. */
export type ContentSeen = { seenAt: number };

type Outline = {
  modules: ReadonlyArray<{ id: string; items: ReadonlyArray<{ id: string }> }>;
};

export type CourseContentChanges = {
  items: ReadonlyMap<string, ContentChange>;
  modules: ReadonlyMap<string, ContentChange>;
};

const NO_CHANGES: CourseContentChanges = {
  items: new Map(),
  modules: new Map(),
};

/**
 * The activities of `outline` that changed after the learner last opened
 * them, and the chapters holding them. An activity in a new chapter counts as
 * new. A chapter is "NEW" when it was added and "UPDATED" otherwise.
 */
export function courseContentChanges(
  notices: readonly SyncNotice[],
  courseId: string,
  outline: Outline | undefined,
  seen: Readonly<Record<string, ContentSeen>>,
): CourseContentChanges {
  if (!outline) return NO_CHANGES;
  const changedAt = new Map<string, { at: number; change: ContentChange }>();
  const note = (itemId: string, at: number, change: ContentChange) => {
    const current = changedAt.get(itemId);
    if (!current || at > current.at) changedAt.set(itemId, { at, change });
    else if (at === current.at && change === "NEW")
      changedAt.set(itemId, { at, change });
  };
  const addedModuleIds = new Set<string>();
  for (const notice of notices) {
    if (notice.kind !== "COURSE_CONTENT" || notice.courseId !== courseId)
      continue;
    for (const item of notice.itemsAdded)
      note(item.id, notice.createdAt, "NEW");
    for (const item of notice.itemsUpdated)
      note(item.id, notice.createdAt, "UPDATED");
    for (const added of notice.modulesAdded) {
      addedModuleIds.add(added.id);
      const courseModule = outline.modules.find(
        (module) => module.id === added.id,
      );
      for (const item of courseModule?.items ?? [])
        note(item.id, notice.createdAt, "NEW");
    }
  }
  if (changedAt.size === 0) return NO_CHANGES;

  const items = new Map<string, ContentChange>();
  const modules = new Map<string, ContentChange>();
  for (const courseModule of outline.modules) {
    for (const item of courseModule.items) {
      const change = changedAt.get(item.id);
      if (!change || (seen[item.id]?.seenAt ?? 0) >= change.at) continue;
      items.set(item.id, change.change);
      modules.set(
        courseModule.id,
        addedModuleIds.has(courseModule.id) ? "NEW" : "UPDATED",
      );
    }
  }
  return items.size ? { items, modules } : NO_CHANGES;
}

export const contentChangeLabel: Record<ContentChange, string> = {
  NEW: "Baru",
  UPDATED: "Diperbarui",
};
