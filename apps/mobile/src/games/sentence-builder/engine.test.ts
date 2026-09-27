import { describe, expect, test } from "bun:test";

import {
  createSentenceChallenges,
  exampleSentences,
  initialSentenceBuilderSession,
  sentenceBuilderReducer,
  sentenceHint,
  sentenceWords,
  type SentenceChallenge,
} from "./engine";

const words = [
  {
    id: "school",
    term: "학교",
    definition: "sekolah",
    examples: ["저는 학교에 가요.", "학교가 커요!", "학교"],
  },
  {
    id: "friend",
    term: "친구",
    definition: "teman",
    examples: ["친구를 만나요.", 42, "  "],
  },
  { id: "empty", term: "물", definition: "air", examples: [] },
];

function start(challenge: SentenceChallenge) {
  return sentenceBuilderReducer(initialSentenceBuilderSession, {
    type: "start",
    challenges: [challenge],
  });
}

function pick(
  state: ReturnType<typeof start>,
  challenge: SentenceChallenge,
  order: readonly string[],
) {
  const used: number[] = [];
  return order.reduce((current, word) => {
    const tileIndex = challenge.tiles.findIndex(
      (tile, index) => tile === word && !used.includes(index),
    );
    used.push(tileIndex);
    return sentenceBuilderReducer(current, { type: "add", tileIndex });
  }, state);
}

describe("sentence builder engine", () => {
  test("reads only non-empty string examples", () => {
    expect(exampleSentences(["  a  b ", 3, ""])).toEqual(["a b"]);
    expect(exampleSentences("하나\n둘")).toEqual(["하나", "둘"]);
    expect(exampleSentences(null)).toEqual([]);
  });

  test("splits words and drops final punctuation", () => {
    expect(sentenceWords("저는 학교에 가요.")).toEqual([
      "저는",
      "학교에",
      "가요",
    ]);
    expect(sentenceWords("뭐 해요?!")).toEqual(["뭐", "해요"]);
  });

  test("builds challenges from examples, one entry at a time", () => {
    const challenges = createSentenceChallenges(words, () => 0);
    expect(challenges).toHaveLength(3);
    expect(
      challenges
        .map((item) => item.entryId)
        .slice(0, 2)
        .sort(),
    ).toEqual(["friend", "school"]);
    expect(challenges.map((item) => item.sentence)).not.toContain("학교");
    for (const challenge of challenges) {
      expect([...challenge.tiles].sort()).toEqual([...challenge.words].sort());
      expect(challenge.tiles).not.toEqual(challenge.words);
    }
    expect(createSentenceChallenges(words, () => 0, 1)).toHaveLength(1);
  });

  test("solves on the right order and records independence", () => {
    const [challenge] = createSentenceChallenges(words.slice(0, 1), () => 0.5);
    const solved = pick(start(challenge!), challenge!, challenge!.words);
    expect(solved.phase).toBe("correct");
    expect(solved.independent).toBe(1);
    expect(sentenceBuilderReducer(solved, { type: "next" }).phase).toBe(
      "complete",
    );
  });

  test("flags a wrong order and queues the sentence for review", () => {
    const [challenge] = createSentenceChallenges(words.slice(1, 2), () => 0.5);
    const wrong = pick(
      start(challenge!),
      challenge!,
      [...challenge!.words].reverse(),
    );
    expect(wrong.feedback).toBe("incorrect");
    expect(wrong.mistakes).toBe(1);

    const cleared = sentenceBuilderReducer(wrong, { type: "clear" });
    const solved = pick(cleared, challenge!, challenge!.words);
    expect(solved.phase).toBe("correct");
    expect(solved.independent).toBe(0);
    expect(solved.reviewIds).toEqual([challenge!.id]);
  });

  test("hints at the first misplaced word", () => {
    const [challenge] = createSentenceChallenges(words.slice(0, 1), () => 0.5);
    const firstTile = challenge!.tiles.indexOf(challenge!.words[0]!);
    expect(sentenceHint(challenge!, [])).toEqual({
      position: 0,
      word: challenge!.words[0]!,
      tileIndex: firstTile,
    });
    expect(sentenceHint(challenge!, [firstTile])?.position).toBe(1);
  });
});
