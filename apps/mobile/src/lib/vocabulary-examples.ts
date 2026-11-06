/**
 * A vocabulary entry's examples: a list of strings (or one string, a line
 * each), written "Korean sentence = translation". Shared by the word page and
 * the games so every place reads them the same way.
 */
export function exampleLines(value: unknown): string[] {
  const lines = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  return lines.filter(
    (example): example is string =>
      typeof example === "string" && Boolean(example.trim()),
  );
}

/**
 * Splits an example on its first " = " into the Korean sentence and its
 * translation; one without a translation is all sentence. Surrounding quotes
 * are dropped.
 */
export function splitExample(example: string) {
  const text = example.trim().replace(/^["“]|["”]$/g, "");
  const at = text.indexOf(" = ");
  if (at < 0) return { sentence: text, translation: null };
  return {
    sentence: text.slice(0, at).trim(),
    translation: text.slice(at + 3).trim() || null,
  };
}
