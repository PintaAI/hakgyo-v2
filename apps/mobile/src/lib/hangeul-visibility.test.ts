import { describe, expect, test } from "bun:test";

import {
  hangeulCompletionBadgeCopy,
  isHangeulMastered,
  isHangeulMasteredInIndexes,
  isHiddenHangeulDocument,
  withoutArchivedHangeulCourse,
} from "./hangeul-visibility";
import { achievementLabel } from "./study";

const HANGEUL = "hakgyo-foundation-hangeul-mastery";

describe("Hangeul visibility", () => {
  test("indexes cached before the field existed are not mastered", () => {
    expect(isHangeulMastered(undefined)).toBe(false);
    expect(isHangeulMastered({})).toBe(false);
    expect(
      isHangeulMastered({ hangeul: { mastered: true, hidden: true } }),
    ).toBe(true);
  });

  test("filters only the Hangeul Mastery course, only while archived", () => {
    const courses = [{ id: HANGEUL }, { id: "course-2" }];
    expect(withoutArchivedHangeulCourse(courses, false)).toEqual(courses);
    expect(withoutArchivedHangeulCourse(courses, true)).toEqual([
      { id: "course-2" },
    ]);
  });

  test("hides the Hangeul games and course documents in search", () => {
    const game = (gameKey: string) => ({
      kind: "game",
      target: { type: "game", gameKey },
    });
    expect(isHiddenHangeulDocument(game("stroke-master"), true)).toBe(true);
    expect(isHiddenHangeulDocument(game("cards"), true)).toBe(false);
    const lessonTarget = {
      type: "courseItem",
      courseId: HANGEUL,
      courseItemId: "i1",
    };
    for (const kind of ["material", "assessment"]) {
      expect(
        isHiddenHangeulDocument({ kind, target: lessonTarget }, true),
      ).toBe(true);
    }
    for (const kind of ["course", "module"]) {
      expect(
        isHiddenHangeulDocument(
          { kind, target: { type: "course", courseId: HANGEUL } },
          true,
        ),
      ).toBe(true);
    }
    expect(
      isHiddenHangeulDocument(
        { kind: "course", target: { type: "course", courseId: "course-2" } },
        true,
      ),
    ).toBe(false);
    expect(
      isHiddenHangeulDocument(
        { kind: "course", target: { type: "course", courseId: HANGEUL } },
        false,
      ),
    ).toBe(false);
  });

  test("keeps Hangeul vocabulary sets and words in search", () => {
    expect(
      isHiddenHangeulDocument(
        {
          kind: "vocabularySet",
          target: { type: "courseItem", courseId: HANGEUL },
        },
        true,
      ),
    ).toBe(false);
    expect(
      isHiddenHangeulDocument(
        {
          kind: "vocabularyEntry",
          target: { type: "vocabularyEntry", courseId: HANGEUL },
        },
        true,
      ),
    ).toBe(false);
  });

  test("the badge copy says whether the class moved to Diarsipkan", () => {
    expect(hangeulCompletionBadgeCopy("unclaimed").detail).toContain("Klaim");
    expect(hangeulCompletionBadgeCopy("archived").detail).toContain(
      "Diarsipkan",
    );
    expect(hangeulCompletionBadgeCopy("shown").detail).toContain(
      "tetap tampil",
    );
  });

  test("any stored index can say mastered", () => {
    expect(
      isHangeulMasteredInIndexes([
        { hangeul: { mastered: false, hidden: false } },
        { hangeul: { mastered: true, hidden: true } },
        {},
      ]),
    ).toBe(true);
    expect(isHangeulMasteredInIndexes([])).toBe(false);
  });

  test("labels the achievement", () => {
    expect(achievementLabel("HANGEUL_MASTERY")).toBe("Hangeul Mastery");
  });
});
