export type RopePoint = { x: number; y: number };

export type RopeState = {
  x: number[];
  y: number[];
  previousX: number[];
  previousY: number[];
};

export type ChainLinkLayout = RopePoint & { angle: number; length: number };

export const ROPE_POINT_COUNT = 13;
export const CHAIN_LINK_SPACING = 13;
export const MAX_CHAIN_LINK_COUNT = 64;

export function chainLinksForRope(
  state: RopeState,
  requestedSpacing?: number,
  requestedMaximum?: number,
): ChainLinkLayout[] {
  "worklet";
  const spacing = Math.max(8, requestedSpacing ?? CHAIN_LINK_SPACING);
  const maximum = Math.max(
    2,
    Math.floor(requestedMaximum ?? MAX_CHAIN_LINK_COUNT),
  );
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let index = 0; index < state.x.length - 1; index += 1) {
    const length = Math.hypot(
      state.x[index + 1]! - state.x[index]!,
      state.y[index + 1]! - state.y[index]!,
    );
    segmentLengths.push(length);
    totalLength += length;
  }
  if (totalLength <= 0 || segmentLengths.length === 0) return [];

  const count = Math.min(
    maximum,
    Math.max(2, Math.ceil(totalLength / spacing)),
  );
  const step = totalLength / count;
  const linkLength = Math.max(11, Math.min(26, step * 1.18));
  const links: ChainLinkLayout[] = [];
  let segmentIndex = 0;
  let segmentStart = 0;

  for (let index = 0; index < count; index += 1) {
    const target = (index + 0.5) * step;
    while (
      segmentIndex < segmentLengths.length - 1 &&
      segmentStart + segmentLengths[segmentIndex]! < target
    ) {
      segmentStart += segmentLengths[segmentIndex]!;
      segmentIndex += 1;
    }
    const segmentLength = Math.max(0.001, segmentLengths[segmentIndex]!);
    const progress = Math.max(
      0,
      Math.min(1, (target - segmentStart) / segmentLength),
    );
    const x1 = state.x[segmentIndex]!;
    const y1 = state.y[segmentIndex]!;
    const x2 = state.x[segmentIndex + 1]!;
    const y2 = state.y[segmentIndex + 1]!;
    links.push({
      x: x1 + (x2 - x1) * progress,
      y: y1 + (y2 - y1) * progress,
      angle: Math.atan2(y2 - y1, x2 - x1),
      length: linkLength,
    });
  }
  return links;
}

export function createRopeState(
  start: RopePoint,
  end: RopePoint,
  pointCount?: number,
): RopeState {
  "worklet";
  // Worklet closure bindings are hydrated inside the function body. A module
  // constant in a default parameter is evaluated too early on the UI runtime.
  const count = Math.max(2, Math.floor(pointCount ?? ROPE_POINT_COUNT));
  const x: number[] = [];
  const y: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    x.push(start.x + (end.x - start.x) * progress);
    y.push(start.y + (end.y - start.y) * progress);
  }
  return { x, y, previousX: [...x], previousY: [...y] };
}

export function stepRope(
  state: RopeState,
  start: RopePoint,
  end: RopePoint,
  elapsedSeconds: number,
): RopeState {
  "worklet";
  const count = state.x.length;
  if (count < 2) return createRopeState(start, end, ROPE_POINT_COUNT);

  // Clamp delayed frames and substep the solver so a resumed app cannot
  // inject enough energy to explode the rope.
  const elapsed = Math.min(1 / 30, Math.max(0, elapsedSeconds));
  const substeps = 2;
  const dt = elapsed / substeps;
  const x = [...state.x];
  const y = [...state.y];
  const previousX = [...state.previousX];
  const previousY = [...state.previousY];

  for (let step = 0; step < substeps; step += 1) {
    for (let index = 1; index < count - 1; index += 1) {
      const currentX = x[index]!;
      const currentY = y[index]!;
      const velocityX = (currentX - previousX[index]!) * 0.985;
      const velocityY = (currentY - previousY[index]!) * 0.985;
      previousX[index] = currentX;
      previousY[index] = currentY;
      x[index] = currentX + velocityX;
      y[index] = currentY + velocityY + 900 * dt * dt;
    }

    x[0] = start.x;
    y[0] = start.y;
    x[count - 1] = end.x;
    y[count - 1] = end.y;
    const directDistance = Math.hypot(end.x - start.x, end.y - start.y);
    const segmentLength = Math.max(8, (directDistance * 1.055) / (count - 1));

    for (let iteration = 0; iteration < 5; iteration += 1) {
      for (let index = 0; index < count - 1; index += 1) {
        const nextIndex = index + 1;
        const dx = x[nextIndex]! - x[index]!;
        const dy = y[nextIndex]! - y[index]!;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const correction = (distance - segmentLength) / distance;
        const correctionX = dx * correction;
        const correctionY = dy * correction;

        if (index === 0) {
          x[nextIndex] = x[nextIndex]! - correctionX;
          y[nextIndex] = y[nextIndex]! - correctionY;
        } else if (nextIndex === count - 1) {
          x[index] = x[index]! + correctionX;
          y[index] = y[index]! + correctionY;
        } else {
          x[index] = x[index]! + correctionX * 0.5;
          y[index] = y[index]! + correctionY * 0.5;
          x[nextIndex] = x[nextIndex]! - correctionX * 0.5;
          y[nextIndex] = y[nextIndex]! - correctionY * 0.5;
        }
      }
      x[0] = start.x;
      y[0] = start.y;
      x[count - 1] = end.x;
      y[count - 1] = end.y;
    }
  }

  return { x, y, previousX, previousY };
}
