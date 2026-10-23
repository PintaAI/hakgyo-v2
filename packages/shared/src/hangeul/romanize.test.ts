import { describe, expect, test } from "bun:test";

import { romanizeHangeulSyllable } from "./romanize";

describe("romanizeHangeulSyllable", () => {
  test("romanizes open and closed syllables", () => {
    expect(romanizeHangeulSyllable("아")).toBe("a");
    expect(romanizeHangeulSyllable("가")).toBe("ga");
    expect(romanizeHangeulSyllable("러")).toBe("reo");
    expect(romanizeHangeulSyllable("쌰")).toBe("ssya");
    expect(romanizeHangeulSyllable("최")).toBe("choe");
    expect(romanizeHangeulSyllable("의")).toBe("ui");
    expect(romanizeHangeulSyllable("한")).toBe("han");
    expect(romanizeHangeulSyllable("강")).toBe("gang");
    expect(romanizeHangeulSyllable("밖")).toBe("bak");
    expect(romanizeHangeulSyllable("옷")).toBe("ot");
    expect(romanizeHangeulSyllable("달")).toBe("dal");
    expect(romanizeHangeulSyllable("닭")).toBe("dak");
  });

  test("returns an empty string for anything but one syllable", () => {
    expect(romanizeHangeulSyllable("")).toBe("");
    expect(romanizeHangeulSyllable("ㄱ")).toBe("");
    expect(romanizeHangeulSyllable("가나")).toBe("");
    expect(romanizeHangeulSyllable("a")).toBe("");
  });
});
