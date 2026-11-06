import { isForwardOnly, type SectionNavigation } from "@hakgyo/shared";

/**
 * A section's rules in the learner's words, for its intro: how questions
 * move and whether answers can change. Empty for a section without rules.
 */
export function sectionRules(section: {
  navigation: SectionNavigation;
  lockAnswers: boolean;
}): string[] {
  const rules: string[] = [];
  if (section.navigation === "PACED") {
    rules.push("Soal berganti sendiri setelah waktunya habis.");
  } else if (isForwardOnly(section.navigation)) {
    rules.push("Soal yang sudah dilewati tidak bisa dibuka lagi.");
  }
  if (section.lockAnswers) {
    rules.push("Pilihan pertama kamu langsung dikunci.");
  } else if (isForwardOnly(section.navigation)) {
    rules.push("Jawaban bisa diubah selama soal masih tampil.");
  }
  return rules;
}
