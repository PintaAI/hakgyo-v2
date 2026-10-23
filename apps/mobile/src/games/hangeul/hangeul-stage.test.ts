import { describe, expect, test } from "bun:test";

import {
  getHangeulGameStage,
  HANGEUL_GAME_STAGES,
} from "@hakgyo/shared/hangeul";

import { getQuizOptions, HANGEUL_LETTERS } from "./hangeul-data";
import { hangeulLessonPlan } from "./hangeul-stage";

const characters = (letters: readonly { character: string }[]) =>
  letters.map((letter) => letter.character).sort();

describe("Hangeul letter game stages", () => {
  test("without a stage, and for batchim, covers every letter", () => {
    for (const plan of [
      hangeulLessonPlan(),
      hangeulLessonPlan(getHangeulGameStage("batchim")),
    ]) {
      expect(plan.newLetters).toHaveLength(HANGEUL_LETTERS.length);
      expect(plan.reviewLetters).toEqual([]);
      expect(plan.quizIds).toEqual(HANGEUL_LETTERS.map((letter) => letter.id));
      expect(plan.learnFamilies.flatMap((group) => group.letters)).toHaveLength(
        HANGEUL_LETTERS.length,
      );
    }
  });

  test("teaches the letters each stage adds and reviews a few earlier ones", () => {
    const expectedNew: Record<string, string> = {
      "basic-vowels": "ㅇㅏㅓㅗㅜㅡㅣ",
      "core-consonants": "ㄴㅁㅅㅂㄱㄷㅈㅎㄹ",
      "y-vowels": "ㅑㅕㅛㅠㅐㅔㅒㅖ",
      "aspirated-tense": "ㅋㅌㅍㅊㄲㄸㅃㅆㅉ",
      "w-vowels": "ㅘㅝㅙㅞㅚㅟㅢ",
    };
    HANGEUL_GAME_STAGES.forEach((stage, index) => {
      if (stage.batchim) return;
      const plan = hangeulLessonPlan(stage);
      expect(characters(plan.newLetters)).toEqual(
        [...expectedNew[stage.id]!].sort(),
      );
      const earlier = new Set<string>(
        HANGEUL_GAME_STAGES[index - 1]?.letters ?? [],
      );
      if (index === 0) expect(plan.reviewLetters).toEqual([]);
      else {
        expect(plan.reviewLetters.length).toBeGreaterThanOrEqual(2);
        expect(plan.reviewLetters.length).toBeLessThan(plan.newLetters.length);
        expect(
          plan.reviewLetters.every((letter) => earlier.has(letter.character)),
        ).toBe(true);
      }
      expect([...plan.quizIds].sort()).toEqual(
        [...plan.newLetters, ...plan.reviewLetters].map((l) => l.id).sort(),
      );
      // Families only show their letters in the stage.
      expect(
        characters(plan.learnFamilies.flatMap((group) => group.letters)),
      ).toEqual(characters(plan.newLetters));
      expect(
        characters(plan.sheetFamilies.flatMap((group) => group.letters)),
      ).toEqual([...new Set(stage.letters)].sort());
    });
  });

  test("quiz options are four unique cues, drawn from the stage when possible", () => {
    for (const stage of HANGEUL_GAME_STAGES) {
      const plan = hangeulLessonPlan(stage);
      const poolCues = new Set(plan.pool.map((letter) => letter.cue));
      plan.quizIds.forEach((id, round) => {
        const letter = HANGEUL_LETTERS.find((entry) => entry.id === id)!;
        const options = getQuizOptions(letter, round, plan.pool);
        expect(options).toHaveLength(4);
        expect(new Set(options)).toHaveLength(4);
        expect(options).toContain(letter.cue);
        const poolPeers = plan.pool.filter(
          (entry) => entry.kind === letter.kind && entry.id !== letter.id,
        );
        if (poolPeers.length >= 3) {
          expect(options.every((cue) => poolCues.has(cue))).toBe(true);
        }
      });
    }
  });
});
