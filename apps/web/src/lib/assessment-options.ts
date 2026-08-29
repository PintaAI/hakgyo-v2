export const ASSESSMENT_OPTION_SYMBOLS = ["①", "②", "③", "④"] as const;

export const MIN_ASSESSMENT_OPTIONS = 2;
export const MAX_ASSESSMENT_OPTIONS = ASSESSMENT_OPTION_SYMBOLS.length;

export function getAssessmentOptionLabel(index: number) {
  return ASSESSMENT_OPTION_SYMBOLS[index] ?? `Opsi ${index + 1}`;
}
