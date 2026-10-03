// Fetches or generates the assets that are not committed: fonts, icons, the logo
// and app screenshots. Safe to run again. Run `bun install` here and in the repo
// root first (icons and Geist come from the web app's installed packages).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const pkg = resolve(import.meta.dir, "..");
const repo = resolve(pkg, "../..");
const projects = { demo: join(pkg, "demo/assets"), reel: join(pkg, "reel/assets") };
for (const dir of Object.values(projects)) mkdirSync(dir, { recursive: true });
const log = (m) => console.log(`[setup] ${m}`);

/** Copies a file into every project's assets folder unless it is already there. */
function place(src, name, only = Object.keys(projects)) {
  for (const key of only) {
    const dest = join(projects[key], name);
    if (!existsSync(dest)) { copyFileSync(src, dest); log(`${key}/assets/${name}`); }
  }
}

// Geist (the landing page font) ships inside the installed Next.js package.
for (const name of ["geist-latin.woff2", "geist-mono-latin.woff2"]) {
  const [found] = [...new Bun.Glob(`node_modules/.bun/next@*/node_modules/next/dist/esm/next-devtools/server/font/${name}`).scanSync({ cwd: repo, dot: true })];
  if (!found) throw new Error(`${name} not found: run \`bun install\` in the repository root first`);
  place(join(repo, found), name);
}

// Noto Sans KR (Hangul) is downloaded once from the Google Fonts repository.
const noto = join(projects.demo, "NotoSansKR.ttf");
if (!existsSync(noto) && !existsSync(join(projects.reel, "NotoSansKR.ttf"))) {
  log("downloading NotoSansKR.ttf (10 MB)");
  const res = await fetch("https://github.com/google/fonts/raw/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf");
  if (!res.ok) throw new Error(`font download failed: ${res.status}`);
  writeFileSync(noto, Buffer.from(await res.arrayBuffer()));
}
place(existsSync(noto) ? noto : join(projects.reel, "NotoSansKR.ttf"), "NotoSansKR.ttf");

// Logo and app screenshots come from the repository itself.
place(join(repo, "apps/mobile/assets/splash-icon-dark.png"), "logo-dark.png");
for (const name of ["app-learn.webp", "app-practice.webp", "app-today.webp", "curriculum-light.jpg", "vocabulary-light.jpg"]) {
  place(join(repo, "apps/web/public/images/landing", name), name, ["reel"]);
}

// icons.js: every quoted name in a project's HTML that is a Lucide icon, rendered
// with the same package the web app uses.
const web = createRequire(join(repo, "apps/web/package.json"));
const { createElement } = web("react");
const { renderToStaticMarkup } = web("react-dom/server");
const lucide = web("lucide-react");
const htmlOf = { demo: "demo/compose.html", reel: "reel/reel.html" };
for (const [key, dir] of Object.entries(projects)) {
  // names also come from the storyboard (callouts reference icons by name)
  // (the demo engine's icons.js serves every project, so it gathers all storyboards)
  const boards = key === "demo" ? ["demo", "kurikulum"].map((d) => join(pkg, d, "storyboard.json")).filter((f) => existsSync(f)) : [];
  const extra = boards.map((f) => readFileSync(f, "utf8")).join("\n");
  const html = readFileSync(join(pkg, htmlOf[key]), "utf8") + extra;
  const names = [...new Set([...html.matchAll(/"([A-Z][A-Za-z0-9]*)"/g)].map((m) => m[1]))];
  const icons = {};
  for (const name of names) {
    const Icon = lucide[`${name}Icon`] ?? lucide[name];
    if (Icon && (typeof Icon === "function" || typeof Icon === "object") && name !== "Icon") {
      icons[name] = renderToStaticMarkup(createElement(Icon, { size: 24, strokeWidth: 1.75 }));
    }
  }
  writeFileSync(join(dir, "icons.js"), `window.ICONS=${JSON.stringify(icons)};`);
  log(`${key}/assets/icons.js (${Object.keys(icons).length} icons)`);
}
log("done");
