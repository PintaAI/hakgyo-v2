import { describe, expect, test } from "bun:test";

import { fetchStats } from "./fetch-stats";

describe("fetchStats", () => {
  test("preserves loader names and values", async () => {
    const stats = await fetchStats({
      learners: async () => 12,
      invites: async () => 4,
    });

    expect(stats).toEqual({ learners: 12, invites: 4 });
  });

  test("starts all loaders before waiting for their results", async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const pending = fetchStats({
      first: async () => {
        started.push("first");
        await gate;
        return 1;
      },
      second: async () => {
        started.push("second");
        await gate;
        return 2;
      },
    });

    await Promise.resolve();
    expect(started).toEqual(["first", "second"]);
    release();
    expect(await pending).toEqual({ first: 1, second: 2 });
  });
});
