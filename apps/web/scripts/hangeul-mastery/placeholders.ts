// Placeholders in the authored content: `hangeul-audio:<korean text>` for a clip and `hangeul-item:<key>` for
// another item of the same module. A placeholder is always a whole string value, anywhere in the block tree,
// including inside props that hold JSON as a string (`letters`, `rows`, `audio`).
import { AUDIO_PLACEHOLDER_PREFIX, ITEM_REFERENCE_PREFIX } from "./blocks";

export type Placeholder =
  { kind: "audio"; value: string } | { kind: "item"; value: string };

export function parsePlaceholder(text: string): Placeholder | null {
  if (text.startsWith(AUDIO_PLACEHOLDER_PREFIX)) {
    return {
      kind: "audio",
      value: text.slice(AUDIO_PLACEHOLDER_PREFIX.length),
    };
  }
  if (text.startsWith(ITEM_REFERENCE_PREFIX)) {
    return { kind: "item", value: text.slice(ITEM_REFERENCE_PREFIX.length) };
  }
  return null;
}

function looksLikeJson(text: string) {
  const start = text.trimStart()[0];
  return start === "[" || start === "{";
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * Returns `value` with every placeholder string replaced by `replace(placeholder)`. JSON strings are parsed,
 * rewritten and serialized again only when something inside them changed, so untouched props keep their exact text.
 * Objects and arrays are copied only along changed paths.
 */
export function replacePlaceholders<T>(
  value: T,
  replace: (placeholder: Placeholder) => string,
): T {
  const visit = (node: unknown): unknown => {
    if (typeof node === "string") {
      const placeholder = parsePlaceholder(node);
      if (placeholder) return replace(placeholder);
      if (!looksLikeJson(node)) return node;
      const parsed = parseJson(node);
      if (!parsed.ok) return node;
      const next = visit(parsed.value);
      return next === parsed.value ? node : JSON.stringify(next);
    }
    if (Array.isArray(node)) {
      let changed = false;
      const next = node.map((child) => {
        const result = visit(child);
        if (result !== child) changed = true;
        return result;
      });
      return changed ? next : node;
    }
    if (node && typeof node === "object") {
      let changed = false;
      const next: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node)) {
        const result = visit(child);
        if (result !== child) changed = true;
        next[key] = result;
      }
      return changed ? next : node;
    }
    return node;
  };
  return visit(value) as T;
}

/** Every placeholder in `values`, in first-seen order, de-duplicated per kind. */
export function collectPlaceholders(...values: unknown[]) {
  const audio = new Set<string>();
  const items = new Set<string>();
  for (const value of values) {
    replacePlaceholders(value, (placeholder) => {
      (placeholder.kind === "audio" ? audio : items).add(placeholder.value);
      return "";
    });
  }
  return { audio: [...audio], items: [...items] };
}
