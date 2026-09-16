export type VocabularyCardFlight = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  width: number;
  height: number;
  targetY: number;
  targetScale: number;
  scale: number;
  direction: number;
  behind: boolean;
  capture: number;
  captureDistance: number;
  promotion: number;
  landing: number;
  remainder: number;
  settled: boolean;
};

export function startVocabularyCardFlight(
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  width: number,
  height: number,
  count: number,
  promotion: number,
): VocabularyCardFlight {
  "worklet";
  const depth = Math.min(count - 1, 3);
  const targetScale = 1 - depth * 0.035;
  return {
    x,
    y,
    velocityX,
    velocityY,
    width,
    height,
    targetY: -depth * 18 + (height * (1 - targetScale)) / 2,
    targetScale,
    scale: 1,
    direction: Math.abs(velocityX) > 40 ? Math.sign(velocityX) : x < 0 ? -1 : 1,
    behind: false,
    capture: 0,
    captureDistance: 0,
    promotion,
    landing: 0,
    remainder: 0,
    settled: false,
  };
}

/** Advance real position/velocity with fixed substeps, independently of display Hz. */
export function stepVocabularyCardFlight(
  previous: VocabularyCardFlight,
  elapsedSeconds: number,
): VocabularyCardFlight {
  "worklet";
  if (previous.settled || elapsedSeconds <= 0) return previous;
  const next = { ...previous };
  // Bound catch-up after a suspended app or a dropped frame, not throw velocity.
  let remaining = previous.remainder + Math.min(elapsedSeconds, 0.064);
  const dt = 1 / 240;
  while (remaining + 1e-10 >= dt && !next.settled) {
    remaining -= dt;
    const clearsAbove = next.y + (next.height * (1 + next.scale)) / 2 < -12;
    const clearsSide =
      Math.abs(next.x) > (next.width * (1 + next.scale)) / 2 + 12;
    if (!next.behind && (clearsAbove || clearsSide)) {
      next.behind = true;
      next.captureDistance = Math.max(
        1,
        Math.hypot(next.x, next.y - next.targetY),
      );
    }

    // Spring engagement is gradual; crossing behind never resets velocity.
    if (next.behind)
      next.capture += (1 - next.capture) * (1 - Math.exp(-12 * dt));
    const capture = next.capture;
    // A stronger, near-critically damped return settles quickly without bounce.
    const drag = 2.2 * (1 - capture) + 25 * capture;
    const spring = 150 * capture;
    // A perpendicular force bends upward momentum into a return arc. It fades
    // as the spring takes over, avoiding a wobble or repeated orbit at landing.
    const curl = 4.2 * (1 - capture);
    const ax =
      -drag * next.velocityX -
      spring * next.x -
      next.direction * curl * next.velocityY;
    const ay =
      -drag * next.velocityY -
      spring * (next.y - next.targetY) -
      3600 * (1 - capture) +
      next.direction * curl * next.velocityX;
    next.velocityX += ax * dt;
    next.velocityY += ay * dt;
    next.x += next.velocityX * dt;
    next.y += next.velocityY * dt;

    if (next.behind) {
      next.scale += (next.targetScale - next.scale) * (1 - Math.exp(-12 * dt));
      const distance = Math.hypot(next.x, next.y - next.targetY);
      next.promotion = 1;
      next.landing = Math.max(
        next.landing,
        Math.min(0.999, 1 - distance / next.captureDistance),
      );
      if (
        distance < 0.5 &&
        Math.hypot(next.velocityX, next.velocityY) < 6 &&
        Math.abs(next.scale - next.targetScale) < 0.001
      ) {
        next.x = 0;
        next.y = next.targetY;
        next.velocityX = 0;
        next.velocityY = 0;
        next.scale = next.targetScale;
        next.landing = 1;
        next.settled = true;
      }
    } else {
      next.promotion = Math.max(
        next.promotion,
        Math.min(
          0.98,
          Math.max(
            -next.y / (next.height + 12),
            Math.abs(next.x) / (next.width + 12),
          ),
        ),
      );
    }
  }
  next.remainder = Math.max(0, remaining);
  return next;
}
