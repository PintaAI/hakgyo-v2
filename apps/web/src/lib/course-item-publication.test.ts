import { describe, expect, test } from "bun:test";

import {
  defaultCourseItemPublished,
  knownNotReadyReason,
} from "./course-item-publication";

describe("defaultCourseItemPublished", () => {
  test("publishes newly attached library items by default for a published course", () => {
    expect(defaultCourseItemPublished("PUBLISHED")).toBe(true);
  });

  test("keeps newly attached library items hidden for unpublished courses", () => {
    expect(defaultCourseItemPublished("DRAFT")).toBe(false);
  });

  test("keeps items that are known to be not ready hidden", () => {
    expect(
      defaultCourseItemPublished("PUBLISHED", "Tugas belum memiliki soal."),
    ).toBe(false);
  });
});

describe("knownNotReadyReason", () => {
  test("flags an assessment without questions", () => {
    expect(
      knownNotReadyReason({
        type: "ASSESSMENT",
        questionCount: 0,
        placementsInModule: [],
      }),
    ).toBe("Tugas ini belum memiliki soal.");
  });

  test("uses the readiness of an existing placement in the module", () => {
    expect(
      knownNotReadyReason({
        type: "MATERIAL",
        placementsInModule: [
          {
            ready: false,
            reasons: [{ message: "Kosakata belum ditambahkan." }],
          },
        ],
      }),
    ).toBe("Kosakata belum ditambahkan.");
  });

  test("returns null when nothing is known against the resource", () => {
    expect(
      knownNotReadyReason({
        type: "ASSESSMENT",
        questionCount: 3,
        placementsInModule: [{ ready: true, reasons: [] }],
      }),
    ).toBeNull();
    expect(
      knownNotReadyReason({ type: "VOCABULARY_SET", placementsInModule: [] }),
    ).toBeNull();
  });
});
