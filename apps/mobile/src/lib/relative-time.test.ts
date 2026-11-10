import { describe, expect, test } from "bun:test";

import { agoLabel } from "./relative-time";

const now = new Date("2026-11-10T10:00:00Z");
const before = (ms: number) => new Date(now.getTime() - ms);

describe("agoLabel", () => {
  test("says just now under a minute, and for a clock running behind", () => {
    expect(agoLabel(before(59_000), now)).toBe("baru saja");
    expect(agoLabel(before(-5_000), now)).toBe("baru saja");
  });

  test("counts whole minutes, hours and days", () => {
    expect(agoLabel(before(60_000), now)).toBe("1 menit lalu");
    expect(agoLabel(before(59 * 60_000), now)).toBe("59 menit lalu");
    expect(agoLabel(before(2 * 3_600_000 + 1), now)).toBe("2 jam lalu");
    expect(agoLabel(before(3 * 86_400_000), now)).toBe("3 hari lalu");
  });
});
