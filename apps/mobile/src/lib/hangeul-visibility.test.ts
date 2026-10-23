import { describe, expect, test } from "bun:test";

import {
  isHangeulHidden,
  isHangeulHiddenInIndexes,
  hangeulCompletionBadgeCopy,
  isHangeulShownAgain,
  isHiddenHangeulDocument,
  withHangeulPreference,
  withoutHiddenHangeulCourse,
} from "./hangeul-visibility";
import { achievementLabel } from "./study";

const HANGEUL = "hakgyo-foundation-hangeul-mastery";

describe("Hangeul visibility", () => {
  test("indexes cached before the field existed are not hidden", () => {
    expect(isHangeulHidden(undefined)).toBe(false);
    expect(isHangeulHidden({})).toBe(false);
    expect(isHangeulHidden({ hangeul: { mastered: true, hidden: true } })).toBe(
      true,
    );
  });

  test("filters only the Hangeul Mastery course, only while hidden", () => {
    const courses = [{ id: HANGEUL }, { id: "course-2" }];
    expect(withoutHiddenHangeulCourse(courses, false)).toEqual(courses);
    expect(withoutHiddenHangeulCourse(courses, true)).toEqual([
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

  test("the badge copy says whether the course stays listed", () => {
    expect(
      isHangeulShownAgain({ hangeul: { mastered: true, hidden: false } }),
    ).toBe(true);
    expect(
      isHangeulShownAgain({ hangeul: { mastered: true, hidden: true } }),
    ).toBe(false);
    expect(isHangeulShownAgain(undefined)).toBe(false);
    expect(hangeulCompletionBadgeCopy(false).eyebrow).toBe("Lencana baru");
    expect(hangeulCompletionBadgeCopy(true).detail).toContain("tetap tampil");
  });

  test("the newest index that carries the flag decides", () => {
    expect(
      isHangeulHiddenInIndexes([
        {
          generatedAt: "2026-10-22T01:00:00.000Z",
          hangeul: { mastered: true, hidden: true },
        },
        {
          generatedAt: "2026-10-22T02:00:00.000Z",
          hangeul: { mastered: true, hidden: false },
        },
        { generatedAt: "2026-10-22T03:00:00.000Z" },
      ]),
    ).toBe(false);
    expect(isHangeulHiddenInIndexes([])).toBe(false);
  });

  test("applies the switch optimistically, only after mastery", () => {
    const mastered = { courses: [], hangeul: { mastered: true, hidden: true } };
    expect(withHangeulPreference(mastered, true).hangeul).toEqual({
      mastered: true,
      hidden: false,
    });
    expect(withHangeulPreference(mastered, false).hangeul).toEqual({
      mastered: true,
      hidden: true,
    });
    expect(withHangeulPreference({ courses: [] }, false).hangeul).toEqual({
      mastered: false,
      hidden: false,
    });
  });

  test("labels the achievement", () => {
    expect(achievementLabel("HANGEUL_MASTERY")).toBe("Hangeul Mastery");
  });
});
