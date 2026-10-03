// Screen recording helpers for the demo: a CDP screencast recorder that writes
// a constant-frame-rate MP4, a visible cursor with click ripples, and timed
// marks the compositor uses for zooms and callouts.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

// The shared development server (see AGENTS.md); override with DEMO_BASE_URL.
export const BASE = process.env.DEMO_BASE_URL ?? "https://jennie-linux.tail2268a1.ts.net";
const FPS = 30;

/** Injected into every page: a cursor that follows the mouse and ripples on click. */
const CURSOR_SCRIPT = `
(() => {
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    // hide the Next.js dev badge and overlays in recordings
    const st = document.createElement("style");
    st.textContent = "nextjs-portal{display:none!important}";
    document.documentElement.appendChild(st);
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    const touch = innerWidth < 600;
    // phones get a round tap indicator instead of an arrow
    c.innerHTML = touch
      ? '<div style="width:34px;height:34px;border-radius:50%;background:rgb(10 10 10 / .28);border:2.5px solid rgb(255 255 255 / .9)"></div>'
      : '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2.5 19.5 10l-6.6 1.9L10 18.5z" fill="#0a0a0a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none",
      transform: touch ? "translate(-17px,-17px)" : "translate(-4px,-3px)", transition: "none", filter: "drop-shadow(0 2px 4px rgb(0 0 0 / .3))" });
    document.documentElement.appendChild(c);
    const pos = window.__demoCursorPos || { x: -100, y: -100 };
    c.style.left = pos.x + "px"; c.style.top = pos.y + "px";
    addEventListener("mousemove", (e) => {
      window.__demoCursorPos = { x: e.clientX, y: e.clientY };
      c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px";
    }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: e.clientX - 22 + "px", top: e.clientY - 22 + "px", width: "44px", height: "44px",
        borderRadius: "50%", background: "rgb(37 99 235 / .28)", border: "2px solid rgb(37 99 235 / .6)", zIndex: "2147483646",
        pointerEvents: "none", transform: "scale(.3)", opacity: "1", transition: "transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s" });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.4)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

export async function launch({ width = 1440, height = 900, scale = 1.5, mobile = false } = {}) {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: scale, locale: "id-ID", timezoneId: "Asia/Jakarta",
    isMobile: mobile, hasTouch: false, colorScheme: "light",
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  return { browser, context, page };
}

/** Records the page through CDP screencast; call stop(name) to write clips/<name>.mp4 and marks. */
export async function record(page, { width = 1440, height = 900, scale = 1.5 } = {}) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  const marks = [];
  let t0 = null;
  session.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const ts = metadata.timestamp;
    if (t0 === null) t0 = ts;
    frames.push({ t: ts - t0, data: Buffer.from(data, "base64") });
    try { await session.send("Page.screencastFrameAck", { sessionId }); } catch {}
  });
  const W = Math.round(width * scale), H = Math.round(height * scale);
  await session.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const start = Date.now() / 1000;
  return {
    /** Seconds since recording started, by wall clock. */
    now: () => Date.now() / 1000 - start,
    mark(name) { marks.push({ name, t: +(Date.now() / 1000 - start).toFixed(3) }); },
    async stop(name, tail = 0.6) {
      await page.waitForTimeout(tail * 1000);
      await session.send("Page.stopScreencast");
      const end = Date.now() / 1000 - start;
      // screencast clock and wall clock start together within a frame
      const out = `clips/${name}.mp4`;
      const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
        "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:white`,
        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-g", "15", "-pix_fmt", "yuv420p", out], { stdio: ["pipe", "inherit", "inherit"] });
      const total = Math.ceil(end * FPS);
      let k = 0;
      for (let f = 0; f < total; f++) {
        const t = f / FPS;
        while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
        if (!frames.length) break;
        if (!ff.stdin.write(frames[k].data)) await new Promise((r) => ff.stdin.once("drain", r));
      }
      ff.stdin.end();
      await new Promise((r) => ff.on("close", r));
      writeFileSync(`clips/${name}.json`, JSON.stringify({ duration: +end.toFixed(3), marks }, null, 1));
      console.log(`${name}: ${end.toFixed(1)}s, ${frames.length} frames, ${marks.length} marks`);
    },
  };
}

/** Human-paced interaction helpers that drive the visible cursor. */
export function actor(page) {
  const pause = (s) => page.waitForTimeout(s * 1000);
  async function moveTo(locator, { steps = 28 } = {}) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("no box for " + locator);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
    return box;
  }
  return {
    pause,
    moveTo,
    async click(locator, { after = 0.5 } = {}) {
      await moveTo(locator);
      await pause(0.15);
      await locator.click();
      await pause(after);
    },
    async type(locator, text, { delay = 55, after = 0.35, clear = true } = {}) {
      await moveTo(locator);
      await locator.click();
      if (clear) await locator.fill("");
      await locator.pressSequentially(text, { delay });
      await pause(after);
    },
    async scroll(dy, { steps = 20 } = {}) {
      for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(0.02); }
      await pause(0.3);
    },
  };
}
