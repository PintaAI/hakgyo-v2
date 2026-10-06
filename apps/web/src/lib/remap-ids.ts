const assetUrlPrefix = "hakgyo-asset:";

/**
 * Returns a copy of `value` in which references to the ids in `ids` point at
 * their new ids. Only whole reference values are rewritten: a string that is
 * exactly an id, a `hakgyo-asset:<id>` URL, and the same inside JSON that a
 * block keeps as a string (culture sections). Ids that merely appear inside
 * other text are left alone, since seeded ids can be readable words.
 */
export function remapIds<T>(value: T, ids: ReadonlyMap<string, string>): T {
  if (ids.size === 0) return value;

  const remapString = (text: string): string => {
    const id = ids.get(text);
    if (id) return id;
    if (text.startsWith(assetUrlPrefix)) {
      const assetId = ids.get(text.slice(assetUrlPrefix.length));
      return assetId ? `${assetUrlPrefix}${assetId}` : text;
    }
    if (text.startsWith("[") || text.startsWith("{")) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return text;
      }
      const remapped = visit(parsed);
      return remapped === parsed ? text : JSON.stringify(remapped);
    }
    return text;
  };

  // Returns the input itself when nothing inside it changed.
  const visit = (current: unknown): unknown => {
    if (typeof current === "string") return remapString(current);
    if (Array.isArray(current)) {
      const next = current.map(visit);
      return next.some((entry, index) => entry !== current[index])
        ? next
        : current;
    }
    if (typeof current === "object" && current !== null) {
      const entries = Object.entries(current);
      const next = entries.map(([key, entry]) => [key, visit(entry)] as const);
      return next.some(([, entry], index) => entry !== entries[index]![1])
        ? Object.fromEntries(next)
        : current;
    }
    return current;
  };

  return visit(value) as T;
}
