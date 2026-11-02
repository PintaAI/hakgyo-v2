import { describe, expect, test } from "bun:test";

import { highlightTerm, termPatterns } from "./highlight-term";

function marked(sentence: string, term: string) {
  return highlightTerm(sentence, term)
    .filter((part) => part.hit)
    .map((part) => part.text);
}

describe("highlightTerm", () => {
  test("finds a grammar ending without its dash or question mark", () => {
    expect(marked("밥 먹었는데 아직 배고파요.", "-는데")).toEqual(["는데"]);
    expect(marked("어디 가는데?", "-는데?")).toEqual(["는데"]);
  });

  test("joins a leading jamo to the syllable before as its final consonant", () => {
    expect(marked("이걸로 할게요.", "-(으)ㄹ게")).toEqual(["할게"]);
    // After a closed syllable the ending keeps its 으: the stem stays unmarked.
    expect(marked("내가 먹을게.", "-(으)ㄹ게")).toEqual(["을게"]);
  });

  test("tries optional parts both with and without them", () => {
    expect(marked("학교에 가면 연락해.", "-(으)면")).toEqual(["면"]);
    expect(marked("밥을 먹으면 졸려요.", "-(으)면")).toEqual(["으면"]);
    expect(termPatterns("-(으)ㄹ게")).toEqual(["을게", "ㄹ게"]);
  });

  test("tries a verb's stem and marks every appearance", () => {
    expect(marked("사과를 먹어요. 또 먹어요.", "먹다")).toEqual(["먹", "먹"]);
    expect(marked("학교에 가요.", "학교")).toEqual(["학교"]);
  });

  test("returns the sentence whole when the term is not in it", () => {
    expect(highlightTerm("좋아요.", "싫다")).toEqual([
      { text: "좋아요.", hit: false },
    ]);
    // A ㄹ ending must not match a syllable closed by another consonant.
    expect(marked("먹게 해요.", "-(으)ㄹ게")).toEqual([]);
  });
});
