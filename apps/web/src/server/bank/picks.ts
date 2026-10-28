/**
 * The record kept in `AssessmentGeneration.picks` (docs/eps-question-generator.md section 3):
 * which bank unit filled each slot, the checks that stayed unmet, and each copy's option order.
 * A record only: the generated set is the organization's own and may be edited afterwards.
 */

export type GenerationPicks = {
  slots: Array<{
    number: number;
    questionIds: string[];
    groupId: string | null;
  }>;
  warnings: string[];
  /** Set question id → the bank option positions in the set's order. */
  options: Record<string, number[]>;
};

export function readPicks(value: unknown): GenerationPicks {
  const picks = (value ?? {}) as Partial<GenerationPicks>;
  return {
    slots: picks.slots ?? [],
    warnings: picks.warnings ?? [],
    options: picks.options ?? {},
  };
}
