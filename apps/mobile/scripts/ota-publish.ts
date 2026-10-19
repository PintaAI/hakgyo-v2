/**
 * Guarded EAS Update publish (see docs/mobile-releases.md).
 *
 * An update reaches every binary on its channel whose runtime version matches,
 * and with the `appVersion` runtime policy that is every build of the same
 * app `version`. If one of those binaries was built from different native code,
 * the update can call a native module it lacks and crash on launch. EAS
 * records a fingerprint of the native project on every build, so this script
 * compares the project's fingerprint with every finished build on the channel
 * and runtime, and publishes only when all of them match.
 *
 *   bun run --cwd apps/mobile ota:check --channel production
 *   bun run --cwd apps/mobile ota:publish --channel production --message "…"
 *
 * Options: --platform ios|android|all (default all), --check (compare only).
 */
import { parseArgs } from "node:util";

import config from "../app.config";

const PROJECT_DIR = new URL("..", import.meta.url).pathname;
/** EAS channels; each build profile in eas.json uses the EAS environment of the same name. */
const CHANNELS = ["development", "preview", "production"] as const;
const PLATFORMS = ["ios", "android"] as const;
/** Upper bound of builds checked per platform and runtime. */
const BUILD_LIMIT = 50;

type Channel = (typeof CHANNELS)[number];
type Platform = (typeof PLATFORMS)[number];
type Build = {
  id: string;
  createdAt: string;
  gitCommitHash?: string | null;
  appBuildVersion?: string | null;
  fingerprint?: { hash: string } | null;
};

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return values.includes(value as T);
}

/** Runs `eas <args> --json` in the project and parses its JSON output. */
function easJson<T>(args: string[]): T {
  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync(["eas", ...args, "--json", "--non-interactive"], {
      cwd: PROJECT_DIR,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    fail("`eas` was not found. Install it with `bun add -g eas-cli`.");
  }
  if (result.exitCode !== 0) {
    fail(`eas ${args.join(" ")} failed:\n${result.stderr?.toString()}`);
  }
  // Some commands print a notice line before the JSON document.
  const output = result.stdout?.toString() ?? "";
  const start = output.search(/^[[{]/m);
  if (start === -1) fail(`eas ${args[0]} printed no JSON.`);
  return JSON.parse(output.slice(start)) as T;
}

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    channel: { type: "string" },
    message: { type: "string" },
    platform: { type: "string", default: "all" },
    check: { type: "boolean", default: false },
  },
  strict: true,
});

const channel = values.channel;
if (!isOneOf<Channel>(CHANNELS, channel)) {
  fail(`Pass --channel ${CHANNELS.join("|")}.`);
}
const platformOption = values.platform;
const platforms: readonly Platform[] =
  platformOption === "all"
    ? PLATFORMS
    : isOneOf<Platform>(PLATFORMS, platformOption)
      ? [platformOption]
      : fail("--platform must be ios, android or all.");
if (!values.check && !values.message?.trim()) {
  fail('Pass --message "…" to describe the update.');
}
if (config.expo.runtimeVersion.policy !== "appVersion") {
  fail(
    "This guard assumes the `appVersion` runtime policy in app.config.ts; " +
      "update it together with the policy.",
  );
}
const runtime = config.expo.version;

console.log(`Channel ${channel}, runtime ${runtime}`);
let safe = true;
for (const platform of platforms) {
  const builds = easJson<Build[]>([
    "build:list",
    "--platform",
    platform,
    "--channel",
    channel,
    "--runtime-version",
    runtime,
    "--status",
    "finished",
    "--limit",
    String(BUILD_LIMIT),
  ]);
  if (builds.length === 0) {
    console.error(
      `✗ ${platform}: no finished build on channel ${channel} with runtime ${runtime}, ` +
        "so nothing would receive this update. Pass --platform for the other platform only.",
    );
    safe = false;
    continue;
  }
  if (builds.length === BUILD_LIMIT) {
    console.warn(
      `! ${platform}: only the newest ${BUILD_LIMIT} builds were checked.`,
    );
  }
  const { hash } = easJson<{ hash: string }>([
    "fingerprint:generate",
    "--platform",
    platform,
    "--environment",
    channel,
  ]);
  const mismatched = builds.filter((build) => build.fingerprint?.hash !== hash);
  if (mismatched.length === 0) {
    console.log(
      `✓ ${platform}: ${builds.length} build(s) match fingerprint ${hash.slice(0, 12)}`,
    );
    continue;
  }
  safe = false;
  console.error(
    `✗ ${platform}: native code differs from ${mismatched.length} of ${builds.length} build(s) (project ${hash.slice(0, 12)}):`,
  );
  for (const build of mismatched) {
    console.error(
      `    ${build.id}  ${build.createdAt.slice(0, 10)}  build ${build.appBuildVersion ?? "?"}  ` +
        `commit ${build.gitCommitHash?.slice(0, 8) ?? "?"}  fingerprint ${build.fingerprint?.hash.slice(0, 12) ?? "none"}`,
    );
  }
  console.error(
    `    See what changed: eas fingerprint:compare --build-id ${mismatched[0]!.id} --environment ${channel}`,
  );
}

if (!safe) {
  fail(
    "Not publishing. When native code changed, bump `version` in app.config.ts " +
      "(a new runtime), ship new builds, and publish updates to that runtime.",
  );
}
if (values.check) process.exit(0);

const publish = Bun.spawnSync(
  [
    "eas",
    "update",
    "--channel",
    channel,
    "--environment",
    channel,
    "--platform",
    platformOption ?? "all",
    "--message",
    values.message!.trim(),
    "--non-interactive",
  ],
  { cwd: PROJECT_DIR, stdout: "inherit", stderr: "inherit" },
);
process.exit(publish.exitCode ?? 1);
