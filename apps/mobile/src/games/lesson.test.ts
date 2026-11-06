import { describe, expect, test } from "bun:test";

import { lessonRounds, pickLessonWords } from "./lesson";

const word = (id: string, examples?: unknown) => ({
  id,
  term: `term-${id}`,
  meanings: [`meaning-${id}`],
  examples,
});

const firstRandom = () => 0;

describe("pickLessonWords", () => {
  test("takes new words first, in the set's order", () => {
    const words = ["a", "b", "c", "d", "e", "f", "g"].map((id) => word(id));
    expect(
      pickLessonWords(words, new Map(), firstRandom).map((item) => item.id),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("fills up with due words, then learning, then mastered", () => {
    const words = ["new", "due", "learning", "mastered"].map((id) => word(id));
    const progress = new Map([
      ["due", { practiced: true, due: true, mastered: false }],
      ["learning", { practiced: true, due: false, mastered: false }],
      ["mastered", { practiced: true, due: false, mastered: true }],
    ]);
    expect(
      pickLessonWords(words, progress, firstRandom).map((item) => item.id),
    ).toEqual(["new", "due", "learning", "mastered"]);
  });

  test("skips words without a term or a meaning", () => {
    const words = [
      word("a"),
      { id: "blank", term: " ", meanings: ["x"] },
      { id: "bare", term: "x", meanings: [" "] },
    ];
    expect(
      pickLessonWords(words, new Map(), firstRandom).map((item) => item.id),
    ).toEqual(["a"]);
  });
});

describe("lessonRounds", () => {
  test("plays every round when the words allow it", () => {
    const words = [
      word("a", ["저는 매일 아침 밥을 먹어요. = Saya makan setiap pagi."]),
      word("b"),
    ];
    expect(lessonRounds(words)).toEqual([
      "match",
      "cards",
      "sentences",
      "word-fall",
    ]);
  });

  test("leaves out matching for one word and sentences without examples", () => {
    expect(lessonRounds([word("a")])).toEqual(["cards", "word-fall"]);
  });

  test("has no rounds without words", () => {
    expect(lessonRounds([])).toEqual([]);
  });
});
