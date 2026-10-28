import "server-only";

import { env } from "~/env";
import { openAiVoices, ttsVoiceDesigns } from "~/lib/tts-clips";
import type { SpeakLine } from "~/server/bank/tts";

/** The OpenAI fallback voice: one Korean line as 24 kHz 16-bit mono PCM. */
export const openAiSpeakLine: SpeakLine = async ({ voice, text }) => {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const [{ generateSpeech }, { openai }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/openai"),
  ]);
  const { audio } = await generateSpeech({
    model: openai.speech("gpt-4o-mini-tts"),
    text,
    voice: openAiVoices[voice],
    outputFormat: "pcm",
    instructions: `${ttsVoiceDesigns[voice]} Read the Korean text exactly as written, with numbers spoken in Korean.`,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(60_000),
  });
  return audio.uint8Array;
};
