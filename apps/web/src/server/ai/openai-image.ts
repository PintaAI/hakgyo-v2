import "server-only";

import { env } from "~/env";

/**
 * One OpenAI image (gpt-image), as bytes in `output_format`. With `reference`, the image is an edit
 * of that picture (a logo or a style sheet); otherwise a new generation.
 */
export async function generateOpenAiImage(input: {
  prompt: string;
  size: string;
  quality?: "low" | "medium" | "high";
  outputFormat?: "webp" | "png";
  reference?: { bytes: Uint8Array; contentType: string; fileName: string };
  logLabel: string;
}) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_MISSING");
  const options = {
    model: "gpt-image-2.5-flare",
    prompt: input.prompt,
    size: input.size,
    quality: input.quality ?? "medium",
    output_format: input.outputFormat ?? "webp",
  };
  let body: string | FormData = JSON.stringify(options);
  if (input.reference) {
    const form = new FormData();
    for (const [key, value] of Object.entries(options)) form.set(key, value);
    form.set(
      "image",
      new Blob([Uint8Array.from(input.reference.bytes)], {
        type: input.reference.contentType,
      }),
      input.reference.fileName,
    );
    body = form;
  }
  const response = await fetch(
    input.reference
      ? "https://api.openai.com/v1/images/edits"
      : "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        ...(!input.reference ? { "Content-Type": "application/json" } : {}),
      },
      body,
      signal: AbortSignal.timeout(180_000),
    },
  );
  if (!response.ok) {
    console.error(input.logLabel, response.status, await response.text());
    throw new Error("IMAGE_GENERATION_FAILED");
  }
  const result: unknown = await response.json();
  const base64 = (result as { data?: Array<{ b64_json?: string }> }).data?.[0]
    ?.b64_json;
  if (!base64) throw new Error("IMAGE_GENERATION_FAILED");
  return Buffer.from(base64, "base64");
}
