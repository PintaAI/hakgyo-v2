import {
  HANGEUL_MASTERY_COURSE_ID,
  isHangeulGameKey,
} from "@hakgyo/shared/hangeul";

export type HangeulIndexState = { mastered: boolean; hidden: boolean };

/** Indexes cached before the server added `hangeul` lack it: not hidden. */
type IndexWithHangeul =
  { hangeul?: HangeulIndexState | null } | null | undefined;

/**
 * Whether learner lists leave out the Hangeul Mastery course and games: the
 * learner mastered it and did not choose to show it again in Pengaturan.
 * Direct links and practice pools ignore this.
 */
export function isHangeulHidden(index: IndexWithHangeul) {
  return index?.hangeul?.hidden === true;
}

export function isHangeulMastered(index: IndexWithHangeul) {
  return index?.hangeul?.mastered === true;
}

/**
 * The learner mastered Hangeul and chose "Tampilkan Hangeul Mastery", so the
 * course stays in their lists (and the badge is not new: the switch only
 * appears after mastery).
 */
export function isHangeulShownAgain(index: IndexWithHangeul) {
  return isHangeulMastered(index) && !isHangeulHidden(index);
}

/** Copy of the badge shown once the Hangeul Mastery course is finished. */
export function hangeulCompletionBadgeCopy(shownAgain: boolean) {
  return shownAgain
    ? {
        eyebrow: "Lencana",
        detail:
          "Kurikulum ini tetap tampil karena kamu memilih menampilkannya di Pengaturan.",
      }
    : {
        eyebrow: "Lencana baru",
        detail:
          "Kurikulum ini sekarang disembunyikan dari daftarmu. Tampilkan lagi kapan saja lewat Pengaturan di Profil.",
      };
}

/** Courses for a learner list, without Hangeul Mastery when it is hidden. */
export function withoutHiddenHangeulCourse<T extends { id: string }>(
  courses: T[],
  hidden: boolean,
) {
  return hidden
    ? courses.filter((course) => course.id !== HANGEUL_MASTERY_COURSE_ID)
    : courses;
}

/** Vocabulary stays findable after mastery, like it stays in practice. */
const KEPT_HANGEUL_SEARCH_KINDS = new Set(["vocabularySet", "vocabularyEntry"]);

/**
 * A search result left out of Cari while Hangeul Mastery is hidden: the
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

/** The index with the learner's new "Tampilkan Hangeul Mastery" choice. */
export function withHangeulPreference<T extends IndexWithHangeul & object>(
  index: T,
  show: boolean,
): T & { hangeul: HangeulIndexState } {
  const mastered = isHangeulMastered(index);
  return { ...index, hangeul: { mastered, hidden: mastered && !show } };
}

/**
 * Hangeul visibility across the stored indexes of every organization scope:
 * the newest index that carries it wins, since it is the same for all scopes.
 */
export function isHangeulHiddenInIndexes(
  indexes: ({ generatedAt: string } & IndexWithHangeul & object)[],
) {
  let newest: (typeof indexes)[number] | undefined;
  for (const index of indexes) {
    if (!index.hangeul) continue;
    if (!newest || index.generatedAt > newest.generatedAt) newest = index;
  }
  return isHangeulHidden(newest);
}
