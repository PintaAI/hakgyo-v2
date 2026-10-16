"use client";

import { useEffect, useState } from "react";

import { randomSeed } from "~/lib/learner/practice";

// Seeds already played in this tab. Back/forward navigation restores the
// page's server render, seed included, and the seed doubles as the attempt
// session id, so replaying it would repeat the round without earning progress.
const playedSeeds = new Set<string>();

/**
 * The practice round's seed: the page's server-picked seed (its data was
 * prefetched with it), or a fresh one when that seed was already played.
 */
export function useRoundSeed(initialSeed: string) {
  const [seed, setSeed] = useState(() =>
    playedSeeds.has(initialSeed) ? randomSeed() : initialSeed,
  );
  useEffect(() => {
    playedSeeds.add(initialSeed);
  }, [initialSeed]);
  return [seed, setSeed] as const;
}
