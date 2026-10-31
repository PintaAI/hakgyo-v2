// Checks the Pola Bahasa content without a database: every manifest chapter has a content file with a body for each
// of its materials, a vocabulary set (one entry per material) and a quiz; every ref() resolves; documents follow
// STYLE.md, pass the app's block validation and load unchanged into a BlockNote editor; the course readiness rules
// pass. Prints blocks and links per material, and the materials nothing links to.
//
//   bun run --cwd apps/web pola:validate [--verbose]
import { parseArgs } from "node:util";

import { buildCurricula, type CurriculumResult } from "./curriculum";
import { loadPolaContent, type LoadedContent } from "./load-content";
import { blockNoteRoundTripIssues } from "./roundtrip";
import {
  POLA_BABS,
  POLA_COURSES,
  POLA_MATERIALS,
  type PolaCourseKey,
} from "./manifest";

export type Validation = {
  loaded: LoadedContent;
  result: CurriculumResult;
  /** Load problems and content errors together; the import refuses to run while any exist. */
  errors: string[];
};

export async function validatePolaContent(dir?: string): Promise<Validation> {
  const loaded = await loadPolaContent(dir);
  const result = buildCurricula(loaded.babs);
  const errors = [...loaded.problems, ...result.errors];
  for (const material of result.materials) {
    for (const issue of blockNoteRoundTripIssues(material.content)) {
      errors.push(`${material.key}: BlockNote round trip: ${issue}`);
    }
  }
  // The loader names the reason for every missing chapter; this only catches a caller passing other content.
  if (!loaded.problems.length && result.missing.length) {
    errors.push(`no content for ${result.missing.join(", ")}`);
  }
  return { loaded, result, errors };
}

export function printValidation(
  { loaded, result, errors }: Validation,
  options: { verbose?: boolean } = {},
) {
  const questions = result.assessments.reduce(
    (sum, row) => sum + row.questions.length,
    0,
  );
  const entries = result.vocabularySets.reduce(
    (sum, row) => sum + row.entries.length,
    0,
  );
  console.log(
    `Pola Bahasa: ${loaded.babs.size}/${POLA_BABS.length} chapters loaded, ${result.assessments.length} valid; ${result.materials.length}/${Object.keys(POLA_MATERIALS).length} materials, ${entries} vocabulary entries, ${questions} quiz questions, ${result.links.length} links`,
  );
  for (const courseKey of Object.keys(POLA_COURSES) as PolaCourseKey[]) {
    console.log(`\n${courseKey}  ${POLA_COURSES[courseKey].title}`);
    for (const bab of POLA_BABS) {
      if (bab.course !== courseKey) continue;
      const valid = result.assessments.some((row) => row.key === bab.key);
      const state = !loaded.babs.has(bab.key)
        ? "no content"
        : valid
          ? "ok"
          : "has errors";
      console.log(
        `  ${bab.key.padEnd(24)} ${bab.materials.length} materials  (${state})`,
      );
      if (!options.verbose) continue;
      for (const material of bab.materials) {
        const row = result.stats.find((stat) => stat.key === material.key);
        if (!row) continue;
        console.log(
          `    ${material.key.padEnd(26)} ${String(row.blocks).padStart(3)} blocks ${String(row.linksOut).padStart(3)} links out ${String(row.linksIn).padStart(3)} links in`,
        );
      }
    }
  }

  const crossCourse = result.links.filter(
    (link) =>
      POLA_MATERIALS[link.from].course !== POLA_MATERIALS[link.to].course,
  ).length;
  console.log(`\nLinks between the two courses: ${crossCourse}`);

  const warnings = [...result.warnings];
  if (result.unlinkedMaterials.length) {
    warnings.push(
      `${result.unlinkedMaterials.length} material(s) no other material links to${options.verbose ? `: ${result.unlinkedMaterials.join(", ")}` : " (--verbose lists them)"}`,
    );
  }
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
  if (errors.length) {
    console.error(`\nErrors (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log("\nNo errors.");
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    options: {
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: bun run --cwd apps/web pola:validate [--verbose]\n\nValidates scripts/pola-bahasa/content offline (no database).",
    );
    return 0;
  }
  const validation = await validatePolaContent();
  printValidation(validation, values);
  return validation.errors.length ? 1 : 0;
}

if (import.meta.main) process.exit(await main());
