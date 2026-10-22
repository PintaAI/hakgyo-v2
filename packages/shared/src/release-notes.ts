/**
 * "Yang baru" (what's new) of the mobile app, newest first. See "What's new"
 * in docs/mobile-releases.md.
 *
 * Every EAS Update and store build ships the entries of its JavaScript bundle:
 * after an update the app shows the entries the learner has not seen yet, and
 * Pengaturan → Yang baru lists them all. The web server reads the same list to
 * show what a store build adds when an outdated binary must update from the
 * store, because that binary cannot contain notes written after it was built.
 *
 * Add an entry in the same PR as the change, before `ota:publish` or a store
 * build. Write for learners, in plain Indonesian, one short sentence per item.
 */
export type ReleaseNote = {
  /**
   * The release date, plus `.2`, `.3` … for later releases on the same day.
   * Ids sort in release order; the app remembers the newest one it showed.
   */
  id: string;
  /**
   * App `version` (the runtime, `apps/mobile/app.config.ts`) that first ships
   * the entry. An entry for a version newer than the store build is shown as
   * what the store update adds.
   */
  version: string;
  /** Release date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  items: readonly string[];
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: "2026-10-21",
    version: "1.0.0",
    date: "2026-10-21",
    title: "Catatan pembaruan",
    items: [
      "Setelah aplikasi diperbarui, kamu langsung melihat apa saja yang baru.",
      "Riwayat semua pembaruan ada di Pengaturan → Yang baru.",
    ],
  },
];

/** Compares dotted numeric versions (`1.10.0` > `1.9.2`); missing parts count as 0. */
export function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

/** Entries a build of `version` ships: its own and every older version's. */
export function releaseNotesUpTo(
  version: string,
  notes: readonly ReleaseNote[] = RELEASE_NOTES,
) {
  return notes.filter((note) => compareVersions(note.version, version) <= 0);
}

/** Entries only a newer store build has, for a binary of `version`. */
export function releaseNotesAfter(
  version: string,
  notes: readonly ReleaseNote[] = RELEASE_NOTES,
) {
  return notes.filter((note) => compareVersions(note.version, version) > 0);
}

/**
 * Entries released after `lastSeenId`. Compares ids rather than positions, so
 * an entry removed from the list or a rolled-back update never replays the
 * history.
 */
export function releaseNotesSince(
  notes: readonly ReleaseNote[],
  lastSeenId: string,
) {
  return notes.filter((note) => note.id > lastSeenId);
}
