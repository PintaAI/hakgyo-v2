import { describe, expect, test } from "bun:test";

import {
  HANGEUL_GAME_STAGE_IDS,
  getHangeulGameStage,
} from "@hakgyo/shared/hangeul";

import {
  composedText,
  decomposeSyllable,
  syllableKeys,
} from "./syllable-forge/hangul-composer";
import {
  getSyllableChallenges,
  SYLLABLE_CHALLENGES,
  SYLLABLE_CHALLENGES_BY_STAGE,
} from "./syllable-forge/syllable-forge-data";
import {
  createSyllableSessionReducer,
  initialSession,
} from "./syllable-forge/syllable-session";
import {
  getWordChallenges,
  WORD_CHALLENGES,
  WORD_CHALLENGES_BY_STAGE,
} from "./word-builder/word-builder-data";
import {
  createWordBuilderReducer,
  initialWordBuilderSession,
} from "./word-builder/word-builder-session";

/** Why a syllable does not fit a stage, or undefined when it does. */
function stageViolation(stageId: string, syllable: string) {
  const stage = getHangeulGameStage(stageId)!;
  const block = decomposeSyllable(syllable);
  if (!block) return `${syllable} is not a syllable block`;
  if (!stage.letters.includes(block.initial))
    return `${syllable}: ${block.initial} is not taught in ${stageId}`;
  if (!stage.letters.includes(block.vowel))
    return `${syllable}: ${block.vowel} is not taught in ${stageId}`;
  if (block.final && !stage.batchim)
    return `${syllable}: batchim ${block.final} before the batchim stage`;
  return undefined;
}

function violations(stageId: string, syllables: readonly string[]) {
  return syllables
    .map((syllable) => stageViolation(stageId, syllable))
    .filter(Boolean);
}

describe("Hangeul stage challenge sets", () => {
  test("every stage has a syllable and a word set", () => {
    expect(Object.keys(SYLLABLE_CHALLENGES_BY_STAGE).sort()).toEqual(
      [...HANGEUL_GAME_STAGE_IDS].sort(),
    );
    expect(Object.keys(WORD_CHALLENGES_BY_STAGE).sort()).toEqual(
      [...HANGEUL_GAME_STAGE_IDS].sort(),
    );
    expect(getSyllableChallenges()).toBe(SYLLABLE_CHALLENGES);
    expect(getSyllableChallenges("unknown")).toBe(SYLLABLE_CHALLENGES);
    expect(getWordChallenges()).toBe(WORD_CHALLENGES);
    expect(getWordChallenges("unknown")).toBe(WORD_CHALLENGES);
  });

  for (const stageId of HANGEUL_GAME_STAGE_IDS) {
    describe(stageId, () => {
      const challenges = SYLLABLE_CHALLENGES_BY_STAGE[stageId];
      const words = WORD_CHALLENGES_BY_STAGE[stageId];

      test("Susun 한글 only uses the stage's letters", () => {
        expect(challenges.length).toBeGreaterThanOrEqual(6);
        expect(
          violations(
            stageId,
            challenges.map((challenge) => challenge.target),
          ),
        ).toEqual([]);
        expect(new Set(challenges.map((c) => c.target)).size).toBe(
          challenges.length,
        );
      });

      test("Susun kata words and tiles only use the stage's letters", () => {
        expect(words.length).toBeGreaterThanOrEqual(4);
        for (const entry of words) {
          expect(violations(stageId, entry.syllables)).toEqual([]);
          expect(violations(stageId, entry.tiles)).toEqual([]);
          expect(entry.syllables.join("")).toBe(entry.word);
          expect(entry.tiles).toHaveLength(entry.syllables.length + 2);
          // The tiles hold every syllable of the word, repeats included.
          const remaining = [...entry.tiles];
          for (const syllable of entry.syllables) {
            const index = remaining.indexOf(syllable);
            expect(index).toBeGreaterThanOrEqual(0);
            remaining.splice(index, 1);
          }
          expect(remaining.some((tile) => entry.syllables.includes(tile))).toBe(
            false,
          );
        }
      });

      test("only the batchim stage practises batchim", () => {
        const hasBatchim = [
          ...challenges.map((challenge) => challenge.target),
          ...words.flatMap((entry) => entry.syllables),
        ].some((syllable) => decomposeSyllable(syllable)?.final);
        expect(hasBatchim).toBe(stageId === "batchim");
      });

      test("a full Susun 한글 session can be typed and completed", () => {
        const reduce = createSyllableSessionReducer(challenges);
        let state = reduce(initialSession, { type: "start" });
        for (const challenge of challenges) {
          const keys = syllableKeys(challenge.target);
          expect(composedText(keys)).toBe(challenge.target);
          state = keys.reduce(
            (current, key) => reduce(current, { type: "key", key }),
            state,
          );
          expect(state.phase).toBe("correct");
          state = reduce(state, { type: "next" });
        }
        expect(state.phase).toBe("complete");
        expect(state.independent).toBe(challenges.length);
      });

      test("a full Susun kata session can be completed", () => {
        const reduce = createWordBuilderReducer(words);
        let state = reduce(initialWordBuilderSession, { type: "start" });
        for (const entry of words) {
          const used = new Set<number>();
          for (const syllable of entry.syllables) {
            const tileIndex = entry.tiles.findIndex(
              (tile, index) => tile === syllable && !used.has(index),
            );
            used.add(tileIndex);
            state = reduce(state, { type: "add", tileIndex });
          }
          expect(state.phase).toBe("correct");
          state = reduce(state, { type: "next" });
        }
        expect(state.phase).toBe("complete");
        expect(state.independent).toBe(words.length);
      });
    });
  }
});
