import { describe, expect, test } from "bun:test";

import type { SyncNotice } from "../sync/notices";
import {
  contentNoticeItemId,
  countUpdatesBadge,
  describeSyncNotice,
  groupSyncNotices,
} from "./sync-notices";

function content(
  revision: string,
  createdAt: number,
  changes: Partial<
    Pick<
      Extract<SyncNotice, { kind: "COURSE_CONTENT" }>,
      "modulesAdded" | "itemsAdded" | "itemsUpdated"
    >
  >,
): SyncNotice {
  return {
    kind: "COURSE_CONTENT",
    id: `content:course-1:${revision}@changed`,
    group: `content:course-1:${revision}`,
    organizationId: "org-1",
    createdAt,
    courseId: "course-1",
    courseTitle: `Korean 1 (rev ${revision})`,
    revision,
    modulesAdded: [],
    itemsAdded: [],
    itemsUpdated: [],
    ...changes,
  };
}

const meeting: SyncNotice = {
  kind: "MEETING_SCHEDULED",
  id: "meeting:m1@MEETING_SCHEDULED:2026-09-02T08:00:00.000Z",
  group: "meeting:m1",
  organizationId: "org-1",
  createdAt: 5,
  courseId: "course-1",
  cohortId: "cohort-1",
  cohortName: "Kelas Pagi",
  meetingId: "m1",
  meetingTitle: "Pertemuan 3",
  startsAt: "2026-09-02T08:00:00.000Z",
};

describe("groupSyncNotices", () => {
  test("merges the content notices of one course, newest first", () => {
    const entries = groupSyncNotices([
      content("2", 1, {
        modulesAdded: [{ id: "m2", title: "Bab 2" }],
        itemsAdded: [{ id: "i1", title: "Salam", moduleId: "m1" }],
      }),
      meeting,
      content("3", 3, {
        itemsAdded: [{ id: "i3", title: "Angka", moduleId: "m2" }],
        itemsUpdated: [
          { id: "i1", title: "Salam", moduleId: "m1" },
          { id: "i2", title: "Hangeul", moduleId: "m1" },
        ],
      }),
    ]);

    expect(entries.map((entry) => entry.key)).toEqual([
      meeting.id,
      "content:course-1",
    ]);
    expect(entries[1]!.ids).toEqual([
      "content:course-1:3@changed",
      "content:course-1:2@changed",
    ]);
    expect(entries[1]!.notice).toMatchObject({
      courseTitle: "Korean 1 (rev 3)",
      modulesAdded: [{ id: "m2" }],
      // i3 belongs to the new module; i1 was new before it changed.
      itemsAdded: [{ id: "i1" }],
      itemsUpdated: [{ id: "i2" }],
    });
    expect(describeSyncNotice(entries[1]!.notice).detail).toBe(
      "1 bab baru · 1 aktivitas baru · 1 aktivitas diperbarui",
    );
  });
});

describe("contentNoticeItemId", () => {
  test("falls back to the course after a changed item was removed", () => {
    const notice = groupSyncNotices([
      content("2", 1, {
        itemsUpdated: [{ id: "i1", title: "Salam", moduleId: "m1" }],
      }),
    ])[0]!.notice;
    if (notice.kind !== "COURSE_CONTENT") throw new Error("Expected content");

    expect(
      contentNoticeItemId(notice, {
        modules: [{ items: [{ id: "i2" }] }],
      }),
    ).toBeNull();
    expect(contentNoticeItemId(notice)).toBeNull();
    expect(
      contentNoticeItemId(notice, {
        modules: [{ items: [{ id: "i1" }] }],
      }),
    ).toBe("i1");
  });
});

describe("countUpdatesBadge", () => {
  const moduleOnly = content("2", 1, {
    modulesAdded: [{ id: "m2", title: "Bab 2" }],
  });

  test("does not count a notice an unread indicator already shows", () => {
    const entries = groupSyncNotices([meeting, moduleOnly]);
    expect(
      countUpdatesBadge(entries, [
        { kind: "MEETING", entityId: "m1", unread: true },
        { kind: "MODULE", entityId: "m2", unread: true },
      ]),
    ).toBe(2);
  });

  test("counts notices whose indicator was already read", () => {
    const entries = groupSyncNotices([meeting, moduleOnly]);
    expect(
      countUpdatesBadge(entries, [
        { kind: "MEETING", entityId: "m1", unread: false },
        { kind: "MODULE", entityId: "m2", unread: true },
      ]),
    ).toBe(2);
    expect(countUpdatesBadge(entries, [])).toBe(2);
  });
});

describe("describeSyncNotice", () => {
  test("uses the Tugas and score wording", () => {
    expect(
      describeSyncNotice({
        kind: "ATTEMPT_GRADED",
        id: "attempt:a1@graded:80",
        group: "attempt:a1",
        organizationId: "org-1",
        createdAt: 1,
        courseId: "course-1",
        courseItemId: "item-1",
        attemptId: "a1",
        assessmentTitle: "Kuis Bab 1",
        score: 80,
        maxScore: 100,
      }),
    ).toEqual({
      title: "Kuis Bab 1",
      detail: "Nilai keluar · 80/100",
      icon: "checkmark.seal.fill",
    });
    expect(
      describeSyncNotice({
        kind: "EVENT_CANCELLED",
        id: "event:e1@EVENT_CANCELLED:",
        group: "event:e1",
        organizationId: "org-1",
        createdAt: 1,
        courseId: "course-1",
        courseTitle: "Korean 1",
        eventId: "e1",
        eventTitle: "Tryout",
        closesAt: null,
      }).detail,
    ).toBe("Tugas dibatalkan · Korean 1");
  });
});
