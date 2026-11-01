/**
 * Start the Expo dev server for the development client over Tailscale.
 *
 *   bun run --cwd apps/mobile dev            (also started by the root `bun run dev`)
 *   bun run --cwd apps/mobile ios | android
 *
 * Metro listens on localhost:8083 and `tailscale serve` exposes it at
 * https://<this machine's tailnet name>:8082, which is the URL the dev client
 * loads. The host comes from `tailscale status`, so the script works on any
 * machine in the tailnet. Set EXPO_PACKAGER_PROXY_URL to use another URL.
 *
 * Tailscale forwards to `localhost`, not 127.0.0.1: with `--localhost`, Metro
 * binds only the first address `localhost` resolves to, which is ::1 on
 * machines that prefer IPv6.
 *
 * Extra arguments are passed to `expo start` (for example `--ios`).
 */
import { join } from "node:path";

const METRO_PORT = 8083;
const HTTPS_PORT = 8082;

function tailnetHost(): string | null {
  try {
    const result = Bun.spawnSync(["tailscale", "status", "--json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) return null;
    const status = JSON.parse(result.stdout.toString()) as {
      Self?: { DNSName?: string };
    };
    return status.Self?.DNSName?.replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

let proxyUrl = process.env.EXPO_PACKAGER_PROXY_URL;
if (!proxyUrl) {
  const host = tailnetHost();
  if (host) {
    const serve = Bun.spawnSync(
      [
        "tailscale",
        "serve",
        "--bg",
        `--https=${HTTPS_PORT}`,
        `http://localhost:${METRO_PORT}`,
      ],
      { stdout: "ignore", stderr: "pipe" },
    );
    if (serve.exitCode === 0) {
      proxyUrl = `https://${host}:${HTTPS_PORT}`;
    } else {
      console.warn(
        `tailscale serve failed, so the dev client can only reach Metro on this machine:\n${serve.stderr.toString().trim()}`,
      );
    }
  } else {
    console.warn(
      "Tailscale is not running, so the dev client can only reach Metro on this machine.",
    );
  }
}

if (proxyUrl) console.log(`Dev client URL: ${proxyUrl}`);

const expo = Bun.spawn(
  [
    process.execPath,
    "x",
    "expo",
    "start",
    "--dev-client",
    "--localhost",
    "--port",
    String(METRO_PORT),
    ...Bun.argv.slice(2),
  ],
  {
    cwd: join(import.meta.dir, ".."),
    env: {
      ...process.env,
      EXPO_UNSTABLE_HEADLESS: "1",
      ...(proxyUrl ? { EXPO_PACKAGER_PROXY_URL: proxyUrl } : {}),
    },
    stdio: ["inherit", "inherit", "inherit"],
  },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => expo.kill(signal));
}

process.exit(await expo.exited);
