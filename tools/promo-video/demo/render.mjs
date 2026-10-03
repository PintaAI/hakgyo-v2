// Renders compose.html to video.mp4 in parallel, resumable chunks.
//
//   bun render.mjs [--jobs 4] [--encoder x264|nvenc] [--crf 18] [--preset medium] [--gpu] [--chunk 20] [--to 30]
//   bun render.mjs --stills 12.5,90      (writes stills/*.jpg for a quick look)
//
// Each chunk is written to parts/ and kept, so a crash or Ctrl+C only loses
// the chunks that were in progress: run the same command again to resume.
// Delete parts/ to force a full re-render.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const FPS = 30;
// The engine (this folder) holds compose.html and the shared assets. A project is a folder next to it
// with its own storyboard, clips, voiceover and outputs: --project <dir>, $PROMO_PROJECT, default demo.
const engine = import.meta.dir;
const arg = (name, fallback = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(name);
const projectArg = arg("--project", process.env.PROMO_PROJECT ?? "demo");
const root = isAbsolute(projectArg) ? projectArg : resolve(engine, "..", projectArg);
const isWindows = process.platform === "win32";
const jobs = Number(arg("--jobs", 4));
const encoder = arg("--encoder", "x264");
const crf = arg("--crf", "18"), preset = arg("--preset", "medium"); // x264 only: higher crf = smaller file
// GPU rasterization in Chrome is opt-in: on this video it made the screen-recording
// scenes ~4x slower (see README, "Why CPU rendering"). NVENC encoding is separate.
const gpu = flag("--gpu");
const chunkSeconds = Number(arg("--chunk", 20));

// Serves the project folder; range requests let <video> elements seek.
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const pathname = decodeURIComponent(new URL(req.url).pathname);
    // project files win; anything else (compose.html, fonts, icons) comes from the engine
    let file = Bun.file(join(root, pathname));
    if (!(await file.exists())) file = Bun.file(join(engine, pathname));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    const range = req.headers.get("range");
    if (!range) return new Response(file);
    const size = file.size;
    const [a, b] = range.replace("bytes=", "").split("-");
    const start = Number(a), end = b ? Number(b) : size - 1;
    return new Response(file.slice(start, end + 1), {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1), "Content-Type": file.type },
    });
  },
});

async function openPage() {
  // Google Chrome is required: it plays the H.264 screen recordings.
  const launch = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" };
  const args = ["--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"];
  if (gpu) args.push("--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-accelerated-video-decode", ...(isWindows ? ["--use-angle=d3d11"] : []));
  const browser = await chromium.launch({ ...launch, args });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto(`http://localhost:${server.port}/compose.html`);
  await page.evaluate(() => window.ready);
  return { browser, page };
}

function encoderArgs(out) {
  const video = encoder === "nvenc"
    ? ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "19", "-b:v", "0"]
    : ["-c:v", "libx264", "-preset", preset, "-crf", crf];
  return ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...video, "-pix_fmt", "yuv420p", "-r", String(FPS), out];
}

async function renderFrames(page, first, last, out) {
  const tmp = out.replace(/\.mp4$/, ".partial.mp4");
  const ff = spawn("ffmpeg", encoderArgs(tmp), { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = first; f < last; f++) {
    await page.evaluate(([t, f]) => window.seek(t, f), [f / FPS, f]);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on("close", r));
  if (code !== 0) throw new Error(`ffmpeg failed on ${out}`);
  renameSync(tmp, out);
}

const first = await openPage();
const timeline = await first.page.evaluate(() => window.TIMELINE);
writeFileSync(join(root, "timeline.json"), JSON.stringify(timeline, null, 1));
// --to <seconds> renders only the start of the video (for quick tests)
const totalFrames = Math.round(Math.min(timeline.duration, Number(arg("--to", timeline.duration))) * FPS);
console.log(`duration ${timeline.duration.toFixed(1)}s, ${totalFrames} frames, ${jobs} job(s), ${encoder}${gpu ? ", GPU" : ""}`);

const stills = arg("--stills");
if (stills) {
  mkdirSync(join(root, "stills"), { recursive: true });
  for (const t of stills.split(",").map(Number)) {
    await first.page.evaluate((t) => window.seek(t), t);
    await first.page.screenshot({ path: join(root, "stills", `t${t.toFixed(2)}.jpg`), type: "jpeg", quality: 85 });
  }
  await first.browser.close();
  server.stop();
  process.exit(0);
}

// Split into chunks; keep finished ones so a re-run resumes.
const partsDir = join(root, "parts");
mkdirSync(partsDir, { recursive: true });
for (const f of readdirSync(partsDir)) if (f.endsWith(".partial.mp4")) rmSync(join(partsDir, f));
const chunk = Math.round(chunkSeconds * FPS);
const chunks = [];
for (let s = 0, i = 0; s < totalFrames; s += chunk, i++) {
  const out = join(partsDir, `part-${String(i).padStart(4, "0")}-${s}-${Math.min(totalFrames, s + chunk)}.mp4`);
  chunks.push({ s, e: Math.min(totalFrames, s + chunk), out });
}
const todo = chunks.filter((c) => !existsSync(c.out));
console.log(`${chunks.length - todo.length}/${chunks.length} chunks already done`);

const t0 = Date.now();
const total = todo.length;
let done = 0;
const pages = [first];
for (let i = 1; i < Math.min(jobs, todo.length); i++) pages.push(await openPage());
await Promise.all(pages.map(async ({ page }) => {
  while (todo.length) {
    const c = todo.shift();
    await renderFrames(page, c.s, c.e, c.out);
    done++;
    // wall time per finished chunk already reflects the parallel jobs
    const perChunk = (Date.now() - t0) / 1000 / done;
    console.log(`chunk ${c.s}-${c.e} done (${done}/${total}). ~${Math.ceil((perChunk * (total - done)) / 60)} min left`);
  }
}));
for (const { browser } of pages) await browser.close();
server.stop();

// Join the chunks without re-encoding.
const list = join(root, "parts.txt");
writeFileSync(list, chunks.map((c) => `file '${c.out.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
await new Promise((resolve, reject) => {
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", join(root, "video.mp4")], { stdio: "inherit" });
  ff.on("close", (c) => (c === 0 ? resolve() : reject(new Error("concat failed"))));
});
console.log(`video.mp4 written in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
