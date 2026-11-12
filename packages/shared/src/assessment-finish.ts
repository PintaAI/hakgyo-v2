import type { SectionNavigation } from "./assessment-question-rules";

/**
 * Questions the learner never opened and can still open, as question indexes,
 * the one to open first leading: the next one after the current question,
 * then from the start of the section. Asked before finishing a tugas or a
 * section, so the confirmation can offer to go there instead.
 *
 * Only reachable questions count: the running section (or the whole tugas
 * without sections), from the current question on in a forward-only section,
 * and none in a paced one, which moves by itself. The question on screen
 * counts as opened.
 */
export function unseenQuestions(input: {
  /** The question indexes of the running section, in order. */
  indexes: readonly number[];
  /** The question index on screen. */
  current: number;
  navigation?: SectionNavigation;
  isSeen: (index: number) => boolean;
}): number[] {
  const { indexes, current, navigation, isSeen } = input;
  if (navigation === "PACED") return [];
  const position = indexes.indexOf(current);
  const unseen = (from: number, to: number) =>
    indexes
      .slice(from, to)
      .filter((index) => index !== current && !isSeen(index));
  const ahead = unseen(position + 1, indexes.length);
  return navigation === "FORWARD_ONLY"
    ? ahead
    : [...ahead, ...unseen(0, Math.max(position, 0))];
}

/** "3 soal belum kamu buka." (or "… di bagian ini …"), or null when none. */
export function unseenNotice(count: number, inSection = false) {
  if (count === 0) return null;
  return `${count} soal${inSection ? " di bagian ini" : ""} belum kamu buka.`;
}
