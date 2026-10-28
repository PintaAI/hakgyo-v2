import "server-only";

import { env } from "~/env";

/** One illustration for a bank question, as webp bytes (the OpenAI image call of course thumbnails). */
export async function generateBankIllustration(prompt: string) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2.5-flare",
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "webp",
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    console.error(
      "Bank illustration failed",
      response.status,
      await response.text(),
    );
    throw new Error("IMAGE_GENERATION_FAILED");
  }
  const result: unknown = await response.json();
  const base64 = (result as { data?: Array<{ b64_json?: string }> }).data?.[0]
    ?.b64_json;
  if (!base64) throw new Error("IMAGE_GENERATION_FAILED");
  return Buffer.from(base64, "base64");
}
