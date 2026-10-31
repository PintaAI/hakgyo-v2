import { describe, expect, test } from "bun:test";

import {
  selectSyncActivity,
  summarizeBundleChanges,
  SYNC_SUMMARY_MS,
  type SyncActivityInput,
} from "./activity";
import type { BundleChange } from "./types";

const idle: SyncActivityInput = {
  bundles: {
    pending: 0,
    completed: 0,
    failed: 0,
    activeCourseIds: [],
    changingCourseIds: [],
    changingDone: 0,
  },
  lastBundleBatch: null,
  outboxWaiting: null,
  pendingCount: 0,
  courseTitles: { hm: "Hangeul Mastery", ik: "Indonesia → Korea" },
  now: 10_000,
};

function change(
  courseId: string,
  kind: BundleChange["kind"],
  title: string | null = courseId,
): BundleChange {
  return { courseId, kind, title, at: 1 };
}

describe("summarizeBundleChanges", () => {
  test("names a single added or updated course", () => {
    expect(summarizeBundleChanges([change("hm", "added", "Hangeul")])).toEqual({
      kind: "changed",
      title: "Hangeul siap dipakai offline",
      detail: "Sudah diunduh ke HP ini.",
    });
    expect(summarizeBundleChanges([change("ik", "updated", "IK")])?.title).toBe(
      "IK diperbarui",
    );
  });

  test("counts several courses and lets failures win", () => {
    expect(
      summarizeBundleChanges([change("a", "added"), change("b", "added")])
        ?.title,
    ).toBe("2 kursus siap dipakai offline");
    expect(
      summarizeBundleChanges([change("a", "added"), change("b", "updated")])
        ?.title,
    ).toBe("2 kursus diperbarui");
    expect(
      summarizeBundleChanges([
        change("a", "added"),
        change("b", "failed", null),
      ]),
    ).toMatchObject({ kind: "failed", title: "Gagal mengunduh Kursus" });
  });

  test("keeps only the latest change of a course", () => {
    expect(
      summarizeBundleChanges([change("a", "failed"), change("a", "updated")])
        ?.kind,
    ).toBe("changed");
  });
});

describe("selectSyncActivity", () => {
  test("shows nothing while idle", () => {
    expect(selectSyncActivity(idle)).toBeNull();
  });

  test("names the running download and counts the run", () => {
    expect(
      selectSyncActivity({
        ...idle,
        bundles: {
          ...idle.bundles!,
          activeCourseIds: ["ik"],
          changingCourseIds: ["hm", "ik"],
          changingDone: 1,
        },
        lastBundleBatch: { id: 4, settledAt: 0, changes: [] },
      }),
    ).toEqual({
      kind: "downloading",
      key: "downloading:5",
      title: "Mengunduh Indonesia → Korea",
      detail: "Kursus 2 dari 3, supaya bisa dipakai offline.",
      progress: { done: 1, total: 3 },
    });
  });

  test("summarizes a settled run for a few seconds", () => {
    const input = {
      ...idle,
      lastBundleBatch: {
        id: 2,
        settledAt: idle.now - 1_000,
        changes: [change("hm", "added", "Hangeul Mastery")],
      },
    };
    expect(selectSyncActivity(input)).toMatchObject({
      kind: "changed",
      key: "batch:2",
      expiresAt: idle.now - 1_000 + SYNC_SUMMARY_MS,
    });
    expect(
      selectSyncActivity({ ...input, now: idle.now + SYNC_SUMMARY_MS }),
    ).toBeNull();
  });

  test("reports queued progress only while operations wait", () => {
    expect(
      selectSyncActivity({
        ...idle,
        outboxWaiting: "offline",
        pendingCount: 0,
      }),
    ).toBeNull();
    expect(
      selectSyncActivity({
        ...idle,
        outboxWaiting: "offline",
        pendingCount: 3,
      }),
    ).toEqual({
      kind: "waiting",
      key: "waiting:offline",
      title: "3 progres belum terkirim",
      detail: "Tersimpan di HP dan dikirim saat online.",
    });
  });
});
