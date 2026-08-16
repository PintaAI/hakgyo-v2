export type CorrectnessOption = {
  id: string;
  isCorrect: boolean;
};

export function keepSingleChoiceCorrectOption(
  options: CorrectnessOption[],
): string | null {
  return options.find((option) => option.isCorrect)?.id ?? null;
}
