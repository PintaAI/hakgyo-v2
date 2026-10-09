/**
 * Every asset id referenced by rich content (BlockNote documents and custom blocks store media as
 * an `assetId` property), in first-seen order. Used to download an assessment's images and audio
 * before a learner works through it.
 */
export function collectContentAssetIds(...values: unknown[]): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "assetId") {
        if (typeof child === "string" && child) ids.add(child);
      } else {
        visit(child);
      }
    }
  };
  for (const value of values) visit(value);
  return [...ids];
}

/** Asset ids of an assessment's instructions, question prompts and options. */
export function assessmentContentAssetIds(assessment: {
  instructions?: unknown;
  questions: ReadonlyArray<{
    prompt: unknown;
    options: ReadonlyArray<{ content: unknown }>;
  }>;
}) {
  return collectContentAssetIds(
    assessment.instructions,
    ...assessment.questions.flatMap((question) => [
      question.prompt,
      ...question.options.map((option) => option.content),
    ]),
  );
}
