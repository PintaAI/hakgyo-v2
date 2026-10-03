// Records the screen clips of the kurikulum tutorial against the shared dev server.
// Usage: bun kurikulum/record.mjs <stage> [--dry]     (state lives in state.json)
// Stages run in order; --dry performs everything without recording, for fixing selectors.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASE, actor, launch, record } from "../demo/lib/recorder.mjs";

process.chdir(import.meta.dir);
mkdirSync("clips", { recursive: true });
const DEBUG = join(tmpdir(), "promo-video-debug");
mkdirSync(DEBUG, { recursive: true });
const STATE = "state.json";
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 1));
const stage = process.argv[2];
const dry = process.argv.includes("--dry");
const T0 = Date.now();
const A = (name) => join(process.cwd(), "assets", name);

const COURSE = {
  title: "Bahasa Korea untuk Pemula",
  desc: "Kursus dasar bahasa Korea untuk pemula: dari membaca Hangeul, perkenalan diri, sampai angka dan waktu.",
};
const W = () => `${BASE}/workspace/${state.orgSlug}`;
const C = () => `${W()}/courses/${state.courseId}`;

async function shot(page, name) {
  await page.screenshot({ path: join(DEBUG, `k-${stage}-${name}.jpg`), type: "jpeg", quality: 60 });
}

let current = null;
async function session(kind, opts = {}) {
  const env = await launch(opts);
  current = env;
  const file = `auth-${kind}.json`;
  if (existsSync(file)) await env.context.addCookies(JSON.parse(readFileSync(file, "utf8")));
  env.saveAuth = async () => writeFileSync(file, JSON.stringify(await env.context.cookies()));
  return env;
}

/** Deletes a course through the app's own API while signed in as the owner (to re-record a stage). */
async function deleteCourse(page, courseId) {
  return page.evaluate(async (id) => {
    const r = await fetch("/api/trpc/course.delete?batch=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ 0: { json: { courseId: id } } }) });
    return r.status;
  }, courseId);
}


/** The organization id (the URLs only carry the slug), read from the app's own requests. */
async function orgIdOf(page) {
  if (state.orgId) return state.orgId;
  let found = null;
  page.on("request", (r) => {
    const m = r.url().match(/content\.listMaterials[^"]*?input=([^&]+)/);
    if (m && !found) { try { found = JSON.parse(decodeURIComponent(m[1]))["0"].json.organizationId; } catch {} }
  });
  await page.goto(`${W()}/library/materials`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (!found) found = (await page.content()).match(/organizationId\\?":\\?"([a-z0-9]{20,})/)?.[1] ?? null;
  if (!found) throw new Error("could not read the organization id");
  state.orgId = found;
  save();
  return found;
}

/** Calls one tRPC procedure through the page (same cookies as the app). */
async function trpc(page, kind, path, input) {
  return page.evaluate(async ([kind, path, input]) => {
    const payload = { 0: { json: input } };
    const res = kind === "query"
      ? await fetch(`/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify(payload))}`)
      : await fetch(`/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await res.json();
    return { status: res.status, data: body[0]?.result?.data?.json, error: body[0]?.error?.json?.message };
  }, [kind, path, input]);
}

/**
 * Deletes demo resources that no course uses (left by earlier runs), matched by title. Resources whose
 * usage cannot be read are treated as used and kept. Without apply it only lists what it would delete.
 */
async function cleanLibrary(page, apply = true) {
  const organizationId = await orgIdOf(page);
  const used = (item) => {
    if (Array.isArray(item.courseItems)) return item.courseItems.length;
    for (const k of ["courseItemCount", "placementCount", "usageCount", "usedInCourseItems"]) if (typeof item[k] === "number") return item[k];
    if (typeof item._count?.courseItems === "number") return item._count.courseItems;
    return null;
  };
  const demo = {
    materials: (t) => /Mengenal Huruf Hangeul|Hal\. \d/.test(t),
    sets: (t) => t === "Kosakata Pekerjaan", // "Kosakata Pabrik" belongs to the other demo's course: never touch it
    tests: (t) => t === "Kuis Hangeul Dasar" || t === "Kuis Angka",
  };
  const report = { deleted: 0, kept: 0, unknownUsage: 0 };
  const sweep = async (label, list, input, matches, remove) => {
    const res = await trpc(page, "query", list, input);
    const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
    if (!items.length && res.error) console.log(`  ${label}: ${res.error}`);
    for (const item of items) {
      if (!matches(item.title ?? "")) continue;
      const n = used(item);
      if (n === null) { report.unknownUsage++; console.log(`  ${label} "${item.title}": usage unknown, kept (keys: ${Object.keys(item).join(",")})`); continue; }
      if (n > 0) { report.kept++; continue; }
      if (!apply) { console.log(`  would delete ${label} "${item.title}"`); continue; }
      const r = await remove(item);
      if (!r.error) report.deleted++; else console.log(`  ${label} "${item.title}": ${r.error}`);
    }
  };
  await sweep("materi", "content.listMaterials", { organizationId }, demo.materials, (m) => trpc(page, "mutation", "content.deleteMaterial", { organizationId, materialId: m.id }));
  // The vocabulary list does not say where a set is used, so keep the newest set of that title (the one
  // the current run created) and delete the older duplicates.
  {
    const res = await trpc(page, "query", "content.listVocabularySets", { organizationId });
    const sets = (Array.isArray(res.data) ? res.data : []).filter((v) => demo.sets(v.title ?? "")).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    for (const v of sets.slice(1)) {
      if (!apply) { console.log(`  would delete kosakata "${v.title}" (older duplicate)`); continue; }
      const r = await trpc(page, "mutation", "content.deleteVocabularySet", { organizationId, vocabularySetId: v.id });
      if (!r.error) report.deleted++; else console.log(`  kosakata "${v.title}": ${r.error}`);
    }
    if (sets.length) report.kept++;
  }
  await sweep("tugas", "assessment.list", { organizationId }, demo.tests, (t) => trpc(page, "mutation", "assessment.delete", { assessmentId: t.id }));
  console.log("library cleanup:", JSON.stringify(report), apply ? "" : "(list only)");
}

/** Moves the cursor onto the first element whose own text matches, using plain DOM calls (no actionability waits). */
async function hover(page, pattern, { move = true } = {}) {
  const box = await page.evaluate((src) => {
    const re = new RegExp(src);
    const el = [...document.querySelectorAll("p, span, div, h1, h2, h3, a, button")].find((e) => e.children.length === 0 && re.test(e.textContent ?? "") && e.getBoundingClientRect().width > 0);
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, pattern);
  if (box && move) await page.mouse.move(box.x, box.y, { steps: 28 });
  return box;
}

const stages = {
  // Create the course and look around the course workspace.
  async create() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${W()}/courses`, { waitUntil: "networkidle" });
    if (state.courseId) { console.log("deleting previous course", await deleteCourse(page, state.courseId)); await page.reload({ waitUntil: "networkidle" }); }
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("list");
    await shot(page, "1-list");
    await a.click(page.getByRole("link", { name: "Course baru" }).or(page.getByRole("button", { name: "Course baru" })).first());
    await page.waitForURL(/courses\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("form");
    await shot(page, "2-form");
    await a.type(page.getByPlaceholder(/Bahasa Korea untuk Pemula/), COURSE.title);
    await a.type(page.getByLabel("Gambaran singkat"), COURSE.desc, { delay: 22 });
    await a.moveTo(page.getByText("Setelah course dibuat").first());
    await a.pause(1.5);
    mark("submit");
    await a.click(page.getByRole("button", { name: "Buat course" }).last(), { after: 0.8 });
    await page.waitForURL((u) => !u.pathname.endsWith("/new"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("back-to-list");
    await shot(page, "3-after");
    await a.click(page.getByRole("main").getByRole("link", { name: new RegExp(COURSE.title) }).first());
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    state.courseId = page.url().split("/").pop();
    save();
    await a.pause(1.5);
    mark("workspace");
    await shot(page, "4-workspace");
    for (const tab of [/Ringkasan/, /Group belajar/, /Siswa/, /Hasil & review/, /Tryout/, /Pengaturan/]) {
      await a.moveTo(page.getByRole("tab", { name: tab }));
      await a.pause(0.7);
    }
    mark("tabs");
    await a.pause(1);
    await rec?.stop("01-create");
    await saveAuth();
    await browser.close();
  },

  // Pengaturan: thumbnail, price, access type, progression; then the AI thumbnail.
  async settings() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(C(), { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1);
    mark("tab");
    await a.click(page.getByRole("tab", { name: /Pengaturan/ }), { after: 1.2 });
    await shot(page, "1-tab");
    mark("info");
    await a.moveTo(page.locator("#settings-title"));
    await a.pause(0.8);
    await a.moveTo(page.locator("#settings-description"));
    await a.pause(1.2);
    mark("thumbnail");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      a.click(page.getByRole("button", { name: /Unggah thumbnail|Ganti thumbnail/ }), { after: 0.2 }),
    ]);
    await chooser.setFiles(A("cover.png"));
    await page.getByText("Thumbnail course diperbarui").first().waitFor({ timeout: 60000 });
    await a.pause(1.5);
    mark("thumbnail-done");
    await shot(page, "2-thumb");
    mark("price");
    await a.type(page.locator("#settings-price"), "150000", { delay: 130, after: 0.6 });
    await a.click(page.locator("#settings-currency"), { after: 1.4 });
    await shot(page, "3-currency");
    await a.moveTo(page.getByRole("option").nth(1));
    await a.pause(1.0);
    await a.click(page.getByRole("option").first(), { after: 0.6 });
    mark("access");
    await a.click(page.locator("#settings-enrollment"), { after: 0.8 });
    await shot(page, "4-access");
    for (const opt of await page.getByRole("option").all()) { await a.moveTo(opt); await a.pause(0.9); }
    await a.click(page.getByRole("option").first(), { after: 0.6 });
    mark("progression");
    await a.click(page.locator("#settings-progression"), { after: 0.8 });
    await shot(page, "5-progression");
    for (const opt of await page.getByRole("option").all()) { await a.moveTo(opt); await a.pause(1.0); }
    await a.click(page.getByRole("option", { name: "Terbuka" }), { after: 0.6 });
    mark("save");
    await a.click(page.getByRole("button", { name: "Simpan perubahan" }), { after: 2 });
    await shot(page, "6-saved");
    mark("ai-thumbnail");
    await a.moveTo(page.getByRole("button", { name: /Buat thumbnail dengan AI/ }));
    await a.pause(1.2);
    await a.click(page.getByRole("button", { name: /Buat thumbnail dengan AI/ }), { after: 0.5 });
    mark("ai-start");
    await page.getByText("Thumbnail course berhasil dibuat").first().waitFor({ timeout: 200000 });
    mark("ai-done");
    await a.pause(2.5);
    await shot(page, "7-ai");
    await rec?.stop("02-settings");
    await saveAuth();
    await browser.close();
  },

  // The kurikulum editor: bab (create, edit, reorder, delete) and the progression select.
  async structure() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    // idempotent: clear bab left by an earlier run, through the UI itself
    while (await page.getByRole("button", { name: "Hapus bab" }).count()) {
      await page.getByRole("button", { name: "Hapus bab" }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: /^Hapus/ }).click();
      await page.waitForTimeout(900);
    }
    await page.goto(C(), { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1);
    mark("workspace");
    await a.click(page.getByRole("link", { name: "Edit kurikulum" }).first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("empty");
    await shot(page, "1-empty");
    await a.moveTo(page.getByText("Mulai dari nol").first());
    await a.pause(1);
    await a.moveTo(page.getByText("Impor dari buku PDF").first());
    await a.pause(1);
    const addBab = async (title, desc, first) => {
      await a.click(page.getByRole("button", { name: first ? "Buat bab" : "Tambah bab" }).last(), { after: 0.6 });
      await a.type(page.locator("#module-title"), title);
      await a.type(page.locator("#module-description"), desc, { delay: 20 });
      await a.click(page.getByRole("dialog").locator('button[type="submit"]'), { after: 1.3 });
    };
    mark("bab-1");
    await addBab("Mengenal Hangeul", "Huruf, suku kata, dan cara membaca Hangeul.", true);
    mark("bab-2");
    await addBab("Angka", "Angka asli Korea dan angka Sino-Korea.");
    mark("bab-3");
    await addBab("Perkenalan Diri", "Salam, memperkenalkan diri, dan ucapan sehari-hari.");
    await shot(page, "2-babs");
    // the order is wrong on purpose: drag "Perkenalan Diri" above "Angka"
    mark("reorder");
    const handles = page.getByRole("button", { name: "Seret bab untuk mengurutkan" });
    await handles.nth(2).scrollIntoViewIfNeeded();
    await page.addStyleTag({ content: "* { user-select: none !important; }" });
    const src = await handles.nth(2).boundingBox();
    const dst = await handles.nth(1).boundingBox();
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2, { steps: 24 });
    await a.pause(0.5);
    await page.mouse.down();
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2 - 14, { steps: 8 });
    await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2 - 40, { steps: 50 });
    await a.pause(0.7);
    await page.mouse.up();
    await a.pause(1.8);
    await shot(page, "3-reordered");
    mark("edit");
    await a.click(page.getByRole("button", { name: "Edit bab" }).nth(2), { after: 0.8 });
    await shot(page, "4-edit");
    await a.type(page.locator("#module-title"), "Angka dan Waktu");
    await a.click(page.getByRole("dialog").locator('button[type="submit"]'), { after: 1.3 });
    mark("temp");
    await addBab("Bab percobaan", "Hanya untuk mencoba menghapus bab.");
    mark("delete");
    await a.click(page.getByRole("button", { name: "Hapus bab" }).last(), { after: 1.6 });
    await shot(page, "5-delete");
    await a.click(page.getByRole("alertdialog").getByRole("button", { name: /^Hapus/ }), { after: 1.8 });
    mark("progression");
    await a.moveTo(page.getByText("Progression").first());
    await a.pause(1);
    await a.click(page.locator("button[role=combobox]").first(), { after: 1.2 });
    await shot(page, "6-progression");
    await page.keyboard.press("Escape");
    await a.pause(0.8);
    mark("done");
    await shot(page, "7-done");
    await rec?.stop("03-structure");
    await saveAuth();
    await browser.close();
  },

  // "Tambah learning item" and the Materi editor (slash menu, blocks), saved into bab 1.
  async materi() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("bab");
    await a.click(page.getByRole("button", { name: "Tambah learning item" }).first(), { after: 1.0 });
    mark("dialog");
    await shot(page, "1-dialog");
    const dlg = page.getByRole("dialog");
    for (const label of ["Kosakata", "Tugas", "Materi"]) {
      await a.click(dlg.getByRole("button", { name: label, exact: true }), { after: 0.9 });
    }
    await a.moveTo(dlg.getByText(/Buat materi baru/).first());
    await a.pause(1.2);
    await a.moveTo(dlg.getByText(/atau pilih dari library/).first());
    await a.pause(1.2);
    mark("to-editor");
    await a.click(dlg.getByRole("link", { name: /Buat materi/ }));
    await page.waitForURL(/materials\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("editor");
    await shot(page, "2-editor");
    await a.type(page.locator("#material-title"), "Mengenal Huruf Hangeul");
    await a.type(page.locator("#material-description"), "Pengenalan huruf vokal dan konsonan dasar Hangeul.", { delay: 22 });
    mark("write");
    const ed = page.locator(".tiptap").first();
    await a.click(ed, { after: 0.4 });
    await page.keyboard.type("# Huruf vokal dasar", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Hangeul terdiri dari huruf vokal dan konsonan. Mulai dari lima vokal dasar: ", { delay: 28 });
    await page.keyboard.type("ㅏ (a), ㅓ (eo), ㅗ (o), ㅜ (u), dan ㅣ (i).", { delay: 28 });
    await a.pause(0.8);
    mark("slash");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/", { delay: 100 });
    await a.pause(1.4);
    await shot(page, "3-slash");
    await page.keyboard.type("callout", { delay: 90 });
    await a.pause(0.9);
    await page.keyboard.press("Enter");
    await a.pause(0.8);
    // a new block arrives pre-filled with sample text: select it and type over it
    await page.keyboard.press("Shift+End");
    await page.keyboard.type("Tip: baca huruf dari kiri ke kanan, lalu atas ke bawah.", { delay: 28 });
    await a.pause(1.2);
    await shot(page, "4-callout");
    mark("conversation");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/", { delay: 100 });
    await a.pause(0.8);
    await page.keyboard.type("conversation", { delay: 80 });
    await a.pause(0.8);
    await page.keyboard.press("Enter");
    await a.pause(2.0);
    await shot(page, "5-conversation");
    mark("preview");
    await a.click(page.getByRole("button", { name: "Pratinjau" }).last(), { after: 1.6 });
    await shot(page, "6-preview");
    await a.pause(2.2);
    await page.keyboard.press("Escape");
    await a.pause(0.8);
    mark("save");
    await a.click(page.getByRole("button", { name: "Simpan dan tambahkan" }), { after: 2 });
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("added");
    await shot(page, "7-added");
    await rec?.stop("04-materi");
    await saveAuth();
    await browser.close();
  },

  // The Kosakata editor: quick add, examples with AI, illustration and audio, "Impor AI".
  async kosakata() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("bab");
    await a.click(page.getByRole("button", { name: "Tambah learning item" }).nth(1), { after: 1.0 });
    const dlg = page.getByRole("dialog");
    await a.click(dlg.getByRole("button", { name: "Kosakata", exact: true }), { after: 0.9 });
    await shot(page, "1-dialog");
    mark("to-editor");
    await a.click(dlg.getByRole("link", { name: /Buat set kosakata/ }));
    await page.waitForURL(/vocabulary\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("editor");
    await a.type(page.getByLabel("Judul set kosakata"), "Kosakata Pekerjaan");
    await a.pause(1.5);
    mark("entries");
    for (const [term, def] of [["공장", "pabrik"], ["안전", "keselamatan"], ["기계", "mesin"]]) {
      await a.type(page.getByLabel("Istilah baru", { exact: true }), term, { delay: 100 });
      await a.type(page.getByLabel("Definisi istilah baru"), def, { after: 0.1 });
      await page.keyboard.press("Enter");
      await a.pause(0.9);
    }
    await shot(page, "2-entries");
    mark("expand");
    // the newest entry (기계) opens by itself: fold it so only 공장 is open
    await a.click(page.getByText("기계 · mesin").first(), { after: 0.8 });
    await a.click(page.getByText("공장 · pabrik").first(), { after: 1.2 });
    await shot(page, "3-expanded");
    mark("ai-examples");
    await a.click(page.getByRole("button", { name: /Tambah 3.4 contoh dengan AI/ }), { after: 0.5 });
    mark("ai-wait");
    await page.waitForFunction(() => document.querySelector("textarea[placeholder='Satu contoh per baris']")?.value.trim().length > 0, null, { timeout: 120000 });
    mark("ai-wait-done");
    await a.pause(2.2);
    await shot(page, "4-examples");
    mark("media");
    const [imgChooser] = await Promise.all([page.waitForEvent("filechooser"), a.click(page.getByRole("button", { name: /^Unggah$/ }).first(), { after: 0.2 })]);
    await imgChooser.setFiles(A("ilustrasi-pabrik.png"));
    await a.pause(2.5);
    const [audioChooser] = await Promise.all([page.waitForEvent("filechooser"), a.click(page.getByRole("button", { name: /^Unggah$/ }).last(), { after: 0.2 })]);
    await audioChooser.setFiles(A("pelafalan-gongjang.mp3"));
    await a.pause(2.5);
    await shot(page, "5-media");
    mark("import");
    // the button opens the file chooser straight away; the review dialog appears after the image is read
    const [impChooser] = await Promise.all([page.waitForEvent("filechooser"), a.click(page.locator("button", { hasText: "Impor AI" }).first(), { after: 0.2 })]);
    await impChooser.setFiles(A("daftar-kosakata.png"));
    mark("import-reading");
    await page.getByText(/istilah terbaca/).first().waitFor({ timeout: 120000 });
    await a.pause(2.5);
    mark("import-review");
    await shot(page, "7-import-review");
    await a.moveTo(page.getByRole("dialog").getByRole("checkbox").first());
    await a.pause(1.5);
    await a.click(page.getByRole("dialog").getByRole("button", { name: /Simpan \d+ istilah/ }), { after: 2.5 });
    mark("import-done");
    await shot(page, "8-import-done");
    await a.click(page.getByLabel("Kembali").first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("added");
    await shot(page, "9-added");
    await rec?.stop("05-kosakata");
    await saveAuth();
    await browser.close();
  },

  // The Tugas editor: three question types, settings, and the question map.
  async tugas() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("bab");
    await a.click(page.getByRole("button", { name: "Tambah learning item" }).first(), { after: 1.0 });
    const dlg = page.getByRole("dialog");
    await a.click(dlg.getByRole("button", { name: "Tugas", exact: true }), { after: 0.9 });
    mark("to-editor");
    await a.click(dlg.getByRole("link", { name: /Buat tugas/ }));
    await page.waitForURL(/assessments\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("editor");
    await a.type(page.getByLabel("Judul tugas"), "Kuis Hangeul Dasar");
    // typing a title creates the tugas and the route changes from /new to its id
    await page.waitForURL(/assessments\/(?!new)[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    await a.type(page.getByLabel("Deskripsi tugas"), "Latihan singkat untuk mengenali huruf vokal Hangeul.", { delay: 22 });
    mark("instructions");
    const ed = page.locator(".tiptap");
    await a.click(ed.first(), { after: 0.3 });
    await page.keyboard.type("Pilih jawaban yang paling tepat.", { delay: 40 });
    await a.pause(0.8);
    const newQuestion = async (n, first) => {
      mark(`q${n}`);
      const closeAll = page.getByRole("button", { name: /Tutup semua/ });
      if (!first && (await closeAll.count())) await a.click(closeAll.first(), { after: 0.6 });
      await a.click(page.getByRole("button", { name: first ? /^Tambah soal$/ : /Tambah soal berikutnya/ }).first(), { after: 1.0 });
    };
    // every change autosaves and the card re-renders from the server. Wait until the header says
    // everything is saved before the next action, or typed text can be overwritten and lost.
    const settle = async () => {
      await page.waitForTimeout(700);
      await page.waitForFunction(() => !/Menyimpan|Menunggu untuk disimpan/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(500);
    };
    const typeLast = async (text) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await settle();
        const editor = page.locator(".tiptap").last();
        await editor.click();
        await page.keyboard.type(text, { delay: 55 });
        await settle();
        if ((await page.locator(".tiptap").last().innerText()).includes(text)) return;
        await page.locator(".tiptap").last().click();
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Delete");
      }
      throw new Error(`option text "${text}" would not stick`);
    };
    const markCorrect = async (n) => a.click(page.getByLabel(`Tandai opsi ${n} sebagai jawaban benar`), { after: 0.9 });
    // question 1: single choice
    await newQuestion(1, true);
    await a.click(ed.nth(1), { after: 0.3 });
    await page.keyboard.type("Huruf ㅏ dibaca apa?", { delay: 45 });
    await settle();
    mark("options");
    for (const text of ["a", "eo", "o", "u"]) {
      await a.click(page.getByRole("button", { name: "Tambah opsi" }), { after: 0.5 });
      await typeLast(text);
    }
    mark("correct");
    await markCorrect(1);
    mark("explain");
    await a.click(ed.nth(2), { after: 0.3 });
    await page.keyboard.type("ㅏ dibaca \"a\", seperti pada kata \"apa\".", { delay: 40 });
    await a.pause(0.8);
    console.log("Q1 editors:", JSON.stringify(await page.locator(".tiptap").allInnerTexts()));
    await shot(page, "1-q1");
    // question 2: multiple choice
    await newQuestion(2);
    await a.click(page.locator("button[role=combobox]").filter({ hasText: "Pilihan tunggal" }).last(), { after: 1.0 });
    await shot(page, "2-types");
    await a.click(page.getByRole("option", { name: "Pilihan ganda" }), { after: 0.8 });
    mark("multiple");
    await a.click(page.locator(".tiptap").nth(1), { after: 0.3 });
    await page.keyboard.type("Mana saja yang termasuk huruf vokal?", { delay: 45 });
    await settle();
    for (const text of ["ㅏ", "ㄱ", "ㅗ", "ㄴ"]) {
      await a.click(page.getByRole("button", { name: "Tambah opsi" }), { after: 0.5 });
      await typeLast(text);
    }
    await markCorrect(1);
    await markCorrect(3);
    await shot(page, "3-q2");
    // question 3: written answer, graded by the teacher
    await newQuestion(3);
    await a.click(page.locator("button[role=combobox]").filter({ hasText: "Pilihan tunggal" }).last(), { after: 0.9 });
    await a.click(page.getByRole("option", { name: "Jawaban tertulis" }), { after: 0.8 });
    mark("written");
    await a.click(page.locator(".tiptap").nth(1), { after: 0.3 });
    await page.keyboard.type("Tuliskan arti 안녕하세요 dalam bahasa Indonesia.", { delay: 40 });
    await a.pause(0.8);
    await a.type(page.locator('input[id^="question-points-"]'), "5", { delay: 100 });
    await shot(page, "4-q3");
    mark("settings");
    await a.type(page.locator("#assessment-passing-score"), "70", { delay: 110 });
    await a.type(page.locator("#assessment-max-attempts"), "3", { delay: 110 });
    await a.type(page.locator("#assessment-time-limit"), "10", { delay: 110 });
    await a.click(page.locator('[role="switch"]').first(), { after: 1.0 });
    await shot(page, "5-settings");
    mark("map");
    await a.moveTo(page.getByText("Peta soal").first());
    await a.pause(1.2);
    await a.click(page.getByRole("button", { name: /Huruf .* dibaca/ }).first(), { after: 1.2 });
    await a.pause(1.0);
    mark("saved");
    await shot(page, "6-map");
    await a.click(page.getByRole("button", { name: "Kembali" }).first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("added");
    await shot(page, "7-added");
    await rec?.stop("06-tugas");
    await saveAuth();
    await browser.close();
  },

  // "Buat dari PDF": upload a textbook, mark page 1, let AI read the table of contents, create hidden materi.
  // Tugas: import questions from a worksheet photo with AI (into a new tugas, "Latihan Konsonan").
  async "tugas-ai"() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    // setup (not recorded): a new, still hidden tugas in bab 1 (a tugas that is live is read-only)
    const title = "Latihan Membaca Konsonan";
    if (await page.getByRole("link", { name: title }).count()) {
      const href = await page.getByRole("link", { name: title }).first().getAttribute("href");
      await page.goto(new URL(href, page.url()).href, { waitUntil: "networkidle" });
    } else {
      await page.getByRole("button", { name: "Tambah learning item" }).first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Tugas", exact: true }).click();
      await page.getByRole("dialog").getByRole("link", { name: /Buat tugas/ }).click();
      await page.waitForURL(/assessments\/new/, { timeout: 30000 });
      await page.getByLabel("Judul tugas").fill(title);
      await page.waitForURL(/assessments\/(?!new)[^/]+$/, { timeout: 30000 });
      await page.getByLabel("Deskripsi tugas").fill("Latihan membaca huruf konsonan Hangeul.");
    }
    await page.waitForTimeout(2500);
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.5);
    mark("editor");
    await shot(page, "1-editor");
    await a.moveTo(page.getByText(/soal · \d+ poin/).first());
    await a.pause(1.2);
    mark("import");
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), a.click(page.locator("button", { hasText: "Impor AI" }).first(), { after: 0.2 })]);
    await chooser.setFiles(A("lembar-soal.png"));
    mark("scan-wait");
    await page.getByText(/soal terbaca/).first().waitFor({ timeout: 120000 });
    mark("scan-done");
    await a.pause(1.8);
    mark("review");
    await shot(page, "2-review");
    await a.moveTo(page.getByText(/Kunci dari gambar/).first());
    await a.pause(2.0);
    mark("ai-key");
    const aiKey = page.getByText(/Kunci dari AI/).first();
    if (await aiKey.count()) { await a.moveTo(aiKey); await a.pause(2.4); } else console.log("  note: no AI answer key in this scan");
    mark("save");
    await a.click(page.getByRole("button", { name: /^Tambah \d+ soal$/ }), { after: 2.5 });
    mark("added");
    await shot(page, "3-added");
    await rec?.stop("06b-tugas-ai");
    await saveAuth();
    await browser.close();
  },

  async pdf() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    // no cleanup of earlier runs: old demo books stay in the library (nothing is deleted on the shared server)
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("button");
    await a.click(page.getByRole("link", { name: /Buat dari PDF/ }).or(page.getByRole("button", { name: /Buat dari PDF/ })).first());
    await page.waitForURL(/impor-pdf/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("upload");
    await shot(page, "1-start");
    // an earlier run's book is still in the library: the upload area sits behind "Unggah buku PDF baru"
    const another = page.getByRole("button", { name: /Unggah buku PDF baru/ });
    if (await another.count()) await a.click(another.first(), { after: 0.8 });
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), a.click(page.getByText(/Tarik PDF ke sini/).first(), { after: 0.2 })]);
    await chooser.setFiles(A("buku-contoh.pdf"));
    await page.getByText("Hal. 3", { exact: true }).first().waitFor({ timeout: 90000 });
    await a.pause(1.5);
    mark("page-one");
    await shot(page, "2-page-one");
    await a.moveTo(page.getByText("Di halaman mana nomor 1 buku Anda?"));
    await a.pause(1.2);
    await a.click(page.getByText("Hal. 3", { exact: true }).first(), { after: 1.0 });
    await a.click(page.getByRole("button", { name: "Lanjut" }), { after: 1.8 });
    mark("map");
    await shot(page, "3-map");
    await a.moveTo(page.getByText("Klik halaman pertama sebuah bab."));
    await a.pause(1.4);
    mark("toc");
    await a.click(page.getByText(/Cara tercepat/).first(), { after: 1.5 });
    await a.click(page.getByRole("dialog").getByText("ii", { exact: true }).first(), { after: 1.0 });
    await shot(page, "4-toc-picked");
    mark("toc-ai");
    await a.click(page.getByRole("dialog").getByRole("button", { name: /Baca dengan AI/ }), { after: 0.5 });
    mark("toc-wait");
    await page.waitForFunction(() => document.querySelector("[role=dialog] textarea")?.value.trim().length > 0, null, { timeout: 180000 });
    mark("toc-wait-done");
    await a.pause(2.8);
    mark("toc-result");
    await shot(page, "5-toc-result");
    await a.click(page.getByRole("dialog").getByRole("button", { name: /^Buat \d+ bab/ }), { after: 2.0 });
    mark("plan");
    await shot(page, "6-plan");
    await a.moveTo(page.getByText("Rencana kurikulum").first());
    await a.pause(1.5);
    mark("review");
    await a.click(page.getByRole("button", { name: /^Tinjau/ }), { after: 1.8 });
    await shot(page, "7-review");
    await a.pause(1.5);
    mark("process-wait");
    // the final step needs every page uploaded; processing can take minutes on a slow link
    await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Buat \d+ materi/.test(x.innerText)); return b && !b.disabled; }, null, { timeout: 600000 });
    mark("create");
    await a.click(page.getByRole("button", { name: /^Buat \d+ materi/ }), { after: 2.5 });
    await page.waitForURL(/kurikulum$/, { timeout: 120000 });
    await page.waitForLoadState("networkidle");
    await a.pause(2.0);
    mark("done");
    await shot(page, "8-done");
    await rec?.stop("07-pdf");
    await saveAuth();
    await browser.close();
  },

  // Remove demo resources left in the library by earlier runs (only ones no course uses).
  async cleanup() {
    const { browser, page } = await session("owner");
    await cleanLibrary(page, process.argv.includes("--apply"));
    await browser.close();
  },

  // Bahan ajar: the library pages, then reusing a kosakata set in another bab.
  async library() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.2);
    mark("sidebar");
    await a.moveTo(page.getByText("Bahan ajar").first());
    await a.pause(1.2);
    await a.click(page.getByRole("link", { name: "Materi", exact: true }).first(), { after: 1.6 });
    await page.waitForLoadState("networkidle");
    mark("materi");
    await shot(page, "1-materi");
    await a.click(page.getByText("Belum digunakan", { exact: true }).first(), { after: 1.4 });
    await a.click(page.getByText("Semua materi", { exact: true }).first(), { after: 1.0 });
    await a.type(page.getByPlaceholder(/Cari judul atau deskripsi/), "Hangeul", { delay: 110, after: 1.5 });
    mark("kosakata");
    await a.click(page.getByRole("link", { name: "Kosakata", exact: true }).first(), { after: 1.6 });
    await page.waitForLoadState("networkidle");
    await shot(page, "2-kosakata");
    await a.pause(1.5);
    mark("tugas");
    await a.click(page.getByRole("link", { name: "Tugas", exact: true }).first(), { after: 1.6 });
    await page.waitForLoadState("networkidle");
    await shot(page, "3-tugas");
    await a.pause(1.5);
    mark("reuse");
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    await a.pause(1.0);
    await a.click(page.getByRole("button", { name: "Tambah learning item" }).nth(2), { after: 1.0 });
    const dlg = page.getByRole("dialog");
    await a.click(dlg.getByRole("button", { name: "Kosakata", exact: true }), { after: 0.8 });
    await a.click(dlg.locator("#item-resource"), { after: 1.2 });
    await shot(page, "4-picker");
    await a.click(page.getByRole("option", { name: /Kosakata Pekerjaan/ }).first(), { after: 1.0 });
    mark("add");
    await a.click(dlg.getByRole("button", { name: "Tambahkan item" }), { after: 2.2 });
    mark("reused");
    await shot(page, "5-reused");
    await rec?.stop("08-library");
    await saveAuth();
    await browser.close();
  },

  // Show items, "Belum siap", publish and unpublish, then switch progression to Bertahap.
  async publish() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    // setup (not recorded): a tugas without questions, so the "Belum siap" badge has something to explain
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    if (!(await page.getByText("Kuis Angka").count())) {
      await page.getByRole("button", { name: "Tambah learning item" }).nth(2).click();
      await page.getByRole("dialog").getByRole("button", { name: "Tugas", exact: true }).click();
      await page.getByRole("dialog").getByRole("link", { name: /Buat tugas/ }).click();
      await page.waitForURL(/assessments\/new/, { timeout: 30000 });
      await page.getByLabel("Judul tugas").fill("Kuis Angka");
      await page.waitForURL(/assessments\/(?!new)[^/]+$/, { timeout: 30000 });
      await page.waitForTimeout(2500);
      await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    }
    // reset (not recorded) so the stage can be repeated: progression back to Terbuka, course unpublished
    const progress = page.locator("button[role=combobox]").first();
    if (/Bertahap/.test((await progress.textContent()) ?? "")) {
      await progress.click();
      await page.getByRole("option", { name: "Terbuka" }).click();
      await page.waitForTimeout(2000);
    }
    await page.goto(C(), { waitUntil: "networkidle" });
    if (await page.getByRole("button", { name: /Batalkan publikasi/ }).count()) {
      await page.getByRole("button", { name: /Batalkan publikasi/ }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: /Batalkan publikasi/ }).click();
      await page.waitForTimeout(2500);
    }
    await page.goto(`${C()}/kurikulum`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.5);
    mark("overview");
    await shot(page, "1-overview");
    await a.moveTo(page.locator("span", { hasText: /disembunyikan/ }).first().locator(".."));
    await a.pause(1.4);
    mark("not-ready");
    await a.click(page.getByRole("button", { name: /Belum siap/ }).first(), { after: 1.6 });
    await shot(page, "2-popover");
    await a.pause(1.8);
    await page.keyboard.press("Escape");
    await a.pause(0.6);
    mark("show");
    const switches = page.locator('[role="switch"][aria-label$="item"]'); // label flips between Tampilkan/Sembunyikan
    const total = await switches.count();
    for (let i = 0; i < total; i++) {
      const sw = switches.nth(i);
      if ((await sw.getAttribute("aria-disabled")) === "true" || (await sw.isDisabled().catch(() => false))) continue;
      // text of the item's own row: climb until the parent holds more than one switch
      const rowText = await sw.evaluate((el) => {
        let row = el;
        while (row.parentElement && row.parentElement.querySelectorAll('[role="switch"]').length === 1) row = row.parentElement;
        return row.textContent ?? "";
      });
      if (/Hal\. \d|PDF/.test(rowText)) continue; // leave PDF lessons hidden
      await a.click(sw, { after: 1.1 });
    }
    await shot(page, "3-shown");
    mark("publish");
    await a.click(page.getByRole("link", { name: /Workspace course/ }).first());
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    await a.click(page.getByRole("button", { name: /^Publikasikan$/ }).first(), { after: 1.5 });
    mark("dialog");
    await page.getByText("Akan tayang").first().waitFor({ timeout: 30000 });
    await a.pause(2.5);
    await shot(page, "4-dialog");
    await a.moveTo(page.getByText("Belum siap").first());
    await a.pause(2.0);
    mark("confirm");
    await a.click(page.getByRole("dialog").getByRole("button", { name: /^Publikasikan$/ }), { after: 2.2 });
    mark("published");
    await shot(page, "5-published");
    await a.click(page.getByRole("button", { name: /Batalkan publikasi/ }).first(), { after: 1.6 });
    mark("unpublish");
    await shot(page, "6-unpublish");
    await a.pause(1.8);
    await a.click(page.getByRole("alertdialog").getByRole("button", { name: "Batal", exact: true }), { after: 1.0 });
    mark("progression");
    await a.click(page.getByRole("link", { name: "Edit kurikulum" }).first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.0);
    await a.click(page.locator("button[role=combobox]").first(), { after: 1.0 });
    await a.click(page.getByRole("option", { name: "Bertahap" }), { after: 2.0 });
    mark("bertahap");
    await shot(page, "7-bertahap");
    await rec?.stop("09-publish");
    await saveAuth();
    await browser.close();
  },

  // What the murid sees: enrol the learner (setup), then record the learner's course page.
  async learner() {
    const owner = await session("owner");
    const oa = actor(owner.page);
    await owner.page.goto(`${C()}?view=learners`, { waitUntil: "networkidle" });
    await oa.pause(1.0);
    await owner.page.getByRole("button", { name: /Tambah siswa/ }).first().click();
    await owner.page.waitForTimeout(800);
    await owner.page.getByRole("dialog").getByRole("textbox").first().fill(state.learnerEmail);
    await owner.page.getByRole("dialog").getByRole("button", { name: /Tambah siswa/ }).click();
    await owner.page.waitForTimeout(2500);
    await owner.browser.close();
    const { browser, page, saveAuth } = await session("learner", { scale: 1 }); // lighter than 1.5x: the 1.5x renderer stalled on this VPS
    const a = actor(page);
    await page.goto(`${BASE}/learn/${state.courseId}`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page, { scale: 1 });
    const mark = (n) => { console.log(`  mark ${n} (+${((Date.now() - T0) / 1000).toFixed(0)}s)`); rec?.mark(n); };
    await a.pause(1.8);
    mark("outline");
    await shot(page, "1-outline");
    await a.moveTo(page.getByText("Terkunci").first());
    await a.pause(2.0);
    mark("open");
    // the "Mulai/Lanjutkan belajar" card leads to the next activity (a repeat run starts further along)
    // The course page alone tells the story (the lesson pages freeze the screen recorder, so they are not opened):
    // finished materi, the next activity, and the bab that stays locked.
    await hover(page, "^Selesai$|Materi · Selesai|Selesai");
    await a.pause(2.2);
    mark("reading");
    await a.pause(2.2);
    mark("finish");
    await hover(page, "^Terkunci$", { move: false }); // moving the mouse onto the locked label stalls the recorder
    await a.pause(2.6);
    mark("progress");
    await rec?.stop("10-learner");
    await saveAuth();
    await browser.close();
  },
};

if (!stages[stage]) {
  console.log("stages:", Object.keys(stages).join(", "));
  process.exit(1);
}
try {
  await stages[stage]();
  console.log("state:", JSON.stringify(state));
} catch (error) {
  console.error("FAILED:", error.message.split("\n").slice(0, 3).join(" | "));
  if (current) {
    await current.page.screenshot({ path: join(DEBUG, `k-${stage}-FAILED.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
    console.error("url:", current.page.url());
    await current.browser.close();
  }
  process.exit(1);
}
