import type {
  Blueprint,
  BlueprintDifficulty,
  BlueprintSlot,
} from "@hakgyo/shared";

import { trigramSetSimilarity, trigrams } from "~/server/bank/draft-checks";

/**
 * Picks bank questions for one package (docs/eps-question-generator.md section 4.1). Pure and
 * seeded: the same bank, usage and seed give the same package. No database, no clock.
 *
 * 1. Candidates per slot: LIVE units with the slot's type (or an allowed alternative). A unit is
 *    one question, or a group that fills consecutive slots.
 * 2. No unit twice, and nothing too similar to a picked unit of the same type, unless only
 *    similar ones are left.
 * 3. Weights favour units this organization used least and longest ago, low global exposure, and
 *    a difficulty that matches the slot.
 * 4. Weighted random pick with the seed.
 * 5. Package checks (difficulty near the slot's, work-topic share, no three same-topic questions
 *    in a row), repaired by swapping a unit for one that fixes the problem, a bounded number of
 *    times. What stays unfixed comes back as a warning.
 */

export type BankUnit = {
  /** Question ids in order (one, or a group's questions). */
  questionIds: string[];
  groupId: string | null;
  /** The first question's type; a group checks each slot against `memberTypes`. */
  type: string;
  /** Each question's type, in order, for groups whose questions differ (an L8 then an L9). */
  memberTypes?: readonly string[];
  level: BlueprintDifficulty | null;
  topic: string | null;
  /** Prompt and options as plain text, for the similarity exclusion. */
  text: string;
  /** Times this organization's packages used it, and when last (epoch ms). */
  organizationUses: number;
  lastUsedAt: number | null;
  /** Times any package used it. */
  globalUses: number;
};

export type SlotPick = {
  number: number;
  slot: BlueprintSlot;
  unit: BankUnit;
};

export type Selection = {
  picks: SlotPick[];
  /** Slots no unit could fill, with how many candidates the type has. */
  missing: Array<{ number: number; type: string; available: number }>;
  /** Checks the repair could not satisfy, in Indonesian. */
  warnings: string[];
};

/** Re-picks the package checks may cause at most. */
const MAX_REPAIRS = 60;
/** Replacements tried per slot for one problem. */
const SWAP_ATTEMPTS = 6;
const SIMILARITY_LIMIT = 0.6;
const levelOrder: BlueprintDifficulty[] = ["mudah", "sedang", "sulit"];

/** A small seeded random number generator (mulberry32 over a string hash). */
export function seededRandom(seed: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  let state = hash >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const allows = (slot: BlueprintSlot, type: string) =>
  slot.type === type || Boolean(slot.alternatives?.includes(type));

/** How well a unit suits a slot, before the random pick (always above 0). */
export function unitWeight(unit: BankUnit, slot: BlueprintSlot, now: number) {
  const use = 1 / (1 + unit.organizationUses);
  const recency =
    unit.lastUsedAt === null
      ? 1
      : Math.min(1, 0.3 + (now - unit.lastUsedAt) / (90 * 24 * 60 * 60 * 1000));
  const exposure = 1 / (1 + unit.globalUses * 0.2);
  const distance =
    unit.level === null
      ? 2
      : Math.abs(
          levelOrder.indexOf(unit.level) - levelOrder.indexOf(slot.difficulty),
        );
  const level = [3, 1, 0.3][Math.min(distance, 2)]!;
  // The slot's own type comes before an alternative, which only varies packages now and then.
  const type = unit.type === slot.type ? 1 : 0.35;
  return use * recency * exposure * level * type;
}

function weightedPick<T>(
  items: readonly T[],
  weight: (item: T) => number,
  random: () => number,
) {
  const weights = items.map(weight);
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return undefined;
  let roll = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index]!;
    if (roll <= 0) return items[index];
  }
  return items.at(-1);
}

type Fill = { start: number; unit: BankUnit };

/**
 * Builds a package from `units` (LIVE bank units) for `blueprint`. `now` is passed in so the
 * result never depends on the clock.
 */
export function selectPackage(input: {
  blueprint: Blueprint;
  units: readonly BankUnit[];
  seed: string;
  now: number;
}): Selection {
  const random = seededRandom(input.seed);
  const slots = input.blueprint.sections.flatMap((section) =>
    section.slots.map((slot) => ({ slot, section: section.key })),
  );
  const fills: Array<Fill | null> = slots.map(() => null);
  const used = new Set<BankUnit>();

  const fits = (unit: BankUnit, start: number) =>
    unit.questionIds.every((_, offset) => {
      const entry = slots[start + offset];
      return (
        entry?.section === slots[start]!.section &&
        allows(entry.slot, unit.memberTypes?.[offset] ?? unit.type) &&
        (offset === 0 || fills[start + offset] === null)
      );
    });
  const grams = new Map(input.units.map((unit) => [unit, trigrams(unit.text)]));
  const tooSimilar = (unit: BankUnit) =>
    [...used].some(
      (other) =>
        other.type === unit.type &&
        trigramSetSimilarity(grams.get(unit)!, grams.get(other)!) >=
          SIMILARITY_LIMIT,
    );
  const place = (start: number, unit: BankUnit) => {
    unit.questionIds.forEach((_, offset) => {
      fills[start + offset] = { start, unit };
    });
    used.add(unit);
  };
  const remove = (start: number) => {
    const fill = fills[start];
    if (!fill) return;
    fill.unit.questionIds.forEach((_, offset) => {
      fills[fill.start + offset] = null;
    });
    used.delete(fill.unit);
  };
  /** A filling pick may fall back to similar units; a repair pick may not. */
  const pickFor = (
    start: number,
    exclude: ReadonlySet<BankUnit> = new Set(),
    allowSimilar = true,
    wants: (unit: BankUnit) => boolean = () => true,
  ) => {
    const candidates = input.units.filter(
      (unit) =>
        !used.has(unit) &&
        !exclude.has(unit) &&
        fits(unit, start) &&
        wants(unit),
    );
    const distinct = candidates.filter((unit) => !tooSimilar(unit));
    return weightedPick(
      distinct.length || !allowSimilar ? distinct : candidates,
      (unit) => unitWeight(unit, slots[start]!.slot, input.now),
      random,
    );
  };

  for (let index = 0; index < slots.length; index += 1) {
    if (fills[index]) continue;
    const unit = pickFor(index);
    if (unit) place(index, unit);
  }

  // Package checks, repaired by swapping one unit at a time for a candidate that fixes the problem.
  const workTopics = new Set(input.blueprint.workTopics.tags);
  const isWork = (unit: BankUnit) => workTopics.has(unit.topic ?? "");
  type Problem = {
    message: string;
    /** How far off the package is (questions to change), so partial repairs count. */
    size: number;
    /** Slots (unit starts) whose unit could be swapped, best first. */
    starts: number[];
    /** What the replacement for `current` at `start` must be. */
    wants: (unit: BankUnit, current: BankUnit, start: number) => boolean;
  };
  const levelDistance = (unit: BankUnit, start: number) =>
    unit.level === null
      ? 2
      : Math.abs(
          levelOrder.indexOf(unit.level) -
            levelOrder.indexOf(slots[start]!.slot.difficulty),
        );
  const problems = () => {
    const found: Problem[] = [];
    for (const section of input.blueprint.sections) {
      const indexes = slots.flatMap((entry, index) =>
        entry.section === section.key ? [index] : [],
      );
      const topics = indexes.map((index) => fills[index]?.unit.topic ?? null);
      for (let offset = 2; offset < topics.length; offset += 1) {
        const topic = topics[offset];
        if (
          topic &&
          topic === topics[offset - 1] &&
          topic === topics[offset - 2]
        ) {
          const run = [offset, offset - 2, offset - 1].map(
            (position) => fills[indexes[position]!]!.start,
          );
          found.push({
            message: `${section.title}: tiga soal berturut-turut bertopik sama.`,
            size: 1,
            starts: [...new Set(run)],
            wants: (unit) => unit.topic !== topic,
          });
        }
      }
      const starts = indexes.filter((index) => fills[index]?.start === index);
      if (starts.length && indexes.every((index) => fills[index])) {
        const work = indexes.filter((index) => isWork(fills[index]!.unit));
        const share = work.length / indexes.length;
        const { minShare, maxShare } = input.blueprint.workTopics;
        if (share < minShare - 1e-9 || share > maxShare + 1e-9) {
          const tooFew = share < minShare;
          const bound = (tooFew ? minShare : maxShare) * indexes.length;
          found.push({
            size: Math.ceil(Math.abs(work.length - bound) - 1e-9),
            message: `${section.title}: soal pekerjaan, K3 dan lembaga ${tooFew ? "kurang" : "lebih"} dari ${Math.round((tooFew ? minShare : maxShare) * 100)}%.`,
            // Swap single questions, so the share moves one question at a time.
            starts: starts.filter(
              (start) =>
                isWork(fills[start]!.unit) !== tooFew &&
                fills[start]!.unit.questionIds.length === 1,
            ),
            wants: (unit) => isWork(unit) === tooFew,
          });
        }
      }
      for (const start of starts) {
        const unit = fills[start]!.unit;
        if (levelDistance(unit, start) > 1) {
          found.push({
            message: `Soal ${slots[start]!.slot.number}: tingkat jauh dari sasaran.`,
            size: 1,
            starts: [start],
            wants: (candidate) => levelDistance(candidate, start) <= 1,
          });
        }
      }
    }
    return found;
  };

  // A swap is kept only when it leaves fewer problems, so repairs never trade one for another.
  const unfixable = new Set<string>();
  for (let repair = 0; repair < MAX_REPAIRS; repair += 1) {
    const before = problems();
    const size = (list: Problem[]) =>
      list.reduce((sum, entry) => sum + entry.size, 0);
    const problem = before.find((entry) => !unfixable.has(entry.message));
    if (!problem) break;
    let fixed = false;
    for (const start of problem.starts) {
      const current = fills[start]!.unit;
      const tried = new Set([current]);
      for (let attempt = 0; attempt < SWAP_ATTEMPTS && !fixed; attempt += 1) {
        remove(start);
        const replacement = pickFor(
          start,
          tried,
          false,
          (unit) =>
            unit.questionIds.length === current.questionIds.length &&
            problem.wants(unit, current, start),
        );
        if (!replacement) {
          place(start, current);
          break;
        }
        tried.add(replacement);
        place(start, replacement);
        if (size(problems()) < size(before)) fixed = true;
        else {
          remove(start);
          place(start, current);
        }
      }
      if (fixed) break;
    }
    if (!fixed) unfixable.add(problem.message);
  }

  const picks: SlotPick[] = [];
  const missing: Selection["missing"] = [];
  slots.forEach((entry, index) => {
    const fill = fills[index];
    if (!fill) {
      missing.push({
        number: entry.slot.number,
        type: entry.slot.type,
        available: input.units.filter((unit) => allows(entry.slot, unit.type))
          .length,
      });
    } else if (fill.start === index) {
      picks.push({
        number: entry.slot.number,
        slot: entry.slot,
        unit: fill.unit,
      });
    }
  });
  return {
    picks,
    missing,
    warnings: [...new Set(problems().map((problem) => problem.message))],
  };
}

/**
 * Where each question's key goes so every position is used about equally per section (EPS keeps
 * about five ① ② ③ ④ in 20 questions). Returns one target position per question, in order.
 */
export function balancedKeyPositions(count: number, seed: string) {
  const random = seededRandom(`${seed}:keys`);
  const positions = Array.from({ length: count }, (_, index) => index % 4);
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [positions[index], positions[swap]] = [positions[swap]!, positions[index]!];
  }
  return positions;
}

/**
 * Whether text names options by number (①, "jawaban 2", "2번"), so their order must stay as
 * written. Prompts and explanations are checked before the key is moved.
 */
export function refersToOptionNumbers(text: string) {
  return /[①②③④]|(?:jawaban|pilihan|opsi|nomor|no\.)\s*[1-4]\b|\b[1-4]\s*번/i.test(
    text,
  );
}

/** The options reordered so the correct one is at `target` (the others keep their order). */
export function moveKeyTo<T extends { isCorrect: boolean }>(
  options: readonly T[],
  target: number,
) {
  const key = options.findIndex((option) => option.isCorrect);
  if (key < 0 || target >= options.length) return [...options];
  const rest = options.filter((_, index) => index !== key);
  return [...rest.slice(0, target), options[key]!, ...rest.slice(target)];
}
