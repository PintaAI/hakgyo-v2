import { createHangeulStageQuestion } from "../hangeul/placement";
import { EPS_PLACEMENT_QUESTIONS } from "./eps-questions";
import { POLA_PLACEMENT_QUESTIONS } from "./pola-questions";
import type {
  PlacementGoal,
  PlacementQuestion,
  PlacementSourceQuestion,
} from "./types";
import { PLACEMENT_VOCABULARY } from "./vocabulary";

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

/** One not yet asked, or any once every one was. */
function fresh<T extends { id: string }>(
  items: readonly T[],
  asked: ReadonlySet<string>,
  random: () => number,
): T {
  const unasked = items.filter((item) => !asked.has(item.id));
  return pick(unasked.length > 0 ? unasked : items, random);
}

function vocabularyQuestion(
  asked: ReadonlySet<string>,
  random: () => number,
): PlacementQuestion {
  const words = PLACEMENT_VOCABULARY.map((word) => ({
    ...word,
    id: `vocab-${word.term}`,
  }));
  const word = fresh(words, asked, random);
  const others = shuffle(
    words.filter((other) => other.term !== word.term),
    random,
  ).slice(0, 3);
  // Korean to Indonesian, or the reverse.
  if (random() < 0.5) {
    return {
      id: word.id,
      stage: 3,
      instruction: "Apa artinya?",
      prompt: word.term,
      promptStyle: "glyph",
      choices: shuffle(
        [word.meaning, ...others.map((other) => other.meaning)],
        random,
      ),
      answer: word.meaning,
    };
  }
  return {
    id: word.id,
    stage: 3,
    instruction: "Mana bahasa Koreanya?",
    prompt: word.meaning,
    promptStyle: "word",
    choices: shuffle([word.term, ...others.map((other) => other.term)], random),
    answer: word.term,
  };
}

function writtenQuestion(
  source: PlacementSourceQuestion,
  random: () => number,
): PlacementQuestion {
  return {
    id: source.id,
    stage: 4,
    instruction: source.instruction ?? "Pilih yang paling tepat.",
    prompt: source.prompt,
    promptStyle: source.prompt.length <= 6 ? "glyph" : "sentence",
    choices: shuffle(source.choices, random),
    answer: source.choices[0]!,
  };
}

/**
 * The next question for `stage`. Stage 4 asks EPS-TOPIK reading to learners
 * preparing for it and everyday sentence patterns to everyone else. Written
 * questions are not repeated while unasked ones remain.
 */
export function createPlacementQuestion(
  stage: 1 | 2 | 3 | 4,
  {
    goal,
    asked = new Set(),
    random = Math.random,
  }: {
    goal: PlacementGoal;
    asked?: ReadonlySet<string>;
    random?: () => number;
  },
): PlacementQuestion {
  if (stage === 1 || stage === 2) {
    const question = createHangeulStageQuestion(stage, random);
    return {
      id: `hangeul-${stage}-${question.prompt}`,
      stage,
      instruction:
        question.kind === "read"
          ? "Bagaimana cara membacanya?"
          : "Mana tulisan Hangeul-nya?",
      prompt: question.prompt,
      promptStyle: question.kind === "read" ? "glyph" : "word",
      choices: question.choices,
      answer: question.answer,
    };
  }
  if (stage === 3) return vocabularyQuestion(asked, random);
  const pool =
    goal === "eps" ? EPS_PLACEMENT_QUESTIONS : POLA_PLACEMENT_QUESTIONS;
  return writtenQuestion(fresh(pool, asked, random), random);
}
