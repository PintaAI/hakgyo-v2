// Loads the material files of ./content one by one (not through content/index.ts), so a missing or broken file is
// reported by name while the others are still validated.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { MaterialContent } from "./blocks";
import { POLA_MATERIALS, type PolaMaterialKey } from "./manifest";

export const CONTENT_DIR = join(import.meta.dir, "content");

export type LoadedContent = {
  /** Materials whose file loaded and default-exports a material, by file key. */
  materials: Map<PolaMaterialKey, MaterialContent>;
  /** Files that are missing, fail to load or export something else. */
  problems: string[];
};

const MANIFEST_KEYS = Object.keys(POLA_MATERIALS) as PolaMaterialKey[];

function isMaterialContent(value: unknown): value is MaterialContent {
  if (typeof value !== "object" || value === null) return false;
  const material = value as Partial<MaterialContent>;
  return typeof material.key === "string" && Array.isArray(material.sections);
}

export async function loadPolaContent(
  dir = CONTENT_DIR,
): Promise<LoadedContent> {
  const materials = new Map<PolaMaterialKey, MaterialContent>();
  const problems: string[] = [];

  for (const key of MANIFEST_KEYS) {
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
    if (!isMaterialContent(loaded.default)) {
      problems.push(
        `${file} must \`export default defineMaterial({ key, title, description, intro, sections, outro })\``,
      );
      continue;
    }
    materials.set(key, loaded.default);
  }

  if (existsSync(dir)) {
    const known = new Set<string>(MANIFEST_KEYS);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".ts") || name === "index.ts") continue;
      if (name.endsWith(".test.ts")) continue;
      if (!known.has(name.slice(0, -3))) {
        problems.push(
          `content/${name} is not a material in manifest.ts (file names are material keys)`,
        );
      }
    }
    const indexPath = join(dir, "index.ts");
    if (!existsSync(indexPath)) {
      problems.push("content/index.ts is missing");
    } else {
      const index = readFileSync(indexPath, "utf8");
      for (const key of MANIFEST_KEYS) {
        if (!index.includes(`from "./${key}"`)) {
          problems.push(`content/index.ts does not import ./${key}`);
        }
      }
    }
  }

  return { materials, problems };
}
