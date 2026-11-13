/**
 * Guarded EAS Update publish (see docs/mobile-releases.md).
 *
 * An update reaches every binary on its channel whose runtime version matches,
 * and with the `appVersion` runtime policy that is every build of the same
 * app `version`. If one of those binaries was built from different native code,
 * the update can call a native module it lacks and crash on launch. EAS
 * records a fingerprint of the native project on every build, so this script
 * compares the project's fingerprint with every finished build on the channel
 * and runtime, and publishes only when all of them match. A build whose hash
 * differs still counts as matching when the only difference is where bun
 * installed the packages (see `native-fingerprint.ts`).
 *
 * It then bundles with the `env` block of the channel's eas.json build profile
 * (`eas update` alone would inline apps/mobile/.env), checks that the bundle
 * talks to that profile's EXPO_PUBLIC_API_URL and to no tailnet host, and only
 * then uploads it with `eas update --skip-bundler`.
 *
 *   bun run --cwd apps/mobile ota:check --channel production
 *   bun run --cwd apps/mobile ota:publish --channel production --message "…"
 *
 * Options: --platform ios|android|all (default all), --check (compare only).
 * `--message` defaults to the newest "Yang baru" entry for the runtime
 * (`@hakgyo/shared/release-notes`), which the update shows after it applies.
 */
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { releaseNotesUpTo } from "@hakgyo/shared/release-notes";

import config from "../app.config";
import { type Fingerprint, nativeDifferences } from "./native-fingerprint";

const PROJECT_DIR = new URL("..", import.meta.url).pathname;
const DIST_DIR = join(PROJECT_DIR, "dist");
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
if (config.expo.runtimeVersion.policy !== "appVersion") {
  fail(
    "This guard assumes the `appVersion` runtime policy in app.config.ts; " +
      "update it together with the policy.",
  );
}
const runtime = config.expo.version;
const releaseNote = releaseNotesUpTo(runtime)[0];
const message =
  values.message?.trim() ||
  (releaseNote ? `${releaseNote.title} (${releaseNote.id})` : "");
if (!values.check && !message) {
  fail(
    'Pass --message "…", or add a "Yang baru" entry to packages/shared/src/release-notes.ts.',
  );
}

// `eas update` applies only the EAS environment's variables, not the `env`
// block of the eas.json build profile, so Expo would inline whatever
// apps/mobile/.env holds (this machine's tailnet dev server). The export and
// the upload below get the profile's variables, as the channel's builds did.
const profileEnv = (
  (await Bun.file(`${PROJECT_DIR}eas.json`).json()) as {
    build: Record<string, { env?: Record<string, string> }>;
  }
).build[channel]?.env;
const apiUrl = profileEnv?.EXPO_PUBLIC_API_URL;
if (!apiUrl) fail(`eas.json has no build.${channel}.env.EXPO_PUBLIC_API_URL.`);
const buildEnv = { ...process.env, ...profileEnv };

/** Fails unless the platform's bundle talks to the channel's API and nothing else of ours. */
function checkBundleApiUrl(platform: Platform) {
  const bundleDir = join(DIST_DIR, "_expo/static/js", platform);
  const bundles = readdirSync(bundleDir).filter(
    (file) => !file.endsWith(".map"),
  );
  if (bundles.length === 0) fail(`No ${platform} bundle in ${bundleDir}.`);
  for (const file of bundles) {
    const text = readFileSync(join(bundleDir, file), "latin1");
    if (!text.includes(apiUrl!)) {
      fail(
        `The ${platform} bundle does not contain ${apiUrl}. Not publishing.`,
      );
    }
    const tailnetHost = text.match(/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net/)?.[0];
    if (tailnetHost) {
      fail(
        `The ${platform} bundle contains the tailnet host ${tailnetHost}. Not publishing.`,
      );
    }
  }
  console.log(`✓ ${platform}: bundle uses ${apiUrl}`);
}

console.log(`Channel ${channel}, runtime ${runtime}, API ${apiUrl}`);
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
  const differing = builds.filter((build) => build.fingerprint?.hash !== hash);
  // Builds with the same recorded fingerprint need one comparison between them.
  const differencesByHash = new Map<string, string[]>();
  for (const build of differing) {
    const recorded = build.fingerprint?.hash;
    if (!recorded || differencesByHash.has(recorded)) continue;
    const { fingerprint1, fingerprint2 } = easJson<{
      fingerprint1: Fingerprint;
      fingerprint2: Fingerprint;
    }>([
      "fingerprint:compare",
      "--build-id",
      build.id,
      "--environment",
      channel,
    ]);
    differencesByHash.set(
      recorded,
      nativeDifferences(fingerprint1, fingerprint2),
    );
  }
  const mismatched = differing.filter(
    (build) =>
      differencesByHash.get(build.fingerprint?.hash ?? "")?.length !== 0,
  );
  if (mismatched.length === 0) {
    const moved = differing.length
      ? ` (${differing.length} differ only in bun store folders)`
      : "";
    console.log(
      `✓ ${platform}: ${builds.length} build(s) match fingerprint ${hash.slice(0, 12)}${moved}`,
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
    for (const source of differencesByHash.get(build.fingerprint?.hash ?? "") ??
      []) {
      console.error(`        changed: ${source}`);
    }
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
if (releaseNote) {
  console.log(
    `\n"Yang baru" shown after the update: ${releaseNote.id} ${releaseNote.title}`,
  );
  for (const item of releaseNote.items) console.log(`    • ${item}`);
  console.log(
    "  Learners who already saw this entry get no prompt. For changes they notice, " +
      "add a newer entry to packages/shared/src/release-notes.ts first.",
  );
} else {
  console.warn(`\n! No "Yang baru" entry for runtime ${runtime}.`);
}
if (values.check) process.exit(0);

// Bundle here instead of inside `eas update`, so the bundle can be checked
// before anything is uploaded. The arguments are the ones `eas update` passes
// to `expo export` itself, plus `--clear`: Metro's cache keeps the
// EXPO_PUBLIC_* values inlined by the previous bundle, whatever the env says now.
rmSync(DIST_DIR, { recursive: true, force: true });
const exported = Bun.spawnSync(
  [
    "bun",
    "x",
    "expo",
    "export",
    "--output-dir",
    DIST_DIR,
    "--dump-sourcemap",
    "--dump-assetmap",
    "--clear",
    ...platforms.flatMap((platform) => ["--platform", platform]),
  ],
  { cwd: PROJECT_DIR, env: buildEnv, stdout: "inherit", stderr: "inherit" },
);
if (exported.exitCode !== 0) fail("expo export failed.");
for (const platform of platforms) checkBundleApiUrl(platform);

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
    message,
    "--skip-bundler",
    "--input-dir",
    DIST_DIR,
    "--non-interactive",
  ],
  { cwd: PROJECT_DIR, env: buildEnv, stdout: "inherit", stderr: "inherit" },
);
process.exit(publish.exitCode ?? 1);
