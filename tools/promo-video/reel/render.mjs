// Usage: bun render.mjs [--stills 1.2,5,9] — without flags renders every frame to frames/.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const FPS = 30;
const root = import.meta.dir;
const server = Bun.serve({ port: 0, fetch: (req) => new Response(Bun.file(root + new URL(req.url).pathname)) });
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--disable-web-security", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("pageerror", e));
await page.goto(`http://localhost:${server.port}/reel.html`);
await page.evaluate(() => window.ready);
const { sfx, duration, music, holds } = await page.evaluate(() => ({ sfx: window.SFX, duration: window.DURATION, music: window.MUSIC, holds: window.HOLDS }));
writeFileSync(root + "/cues.json", JSON.stringify({ duration, music, sfx }, null, 1));
console.log(`duration ${duration.toFixed(2)}s holds ${JSON.stringify(holds)}`);

const stillsArg = process.argv.indexOf("--stills");
if (stillsArg > 0) {
  mkdirSync(root + "/stills", { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: `${root}/stills/t${t.toFixed(2)}.jpg`, type: "jpeg", quality: 80 });
  }
} else {
  mkdirSync(root + "/frames_new", { recursive: true });
  const total = Math.round(duration * FPS);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(([t, f]) => window.seek(t, f), [f / FPS, f]);
    await page.screenshot({ path: `${root}/frames_new/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 93 });
    if (f % 60 === 0) console.log(`frame ${f}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
await browser.close();
server.stop();
