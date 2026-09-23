import { describe, expect, test } from "bun:test";
import { syllableKeys } from "./hangul-composer";
import { SYLLABLE_CHALLENGES } from "./syllable-forge-data";
import {
  initialSession,
  syllableSessionReducer as reduce,
  type SyllableSession,
} from "./syllable-session";

function typeAnswer(state: SyllableSession) {
  return syllableKeys(SYLLABLE_CHALLENGES[state.index]!.target).reduce(
    (current, key) => reduce(current, { type: "key", key }),
    state,
  );
}

describe("syllable practice session", () => {
  test("a full session completes once and replay resets all progress", () => {
    let state = reduce(initialSession, { type: "start" });
    for (let index = 0; index < SYLLABLE_CHALLENGES.length; index++) {
      state = typeAnswer(state);
      expect(state.phase).toBe("correct");
      expect(state.independent).toBe(index + 1);
      expect(reduce(state, { type: "key", key: "ㄱ" })).toBe(state);
      state = reduce(state, { type: "next" });
    }
    expect(state.phase).toBe("complete");
    expect(reduce(state, { type: "next" })).toBe(state);
    expect(reduce(state, { type: "start" })).toEqual({
      ...initialSession,
      phase: "playing",
    });
  });

  test("a typo flashes in the answer, then is removed automatically", () => {
    let state = reduce(initialSession, { type: "start" });
    state = reduce(state, { type: "key", key: "ㅏ" });
    expect(state.feedback).toBe("incorrect");
    expect(state.errors).toBe(1);
    expect(state.keys).toEqual(["ㅏ"]);
    expect(reduce(state, { type: "key", key: "ㄱ" })).toBe(state);
    expect(reduce(state, { type: "next" })).toBe(state);
    state = reduce(state, { type: "reject-typo" });
    expect(state.keys).toEqual([]);
    expect(state.feedback).toBe("idle");

    state = typeAnswer(state);
    expect(state.independent).toBe(0);
    state = reduce(state, { type: "next" });
    state = reduce(state, { type: "hint" });
    state = reduce(state, { type: "hint" });
    state = typeAnswer(state);
    expect(state.phase).toBe("correct");
    expect(state.independent).toBe(0);
  });

  test("space is not accepted and partial answers stay editable", () => {
    let state = reduce(initialSession, { type: "start" });
    expect(reduce(state, { type: "next" })).toBe(state);
    expect(reduce(state, { type: "key", key: "x" })).toBe(state);
    expect(reduce(state, { type: "key", key: " " })).toBe(state);
    state = reduce(state, { type: "key", key: "ㄱ" });
    expect(state.keys).toEqual(["ㄱ"]);
    expect(reduce(state, { type: "delete" }).keys).toEqual([]);
  });
});
