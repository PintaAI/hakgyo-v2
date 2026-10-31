import { useSyncExternalStore } from "react";

import type { SyncActivity } from "./activity";

/**
 * Development only: sample activities that Pengaturan → Pengembangan steps
 * through, so the tab bar accessory, snackbar and their copy can be checked
 * without waiting for real downloads or going offline.
 */
const samples: Omit<SyncActivity, "key">[] = [
  {
    kind: "downloading",
    title: "Mengunduh Hangeul Mastery",
    detail: "Kursus 1 dari 2, supaya bisa dipakai offline.",
    progress: { done: 0, total: 2 },
  },
  {
    kind: "changed",
    title: "Indonesia → Korea diperbarui",
    detail: "Materi terbaru sudah ada di HP ini.",
  },
  {
    kind: "failed",
    title: "Gagal mengunduh Korea → Indonesia",
    detail: "Dicoba lagi otomatis. Materi yang sudah ada tetap bisa dibuka.",
  },
  {
    kind: "waiting",
    title: "3 progres belum terkirim",
    detail: "Tersimpan di HP dan dikirim saat online.",
  },
];

let step = -1;
let preview: SyncActivity | null = null;
const listeners = new Set<() => void>();

/** Shows the next sample, then none after the last one. Returns its title. */
export function stepSyncActivityPreview() {
  step = step + 1 > samples.length ? 0 : step + 1;
  const sample = samples[step];
  preview = sample ? { ...sample, key: `preview:${step}:${Date.now()}` } : null;
  for (const listener of listeners) listener();
  return preview?.title ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncActivityPreview() {
  return useSyncExternalStore(
    subscribe,
    () => preview,
    () => null,
  );
}
