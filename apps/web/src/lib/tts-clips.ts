/**
 * What a bank question's audio says, shared by the server and the VPS TTS poller
 * (scripts/tts-poller). Plain data and pure functions, no server imports.
 * See docs/eps-question-generator.md section 6 (TTS).
 */

/** Two fixed designed voices (adult man and woman, standard Seoul); no real person is cloned. */
export type TtsVoice = "M" | "F";

export type TtsLine = { voice: TtsVoice; text: string };

/** One audio file: the prompt's (the whole script), or one option read aloud. */
export type TtsClip = { key: string; lines: TtsLine[] };

export const ttsVoiceDesigns: Record<TtsVoice, string> = {
  M: "A calm Korean man in his thirties speaking standard Seoul Korean, clear, neutral and evenly paced, like a language exam recording. No music, no background noise.",
  F: "A calm Korean woman in her thirties speaking standard Seoul Korean, clear, neutral and evenly paced, like a language exam recording. No music, no background noise.",
};

/** The OpenAI fallback voices for the two designed voices. */
export const openAiVoices: Record<TtsVoice, string> = {
  M: "ash",
  F: "coral",
};

/** Pause between the lines of a dialogue. */
export const LINE_GAP_MS = 700;

type ScriptLine = { speaker: string; text: string };

/**
 * The clips of a question: the prompt clip speaks its script (the narrator reads in the woman's
 * voice, as single-voice items do in the official recordings), and for types whose options are read
 * aloud each option gets its own clip.
 */
export function ttsClipsFor(input: {
  audio: string;
  script: readonly ScriptLine[];
  optionTexts: readonly string[];
}): TtsClip[] {
  if (input.audio === "none") return [];
  const lines = input.script
    .map((line): TtsLine => ({
      voice: line.speaker === "M" ? "M" : "F",
      text: line.text.trim(),
    }))
    .filter((line) => line.text);
  const clips: TtsClip[] = lines.length ? [{ key: "prompt", lines }] : [];
  if (input.audio === "prompt-and-options") {
    input.optionTexts.forEach((text, index) => {
      if (text.trim()) {
        clips.push({
          key: `option-${index}`,
          lines: [{ voice: "F", text: text.trim() }],
        });
      }
    });
  }
  return clips;
}

/** Which option a clip key belongs to, or null for the prompt. */
export function optionIndexOfClip(key: string) {
  const match = /^option-(\d)$/.exec(key);
  return match ? Number(match[1]) : null;
}

/**
 * Joins raw 16-bit mono PCM pieces (OpenAI's `pcm` output, 24 kHz) with silence between them into
 * one WAV file.
 */
export function pcmToWav(
  pieces: readonly Uint8Array[],
  options: { sampleRate?: number; gapMs?: number } = {},
) {
  const sampleRate = options.sampleRate ?? 24_000;
  const gapBytes =
    Math.round((sampleRate * (options.gapMs ?? LINE_GAP_MS)) / 1000) * 2;
  const dataLength =
    pieces.reduce((total, piece) => total + piece.length, 0) +
    gapBytes * Math.max(0, pieces.length - 1);
  const wav = new Uint8Array(44 + dataLength);
  const view = new DataView(wav.buffer);
  const ascii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      wav[offset + index] = text.charCodeAt(index);
    }
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  pieces.forEach((piece, index) => {
    wav.set(piece, offset);
    offset += piece.length;
    if (index < pieces.length - 1) offset += gapBytes; // already zero (silence)
  });
  return wav;
}
