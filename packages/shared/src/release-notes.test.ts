import { expect, test } from "bun:test";

import {
  compareVersions,
  RELEASE_NOTES,
  releaseNotesAfter,
  releaseNotesSince,
  releaseNotesUpTo,
  type ReleaseNote,
} from "./release-notes";

const note = (id: string, version: string): ReleaseNote => ({
  id,
  version,
  date: id.slice(0, 10),
  title: id,
  items: ["Item"],
});

const notes = [
  note("2026-12-01", "1.1.0"),
  note("2026-11-02", "1.0.0"),
  note("2026-11-01", "1.0.0"),
];

test("compareVersions compares numerically", () => {
  expect(compareVersions("1.10.0", "1.9.2")).toBe(1);
  expect(compareVersions("1.0", "1.0.0")).toBe(0);
  expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
});

test("releaseNotesUpTo and releaseNotesAfter split at the installed version", () => {
  expect(releaseNotesUpTo("1.0.0", notes).map((n) => n.id)).toEqual([
    "2026-11-02",
    "2026-11-01",
  ]);
  expect(releaseNotesAfter("1.0.0", notes).map((n) => n.id)).toEqual([
    "2026-12-01",
  ]);
});

test("releaseNotesSince returns entries newer than the seen one", () => {
  expect(releaseNotesSince(notes, "2026-11-01").map((n) => n.id)).toEqual([
    "2026-12-01",
    "2026-11-02",
  ]);
  expect(releaseNotesSince(notes, "2026-12-01")).toEqual([]);
  expect(releaseNotesSince(notes, "2026-11-01.2").map((n) => n.id)).toEqual([
    "2026-12-01",
    "2026-11-02",
  ]);
});

test("RELEASE_NOTES is newest first with unique ids", () => {
  const ids = RELEASE_NOTES.map((n) => n.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (let index = 1; index < RELEASE_NOTES.length; index++) {
    const newer = RELEASE_NOTES[index - 1]!;
    const older = RELEASE_NOTES[index]!;
    expect(newer.id > older.id).toBe(true);
    expect(
      compareVersions(newer.version, older.version),
    ).toBeGreaterThanOrEqual(0);
  }
  for (const entry of RELEASE_NOTES) {
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.id).toMatch(new RegExp(`^${entry.date}(\\.[2-9])?$`));
    expect(entry.items.length).toBeGreaterThan(0);
  }
});
