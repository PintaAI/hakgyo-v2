/** Why the learner is studying Korean, asked first in the placement. */
export type PlacementGoal = "beginner" | "eps" | "work" | "other";

/** How well the learner says they read Hangeul; decides where the test starts. */
export type PlacementReading = "none" | "slow" | "fluent";

/**
 * The test's ladder: 1 basic Hangeul, 2 full Hangeul (reads Hangeul: earns
 * Hangeul Mastery), 3 basic vocabulary, 4 sentences (EPS-TOPIK reading or
 * everyday patterns, by goal). 0 is "no stage passed".
 */
export type PlacementStage = 0 | 1 | 2 | 3 | 4;

/** A written question; the answer is always the first choice. */
export type PlacementSourceQuestion = {
  id: string;
  prompt: string;
  /** A line above the prompt; defaults to the stage's instruction. */
  instruction?: string;
  choices: readonly string[];
};

export type PlacementQuestion = {
  id: string;
  stage: 1 | 2 | 3 | 4;
  instruction: string;
  prompt: string;
  /**
   * `glyph`: one syllable or word, drawn large. `word`: a short word or
   * romanization. `sentence`: running text.
   */
  promptStyle: "glyph" | "word" | "sentence";
  /** Four choices, shuffled. */
  choices: string[];
  answer: string;
};
