// Records the demo's screen clips against the shared dev server.
// Usage: bun record.mjs <stage> [--dry]   (state is kept in state.json)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BASE, actor, launch, record } from "./lib/recorder.mjs";

process.chdir(import.meta.dir);
mkdirSync("clips", { recursive: true });
const DEBUG = join(tmpdir(), "promo-video-debug");
mkdirSync(DEBUG, { recursive: true });
const STATE = "state.json";
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 1));
const stage = process.argv[2];
const dry = process.argv.includes("--dry");

const OWNER = { name: "Rina Kusuma", email: state.ownerEmail ?? `rina.${Date.now().toString(36).slice(-4)}@annyeongclass.id`, password: "Annyeong123!" };
const LEARNER = { name: "Dimas Pratama", email: state.learnerEmail ?? `dimas.${Date.now().toString(36).slice(-4)}@gmail.test`, password: "Belajar123!" };
const ORG = "Annyeong Korean Class";
const COURSE = { title: "Persiapan EPS-TOPIK", desc: "Kurikulum persiapan ujian EPS-TOPIK untuk calon pekerja ke Korea: hangeul, kosakata kerja, dan latihan soal." };
const COHORT = { name: "Kelas Intensif Oktober 2026", desc: "Kelas online 8 minggu dengan pertemuan Zoom dua kali seminggu.", capacity: "25", start: "2026-10-12", end: "2026-12-07" };

async function shot(page, name) {
  await page.screenshot({ path: join(DEBUG, `${stage}-${name}.jpg`), type: "jpeg", quality: 60 });
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

const stages = {
  // Sign up, pick "Buat organization" on onboarding, create the workspace.
  async org() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    await page.goto(BASE + "/auth?mode=sign-up", { waitUntil: "networkidle" });
    await shot(page, "1-auth");
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("signup");
    await a.type(page.getByPlaceholder("Nama Anda"), OWNER.name);
    await a.type(page.getByPlaceholder("nama@email.com"), OWNER.email, { delay: 35 });
    await a.type(page.getByPlaceholder("Minimal 8 karakter"), OWNER.password, { delay: 40 });
    mark("signup-submit");
    await a.click(page.locator("form").getByRole("button", { name: "Buat akun" }));
    state.ownerEmail = OWNER.email; save();
    // New accounts start in the learner area (they are auto-enrolled in Hangeul Mastery).
    await page.waitForURL(/\/learn/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("learn-landing");
    await shot(page, "2-learn");
    await a.click(page.getByText(OWNER.email.slice(0, 8)).first(), { after: 0.9 });
    mark("menu");
    await a.click(page.getByRole("menuitem", { name: "Buat organization" }));
    await page.waitForURL(/organizations\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1);
    mark("org-form");
    await shot(page, "3-orgform");
    await a.type(page.getByPlaceholder("Hakgyo Academy"), ORG);
    await a.pause(0.4);
    mark("org-type");
    await a.moveTo(page.getByText("Private course", { exact: true }).first());
    await a.pause(1.2);
    await a.moveTo(page.getByText("Public course", { exact: true }).first());
    await a.pause(1.2);
    await a.click(page.getByText("Private course", { exact: true }).first());
    mark("org-submit");
    await a.click(page.getByRole("button", { name: "Buat organization" }));
    await page.waitForURL(/\/workspace\/[^/]+\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    state.orgSlug = page.url().match(/\/workspace\/([^/]+)\//)[1]; save();
    mark("dashboard");
    await a.pause(2.5);
    await shot(page, "4-dashboard");
    await rec?.stop("01-org");
    await saveAuth();
    await browser.close();
  },

  // Create the course (kurikulum), add bab and a kosakata set, then publish.
  async course() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const W = `${BASE}/workspace/${state.orgSlug}`;
    await page.goto(W + "/dashboard", { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("dashboard");
    await a.click(page.getByRole("link", { name: "Buat course" }).or(page.getByRole("button", { name: "Buat course" })).first());
    await page.waitForURL(/courses\/new/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1);
    mark("course-form");
    await shot(page, "1-form");
    await a.type(page.getByPlaceholder(/Bahasa Korea untuk Pemula/), COURSE.title);
    await a.type(page.getByLabel("Gambaran singkat"), COURSE.desc, { delay: 18 });
    mark("course-submit");
    await a.click(page.getByRole("button", { name: "Buat course" }).last());
    await page.waitForURL((u) => !u.pathname.endsWith("/new"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("course-list");
    await shot(page, "2-list");
    await a.click(page.getByRole("main").getByRole("link", { name: new RegExp(COURSE.title) }).first());
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    state.courseId = page.url().split("/").pop(); save();
    await a.pause(1.5);
    mark("course-overview");
    await shot(page, "3-overview");
    await a.click(page.getByRole("link", { name: "Edit kurikulum" }).first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("kurikulum");
    const babs = [
      ["Mengenal Hangeul", "Huruf, suku kata, dan cara membaca Hangeul."],
      ["Kosakata di Tempat Kerja", "Istilah sehari-hari di pabrik dan lokasi kerja."],
    ];
    for (const [i, [title, desc]] of babs.entries()) {
      mark(`bab-${i + 1}`);
      await a.click(page.getByRole("button", { name: i === 0 ? "Buat bab" : "Tambah bab" }).last(), { after: 0.6 });
      await a.type(page.locator("#module-title"), title);
      await a.type(page.locator("#module-description"), desc, { delay: 20 });
      await a.click(page.getByRole("dialog").locator('button[type="submit"]'), { after: 1.2 });
    }
    await shot(page, "4-babs");
    mark("item-dialog");
    await a.click(page.getByRole("button", { name: /Tambah learning item/ }).nth(1), { after: 0.8 });
    await shot(page, "5-itemdialog");
    for (const label of ["Materi", "Tugas", "Kosakata"]) {
      await a.click(page.getByRole("dialog").getByRole("button", { name: label, exact: true }), { after: 0.7 });
    }
    mark("vocab-create");
    await a.click(page.getByRole("dialog").getByRole("link", { name: /Buat set kosakata/ }));
    await page.waitForURL(/vocabulary\/new|vocabulary\//, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1);
    mark("vocab-editor");
    await shot(page, "6-vocab");
    await a.type(page.getByLabel("Judul set kosakata"), "Kosakata Pabrik");
    const words = [["공장", "pabrik"], ["안전", "keselamatan"], ["일하다", "bekerja"], ["기계", "mesin"]];
    for (const [term, def] of words) {
      await a.type(page.getByLabel("Istilah baru", { exact: true }), term, { delay: 90 });
      await a.type(page.getByLabel("Definisi istilah baru"), def, { after: 0.1 });
      await page.keyboard.press("Enter");
      await a.pause(0.6);
    }
    mark("vocab-done");
    await a.pause(1.5);
    await shot(page, "7-vocabdone");
    await a.click(page.getByLabel("Kembali").first());
    await page.waitForURL(/kurikulum$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("kurikulum-filled");
    await shot(page, "8-filled");
    await a.click(page.getByRole("link", { name: "Workspace course" }).first());
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1);
    mark("publish");
    await a.click(page.getByRole("button", { name: "Publikasikan" }).first(), { after: 1.2 });
    await shot(page, "9-publish");
    await a.click(page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: /Publikasikan/ }).last(), { after: 2 });
    mark("published");
    await shot(page, "10-published");
    await rec?.stop("02-course");
    await saveAuth();
    await browser.close();
  },

  // Show the kosakata item, then set the kurikulum's default price.
  async price() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const C = `${BASE}/workspace/${state.orgSlug}/courses/${state.courseId}`;
    await page.goto(C + "/kurikulum", { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("item-toggle");
    await a.click(page.locator('[role="switch"][aria-label="Tampilkan item"]').first(), { after: 1.5 });
    await shot(page, "1-shown");
    mark("to-settings");
    await a.click(page.getByRole("link", { name: "Workspace course" }).first());
    await page.waitForURL(/\/courses\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(0.8);
    await a.click(page.getByRole("tab", { name: /Pengaturan/ }), { after: 1.2 });
    mark("settings");
    await shot(page, "2-settings");
    await a.moveTo(page.locator("#settings-currency"));
    await a.pause(0.8);
    mark("price");
    await a.type(page.locator("#settings-price"), "350000", { delay: 120, after: 0.8 });
    mark("price-save");
    await a.click(page.getByRole("button", { name: "Simpan perubahan" }), { after: 2 });
    await shot(page, "3-saved");
    await rec?.stop("03-price");
    await saveAuth();
    await browser.close();
  },

  // Create a Group belajar from the kurikulum, open it and set it to "Dibuka".
  async cohort() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const C = `${BASE}/workspace/${state.orgSlug}/courses/${state.courseId}`;
    await page.goto(C, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("tab");
    await a.click(page.getByRole("tab", { name: /Group belajar/ }), { after: 1.2 });
    await shot(page, "1-tab");
    mark("dialog");
    await a.click(page.getByRole("button", { name: /Buat Group belajar/ }).first(), { after: 0.8 });
    await a.type(page.locator("#cohort-name"), COHORT.name);
    await a.type(page.locator("#cohort-description"), COHORT.desc, { delay: 18 });
    await a.type(page.locator("#cohort-capacity"), COHORT.capacity, { delay: 120 });
    // The date fields are popover calendars: open, page months, click the day.
    const pickDate = async (id, monthsAhead, day) => {
      await a.click(page.locator(`#${id}`), { after: 0.6 });
      const pop = page.locator('[data-slot="popover-content"]').last();
      for (let i = 0; i < monthsAhead; i++) {
        await a.click(pop.getByRole("button", { name: /next|berikut|selanjutnya/i }).first(), { after: 0.4 });
      }
      await a.click(pop.getByRole("grid").locator("button").filter({ hasText: new RegExp(`^${day}$`) }).first(), { after: 0.5 });
      // the calendar stays open; click the dialog heading to close it
      if (await pop.isVisible()) await a.click(page.getByRole("dialog").getByText("Buat Group belajar baru untuk course ini."), { after: 0.4 });
    };
    await pickDate("cohort-start", 0, 12);
    await pickDate("cohort-end", 2, 7);
    await a.pause(0.6);
    await shot(page, "2-dialog");
    mark("create");
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Buat Group belajar" }), { after: 1.5 });
    await shot(page, "3-created");
    mark("open");
    await a.click(page.getByRole("link", { name: new RegExp(COHORT.name) }).first());
    await page.waitForURL(/cohorts\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    state.cohortId = page.url().split("/").pop(); save();
    await a.pause(1.5);
    mark("overview");
    await shot(page, "4-overview");
    await a.moveTo(page.getByText("ikuti course").first());
    await a.pause(1.5);
    await a.click(page.getByRole("tab", { name: /Pengaturan/ }), { after: 1.2 });
    mark("settings");
    await shot(page, "5-settings");
    await a.moveTo(page.locator("#settings-cohort-price"));
    await a.pause(1.8);
    mark("status");
    await a.click(page.locator("#settings-cohort-status"), { after: 0.6 });
    await a.click(page.getByRole("option", { name: "Dibuka" }), { after: 0.6 });
    await a.moveTo(page.locator("#settings-cohort-enrollment"));
    await a.pause(1);
    mark("save");
    await a.click(page.getByRole("button", { name: "Simpan pengaturan" }), { after: 1.8 });
    await shot(page, "6-saved");
    await a.click(page.getByRole("tab", { name: /Ringkasan/ }), { after: 2 });
    mark("overview-open");
    await shot(page, "7-open");
    await rec?.stop("04-cohort");
    await saveAuth();
    await browser.close();
  },

  // Payment settings: upload the static QRIS and add a bank account.
  async payments() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const W = `${BASE}/workspace/${state.orgSlug}`;
    await page.goto(W + "/settings/general", { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("settings");
    await a.click(page.getByRole("link", { name: "Pembayaran", exact: true }).last());
    await page.waitForURL(/settings\/payments/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("payments");
    await shot(page, "1-payments");
    mark("qris-upload");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      a.click(page.getByRole("button", { name: "Unggah QRIS" }).first(), { after: 0.2 }),
    ]);
    await chooser.setFiles(process.cwd() + "/assets/qris.png");
    await page.getByText("ANNYEONG KOREAN CLASS").first().waitFor({ timeout: 30000 });
    await a.pause(1.5);
    mark("qris-done");
    await shot(page, "2-qris");
    await a.moveTo(page.getByText("ANNYEONG KOREAN CLASS").first());
    await a.pause(1.2);
    mark("bank");
    await a.click(page.getByRole("button", { name: "Tambah rekening" }).first(), { after: 0.8 });
    await a.click(page.locator("#bank-account-bank"), { after: 0.6 });
    await a.type(page.getByPlaceholder("Cari nama atau kode bank"), "BCA", { delay: 120, after: 0.6 });
    await a.click(page.getByRole("option", { name: /BCA/ }).first(), { after: 0.5 });
    await a.type(page.locator("#bank-account-number"), "1234567890", { delay: 80 });
    await a.type(page.locator("#bank-account-holder"), "ANNYEONG KOREAN CLASS", { delay: 40 });
    await shot(page, "3-bankdialog");
    mark("bank-save");
    await a.click(page.getByRole("button", { name: "Simpan rekening" }), { after: 2 });
    mark("done");
    await shot(page, "4-done");
    await rec?.stop("05-payments");
    await saveAuth();
    await browser.close();
  },

  // Cohort "Siswa" tab: show manual add, then create and copy an invite link.
  async invite() {
    const { browser, context, page, saveAuth } = await session("owner");
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    const a = actor(page);
    const K = `${BASE}/workspace/${state.orgSlug}/courses/${state.courseId}/cohorts/${state.cohortId}`;
    await page.goto(K, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("tab");
    await a.click(page.getByRole("tab", { name: /Siswa/ }), { after: 1.2 });
    await shot(page, "1-siswa");
    mark("manual");
    await a.click(page.getByRole("button", { name: /Tambah siswa/ }).first(), { after: 0.8 });
    await a.moveTo(page.locator("#cohort-learner-email"));
    await a.pause(1.5);
    await shot(page, "2-manual");
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Batal" }), { after: 0.8 });
    mark("invite");
    await a.click(page.getByRole("button", { name: /Buat link invite/ }).first(), { after: 0.8 });
    await shot(page, "3-invitedialog");
    // a class link is shared with many learners, so turn off single use
    await a.click(page.getByRole("dialog").locator('[role="switch"][aria-label="Link sekali pakai"]'), { after: 0.6 });
    await a.type(page.getByRole("dialog").getByLabel("Maks. penggunaan"), "25", { delay: 120 });
    mark("invite-create");
    await a.click(page.getByRole("dialog").locator('button[type="submit"]'), { after: 1.5 });
    const path = (await page.getByRole("dialog").getByText(/\/invite\//).innerText()).trim();
    state.invitePath = path; save();
    mark("invite-ready");
    await shot(page, "4-ready");
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Salin link" }), { after: 1.5 });
    mark("invite-copied");
    await a.pause(1);
    await rec?.stop("06-invite");
    await saveAuth();
    await browser.close();
  },

  // Learner on a phone: open the invite, sign up, check out with QRIS, upload proof.
  async learner() {
    const M = { width: 390, height: 844, scale: 3, mobile: true };
    const { browser, page, saveAuth } = await session("learner", M);
    const a = actor(page);
    await page.goto(BASE + state.invitePath, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page, M);
    const mark = (n) => rec?.mark(n);
    await a.pause(1.5);
    mark("invite");
    await shot(page, "1-invite");
    await a.scroll(500);
    await a.pause(1);
    await a.scroll(-500);
    mark("signup");
    await a.click(page.getByRole("link", { name: /Buat akun atau masuk/ }).first());
    await page.waitForURL(/\/auth/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(0.8);
    await shot(page, "2-auth");
    await a.type(page.getByPlaceholder("Nama Anda"), LEARNER.name);
    await a.type(page.getByPlaceholder("nama@email.com"), LEARNER.email, { delay: 35 });
    await a.type(page.getByPlaceholder("Minimal 8 karakter"), LEARNER.password, { delay: 40 });
    await a.click(page.locator("form").getByRole("button", { name: "Buat akun" }));
    state.learnerEmail = LEARNER.email; save();
    await page.waitForURL(/\/invite\//, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.5);
    mark("invite-signed-in");
    await shot(page, "3-invite-in");
    await a.moveTo(page.getByText("Biaya").first());
    await a.pause(1.2);
    mark("to-checkout");
    await a.click(page.getByRole("link", { name: /Lanjut ke pembayaran/ }).first());
    await page.waitForURL(/\/learn\/checkout\//, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("checkout");
    await shot(page, "4-checkout");
    await a.click(page.locator("label").filter({ hasText: "Transfer bank" }).first(), { after: 0.8 });
    await a.click(page.locator("label").filter({ hasText: /^QRIS/ }).first(), { after: 0.8 });
    mark("checkout-submit");
    await a.click(page.getByRole("button", { name: /Lanjut ke pembayaran/ }));
    await page.waitForURL(/\/learn\/payments\//, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    state.paymentId = page.url().split("/").pop(); save();
    await a.pause(2);
    mark("payment");
    await shot(page, "5-payment");
    await a.scroll(450);
    await a.pause(1.5);
    mark("qris");
    await shot(page, "6-qris");
    await a.scroll(700);
    await a.pause(1);
    mark("proof");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      a.click(page.getByRole("button", { name: /Pilih gambar bukti pembayaran/ }), { after: 0.2 }),
    ]);
    await chooser.setFiles(process.cwd() + "/assets/bukti-qris.png");
    await a.pause(0.8);
    await a.type(page.locator("#payment-payer-name"), "Dimas Pratama");
    await shot(page, "7-proof");
    mark("proof-submit");
    await a.click(page.getByRole("button", { name: "Saya sudah bayar" }), { after: 2.5 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await a.pause(2);
    mark("submitted");
    await shot(page, "8-submitted");
    await rec?.stop("07-learner");
    await saveAuth();
    await browser.close();
  },

  // Owner reviews the proof in the cohort "Pembayaran" tab and approves it.
  async verify() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const K = `${BASE}/workspace/${state.orgSlug}/courses/${state.courseId}/cohorts/${state.cohortId}`;
    await page.goto(K, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1.2);
    mark("overview");
    await shot(page, "1-overview");
    await a.click(page.getByRole("tab", { name: /Pembayaran/ }), { after: 1.5 });
    mark("payments");
    await shot(page, "2-list");
    await a.click(page.getByRole("button", { name: "Periksa" }).first(), { after: 1.5 });
    mark("detail");
    await shot(page, "3-detail");
    await a.moveTo(page.getByRole("dialog").getByRole("img").first());
    await a.pause(2);
    mark("approve");
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Setujui", exact: true }), { after: 1 });
    await shot(page, "4-confirm");
    await a.click(page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: "Setujui pembayaran" }).last(), { after: 2 });
    mark("approved");
    await shot(page, "5-approved");
    await page.keyboard.press("Escape");
    await a.pause(0.8);
    await a.click(page.getByRole("tab", { name: /Siswa/ }), { after: 2 });
    mark("learners");
    await shot(page, "6-learners");
    await a.pause(1.5);
    await rec?.stop("08-verify");
    await saveAuth();
    await browser.close();
  },

  // Learner sees the payment approved and starts learning.
  async paid() {
    const M = { width: 390, height: 844, scale: 3, mobile: true };
    const { browser, page, saveAuth } = await session("learner", M);
    const a = actor(page);
    await page.goto(`${BASE}/learn/payments/${state.paymentId}`, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page, M);
    const mark = (n) => rec?.mark(n);
    await a.pause(1.5);
    mark("paid");
    await shot(page, "1-paid");
    await a.moveTo(page.getByText("Mulai belajar").first());
    await a.pause(0.8);
    mark("start");
    await a.click(page.getByText("Mulai belajar").first());
    await page.waitForLoadState("networkidle");
    await a.pause(3);
    mark("handoff");
    await shot(page, "2-handoff");
    await rec?.stop("09-paid");
    await saveAuth();
    await browser.close();
  },

  // Other ways in, shown without submitting: course-wide invite and staff invite.
  async joins() {
    const { browser, page, saveAuth } = await session("owner");
    const a = actor(page);
    const C = `${BASE}/workspace/${state.orgSlug}/courses/${state.courseId}`;
    await page.goto(C, { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1);
    mark("course-siswa");
    await a.click(page.getByRole("tab", { name: /Siswa/ }), { after: 1.5 });
    await shot(page, "1-siswa");
    mark("mandiri");
    await a.moveTo(page.getByText("Belajar mandiri").first());
    await a.pause(2);
    mark("course-invite");
    await a.click(page.getByRole("button", { name: /Buat invite/ }).first(), { after: 1 });
    await a.click(page.locator("#invite-cohort"), { after: 0.8 });
    await shot(page, "2-target");
    await a.moveTo(page.getByRole("option", { name: "Seluruh course" }));
    await a.pause(1.2);
    await a.moveTo(page.getByRole("option").nth(1));
    await a.pause(1.2);
    await page.keyboard.press("Escape");
    await a.pause(0.4);
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Batal" }), { after: 0.8 });
    mark("members");
    await a.click(page.getByRole("link", { name: "Anggota", exact: true }).first());
    await page.waitForURL(/members/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1);
    await a.click(page.getByRole("button", { name: /Undang anggota/ }).first(), { after: 1 });
    await a.type(page.locator("#member-email"), "bima.pengajar@annyeongclass.id", { delay: 30 });
    await shot(page, "3-member");
    mark("member-role");
    await a.pause(1.5);
    await a.click(page.getByRole("dialog").getByRole("button", { name: "Batal" }), { after: 0.8 });
    await rec?.stop("10-joins");
    await saveAuth();
    await browser.close();
  },

  // The public catalog: a public course lists its open Group belajar with "Daftar".
  async catalog() {
    const { browser, page } = await launch();
    current = { browser, page };
    const a = actor(page);
    await page.goto(BASE + "/catalog", { waitUntil: "networkidle" });
    const rec = dry ? null : await record(page);
    const mark = (n) => rec?.mark(n);
    await a.pause(1.5);
    mark("catalog");
    await shot(page, "1-catalog");
    // the seeded public course has an open, public Group belajar
    let target = page.locator('a[href^="/catalog/"]').filter({ hasText: "Bahasa Korea Dasar" });
    if (!(await target.count())) {
      target = page.locator("article, li").filter({ hasText: "Bahasa Korea Dasar" }).locator('a[href^="/catalog/"]');
    }
    await a.click(target.first());
    await page.waitForURL(/catalog\/[^/]+/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await a.pause(1.2);
    mark("course");
    await shot(page, "2-course");
    await a.moveTo(page.getByText("Group belajar").first());
    await a.scroll(500);
    mark("cohorts");
    await a.moveTo(page.getByRole("link", { name: /Daftar/ }).or(page.getByRole("button", { name: /Daftar/ })).first());
    await a.pause(2);
    await shot(page, "3-daftar");
    await rec?.stop("11-catalog");
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
    await current.page.screenshot({ path: join(DEBUG, `${stage}-FAILED.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
    console.error("url:", current.page.url());
    await current.browser.close();
  }
  process.exit(1);
}
