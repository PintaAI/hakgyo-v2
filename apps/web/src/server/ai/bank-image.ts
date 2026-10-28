import "server-only";

import { generateOpenAiImage } from "~/server/ai/openai-image";

/** One illustration for a bank question, as webp bytes. */
export function generateBankIllustration(prompt: string) {
  return generateOpenAiImage({
    prompt,
    size: "1024x1024",
    logLabel: "Bank illustration failed",
  });
}
