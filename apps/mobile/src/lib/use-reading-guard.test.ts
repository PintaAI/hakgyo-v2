import { describe, expect, mock, test } from "bun:test";

void mock.module("expo-sqlite/kv-store", () => ({
  default: {
    getItemSync: () => null,
    setItemSync: () => undefined,
    removeItemSync: () => undefined,
  },
}));
void mock.module("./use-screen-active", () => ({
  useScreenActive: () => true,
}));

const { createSecondsStore } = await import("./use-reading-guard");

describe("createSecondsStore", () => {
  test("starts from the seconds given", () => {
    expect(createSecondsStore(42).get()).toBe(42);
  });

  test("tells subscribers about each change, and only changes", () => {
    const store = createSecondsStore(0);
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.get()));
    store.set(1);
    store.set(1);
    store.set(2);
    expect(seen).toEqual([1, 2]);
  });

  test("stops telling a subscriber once it unsubscribes", () => {
    const store = createSecondsStore(0);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.set(1);
    unsubscribe();
    store.set(2);
    expect(calls).toBe(1);
    expect(store.get()).toBe(2);
  });
});
