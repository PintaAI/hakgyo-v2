import type {
  BundleChange,
  BundleChangeBatch,
  BundleSyncProgress,
  SyncQueuedReason,
  SyncRefreshPhase,
} from "./types";

/** How long the summary of finished downloads stays visible. */
export const SYNC_SUMMARY_MS = 5_000;

export type SyncActivityKind =
  | "preparing"
  | "downloading"
  | "changed"
  | "failed"
  | "waiting"
  | "updating"
  | "update";

/**
 * What sync is doing that the learner should know about, in the copy every
 * surface shows (the iOS tab bar accessory, the Android snackbar). An app
 * update uses the same surfaces while it downloads (`updating`) and once it
 * waits for a restart (`update`), where pressing it restarts the app instead
 * of opening the sync status.
 */
export type SyncActivity = {
  kind: SyncActivityKind;
  /**
   * Identifies one announcement: one run of downloads, its summary, or one
   * stretch of waiting. Surfaces that announce once (the snackbar) compare it.
   */
  key: string;
  title: string;
  detail: string;
  /** Downloads only: courses finished and in total. */
  progress?: { done: number; total: number };
  /** When a summary stops showing (ms since epoch). */
  expiresAt?: number;
};

export type SyncActivityInput = {
  bundles: BundleSyncProgress | null;
  lastBundleBatch: BundleChangeBatch | null;
  outboxWaiting: SyncQueuedReason | null;
  pendingCount: number;
  /** What a running refresh waits for, or null. */
  refreshPhase: SyncRefreshPhase | null;
  /** False until the first sync wrote a learner index to this device. */
  hasIndex: boolean;
  /** Course titles by id, from the learner index. */
  courseTitles: Record<string, string>;
  /** The app update being downloaded or waiting for a restart, or null. */
  appUpdate: AppUpdateState | null;
  now: number;
};

/** An EAS Update in progress: downloading, or downloaded (its id, or `"rollback"`). */
export type AppUpdateState =
  | { status: "downloading"; progress: number | null }
  | { status: "ready"; id: string };

export const UPDATE_DOWNLOADING_TITLE = "Mengunduh pembaruan aplikasi";
export const UPDATE_DOWNLOADING_DETAIL =
  "Kamu tetap bisa belajar seperti biasa.";
export const UPDATE_READY_TITLE = "Pembaruan aplikasi siap";
export const UPDATE_READY_DETAIL =
  "Ketuk untuk memulai ulang. Progresmu tetap aman.";

export const PREPARING_TITLE = "Menyiapkan akunmu";

/** What the first sync waits for from the server, by refresh phase. */
export const PREPARING_DETAIL: Record<SyncRefreshPhase, string> = {
  manifest: "Menghubungi server Hakgyo…",
  index: "Mengambil kelas dan kursusmu…",
};

/** Where queued progress stands, by why it waits. */
export const WAITING_DETAIL: Record<SyncQueuedReason, string> = {
  offline: "Tersimpan di HP dan dikirim saat online.",
  unavailable: "Tersimpan di HP dan dikirim otomatis nanti.",
  maintenance: "Tersimpan di HP dan dikirim setelah pemeliharaan.",
  "upgrade-required": "Perbarui aplikasi untuk mengirimnya.",
};

function courseName(title: string | null | undefined) {
  return title?.trim() || "Kursus";
}

/** One line about a settled run of downloads, or null when nothing changed. */
export function summarizeBundleChanges(
  changes: BundleChange[],
): Pick<SyncActivity, "kind" | "title" | "detail"> | null {
  const latest = new Map<string, BundleChange>();
  for (const change of changes) latest.set(change.courseId, change);
  const all = [...latest.values()];
  const failed = all.filter((change) => change.kind === "failed");
  if (failed.length) {
    return {
      kind: "failed",
      title:
        failed.length === 1
          ? `Gagal mengunduh ${courseName(failed[0]?.title)}`
          : `Gagal mengunduh ${failed.length} kursus`,
      detail: "Dicoba lagi otomatis. Materi yang sudah ada tetap bisa dibuka.",
    };
  }
  if (!all.length) return null;
  const added = all.filter((change) => change.kind === "added");
  const only = all.length === 1 ? all[0] : undefined;
  if (added.length === all.length) {
    return {
      kind: "changed",
      title: only
        ? `${courseName(only.title)} siap dipakai offline`
        : `${all.length} kursus siap dipakai offline`,
      detail: "Sudah diunduh ke HP ini.",
    };
  }
  return {
    kind: "changed",
    title: only
      ? `${courseName(only.title)} diperbarui`
      : `${all.length} kursus diperbarui`,
    detail: "Materi terbaru sudah ada di HP ini.",
  };
}

/**
 * The activity to show right now, most useful first: the first sync of a
 * device with nothing to show yet, course downloads in progress, an app update
 * downloading, the summary of the downloads that just finished, progress
 * waiting to be sent, then a downloaded app update waiting for a restart. Null when there is nothing worth interrupting the
 * learner for.
 */
export function selectSyncActivity(
  input: SyncActivityInput,
): SyncActivity | null {
  if (!input.hasIndex && input.refreshPhase) {
    return {
      kind: "preparing",
      key: "preparing",
      title: PREPARING_TITLE,
      detail: PREPARING_DETAIL[input.refreshPhase],
    };
  }

  const batchId = input.lastBundleBatch?.id ?? 0;
  const changing = input.bundles?.changingCourseIds ?? [];
  if (changing.length) {
    const running = input.bundles?.activeCourseIds ?? [];
    const courseId =
      changing.find((id) => running.includes(id)) ?? changing[0] ?? "";
    const done = input.bundles?.changingDone ?? 0;
    const total = done + changing.length;
    return {
      kind: "downloading",
      key: `downloading:${batchId + 1}`,
      title: `Mengunduh ${courseName(input.courseTitles[courseId])}`,
      detail:
        total > 1
          ? `Kursus ${Math.min(done + 1, total)} dari ${total}, supaya bisa dipakai offline.`
          : "Supaya bisa dipakai offline.",
      progress: { done, total },
    };
  }

  if (input.appUpdate?.status === "downloading") {
    const percent = input.appUpdate.progress;
    return {
      kind: "updating",
      key: "updating",
      title: UPDATE_DOWNLOADING_TITLE,
      detail:
        percent !== null
          ? `${percent}% · ${UPDATE_DOWNLOADING_DETAIL}`
          : UPDATE_DOWNLOADING_DETAIL,
    };
  }

  const batch = input.lastBundleBatch;
  if (batch && input.now - batch.settledAt < SYNC_SUMMARY_MS) {
    const summary = summarizeBundleChanges(batch.changes);
    if (summary) {
      return {
        ...summary,
        key: `batch:${batch.id}`,
        expiresAt: batch.settledAt + SYNC_SUMMARY_MS,
      };
    }
  }

  if (input.outboxWaiting && input.pendingCount > 0) {
    return {
      kind: "waiting",
      key: `waiting:${input.outboxWaiting}`,
      title: `${input.pendingCount} progres belum terkirim`,
      detail: WAITING_DETAIL[input.outboxWaiting],
    };
  }

  if (input.appUpdate?.status === "ready") {
    return {
      kind: "update",
      key: `update:${input.appUpdate.id}`,
      title: UPDATE_READY_TITLE,
      detail: UPDATE_READY_DETAIL,
    };
  }
  return null;
}
