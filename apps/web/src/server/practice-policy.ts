import { createHash } from "node:crypto";

import { shuffleForAttempt } from "./assessment-order";

type Identifiable = { id: string };

export function sampleForPractice<T extends Identifiable>(
  values: readonly T[],
  seed: string,
  limit: number,
) {
  return shuffleForAttempt(values, seed, true, "practice").slice(0, limit);
}

export function vocabularySetVersion(
  entries: readonly { id: string; term: string; definition: string }[],
) {
  const content = [...entries]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, term, definition }) => [id, term, definition]);

  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function gradePracticeChoice(
  options: readonly { id: string; isCorrect: boolean }[],
  selectedOptionIds: readonly string[],
) {
  const allowed = new Set(options.map((option) => option.id));
  const selected = [...new Set(selectedOptionIds)];
  if (selected.some((optionId) => !allowed.has(optionId))) return null;

  const correctOptionIds = options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
    .sort();
  if (correctOptionIds.length === 0) return null;
  selected.sort();

  return {
    correct:
      selected.length === correctOptionIds.length &&
      selected.every((optionId, index) => optionId === correctOptionIds[index]),
    correctOptionIds,
  };
}

export function preparePracticeOptions<
  T extends { id: string; isCorrect: boolean },
>(options: readonly T[], seed: string) {
  return sampleForPractice(options, seed, options.length).map(
    ({ isCorrect: _isCorrect, ...option }) => option,
  );
}
