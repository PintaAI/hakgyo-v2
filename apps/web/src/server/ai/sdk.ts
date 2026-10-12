/**
 * The AI SDK and its OpenAI provider load on the first AI call instead of in
 * the cold start of every function that imports an AI feature (about 230 ms).
 */
export async function loadAiSdk() {
  const [{ generateText, Output }, { openai }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/openai"),
  ]);
  return { generateText, Output, openai };
}
