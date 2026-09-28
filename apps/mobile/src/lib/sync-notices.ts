import type { SFSymbol } from "expo-symbols";

import type { CourseContentNotice, SyncNotice } from "../sync/notices";
import type { SidebarIndicatorKind } from "./sidebar-indicator-count";
import { dateLabel } from "./study";

/** One card in Pembaruan; dismissing it dismisses every notice in `ids`. */
export type SyncNoticeEntry = {
  key: string;
  ids: string[];
  notice: SyncNotice;
};

function unionById<T extends { id: string }>(lists: T[][]) {
  const byId = new Map<string, T>();
  for (const list of lists) {
    for (const entry of list)
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function mergeCourseContent(
  notices: CourseContentNotice[],
): CourseContentNotice {
  // Newest first: the newest title and revision describe the course now.
  const [newest] = notices;
  const modulesAdded = unionById(notices.map((notice) => notice.modulesAdded));
  const newModuleIds = new Set(modulesAdded.map((module) => module.id));
  const itemsAdded = unionById(
    notices.map((notice) => notice.itemsAdded),
  ).filter((item) => !newModuleIds.has(item.moduleId));
  const addedItemIds = new Set(itemsAdded.map((item) => item.id));
  const itemsUpdated = unionById(
    notices.map((notice) => notice.itemsUpdated),
  ).filter(
    (item) => !addedItemIds.has(item.id) && !newModuleIds.has(item.moduleId),
  );
  return { ...newest!, modulesAdded, itemsAdded, itemsUpdated };
}

/**
 * Notices newest first, with the content notices of one course (one per
 * downloaded revision) merged into a single entry.
 */
export function groupSyncNotices(notices: SyncNotice[]): SyncNoticeEntry[] {
  const sorted = [...notices].sort(
    (first, second) => second.createdAt - first.createdAt,
  );
  const contentByCourse = new Map<string, CourseContentNotice[]>();
  for (const notice of sorted) {
    if (notice.kind !== "COURSE_CONTENT") continue;
    const list = contentByCourse.get(notice.courseId);
    if (list) list.push(notice);
    else contentByCourse.set(notice.courseId, [notice]);
  }
  const entries: SyncNoticeEntry[] = [];
  for (const notice of sorted) {
    if (notice.kind !== "COURSE_CONTENT") {
      entries.push({ key: notice.id, ids: [notice.id], notice });
      continue;
    }
    const group = contentByCourse.get(notice.courseId);
    // Emitted once, at the newest notice of the course.
    if (!group || group[0] !== notice) continue;
    entries.push({
      key: `content:${notice.courseId}`,
      ids: group.map((member) => member.id),
      notice: mergeCourseContent(group),
    });
  }
  return entries;
}

/** Deep-link only when the changed item still exists in the latest outline. */
export function contentNoticeItemId(
  notice: CourseContentNotice,
  outline?: { modules: Array<{ items: Array<{ id: string }> }> },
): string | null {
  const changed = [...notice.itemsAdded, ...notice.itemsUpdated];
  if (notice.modulesAdded.length || changed.length !== 1) return null;
  const id = changed[0]!.id;
  return outline?.modules.some((module) =>
    module.items.some((item) => item.id === id),
  )
    ? id
    : null;
}

/**
 * Whether an unread Pembaruan indicator already stands for the notice, so
 * the bell does not count the same news twice.
 */
export function isCoveredByIndicator(
  notice: SyncNotice,
  /** `${kind}:${entityId}` of every unread indicator. */
  unreadIndicators: ReadonlySet<string>,
) {
  switch (notice.kind) {
    case "MEETING_SCHEDULED":
      return unreadIndicators.has(`MEETING:${notice.meetingId}`);
    case "EVENT_OPENED":
      return unreadIndicators.has(`ASSESSMENT:${notice.eventId}`);
    case "COURSE_CONTENT":
      return (
        !notice.itemsAdded.length &&
        !notice.itemsUpdated.length &&
        notice.modulesAdded.every((module) =>
          unreadIndicators.has(`MODULE:${module.id}`),
        )
      );
    default:
      return false;
  }
}

/** Bell badge: unread indicators plus the notices they do not cover. */
export function countUpdatesBadge(
  entries: SyncNoticeEntry[],
  indicators: ReadonlyArray<{
    kind: SidebarIndicatorKind;
    entityId: string;
    unread: boolean;
  }>,
) {
  const unread = new Set(
    indicators
      .filter((indicator) => indicator.unread)
      .map((indicator) => `${indicator.kind}:${indicator.entityId}`),
  );
  return (
    unread.size +
    entries.filter((entry) => !isCoveredByIndicator(entry.notice, unread))
      .length
  );
}

function count(value: number, label: string) {
  return value ? [`${value} ${label}`] : [];
}

function scoreLabel(score: number | null, maxScore: number | null) {
  if (score === null) return null;
  return maxScore ? `${score}/${maxScore}` : String(score);
}

/** Indonesian copy and SF Symbol of a notice. */
export function describeSyncNotice(notice: SyncNotice): {
  title: string;
  detail: string;
  icon: SFSymbol;
} {
  switch (notice.kind) {
    case "COURSE_ADDED":
      return {
        title: notice.courseTitle,
        detail: "Course baru tersedia",
        icon: "book.closed.fill",
      };
    case "COHORT_ADDED":
      return {
        title: notice.cohortName,
        detail: `Kelas baru · ${notice.courseTitle}`,
        icon: "person.3.fill",
      };
    case "MEETING_SCHEDULED":
      return {
        title: notice.meetingTitle,
        detail: `Pertemuan baru · ${dateLabel(new Date(notice.startsAt))}`,
        icon: "video.fill",
      };
    case "MEETING_RESCHEDULED":
      return {
        title: notice.meetingTitle,
        detail: `Jadwal diubah · ${dateLabel(new Date(notice.startsAt))}`,
        icon: "calendar.badge.clock",
      };
    case "MEETING_CANCELLED":
      return {
        title: notice.meetingTitle,
        detail: `Pertemuan dibatalkan · ${notice.cohortName}`,
        icon: "video.slash.fill",
      };
    case "EVENT_OPENED":
      return {
        title: notice.eventTitle,
        detail: notice.closesAt
          ? `Tugas dibuka · tenggat ${dateLabel(new Date(notice.closesAt))}`
          : `Tugas dibuka · ${notice.courseTitle}`,
        icon: "checklist",
      };
    case "EVENT_DEADLINE_CHANGED":
      return {
        title: notice.eventTitle,
        detail: notice.closesAt
          ? `Tenggat diubah · ${dateLabel(new Date(notice.closesAt))}`
          : "Tenggat diubah",
        icon: "clock.badge.exclamationmark",
      };
    case "EVENT_CANCELLED":
      return {
        title: notice.eventTitle,
        detail: `Tugas dibatalkan · ${notice.courseTitle}`,
        icon: "xmark.circle",
      };
    case "ATTEMPT_GRADED": {
      const score = scoreLabel(notice.score, notice.maxScore);
      return {
        title: notice.assessmentTitle,
        detail: score ? `Nilai keluar · ${score}` : "Nilai keluar",
        icon: "checkmark.seal.fill",
      };
    }
    case "COURSE_CONTENT": {
      const parts = [
        ...count(notice.modulesAdded.length, "bab baru"),
        ...count(notice.itemsAdded.length, "aktivitas baru"),
        ...count(notice.itemsUpdated.length, "aktivitas diperbarui"),
      ];
      return {
        title: notice.courseTitle,
        detail: parts.join(" · ") || "Materi diperbarui",
        icon: "book.pages.fill",
      };
    }
  }
}
