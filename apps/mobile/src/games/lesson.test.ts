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

  test("puts words still to learn before due and learned ones", () => {
    const words = ["learned-due", "unlearned", "learned", "new"].map((id) =>
      word(id),
    );
    const progress = new Map([
      [
        "learned-due",
        { practiced: true, due: true, mastered: false, learned: true },
      ],
      [
        "unlearned",
        { practiced: true, due: false, mastered: false, learned: false },
      ],
      [
        "learned",
        { practiced: true, due: false, mastered: false, learned: true },
      ],
    ]);
    expect(
      pickLessonWords(words, progress, firstRandom).map((item) => item.id),
    ).toEqual(["new", "unlearned", "learned-due", "learned"]);
  });

  test("a set of five with two words left keeps both in the lesson", () => {
    const words = ["a", "b", "c", "d", "e", "f", "g"].map((id) => word(id));
    const progress = new Map(
      words.map((item) => [
        item.id,
        {
          practiced: true,
          due: true,
          mastered: false,
          learned: !["f", "g"].includes(item.id),
        },
      ]),
    );
    expect(
      pickLessonWords(words, progress, firstRandom)
        .slice(0, 2)
        .map((item) => item.id)
        .sort(),
    ).toEqual(["f", "g"]);
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
  const withExample = (id: string) =>
    word(id, ["저는 매일 아침 밥을 먹어요. = Saya makan setiap pagi."]);
  // shuffled() swaps the last item with index floor(random * length).
  const keepOrder = () => 0.99;
  const swapPair = () => 0;

  test("opens with matching and closes with Hujan Kata", () => {
    expect(
      lessonRounds([withExample("a"), word("b")], { random: keepOrder }),
    ).toEqual(["match", "cards", "sentences", "word-fall"]);
  });

  test("Kartu and Susun makna take turns", () => {
    expect(
      lessonRounds([withExample("a"), word("b")], { random: swapPair }),
    ).toEqual(["match", "sentences", "cards", "word-fall"]);
  });

  test("skips matching once every word is learned", () => {
    const progress = new Map([
      ["a", { practiced: true, due: false, mastered: false, learned: true }],
      ["b", { practiced: true, due: true, mastered: true }],
    ]);
    expect(
      lessonRounds([withExample("a"), word("b")], {
        progress,
        random: keepOrder,
      }),
    ).toEqual(["cards", "sentences", "word-fall"]);
    const oneNew = new Map([...progress].slice(0, 1));
    expect(
      lessonRounds([withExample("a"), word("b")], {
        progress: oneNew,
        random: keepOrder,
      })[0],
    ).toBe("match");
  });

  test("leaves out matching for one word and sentences without examples", () => {
    expect(lessonRounds([word("a")])).toEqual(["cards", "word-fall"]);
  });

  test("has no rounds without words", () => {
    expect(lessonRounds([])).toEqual([]);
  });
});
