import { expect, test } from "bun:test";

import { createOfflineDownloads } from "./offline-downloads";

test("tracks progress per key and ignores a second start while running", async () => {
  const downloads = createOfflineDownloads();
  let finish: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let calls = 0;
  const events: number[] = [];
  downloads.subscribe(() => events.push(downloads.getRevision()));

  const first = downloads.start(
    "course:1",
    ["a", "b"],
    async (ids, onProgress) => {
      calls += 1;
      onProgress({ total: 2, ready: 1, readyIds: ["a"], failed: [] });
      await gate;
      return { total: 2, ready: 1, readyIds: ["a"], failed: ["b"] };
    },
  );
  expect(downloads.get("course:1")).toMatchObject({ ready: 1, running: true });
  await downloads.start("course:1", ["a", "b"], async () => null);
  expect(calls).toBe(1);

  finish();
  await first;
  expect(downloads.get("course:1")).toEqual({
    total: 2,
    ready: 1,
    readyIds: ["a"],
    failed: ["b"],
    running: false,
  });
  expect(events.length).toBeGreaterThanOrEqual(3);
});
