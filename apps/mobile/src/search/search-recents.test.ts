import { describe, expect, mock, test } from "bun:test";

const saved = new Map<string, string>();
void mock.module("expo-sqlite/kv-store", () => ({
  default: {
    getItemSync: (key: string) => saved.get(key) ?? null,
    setItemSync: (key: string, value: string) => void saved.set(key, value),
    removeItemSync: (key: string) => void saved.delete(key),
  },
}));

const {
  MAX_RECENT_OPENED,
  MAX_RECENT_QUERIES,
  clearSearchRecents,
  forgetQuery,
  pushRecent,
  rememberOpened,
  rememberQuery,
} = await import("./search-recents");

function stored(userId: string) {
  const raw = saved.get(`hakgyo:search-recents:v1:${userId}`);
  return raw
    ? (JSON.parse(raw) as { queries: string[]; opened: string[] })
    : null;
}

describe("search recents", () => {
  test("pushRecent puts the value first, once, within the cap", () => {
    expect(pushRecent(["b", "a", "c"], "a", 3)).toEqual(["a", "b", "c"]);
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });

  test("searches stay capped, newest first, without repeats", () => {
    for (let index = 0; index < 20; index += 1)
      rememberQuery("u1", `kata ${index}`);
    rememberQuery("u1", "  KATA 19  ");
    rememberQuery("u1", "x");
    const recents = stored("u1")!;
    expect(recents.queries).toHaveLength(MAX_RECENT_QUERIES);
    expect(recents.queries[0]).toBe("KATA 19");
    expect(
      recents.queries.filter((q) => q.toLowerCase() === "kata 19"),
    ).toHaveLength(1);
    expect(recents.queries).not.toContain("x");
  });

  test("opened results stay capped and move to the top when reopened", () => {
    for (let index = 0; index < 30; index += 1)
      rememberOpened("u2", `doc-${index}`);
    rememberOpened("u2", "doc-25");
    const recents = stored("u2")!;
    expect(recents.opened).toHaveLength(MAX_RECENT_OPENED);
    expect(recents.opened[0]).toBe("doc-25");
    expect(new Set(recents.opened).size).toBe(MAX_RECENT_OPENED);
  });

  test("forgets one search, or clears everything", () => {
    rememberQuery("u3", "학교");
    rememberQuery("u3", "makan");
    forgetQuery("u3", "MAKAN");
    expect(stored("u3")!.queries).toEqual(["학교"]);
    clearSearchRecents("u3");
    expect(stored("u3")).toBeNull();
  });
});
