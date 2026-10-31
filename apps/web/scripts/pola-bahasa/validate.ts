// Checks the Pola Bahasa content without a database: every manifest material has a content file, keys and
// sections match the manifest, every ref() resolves, documents pass the app's block validation and load unchanged
// into a BlockNote editor, custom blocks and quizzes fit. Prints link statistics and the sections nothing links to.
//
//   bun run --cwd apps/web pola:validate [--verbose]
import { parseArgs } from "node:util";

import { buildCurricula, type CurriculumResult } from "./curriculum";
import { loadPolaContent, type LoadedContent } from "./load-content";
import { blockNoteRoundTripIssues } from "./roundtrip";
import { POLA_COURSES, POLA_MATERIALS, type PolaCourseKey } from "./manifest";

export type Validation = {
  loaded: LoadedContent;
  result: CurriculumResult;
  /** Load problems and content errors together; the import refuses to run while any exist. */
  errors: string[];
};

export async function validatePolaContent(dir?: string): Promise<Validation> {
  const loaded = await loadPolaContent(dir);
  const result = buildCurricula(loaded.materials);
  const errors = [...loaded.problems, ...result.errors];
  for (const material of result.materials) {
    for (const issue of blockNoteRoundTripIssues(material.content)) {
      errors.push(`${material.id}: BlockNote round trip: ${issue}`);
    }
  }
  // The loader names the reason for every missing material; this only catches a caller passing other content.
  if (!loaded.problems.length && result.missing.length) {
    errors.push(`no content for ${result.missing.join(", ")}`);
  }
  return { loaded, result, errors };
}

export function printValidation(
  { loaded, result, errors }: Validation,
  options: { verbose?: boolean } = {},
) {
  const total = Object.keys(POLA_MATERIALS).length;
  const sections = result.stats.reduce((sum, row) => sum + row.sections, 0);
  console.log(
    `Pola Bahasa: ${loaded.materials.size}/${total} materials loaded, ${result.materials.length} valid, ${sections} sections, ${result.links.length} links, ${result.assessments.length} quizzes (${result.assessments.reduce((sum, row) => sum + row.questions.length, 0)} questions)`,
  );
  for (const courseKey of Object.keys(POLA_COURSES) as PolaCourseKey[]) {
    console.log(`\n${courseKey}  ${POLA_COURSES[courseKey].title}`);
    for (const [key, material] of Object.entries(POLA_MATERIALS)) {
      if (material.course !== courseKey) continue;
      const row = result.stats.find((stat) => stat.key === key);
      console.log(
        row
          ? `  ${key.padEnd(18)} ${String(row.sections).padStart(3)} sections ${String(row.blocks).padStart(4)} blocks ${String(row.linksOut).padStart(4)} links out ${String(row.linksIn).padStart(4)} links in`
          : `  ${key.padEnd(18)} (no content)`,
      );
    }
  }

  const crossCourse = result.links.filter(
    (link) =>
      POLA_MATERIALS[link.from.material as keyof typeof POLA_MATERIALS]
        ?.course !==
      POLA_MATERIALS[link.to.material as keyof typeof POLA_MATERIALS]?.course,
  ).length;
  console.log(`\nLinks between the two courses: ${crossCourse}`);

  const warnings = [...result.warnings];
  if (result.unlinkedSections.length) {
    warnings.push(
      `${result.unlinkedSections.length} section(s) nothing links to${options.verbose ? `: ${result.unlinkedSections.join(", ")}` : " (--verbose lists them)"}`,
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
