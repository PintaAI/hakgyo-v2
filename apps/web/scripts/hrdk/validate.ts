import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { validateHrdkManifest } from "../../src/lib/hrdk-content/parser";
import {
  hrdkManifestSchema,
  hrdkReportSchema,
  type HrdkIssue,
} from "../../src/lib/hrdk-content/schema";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  strict: true,
  options: {
    "fail-on-warnings": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || !positionals[0]) {
  console.log(
    "Usage: bun run content:validate-hrdk -- manifest.json [--fail-on-warnings]",
  );
  process.exit(values.help ? 0 : 1);
}

const manifestPath = resolve(positionals[0]);
const manifest = hrdkManifestSchema.parse(
  JSON.parse(await readFile(manifestPath, "utf8")),
);
const extractionReportPath = manifestPath.replace(/\.json$/i, ".report.json");
let extractionIssues: HrdkIssue[] = [];
try {
  await access(extractionReportPath);
  extractionIssues = hrdkReportSchema.parse(
    JSON.parse(await readFile(extractionReportPath, "utf8")),
  ).issues;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const report = validateHrdkManifest(manifest, extractionIssues);
console.log(JSON.stringify(report, null, 2));

if (
  !report.valid ||
  (values["fail-on-warnings"] &&
    report.issues.some((issue) => issue.severity === "warning"))
) {
  process.exit(1);
}
