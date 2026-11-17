import { describe, expect, test } from "bun:test";

import {
  addBody,
  createWorld,
  cruiseSpeed,
  fallProgress,
  findBody,
  holdBody,
  explode,
  knockBack,
  massForAnswer,
  removeBody,
  stepWorld,
  type WordFallArena,
  type WordFallWorld,
} from "./physics";

const arena: WordFallArena = {
  width: 390,
  shipX: 195,
  shipY: 500,
  spawnY: -72,
};
const FRAME = 1 / 60;
/** A shot going straight up, from the ship below. */
const UP = { x: 0, y: -1 };

function spawn(
  world: WordFallWorld,
  id: string,
  x: number,
  options: { y?: number; durationMs?: number; mass?: number } = {},
) {
  addBody(world, {
    id,
    x,
    y: options.y ?? arena.spawnY,
    halfWidth: 40,
    halfHeight: 24,
    mass: options.mass ?? 1,
    cruise: cruiseSpeed(arena, options.durationMs ?? 10_000),
  });
}

/** Steps until `until` holds, returning the seconds simulated. */
function run(
  world: WordFallWorld,
  until: (impacted: string[]) => boolean,
  limitSeconds = 120,
) {
  let seconds = 0;
  while (seconds < limitSeconds) {
    stepWorld(world, FRAME, arena);
    seconds += FRAME;
    if (until(world.impacted)) break;
  }
  return seconds;
}

describe("word fall physics", () => {
  test("an undisturbed word reaches the ship in its fall time", () => {
    const world = createWorld();
    spawn(world, "a", 60, { durationMs: 10_000 });

    const seconds = run(world, (impacted) => impacted.includes("a"));

    expect(seconds).toBeGreaterThan(9.8);
    expect(seconds).toBeLessThan(10.2);
    expect(world.bodies).toHaveLength(0);
  });

  test("a word arrives lined up with the ship from either side", () => {
    const world = createWorld();
    spawn(world, "a", 340);
    let lastX = 0;
    run(world, (impacted) => {
      lastX = findBody(world, "a")?.x ?? lastX;
      return impacted.length > 0;
    });

    expect(Math.abs(lastX - arena.shipX)).toBeLessThan(12);
  });

  test("reports an impact once and removes the word", () => {
    const world = createWorld();
    spawn(world, "a", 195, { y: 499.9 });

    stepWorld(world, FRAME, arena);
    expect(world.impacted).toEqual(["a"]);
    stepWorld(world, FRAME, arena);
    expect(world.impacted).toEqual([]);
  });

  test("overlapping words push apart instead of stacking", () => {
    const world = createWorld();
    spawn(world, "a", 190, { y: 100 });
    spawn(world, "b", 200, { y: 104 });

    run(world, () => false, 1);

    const a = findBody(world, "a")!;
    const b = findBody(world, "b")!;
    const apartX = Math.abs(a.x - b.x) >= a.halfWidth + b.halfWidth;
    const apartY = Math.abs(a.y - b.y) >= a.halfHeight + b.halfHeight;
    expect(apartX || apartY).toBe(true);
  });

  test("words never overlap for long on the way down", () => {
    const world = createWorld();
    spawn(world, "a", 60, { y: 0 });
    spawn(world, "b", 195, { y: -20 });
    spawn(world, "c", 330, { y: -40 });
    let deepest = 0;

    run(world, (impacted) => {
      const bodies = world.bodies;
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i]!;
          const b = bodies[j]!;
          const x = a.halfWidth + b.halfWidth - Math.abs(a.x - b.x);
          const y = a.halfHeight + b.halfHeight - Math.abs(a.y - b.y);
          deepest = Math.max(deepest, Math.min(x, y));
        }
      }
      return impacted.length > 0 && world.bodies.length === 0;
    });

    expect(world.bodies).toHaveLength(0);
    expect(deepest).toBeLessThan(4);
  });

  test("a plain shot sets a word back, then it falls on as before", () => {
    const hit = createWorld();
    const free = createWorld();
    spawn(hit, "a", 195, { y: 200 });
    spawn(free, "a", 195, { y: 200 });

    knockBack(hit, "a", 60, UP);
    expect(findBody(hit, "a")!.vy).toBeLessThan(0);
    run(hit, () => false, 3);
    run(free, () => false, 3);

    const setBack = findBody(free, "a")!.y - findBody(hit, "a")!.y;
    expect(setBack).toBeGreaterThan(15);
    expect(setBack).toBeLessThan(60);
    expect(findBody(hit, "a")!.vy).toBeCloseTo(findBody(free, "a")!.vy, 0);
  });

  test("a shot changes the word's course, which it keeps for a moment", () => {
    const world = createWorld();
    spawn(world, "a", 195, { y: 200 });
    const startX = findBody(world, "a")!.x;

    // From the lower left: up and to the right.
    knockBack(world, "a", 150, { x: 0.6, y: -0.8 });
    run(world, () => false, 0.4);

    const body = findBody(world, "a")!;
    expect(body.x - startX).toBeGreaterThan(15);
    expect(body.y).toBeLessThan(200);
  });

  test("a heavier word is knocked back less", () => {
    const world = createWorld();
    spawn(world, "light", 100, { y: 200, mass: massForAnswer(2) });
    spawn(world, "heavy", 300, { y: 200, mass: massForAnswer(12) });

    knockBack(world, "light", 90, UP);
    knockBack(world, "heavy", 90, UP);

    expect(findBody(world, "light")!.vy).toBeLessThan(
      findBody(world, "heavy")!.vy,
    );
  });

  test("a knocked-back word shoves the word behind it", () => {
    const world = createWorld();
    spawn(world, "front", 195, { y: 300 });
    spawn(world, "behind", 195, { y: 240 });
    const before = findBody(world, "behind")!.vy;

    knockBack(world, "front", 200, UP);
    run(world, () => false, 0.2);

    expect(findBody(world, "behind")!.vy).toBeLessThan(before);
  });

  test("a held word stays put and blocks the word behind it", () => {
    const world = createWorld();
    spawn(world, "held", 195, { y: 300 });
    spawn(world, "behind", 195, { y: 200 });
    holdBody(world, "held");

    run(world, () => false, 5);

    const held = findBody(world, "held")!;
    const behind = findBody(world, "behind")!;
    expect(held.y).toBe(300);
    expect(behind.y).toBeLessThan(held.y - held.halfHeight);

    removeBody(world, "held");
    run(world, (impacted) => impacted.includes("behind"));
    expect(world.bodies).toHaveLength(0);
  });

  test("keeps words inside the walls and below the spawn line", () => {
    const world = createWorld();
    spawn(world, "a", 5, { y: arena.spawnY });
    knockBack(world, "a", 200, UP);

    stepWorld(world, FRAME, arena);

    const body = findBody(world, "a")!;
    expect(body.x).toBeGreaterThanOrEqual(body.halfWidth);
    expect(body.y).toBeGreaterThanOrEqual(arena.spawnY);
  });

  test("a shot off centre spins the word, which settles upright again", () => {
    const world = createWorld();
    spawn(world, "a", 195, { y: 100 });

    knockBack(world, "a", 90, UP, -1);
    let widest = 0;
    run(
      world,
      () => {
        widest = Math.max(widest, Math.abs(findBody(world, "a")!.angle));
        return false;
      },
      0.5,
    );
    expect(widest).toBeGreaterThan(0.08);

    run(world, () => false, 3);
    expect(Math.abs(findBody(world, "a")!.angle)).toBeLessThan(0.01);
  });

  test("a centred shot does not spin the word", () => {
    const world = createWorld();
    spawn(world, "a", 195, { y: 100 });

    knockBack(world, "a", 90, UP);

    expect(findBody(world, "a")!.spin).toBe(0);
  });

  test("calm words barely turn when they touch", () => {
    const world = createWorld();
    spawn(world, "front", 170, { y: 300 });
    spawn(world, "behind", 230, { y: 240 });

    knockBack(world, "front", 200, UP);
    let turned = 0;
    run(
      world,
      () => {
        turned = Math.max(turned, Math.abs(findBody(world, "behind")!.angle));
        return false;
      },
      0.6,
    );

    // Only the lean into its sideways drift, a few degrees.
    expect(turned).toBeLessThan(0.08);
  });

  test("a blast throws the words near it away and spins them", () => {
    const world = createWorld();
    spawn(world, "left", 100, { y: 200 });
    spawn(world, "right", 300, { y: 200 });
    spawn(world, "far", 195, { y: 450 });
    const fallSpeed = findBody(world, "far")!.vy;

    explode(world, 200, 200, 140, 300);

    const left = findBody(world, "left")!;
    const right = findBody(world, "right")!;
    expect(left.vx).toBeLessThan(-50);
    expect(right.vx).toBeGreaterThan(50);
    expect(left.spin).toBeLessThan(0);
    expect(right.spin).toBeGreaterThan(0);
    expect(left.shaken).toBeGreaterThan(0);
    expect(findBody(world, "far")!.vy).toBe(fallSpeed);
    expect(findBody(world, "far")!.shaken).toBe(0);
  });

  test("shaken words bounce and turn off each other, then calm down", () => {
    const calm = createWorld();
    const shaken = createWorld();
    for (const world of [calm, shaken]) {
      spawn(world, "front", 170, { y: 300 });
      spawn(world, "behind", 230, { y: 240 });
      knockBack(world, "front", 200, UP);
    }
    for (const body of shaken.bodies) body.shaken = 1;
    const widest = (world: WordFallWorld) => {
      let turned = 0;
      run(
        world,
        () => {
          turned = Math.max(turned, Math.abs(findBody(world, "behind")!.angle));
          return false;
        },
        0.6,
      );
      return turned;
    };

    expect(widest(shaken)).toBeGreaterThan(widest(calm) * 4);
    run(shaken, () => false, 1);
    expect(findBody(shaken, "behind")!.shaken).toBe(0);
  });

  test("a long frame is simulated as a short one", () => {
    const world = createWorld();
    spawn(world, "a", 195, { y: 0 });

    stepWorld(world, 5, arena);

    expect(findBody(world, "a")!.y).toBeLessThan(10);
    expect(fallProgress(findBody(world, "a")!, arena)).toBeLessThan(0.2);
  });
});
