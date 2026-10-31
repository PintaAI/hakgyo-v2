// Loads the chapter files of ./content one by one (not through content/index.ts), so a missing or broken file is
// reported by name while the others are still validated.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { BabContent } from "./blocks";
import { POLA_BABS, type PolaBabKey } from "./manifest";

export const CONTENT_DIR = join(import.meta.dir, "content");

export type LoadedContent = {
  /** Chapters whose file loaded and default-exports a chapter, by file key. */
  babs: Map<PolaBabKey, BabContent>;
  /** Files that are missing, fail to load or export something else. */
  problems: string[];
};

const BAB_KEYS = POLA_BABS.map((bab) => bab.key);

function isBabContent(value: unknown): value is BabContent {
  if (typeof value !== "object" || value === null) return false;
  const bab = value as Partial<BabContent>;
  return (
    typeof bab.key === "string" &&
    typeof bab.materials === "object" &&
    bab.materials !== null &&
    typeof bab.vocabulary === "object" &&
    bab.vocabulary !== null &&
    typeof bab.quiz === "object" &&
    bab.quiz !== null
  );
}

export const isMissingFileProblem = (problem: string) =>
  problem.endsWith(" is missing");

export async function loadPolaContent(
  dir = CONTENT_DIR,
): Promise<LoadedContent> {
  const babs = new Map<PolaBabKey, BabContent>();
  const problems: string[] = [];

  for (const key of BAB_KEYS) {
    const file = `content/${key}.ts`;
    const path = join(dir, `${key}.ts`);
    if (!existsSync(path)) {
      problems.push(`${file} is missing`);
      continue;
    }
    let loaded: Record<string, unknown>;
    try {
      loaded = (await import(path)) as Record<string, unknown>;
    } catch (error) {
      problems.push(
        `${file} fails to load: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    if (!isBabContent(loaded.default)) {
      problems.push(
        `${file} must \`export default defineBab({ key, materials, vocabulary, quiz })\``,
      );
      continue;
    }
    babs.set(key, loaded.default);
  }

  if (existsSync(dir)) {
    const known = new Set<string>(BAB_KEYS);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".ts") || name === "index.ts") continue;
      if (name.endsWith(".test.ts")) continue;
      if (!known.has(name.slice(0, -3))) {
        problems.push(
          `content/${name} is not a chapter in manifest.ts (file names are chapter keys)`,
        );
      }
    }
    const indexPath = join(dir, "index.ts");
    if (!existsSync(indexPath)) {
      problems.push("content/index.ts is missing");
    } else {
      const index = readFileSync(indexPath, "utf8");
      for (const key of BAB_KEYS) {
        if (!index.includes(`from "./${key}"`)) {
          problems.push(`content/index.ts does not import ./${key}`);
        }
      }
    }
  } else {
    problems.push("content/ is missing");
  }

  return { babs, problems };
}
