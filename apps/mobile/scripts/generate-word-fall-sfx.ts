/**
 * Writes Hujan Kata's sound effects (apps/mobile/assets/sounds/word-fall/).
 *
 * The sounds are synthesized here, not recorded: each is a few sine tones or
 * filtered noise under a decay envelope. To change one, change its recipe and
 * run `bun scripts/generate-word-fall-sfx.ts`; the WAV files are committed, so
 * the app never runs this.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLE_RATE = 22_050;
const OUT_DIR = join(import.meta.dir, "../assets/sounds/word-fall");

type Voice = (time: number, duration: number) => number;

/** A tone gliding from one pitch to another, with a little second harmonic. */
function tone(fromHz: number, toHz: number, decay: number): Voice {
  let phase = 0;
  return (time, duration) => {
    const hz = fromHz + (toHz - fromHz) * (time / duration);
    phase += (2 * Math.PI * hz) / SAMPLE_RATE;
    return (
      (Math.sin(phase) + 0.25 * Math.sin(phase * 2)) * Math.exp(-decay * time)
    );
  };
}

/** Noise through a one-pole low-pass that closes as it decays: a soft blast. */
function noise(cutoff: number, decay: number, seed: number): Voice {
  let state = seed;
  let low = 0;
  return (time) => {
    state = (state * 48271) % 2147483647;
    const white = (state / 2147483647) * 2 - 1;
    const open = cutoff * Math.exp(-decay * 0.6 * time);
    low += open * (white - low);
    return low * Math.exp(-decay * time);
  };
}

/** A voice that starts `at` seconds in. */
function delayed(at: number, voice: Voice): Voice {
  return (time, duration) => (time < at ? 0 : voice(time - at, duration - at));
}

function render(duration: number, gain: number, voices: Voice[]) {
  const length = Math.round(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const time = index / SAMPLE_RATE;
    let value = 0;
    for (const voice of voices) value += voice(time, duration);
    // A few milliseconds in and out, so nothing clicks.
    const edge = Math.min(1, time / 0.004, (duration - time) / 0.012);
    samples[index] = value * gain * edge;
  }
  return samples;
}

function wav(samples: Float32Array) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clipped * 32767), index * 2);
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const SOUNDS: Record<string, Float32Array> = {
  // A letter fired: a quick falling blip.
  shot: render(0.08, 0.5, [tone(980, 520, 38)]),
  // A word destroyed: a thump under a puff of noise.
  blast: render(0.3, 0.8, [tone(150, 55, 14), noise(0.5, 16, 7)]),
  // A big blast (a streak, a power-up): deeper and longer.
  "blast-big": render(0.5, 0.9, [
    tone(120, 38, 8),
    noise(0.6, 9, 13),
    delayed(0.05, tone(240, 90, 14)),
  ]),
  // A wrong letter: a short low knock.
  wrong: render(0.12, 0.6, [tone(190, 130, 26)]),
  // A word got through: two notes going down.
  lost: render(0.36, 0.55, [
    tone(392, 392, 12),
    delayed(0.14, tone(262, 247, 9)),
  ]),
  // A new level: two notes going up.
  level: render(0.4, 0.45, [
    tone(523, 523, 12),
    delayed(0.12, tone(784, 784, 8)),
  ]),
  // A power-up collected or used: three quick notes up.
  powerup: render(0.34, 0.4, [
    tone(659, 659, 16),
    delayed(0.07, tone(880, 880, 14)),
    delayed(0.14, tone(1175, 1175, 10)),
  ]),
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  const file = wav(samples);
  writeFileSync(join(OUT_DIR, `${name}.wav`), file);
  console.log(`${name}.wav  ${(file.length / 1024).toFixed(1)} KB`);
}
