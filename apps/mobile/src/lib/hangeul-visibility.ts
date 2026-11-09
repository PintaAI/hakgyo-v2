import {
  HANGEUL_MASTERY_COURSE_ID,
  isHangeulGameKey,
} from "@hakgyo/shared/hangeul";

export type HangeulIndexState = { mastered: boolean; hidden: boolean };

/** Indexes cached before the server added `hangeul` lack it: not mastered. */
type IndexWithHangeul =
  { hangeul?: HangeulIndexState | null } | null | undefined;

export function isHangeulMastered(index: IndexWithHangeul) {
  return index?.hangeul?.mastered === true;
}

/**
 * Copy of the badge shown once the Hangeul Mastery course is finished:
 * waiting to be claimed in the Bab list, filed under Diarsipkan after the
 * claim, or shown again by the learner.
 */
export function hangeulCompletionBadgeCopy(
  state: "unclaimed" | "archived" | "shown",
) {
  switch (state) {
    case "unclaimed":
      return {
        eyebrow: "Lencana baru",
        detail:
          "Klaim lencanamu di daftar Bab pada kartu kelas di tab Belajar.",
      };
    case "archived":
      return {
        eyebrow: "Lencana",
        detail:
          "Kelas ini ada di Diarsipkan di bawah tab Belajar. Tampilkan lagi kapan saja dari sana.",
      };
    case "shown":
      return {
        eyebrow: "Lencana",
        detail:
          "Kelas ini tetap tampil di Belajar karena kamu menampilkannya lagi.",
      };
  }
}

/** Courses for a learner list, without Hangeul Mastery while it is archived. */
export function withoutArchivedHangeulCourse<T extends { id: string }>(
  courses: T[],
  archived: boolean,
) {
  return archived
    ? courses.filter((course) => course.id !== HANGEUL_MASTERY_COURSE_ID)
    : courses;
}

/** Vocabulary stays findable after mastery, like it stays in practice. */
const KEPT_HANGEUL_SEARCH_KINDS = new Set(["vocabularySet", "vocabularyEntry"]);

/**
 * A search result left out of Cari while Hangeul Mastery is archived: the
 * course itself, its modules, materials and assessments, and the Hangeul
 * games. Its vocabulary sets and words stay.
 */
export function isHiddenHangeulDocument(
  document: {
    kind: string;
    target: { type: string; gameKey?: string; courseId?: string };
  },
  hidden: boolean,
) {
  if (!hidden || KEPT_HANGEUL_SEARCH_KINDS.has(document.kind)) return false;
  const { target } = document;
  return target.type === "game"
    ? isHangeulGameKey(target.gameKey)
    : target.courseId === HANGEUL_MASTERY_COURSE_ID;
}

/** Whether any stored index (one per organization scope) says mastered. */
export function isHangeulMasteredInIndexes(indexes: IndexWithHangeul[]) {
  return indexes.some((index) => isHangeulMastered(index));
}
