import { expect, test } from "bun:test";

import { levelForXp, xpForLevel } from "./xp-level";

test("levels follow the table, then 2,000 XP each", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(xpForLevel)).toEqual([
    0, 200, 600, 1200, 2000, 3000, 4400, 6000, 8000, 10000,
  ]);
});

test("levelForXp finds the level and the progress through it", () => {
  expect(levelForXp(0)).toEqual({
    level: 1,
    levelStartXp: 0,
    nextLevelXp: 200,
    progress: 0,
  });
  expect(levelForXp(199).level).toBe(1);
  expect(levelForXp(200).level).toBe(2);
  expect(levelForXp(900)).toMatchObject({ level: 3, progress: 0.5 });
  expect(levelForXp(9000).level).toBe(9);
  expect(levelForXp(-5).level).toBe(1);
});
