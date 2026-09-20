import { describe, expect, test } from "bun:test";

import {
  CHAIN_LINK_SPACING,
  chainLinksForRope,
  createRopeState,
  stepRope,
} from "./rope";

describe("vocabulary match rope", () => {
  test("does not read a captured binding from a worklet default parameter", async () => {
    const source = await Bun.file(`${import.meta.dir}/rope.ts`).text();
    expect(source).not.toContain("pointCount = ROPE_POINT_COUNT");
  });

  test("keeps both dragged endpoints pinned", () => {
    const start = { x: 20, y: 30 };
    const end = { x: 280, y: 190 };
    let rope = createRopeState(start, end);
    for (let frame = 0; frame < 120; frame += 1)
      rope = stepRope(rope, start, end, 1 / 60);

    expect(rope.x[0]).toBe(start.x);
    expect(rope.y[0]).toBe(start.y);
    expect(rope.x.at(-1)).toBe(end.x);
    expect(rope.y.at(-1)).toBe(end.y);
    expect(rope.x.every(Number.isFinite)).toBe(true);
    expect(rope.y.every(Number.isFinite)).toBe(true);
  });

  test("clamps a delayed frame instead of destabilizing the chain", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 300, y: 0 };
    const rope = stepRope(createRopeState(start, end), start, end, 5);
    expect(Math.max(...rope.y)).toBeLessThan(100);
  });

  test("keeps links connected across a long drag", () => {
    const links = chainLinksForRope(
      createRopeState({ x: 0, y: 0 }, { x: 0, y: 800 }),
    );
    const largestGap = links.slice(1).reduce((largest, link, index) => {
      const previous = links[index]!;
      return Math.max(
        largest,
        Math.hypot(link.x - previous.x, link.y - previous.y),
      );
    }, 0);

    expect(links.length).toBeGreaterThan(40);
    expect(largestGap).toBeLessThanOrEqual(CHAIN_LINK_SPACING * 1.05);
  });
});
