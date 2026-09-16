import { describe, expect, test } from "bun:test";
import {
  startVocabularyCardFlight as start,
  stepVocabularyCardFlight as step,
  type VocabularyCardFlight,
} from "./vocabulary-card-physics";

function simulate(initial: VocabularyCardFlight, hz = 120) {
  let state = initial;
  let elapsed = 0;
  let highestY = initial.y;
  let speedAtApex = 0;
  while (!state.settled && elapsed < 8) {
    const previous = state;
    state = step(state, 1 / hz);
    elapsed += 1 / hz;
    highestY = Math.min(highestY, state.y);
    if (previous.velocityY < 0 && state.velocityY >= 0)
      speedAtApex = Math.abs(state.velocityX);
  }
  return { state, elapsed, highestY, speedAtApex };
}

describe("velocity-driven card flight", () => {
  test("uses the release velocity directly, without clamping it or assigning a duration", () => {
    const flight = start(12, -80, 2400, -5000, 328, 224, 24, 0.3);
    expect(flight.velocityX).toBe(2400);
    expect(flight.velocityY).toBe(-5000);
    const next = step(flight, 1 / 240);
    expect(next.x).toBeGreaterThan(flight.x);
    expect(next.y).toBeLessThan(flight.y);
  });

  test("stronger throws actually travel farther and have different settling times", () => {
    const gentle = simulate(start(0, -80, 0, -300, 328, 224, 24, 0.3));
    const strong = simulate(start(0, -80, 0, -3000, 328, 224, 24, 0.3));
    expect(strong.highestY).toBeLessThan(gentle.highestY - 70);
    expect(Math.abs(strong.elapsed - gentle.elapsed)).toBeGreaterThan(0.05);
    expect(gentle.state.settled).toBeTrue();
    expect(strong.state.settled).toBeTrue();
  });

  test("retains lateral momentum as upward flight turns toward the deck", () => {
    for (const speed of [0, -300, -900, -2000, -4000]) {
      const result = simulate(start(0, -80, 0, speed, 328, 224, 24, 0.3));
      expect(result.speedAtApex).toBeGreaterThan(50);
    }
  });

  test("settles the return within 950ms across gentle and strong throws", () => {
    for (const velocityY of [-300, -900, -3000]) {
      let flight = start(0, -80, 0, velocityY, 328, 224, 24, 0.3);
      let returnTime = 0;
      for (let frame = 0; frame < 960 && !flight.settled; frame++) {
        if (flight.behind) returnTime += 1 / 240;
        flight = step(flight, 1 / 240);
      }
      expect(flight.settled).toBeTrue();
      expect(returnTime).toBeGreaterThan(0);
      expect(returnTime).toBeLessThan(0.95);
    }
  });

  test("only changes stacking order once the physical card clears the deck", () => {
    let flight = start(0, -80, 0, -900, 328, 224, 24, 0.3);
    let steps = 0;
    while (!flight.behind && steps++ < 1000) {
      const previous = flight;
      flight = step(flight, 1 / 240);
      if (flight.behind) {
        const above =
          previous.y + (previous.height * (1 + previous.scale)) / 2 < -12;
        const beside =
          Math.abs(previous.x) >
          (previous.width * (1 + previous.scale)) / 2 + 12;
        expect(above || beside).toBeTrue();
        expect(Math.hypot(flight.velocityX, flight.velocityY)).toBeGreaterThan(
          100,
        );
        expect(
          Math.hypot(
            flight.velocityX - previous.velocityX,
            flight.velocityY - previous.velocityY,
          ),
        ).toBeLessThan(100);
      }
    }
    expect(flight.behind).toBeTrue();
  });

  test("lands stably across deck sizes, release directions, and strong flicks", () => {
    for (const count of [1, 2, 24]) {
      for (const velocityX of [-1600, 0, 1600]) {
        for (const velocityY of [0, -900, -5000]) {
          const result = simulate(
            start(0, -80, velocityX, velocityY, 328, 224, count, 0.3),
          );
          expect(result.state.settled).toBeTrue();
          expect(result.state.x).toBe(0);
          expect(result.state.y).toBe(result.state.targetY);
          expect(result.state.scale).toBe(result.state.targetScale);
          expect(result.state.velocityX).toBe(0);
          expect(result.state.velocityY).toBe(0);
        }
      }
    }
  });

  test("shrinks monotonically without a scale bounce", () => {
    let flight = start(0, -80, 200, -900, 328, 224, 24, 0.3);
    for (let frame = 0; frame < 400 && !flight.settled; frame++) {
      const next = step(flight, 1 / 120);
      expect(next.scale).toBeLessThanOrEqual(flight.scale);
      expect(next.scale).toBeGreaterThanOrEqual(next.targetScale);
      flight = next;
    }
    expect(flight.settled).toBeTrue();
  });

  test("follows the same simulation at 60Hz and 120Hz", () => {
    const initial = start(0, -80, 180, -1500, 328, 224, 24, 0.3);
    let sixty = initial;
    let oneTwenty = initial;
    for (let frame = 0; frame < 60; frame++) {
      sixty = step(sixty, 1 / 60);
      oneTwenty = step(step(oneTwenty, 1 / 120), 1 / 120);
      expect(sixty.x).toBeCloseTo(oneTwenty.x, 5);
      expect(sixty.y).toBeCloseTo(oneTwenty.y, 5);
      expect(sixty.velocityY).toBeCloseTo(oneTwenty.velocityY, 5);
    }
  });

  test("bounds catch-up after a long frame without invalidating state", () => {
    const initial = start(0, -80, 200, -900, 328, 224, 24, 0.3);
    expect(step(initial, 2)).toEqual(step(initial, 0.064));
    expect(simulate(step(initial, 2)).state.settled).toBeTrue();
    expect(step(initial, 0)).toBe(initial);
  });
});
