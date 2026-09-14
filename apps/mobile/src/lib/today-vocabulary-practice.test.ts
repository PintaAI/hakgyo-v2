import { describe, expect, test } from "bun:test";

import {
  buildTodayVocabularyQueue,
  emptyTodayVocabularyMemory,
  isDefinitionCorrect,
  isVocabularySetPracticed,
  parseTodayVocabularyMemory,
  recordTodayVocabularyRecall,
  type TodayVocabularyCard,
} from "./today-vocabulary-practice";

const first: TodayVocabularyCard = {
  entryId: "one",
  term: "학교",
  definition: "School building",
  vocabularySetId: "set",
  setEntryCount: 2,
  setVersion: "v1",
};
const second = { ...first, entryId: "two", term: "책", definition: "Book" };

describe("Today vocabulary practice", () => {
  test("normalizes answers but requires the complete definition", () => {
    expect(isDefinitionCorrect(first, "  SCHOOL   BUILDING ")).toBeTrue();
    expect(isDefinitionCorrect(first, "school")).toBeFalse();
  });

  test("requires three consecutive correct recalls for every set entry", () => {
    let memory = emptyTodayVocabularyMemory();
    for (let pass = 0; pass < 3; pass += 1) {
      memory = recordTodayVocabularyRecall(memory, first, true, pass);
      memory = recordTodayVocabularyRecall(memory, second, true, pass);
    }
    expect(isVocabularySetPracticed(first, memory)).toBeTrue();

    memory = recordTodayVocabularyRecall(memory, second, false, 10);
    expect(isVocabularySetPracticed(first, memory)).toBeFalse();
  });

  test("content version changes invalidate the whole set", () => {
    let memory = emptyTodayVocabularyMemory();
    memory = recordTodayVocabularyRecall(memory, first, true, 0);
    memory = recordTodayVocabularyRecall(
      memory,
      { ...second, setVersion: "v2" },
      true,
      0,
    );

    expect(memory.entries.one).toBeUndefined();
  });

  test("returns only due cards and falls back to extra practice", () => {
    const memory = recordTodayVocabularyRecall(
      emptyTodayVocabularyMemory(),
      first,
      true,
      0,
    );
    expect(buildTodayVocabularyQueue([first, second], memory, 1)).toEqual({
      cards: [second],
      extraPractice: false,
    });
    expect(buildTodayVocabularyQueue([first], memory, 1)).toEqual({
      cards: [first],
      extraPractice: true,
    });
  });

  test("discards corrupt persisted entries", () => {
    expect(parseTodayVocabularyMemory("broken")).toEqual(
      emptyTodayVocabularyMemory(),
    );
    expect(
      parseTodayVocabularyMemory(
        '{"version":1,"entries":{"bad":{"correctStreak":-1}}}',
      ),
    ).toEqual(emptyTodayVocabularyMemory());
  });
});
