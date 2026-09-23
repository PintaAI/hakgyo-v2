import { describe, expect, test } from "bun:test";
import {
  blockText,
  composedText,
  decomposeSyllable,
  syllableKeys,
} from "./hangul-composer";
import { SYLLABLE_CHALLENGES } from "./syllable-forge-data";

describe("two-set Hangul composition", () => {
  test.each([
    ["ㄱㅏ", "가"],
    ["ㅎㅏㄴㄱㅡㄹ", "한글"],
    ["ㄱㅗㅏ", "과"],
    ["ㅇㅜㅔ", "웨"],
    ["ㅇㅡㅣ", "의"],
    ["ㄲㅜㅓ", "꿔"],
    ["ㅇㅣㄹㄱ", "읽"],
    ["ㄱㅏㄴㅏ", "가나"],
    ["ㅇㅣㄹㄱㅓ", "일거"],
    ["ㅇㅓㅂㅅㅓ", "업서"],
    ["ㄱㅏㄲㅏ", "가까"],
    ["ㄱㅏㅆㅏ", "가싸"],
    ["ㄱㅏㄸㅏ", "가따"],
    ["ㄱㄱㅏ", "ㄱ가"],
    ["ㅏ", "ㅏ"],
    ["ㄱㅏ ㄴㅏ", "가 나"],
    ["ㅗㅏ", "ㅘ"],
    ["ㄱㅏㅣ", "가ㅣ"],
  ])("%s → %s", (keys, expected) => {
    expect(composedText([...keys])).toBe(expected);
  });

  test("backspace reverses compounds and final migration one keystroke at a time", () => {
    const keys = [..."ㅇㅣㄹㄱㅓ"];
    expect(composedText(keys)).toBe("일거");
    keys.pop();
    expect(composedText(keys)).toBe("읽");
    keys.pop();
    expect(composedText(keys)).toBe("일");
    keys.pop();
    expect(composedText(keys)).toBe("이");
    keys.pop();
    expect(composedText(keys)).toBe("ㅇ");
    keys.pop();
    expect(composedText(keys)).toBe("");
    expect(composedText(["ㄱ", "ㅗ", "ㅏ"].slice(0, -1))).toBe("고");
  });

  test("round-trips every one of the 11,172 modern Unicode syllables through keyboard input", () => {
    for (let code = 0xac00; code <= 0xd7a3; code++) {
      const syllable = String.fromCharCode(code);
      expect(blockText(decomposeSyllable(syllable)!)).toBe(syllable);
      expect(composedText(syllableKeys(syllable))).toBe(syllable);
    }
  });

  test("every fixture can be completed with its hint keystrokes", () => {
    for (const challenge of SYLLABLE_CHALLENGES) {
      expect(composedText(syllableKeys(challenge.target))).toBe(
        challenge.target,
      );
    }
    expect(decomposeSyllable("a")).toBeUndefined();
    expect(decomposeSyllable("가나")).toBeUndefined();
  });
});
