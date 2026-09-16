const RESTING_FOLD = 18;

export function vocabularyStickerPeelGesture(
  translationX: number,
  translationY: number,
  velocityX: number,
  velocityY: number,
  width: number,
  height: number,
) {
  "worklet";
  const diagonal = Math.SQRT1_2;
  const pull =
    (Math.max(0, -translationX) + Math.max(0, -translationY)) * diagonal;
  const travel = Math.max(1, (width + height) * diagonal);
  const progress = Math.max(0, Math.min(1, pull / travel));
  const releaseVelocity =
    (Math.max(0, -velocityX) + Math.max(0, -velocityY)) * diagonal;
  return {
    progress,
    commit: progress >= 0.42 || (progress >= 0.12 && releaseVelocity >= 700),
  };
}

/** Continue the released corner until its crease clears the opposite edge. */
export function vocabularyStickerPeelCompletion(
  translationX: number,
  translationY: number,
  width: number,
  height: number,
) {
  "worklet";
  let dx = Math.min(0, translationX);
  let dy = Math.min(0, translationY);
  let length = Math.hypot(dx, dy);
  if (length < 1) {
    dx = -1;
    dy = -1;
    length = Math.SQRT2;
  }
  const nx = dx / length;
  const ny = dy / length;
  // Since the crease sits halfway between the original and dragged corner,
  // moving it beyond the furthest point in this direction clears the card.
  const completionLength = Math.max(1, -2 * (nx * width + ny * height) + 8);
  return {
    translationX: nx * completionLength,
    translationY: ny * completionLength,
  };
}

/**
 * Model an ideal paper fold. The crease is the perpendicular bisector between
 * the original bottom-right corner and its dragged position. Reflecting that
 * original corner over the crease lands it exactly under the finger.
 */
export function vocabularyStickerPeelAtTip(
  tipX: number,
  tipY: number,
  width: number,
  height: number,
) {
  "worklet";
  const cornerX = width;
  const cornerY = height;
  let dx = Math.min(0, tipX - cornerX);
  let dy = Math.min(0, tipY - cornerY);
  let distance = Math.hypot(dx, dy);
  if (distance < 0.001) {
    dx = -RESTING_FOLD;
    dy = -RESTING_FOLD;
    distance = Math.hypot(dx, dy);
  }
  tipX = cornerX + dx;
  tipY = cornerY + dy;

  const nx = dx / distance;
  const ny = dy / distance;
  const tangentX = -ny;
  const tangentY = nx;
  const angle = Math.atan2(tangentY, tangentX);
  const creaseX = (cornerX + tipX) / 2;
  const creaseY = (cornerY + tipY) / 2;
  const span = Math.hypot(width, height) * 2.5 + 64;
  const maskHeight = span;

  // The clipping plane's x-axis follows the crease. Its negative y direction
  // points into the unpeeled sheet, so its bottom edge is the live crease.
  const normalBasisX = -nx;
  const normalBasisY = -ny;
  const maskLeft = creaseX - tangentX * span - normalBasisX * maskHeight;
  const maskTop = creaseY - tangentY * span - normalBasisY * maskHeight;
  const contentLeft = -(maskLeft * tangentX + maskTop * tangentY);
  const contentTop = -(maskLeft * normalBasisX + maskTop * normalBasisY);

  // This matrix reflects the source card over the horizontal crease in plane
  // coordinates. The parent rotation turns that into the finger-defined fold.
  const backMatrix = [
    tangentX,
    nx,
    0,
    0,
    tangentY,
    ny,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ];
  const completionDistance = Math.max(1, -2 * (nx * width + ny * height));
  const progress = Math.max(0, Math.min(1, distance / completionDistance));
  const creasePositions: number[] = [];
  const epsilon = 0.001;
  if (Math.abs(tangentX) > epsilon) {
    for (const x of [0, width]) {
      const position = (x - creaseX) / tangentX;
      const y = creaseY + position * tangentY;
      if (y >= -epsilon && y <= height + epsilon)
        creasePositions.push(position);
    }
  }
  if (Math.abs(tangentY) > epsilon) {
    for (const y of [0, height]) {
      const position = (y - creaseY) / tangentY;
      const x = creaseX + position * tangentX;
      if (x >= -epsilon && x <= width + epsilon) creasePositions.push(position);
    }
  }
  let creaseLeft = span;
  let creaseWidth = 0;
  if (creasePositions.length >= 2) {
    const start = Math.min(...creasePositions);
    const end = Math.max(...creasePositions);
    creaseLeft = span + start;
    creaseWidth = Math.max(0, end - start);
  }
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  let remaining = -Infinity;
  for (const corner of corners) {
    remaining = Math.max(
      remaining,
      nx * (corner![0]! - creaseX) + ny * (corner![1]! - creaseY),
    );
  }

  return {
    angle,
    tipX,
    tipY,
    creaseX,
    creaseY,
    maskLeft,
    maskTop,
    maskWidth: span * 2,
    maskHeight,
    contentLeft,
    contentTop,
    backLeft: contentLeft,
    backTop: 2 * maskHeight - contentTop,
    backMatrix,
    creaseTop: maskHeight,
    creaseLeft,
    creaseWidth,
    curlHeight: 3 + 18 * Math.sin(Math.PI * progress),
    shadowOpacity:
      (0.12 + 0.2 * Math.sin(Math.PI * progress)) *
      Math.min(1, (1 - progress) * 12),
    opacity: remaining <= 0 ? 0 : 1,
  };
}

/** Default diagonal path for grading and accessibility-triggered reveals. */
export function vocabularyStickerPeel(
  progress: number,
  width: number,
  height: number,
) {
  "worklet";
  const p = Math.max(0, Math.min(1, progress));
  const completion = vocabularyStickerPeelCompletion(-1, -1, width, height);
  const restingX = width - RESTING_FOLD;
  const restingY = height - RESTING_FOLD;
  const tipX = restingX + (width + completion.translationX - restingX) * p;
  const tipY = restingY + (height + completion.translationY - restingY) * p;
  return vocabularyStickerPeelAtTip(tipX, tipY, width, height);
}
