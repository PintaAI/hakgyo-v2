import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

/**
 * Hujan Kata's sound effects: short synthesized WAVs (made by
 * `scripts/generate-word-fall-sfx.ts`) played through small pools of players,
 * so quick shots overlap instead of cutting each other off. They follow the
 * phone's silent switch, and the game's own "Suara" setting.
 */
const SOUNDS = {
  shot: {
    source: require("../../../assets/sounds/word-fall/shot.wav"),
    voices: 4,
    volume: 0.35,
  },
  blast: {
    source: require("../../../assets/sounds/word-fall/blast.wav"),
    voices: 2,
    volume: 0.6,
  },
  blastBig: {
    source: require("../../../assets/sounds/word-fall/blast-big.wav"),
    voices: 1,
    volume: 0.7,
  },
  wrong: {
    source: require("../../../assets/sounds/word-fall/wrong.wav"),
    voices: 2,
    volume: 0.4,
  },
  lost: {
    source: require("../../../assets/sounds/word-fall/lost.wav"),
    voices: 1,
    volume: 0.5,
  },
  level: {
    source: require("../../../assets/sounds/word-fall/level.wav"),
    voices: 1,
    volume: 0.45,
  },
  powerup: {
    source: require("../../../assets/sounds/word-fall/powerup.wav"),
    voices: 1,
    volume: 0.45,
  },
} as const;

export type WordFallSound = keyof typeof SOUNDS;

type Pool = { players: AudioPlayer[]; next: number };

/**
 * `play(name)` for the game's sounds while `enabled`. The players are made
 * when the game opens and released when it closes; a device or build that
 * cannot play them just stays silent.
 */
export function useWordFallSfx(enabled: boolean) {
  const poolsRef = useRef<Partial<Record<WordFallSound, Pool>>>({});
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const pools = poolsRef.current;
    try {
      for (const name of Object.keys(SOUNDS) as WordFallSound[]) {
        const sound = SOUNDS[name];
        pools[name] = {
          next: 0,
          players: Array.from({ length: sound.voices }, () => {
            const player = createAudioPlayer(sound.source);
            player.volume = sound.volume;
            return player;
          }),
        };
      }
    } catch {
      // No audio: the game plays without sound.
    }
    return () => {
      for (const pool of Object.values(pools)) {
        for (const player of pool.players) {
          try {
            player.remove();
          } catch {
            // Already released.
          }
        }
      }
      poolsRef.current = {};
    };
  }, []);

  return useCallback((name: WordFallSound) => {
    if (!enabledRef.current) return;
    const pool = poolsRef.current[name];
    if (!pool || pool.players.length === 0) return;
    const player = pool.players[pool.next]!;
    pool.next = (pool.next + 1) % pool.players.length;
    try {
      // Back to the start, then play: the same player serves every shot.
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => undefined);
    } catch {
      // A released player (the game is closing).
    }
  }, []);
}
