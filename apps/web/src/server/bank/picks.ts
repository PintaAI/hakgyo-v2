/**
 * The package record kept in `AssessmentGeneration.picks` (docs/eps-question-generator.md section 3):
 * which bank unit fills each slot, the swaps since, and each copy's option order.
 */

export type PackagePicks = {
  slots: Array<{
    number: number;
    questionIds: string[];
    groupId: string | null;
  }>;
  warnings: string[];
  swaps: Array<{
    number: number;
    from: string[];
    to: string[];
    at: string;
    byUserId: string;
  }>;
  /** Package question id → the bank option positions in package order, for statistics. */
  options: Record<string, number[]>;
};

export function readPicks(value: unknown): PackagePicks {
  const picks = (value ?? {}) as Partial<PackagePicks>;
  return {
    slots: picks.slots ?? [],
    warnings: picks.warnings ?? [],
    swaps: picks.swaps ?? [],
    options: picks.options ?? {},
  };
}
