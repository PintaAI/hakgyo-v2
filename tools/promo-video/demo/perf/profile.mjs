// Measures where the time goes per frame, by kind of scene.
//   bun demo/perf/profile.mjs [--frames 45] [--quick] [--gpu] [--chrome-flags "..."]
import { chromium } from "playwright-core";
import { join } from "node:path";

const FPS = 30;
const root = join(import.meta.dir, "..");
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const frames = Number(arg("--frames", 45));
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const file = Bun.file(join(root, decodeURIComponent(new URL(req.url).pathname)));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    const range = req.headers.get("range");
    if (!range) return new Response(file);
    const [a, b] = range.replace("bytes=", "").split("-");
    const start = Number(a), end = b ? Number(b) : file.size - 1;
    return new Response(file.slice(start, end + 1), { status: 206, headers: { "Content-Range": `bytes ${start}-${end}/${file.size}`, "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1), "Content-Type": file.type } });
  },
});
const args = ["--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"];
if (process.argv.includes("--gpu")) args.push("--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-accelerated-video-decode");
const extra = arg("--chrome-flags");
if (extra) args.push(...extra.split(" "));
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://localhost:${server.port}/compose.html`);
await page.evaluate(() => window.ready);
console.log("chrome GPU:", await page.evaluate(() => { const c = document.createElement("canvas"); const gl = c.getContext("webgl"); const e = gl?.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "no webgl"; }));
const { segments } = await page.evaluate(() => window.TIMELINE);
const pick = (id, label) => ({ ...segments.find((s) => s.id === id), label });
const all = [pick("c4a", "desktop clip (video seek)"), pick("c7c", "phone clip (video seek)"), pick("concept", "graphics only"), pick("ch3", "chapter card")];
const cases = process.argv.includes("--quick") ? [all[0], all[2]] : all;
const ms = (a) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(0);
console.log(`${frames} frames per case, 1 page\n`);
for (const c of cases) {
  const seekT = [], shotT = [];
  const startFrame = Math.round((c.start + Math.min(2, c.dur / 3)) * FPS);
  // untimed warm-up (GPU pipeline setup, shader compile, first texture uploads)
  for (let f = startFrame - 12; f < startFrame; f++) {
    await page.evaluate(([t, f]) => window.seek(t, f), [f / FPS, f]);
    await page.screenshot({ type: "jpeg", quality: 92 });
  }
  for (let f = startFrame; f < startFrame + frames; f++) {
    let t0 = performance.now();
    await page.evaluate(([t, f]) => window.seek(t, f), [f / FPS, f]);
    seekT.push(performance.now() - t0);
    t0 = performance.now();
    await page.screenshot({ type: "jpeg", quality: 92 });
    shotT.push(performance.now() - t0);
  }
  console.log(`${c.label.padEnd(26)} seek+scene ${ms(seekT).padStart(4)} ms   screenshot ${ms(shotT).padStart(4)} ms   total ${(Number(ms(seekT)) + Number(ms(shotT))).toString().padStart(4)} ms/frame`);
}
await browser.close();
server.stop();
