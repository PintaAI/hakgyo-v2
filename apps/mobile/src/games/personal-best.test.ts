import { describe, expect, mock, test } from "bun:test";

const store = new Map<string, string>();
mock.module("expo-sqlite/kv-store", () => ({
  default: {
    getItemSync: (key: string) => store.get(key) ?? null,
    setItemSync: (key: string, value: string) => store.set(key, value),
  },
}));

const { beatsBest, formatScore, recordBest } = await import("./personal-best");

describe("beatsBest", () => {
  test("any score beats nothing, but a zero never does", () => {
    expect(beatsBest({ value: 3, max: 10 }, null)).toBe(true);
    expect(beatsBest({ value: 0 }, null)).toBe(false);
  });

  test("compares out-of scores as shares", () => {
    expect(beatsBest({ value: 9, max: 10 }, { value: 8, max: 9 })).toBe(true);
    expect(beatsBest({ value: 4, max: 5 }, { value: 9, max: 10 })).toBe(false);
    // Same share: more right wins.
    expect(beatsBest({ value: 10, max: 10 }, { value: 8, max: 8 })).toBe(true);
    expect(beatsBest({ value: 8, max: 8 }, { value: 8, max: 8 })).toBe(false);
  });

  test("compares points as they are", () => {
    expect(beatsBest({ value: 1240 }, { value: 900 })).toBe(true);
    expect(beatsBest({ value: 900 }, { value: 900 })).toBe(false);
  });
});

describe("formatScore", () => {
  test("shows out-of scores and points", () => {
    expect(formatScore({ value: 9, max: 10 })).toBe("9/10");
    expect(formatScore({ value: 1240 })).toBe("1.240 poin");
  });
});

describe("recordBest", () => {
  test("keeps the best and reports the one it beat", () => {
    store.clear();
    expect(recordBest("word-fall:set-1", { value: 500 })).toEqual({
      previous: null,
      isNew: true,
    });
    const second = recordBest("word-fall:set-1", { value: 300 });
    expect(second.isNew).toBe(false);
    expect(second.previous?.value).toBe(500);
    const third = recordBest("word-fall:set-1", { value: 800 });
    expect(third.isNew).toBe(true);
    expect(third.previous?.value).toBe(500);
    expect(recordBest("word-fall:set-1", { value: 1 }).previous?.value).toBe(
      800,
    );
  });

  test("keeps sets apart", () => {
    store.clear();
    recordBest("match:set-1", { value: 100 });
    expect(recordBest("match:set-2", { value: 50 }).isNew).toBe(true);
  });
});
