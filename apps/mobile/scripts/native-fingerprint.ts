/**
 * Compares two native fingerprints (`eas fingerprint:compare --json`) while
 * ignoring where bun happened to install each package.
 *
 * Bun keeps packages in `node_modules/.bun/<name>@<version>+<hash>/`, and the
 * hash covers the resolved peer dependencies. Changing a JavaScript-only
 * dependency that many packages list as an optional peer (TypeScript, for
 * example) renames the folders of every Expo module. The autolinking config
 * in the fingerprint records those paths, so its hash changes although the
 * native code is the same. Everything else still counts: module versions,
 * native sources, the Expo config, plugins and assets.
 */

export type FingerprintSource = {
  type: "file" | "dir" | "contents";
  filePath?: string;
  id?: string;
  hash?: string | null;
  contents?: string;
};

export type Fingerprint = {
  hash: string;
  sources: FingerprintSource[];
};

const BUN_STORE_FOLDER =
  /(node_modules\/\.bun\/[^/]+?@[^/+]+)\+[0-9a-f]{16}\//g;

/** Drops the peer-dependency hash bun appends to a store folder name. */
export function stripBunStoreHashes(text: string): string {
  return text.replace(BUN_STORE_FOLDER, "$1/");
}

function normalizedSources(fingerprint: Fingerprint): Map<string, string> {
  const sources = new Map<string, string>();
  for (const source of fingerprint.sources) {
    const location = stripBunStoreHashes(source.filePath ?? source.id ?? "");
    const value =
      source.type === "contents"
        ? stripBunStoreHashes(source.contents ?? "")
        : (source.hash ?? "");
    sources.set(`${source.type}:${location}`, value);
  }
  return sources;
}

/**
 * Sources that differ between the two fingerprints once bun store hashes are
 * removed, as `type:path` keys. Empty means the native code is the same.
 */
export function nativeDifferences(a: Fingerprint, b: Fingerprint): string[] {
  const left = normalizedSources(a);
  const right = normalizedSources(b);
  const keys = new Set([...left.keys(), ...right.keys()]);
  return [...keys].filter((key) => left.get(key) !== right.get(key)).sort();
}
