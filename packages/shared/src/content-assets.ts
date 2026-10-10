/** Prefix of BlockNote file URLs that point at an uploaded asset. */
const assetUrlPrefix = "hakgyo-asset:";

/**
 * Every asset id referenced by rich content, in first-seen order: `assetId` properties of custom
 * media blocks, `hakgyo-asset:<id>` URLs of BlockNote file blocks, and the same inside JSON that a
 * block keeps as a string (culture sections). Used to download an assessment's images and audio
 * before a learner works through it.
 */
export function collectContentAssetIds(...values: unknown[]): string[] {
  const ids = new Set<string>();
  const visitString = (text: string) => {
    if (text.startsWith(assetUrlPrefix)) {
      const assetId = text.slice(assetUrlPrefix.length);
      if (assetId) ids.add(assetId);
    } else if (text.startsWith("[") || text.startsWith("{")) {
      try {
        visit(JSON.parse(text));
      } catch {
        // Plain text that only looks like JSON.
      }
    }
  };
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      visitString(value);
      return;
    }
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
