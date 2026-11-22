/**
 * Hujan Kata's movement: a small rigid-body simulation of the falling words.
 *
 * It knows nothing about React, vocabulary or scoring. The screen adds a body
 * per falling word, steps the world once a frame on the UI thread and draws
 * each word where its body is. Every function is a worklet, and also runs as
 * plain TypeScript (see `physics.test.ts`).
 *
 * The model, per step:
 * 1. each word steers towards its cruise velocity: straight down at `cruise`
 *    and sideways just enough to arrive at the ship, so an undisturbed word
 *    takes the level's fall time whatever else happens around it;
 * 2. overlapping words push each other apart and trade momentum by mass;
 * 3. words stay inside the side walls and below the spawn line, and every
 *    word turns on a spring that pulls it back upright: a shot or a push off
 *    centre makes it wobble;
 * 4. a word whose centre reaches the ship's line leaves the world and is
 *    listed in `impacted`.
 *
 * At most five words fall at once, so the pair loop is ten checks a frame.
 * To change how the game feels, change the constants below.
 */

export type WordBody = {
  id: string;
  /** Centre, in the field's coordinates. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  halfWidth: number;
  halfHeight: number;
  mass: number;
  /** Rotation in radians (clockwise) and its speed in rad/s. */
  angle: number;
  spin: number;
  /**
   * How shaken the word is by a blast, 1 just after one and fading to 0.
   * Calm words touch with little bounce or turning; shaken ones bounce and
   * spin off each other.
   */
  shaken: number;
  /**
   * How thrown off its course the word is by a hit, 1 just after a hard one
   * and fading to 0. A staggered word steers back to its path more slowly,
   * so a shot changes where it goes, not only how it leans.
   */
  staggered: number;
  /** Downward speed it settles at, in px/s. */
  cruise: number;
  /** Held in place and immovable (a word being destroyed). */
  held: boolean;
};

export type WordFallWorld = {
  bodies: WordBody[];
  /** Ids of the words that reached the ship in the last step. */
  impacted: string[];
};

export type WordFallArena = {
  width: number;
  shipX: number;
  shipY: number;
  /** Where words appear; nothing is pushed above it. */
  spawnY: number;
};

/** How fast a word returns to its cruise velocity, per second. */
const STEER_RATE = 3;
/** Share of the steering a fully staggered word loses, and how fast it recovers, per second. */
const STAGGER_STEER_LOSS = 0.75;
const STAGGER_RECOVERY = 1.5;
/** The shot impulse (px/s) that staggers a word fully. */
const FULL_STAGGER_IMPULSE = 150;
/** Shots turn words by real torque, scaled down so they wobble rather than spin. */
const SHOT_TORQUE_SCALE = 0.6;
/** Longest step simulated at once, so a dropped frame cannot tunnel words. */
const MAX_STEP_SECONDS = 1 / 30;
/** Space kept between two words. */
const WORD_GAP = 6;
/** Space kept between a word and a side wall. */
const WALL_GAP = 8;
/** Share of an overlap corrected per pass; below 1 so stacks do not jitter. */
const OVERLAP_CORRECTION = 0.5;
/** Bounce of a collision, calm and shaken: 0 sticks, 1 bounces back at full speed. */
const CALM_RESTITUTION = 0.1;
const SHAKEN_RESTITUTION = 0.45;
/** Share of the collision spin a calm word gets; a shaken one gets all of it. */
const CALM_SPIN_SHARE = 0.1;
/** How fast a word calms down after a blast, per second. */
const CALM_RATE = 1.4;
/** Collision passes per step, so a push travels through a stack of words. */
const COLLISION_PASSES = 2;
/** Shortest time a word aims to take to line up with the ship, in seconds. */
const MIN_ARRIVAL_SECONDS = 0.35;
/** Share of the sideways speed two touching words lose to each other per pass. */
const FRICTION = 0.12;
/** Lean per px/s of sideways speed, and its limit, in radians. */
const LEAN_PER_SPEED = 1 / 1400;
const MAX_LEAN = 0.05;
/** The spring that brings a word back upright, and how fast its wobble dies. */
const UPRIGHT_STIFFNESS = 70;
const SPIN_DAMPING = 6;
/** Limits of a word's rotation (radians) and spin (rad/s). */
const MAX_ANGLE = 0.38;
const MAX_SPIN = 9;
/** Spin from an off-centre collision, per unit of impulse or of overlap pushed out. */
const SPIN_PER_IMPULSE = 0.08;
const SPIN_PER_OVERLAP = 0.6;
/** Spin from two words sliding along each other, per px/s. */
const SPIN_PER_SLIDE = 0.004;
/** Spin a blast gives a word next to it, per px/s it is thrown at. */
const SPIN_PER_BLAST = 0.02;

export function createWorld(): WordFallWorld {
  "worklet";
  return { bodies: [], impacted: [] };
}

/** Longer answers are heavier: harder to knock back, and they shove others. */
export function massForAnswer(characters: number) {
  "worklet";
  return 1 + Math.min(12, Math.max(0, characters)) / 24;
}

/** The cruise speed that takes a word from the spawn line to the ship in `durationMs`. */
export function cruiseSpeed(arena: WordFallArena, durationMs: number) {
  "worklet";
  return (
    Math.max(1, arena.shipY - arena.spawnY) / (Math.max(1, durationMs) / 1000)
  );
}

export function findBody(world: WordFallWorld, id: string) {
  "worklet";
  for (const body of world.bodies) if (body.id === id) return body;
  return undefined;
}

/** Adds a word at rest relative to its cruise: it starts at cruise speed. */
export function addBody(
  world: WordFallWorld,
  body: Omit<
    WordBody,
    "vx" | "vy" | "angle" | "spin" | "shaken" | "staggered" | "held"
  >,
) {
  "worklet";
  if (findBody(world, body.id)) return;
  world.bodies.push({
    ...body,
    vx: 0,
    vy: body.cruise,
    angle: 0,
    spin: 0,
    shaken: 0,
    staggered: 0,
    held: false,
  });
}

export function removeBody(world: WordFallWorld, id: string) {
  "worklet";
  world.bodies = world.bodies.filter((body) => body.id !== id);
}

/** The word's measured size, replacing the estimate it spawned with. */
export function setBodySize(
  world: WordFallWorld,
  id: string,
  halfWidth: number,
  halfHeight: number,
) {
  "worklet";
  const body = findBody(world, id);
  if (!body) return;
  body.halfWidth = halfWidth;
  body.halfHeight = halfHeight;
}

/** Stops a word where it is; other words now collide with it as with a wall. */
export function holdBody(world: WordFallWorld, id: string) {
  "worklet";
  const body = findBody(world, id);
  if (!body) return;
  body.held = true;
  body.vx = 0;
  body.vy = 0;
}

/**
 * A shot's hit, as an impulse on a rigid card.
 *
 * `impulse` is the speed (px/s) it gives a word of mass 1, along the shot's
 * `direction` (it needs not be of length 1): a word hit from the lower left
 * flies up and to the right, and heavier words move less. `offset` is where
 * on the card the shot lands, from -1 (left edge) to 1 (right edge); off
 * centre the impulse also turns the word, by its torque about the centre.
 * The word is staggered for a moment, so it keeps some of its new course
 * before steering back to its path.
 */
export function knockBack(
  world: WordFallWorld,
  id: string,
  impulse: number,
  direction: { x: number; y: number },
  offset = 0,
) {
  "worklet";
  const body = findBody(world, id);
  if (!body) return;
  const length = Math.hypot(direction.x, direction.y);
  // No direction given: straight up, away from the ship below.
  const unitX = length > 0.001 ? direction.x / length : 0;
  const unitY = length > 0.001 ? direction.y / length : -1;
  const strength = Math.max(0, impulse);
  const impulseX = unitX * strength;
  const impulseY = unitY * strength;

  // It lands on the face it comes at: the bottom for a shot going up.
  const contactX = Math.max(-1, Math.min(1, offset)) * body.halfWidth;
  const contactY = unitY <= 0 ? body.halfHeight : -body.halfHeight;
  // Torque r × J (clockwise positive, as y points down) over the moment of
  // inertia of a uniform card, m(w² + h²)/12 with the full width and height.
  const torque = contactX * impulseY - contactY * impulseX;
  const inertia =
    (body.mass * (body.halfWidth ** 2 + body.halfHeight ** 2)) / 3;
  body.spin += (torque / Math.max(1, inertia)) * SHOT_TORQUE_SCALE;
  if (body.held) return;

  body.vx += impulseX / body.mass;
  body.vy += impulseY / body.mass;
  body.staggered = Math.min(
    1,
    Math.max(body.staggered, strength / body.mass / FULL_STAGGER_IMPULSE),
  );
}

/**
 * A destroyed word's blast at (`x`, `y`): every word within `radius` is
 * thrown away from it, the nearer the harder (`strength` px/s at the centre,
 * less for heavier words), spins and is shaken for a moment.
 */
export function explode(
  world: WordFallWorld,
  x: number,
  y: number,
  radius: number,
  strength: number,
) {
  "worklet";
  for (const body of world.bodies) {
    const awayX = body.x - x;
    const awayY = body.y - y;
    // Measured to the near edge of the card, so a wide word next door counts.
    const gapX = Math.max(0, Math.abs(awayX) - body.halfWidth);
    const gapY = Math.max(0, Math.abs(awayY) - body.halfHeight);
    const reach = 1 - Math.hypot(gapX, gapY) / Math.max(1, radius);
    if (reach <= 0) continue;
    body.shaken = Math.max(body.shaken, reach);
    body.staggered = Math.max(body.staggered, reach);
    if (body.held) continue;
    const length = Math.hypot(awayX, awayY);
    const directionX = length > 0.001 ? awayX / length : 0;
    const directionY = length > 0.001 ? awayY / length : -1;
    const speed = (strength * reach) / body.mass;
    body.vx += directionX * speed;
    body.vy += directionY * speed;
    // Thrown to the right it tips clockwise, to the left anticlockwise; a
    // word straight above or below tips a random way.
    const side =
      Math.abs(directionX) > 0.2
        ? Math.sign(directionX)
        : Math.random() < 0.5
          ? -1
          : 1;
    body.spin += side * speed * SPIN_PER_BLAST;
  }
}

/** How far along its fall a word is: 0 at the spawn line, 1 at the ship. */
export function fallProgress(body: WordBody, arena: WordFallArena) {
  "worklet";
  const progress =
    (body.y - arena.spawnY) / Math.max(1, arena.shipY - arena.spawnY);
  return Math.max(0, Math.min(1, progress));
}

/** Turns the word and pulls it back upright, like a weight on a spring. */
function rotate(body: WordBody, seconds: number) {
  "worklet";
  const lean = Math.max(
    -MAX_LEAN,
    Math.min(MAX_LEAN, body.vx * LEAN_PER_SPEED),
  );
  body.spin +=
    (UPRIGHT_STIFFNESS * (lean - body.angle) - SPIN_DAMPING * body.spin) *
    seconds;
  body.spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, body.spin));
  body.angle = Math.max(
    -MAX_ANGLE,
    Math.min(MAX_ANGLE, body.angle + body.spin * seconds),
  );
}

function steer(body: WordBody, arena: WordFallArena, seconds: number) {
  "worklet";
  const arrival = Math.max(
    MIN_ARRIVAL_SECONDS,
    (arena.shipY - body.y) / Math.max(1, body.cruise),
  );
  const sidewaysLimit = body.cruise * 3 + 60;
  const targetVx = Math.max(
    -sidewaysLimit,
    Math.min(sidewaysLimit, (arena.shipX - body.x) / arrival),
  );
  // Exponential approach: the same curve at any frame rate.
  const rate = STEER_RATE * (1 - STAGGER_STEER_LOSS * body.staggered);
  const blend = 1 - Math.exp(-rate * seconds);
  body.vx += (targetVx - body.vx) * blend;
  body.vy += (body.cruise - body.vy) * blend;
  body.x += body.vx * seconds;
  body.y += body.vy * seconds;
}

function collide(a: WordBody, b: WordBody) {
  "worklet";
  const inverseA = a.held ? 0 : 1 / a.mass;
  const inverseB = b.held ? 0 : 1 / b.mass;
  const inverseSum = inverseA + inverseB;
  if (inverseSum === 0) return;

  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;
  const overlapX = a.halfWidth + b.halfWidth + WORD_GAP - Math.abs(deltaX);
  const overlapY = a.halfHeight + b.halfHeight + WORD_GAP - Math.abs(deltaY);
  if (overlapX <= 0 || overlapY <= 0) return;

  // Separate along the axis that takes the smaller move.
  const alongX = overlapX < overlapY;
  const normalX = alongX ? (deltaX < 0 ? -1 : 1) : 0;
  const normalY = alongX ? 0 : deltaY < 0 ? -1 : 1;
  const correction =
    ((alongX ? overlapX : overlapY) * OVERLAP_CORRECTION) / inverseSum;
  a.x -= normalX * correction * inverseA;
  a.y -= normalY * correction * inverseA;
  b.x += normalX * correction * inverseB;
  b.y += normalY * correction * inverseB;

  // How far off centre they touch, -1 to 1: an off-centre push turns both.
  const lever = alongX
    ? deltaY / (a.halfHeight + b.halfHeight)
    : -deltaX / (a.halfWidth + b.halfWidth);
  // Sliding along each other: friction slows the slide and rolls them.
  const slide = alongX ? b.vy - a.vy : b.vx - a.vx;
  const grip = (slide * FRICTION) / inverseSum;
  if (alongX) {
    a.vy += grip * inverseA;
    b.vy -= grip * inverseB;
  } else {
    a.vx += grip * inverseA;
    b.vx -= grip * inverseB;
  }
  // Calm words just make room; after a blast they bounce and spin.
  const shaken = Math.max(a.shaken, b.shaken);
  const spinShare = CALM_SPIN_SHARE + (1 - CALM_SPIN_SHARE) * shaken;
  const roll = slide * SPIN_PER_SLIDE * (alongX ? normalX : -normalY);
  const squeeze = lever * correction * SPIN_PER_OVERLAP;
  a.spin += (squeeze + roll) * spinShare * inverseA;
  b.spin += (squeeze + roll) * spinShare * inverseB;

  const closing = (b.vx - a.vx) * normalX + (b.vy - a.vy) * normalY;
  if (closing >= 0) return;
  const restitution =
    CALM_RESTITUTION + (SHAKEN_RESTITUTION - CALM_RESTITUTION) * shaken;
  const impulse = (-(1 + restitution) * closing) / inverseSum;
  a.spin += lever * impulse * SPIN_PER_IMPULSE * spinShare * inverseA;
  b.spin += lever * impulse * SPIN_PER_IMPULSE * spinShare * inverseB;
  a.vx -= normalX * impulse * inverseA;
  a.vy -= normalY * impulse * inverseA;
  b.vx += normalX * impulse * inverseB;
  b.vy += normalY * impulse * inverseB;
}

function contain(body: WordBody, arena: WordFallArena) {
  "worklet";
  const left = body.halfWidth + WALL_GAP;
  const right = arena.width - body.halfWidth - WALL_GAP;
  // A word wider than the field sits in the middle.
  if (left >= right) {
    body.x = arena.width / 2;
    body.vx = 0;
  } else if (body.x < left) {
    body.x = left;
    body.vx = Math.max(0, body.vx);
  } else if (body.x > right) {
    body.x = right;
    body.vx = Math.min(0, body.vx);
  }
  if (body.y < arena.spawnY) {
    body.y = arena.spawnY;
    body.vy = Math.max(0, body.vy);
  }
}

/** Advances the world by `seconds`, in place. */
export function stepWorld(
  world: WordFallWorld,
  seconds: number,
  arena: WordFallArena,
) {
  "worklet";
  world.impacted = [];
  const step = Math.max(0, Math.min(MAX_STEP_SECONDS, seconds));
  if (step === 0) return;
  const bodies = world.bodies;

  for (const body of bodies) if (!body.held) steer(body, arena, step);
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let first = 0; first < bodies.length; first++) {
      for (let second = first + 1; second < bodies.length; second++) {
        collide(bodies[first]!, bodies[second]!);
      }
    }
  }
  for (const body of bodies) {
    if (!body.held) contain(body, arena);
    rotate(body, step);
    body.shaken = Math.max(0, body.shaken - CALM_RATE * step);
    body.staggered = Math.max(0, body.staggered - STAGGER_RECOVERY * step);
  }

  for (const body of bodies) {
    if (!body.held && body.y >= arena.shipY) world.impacted.push(body.id);
  }
  if (world.impacted.length > 0) {
    world.bodies = bodies.filter((body) => body.held || body.y < arena.shipY);
  }
}
