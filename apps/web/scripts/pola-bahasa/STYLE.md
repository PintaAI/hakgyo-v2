# Panduan menulis kurikulum Pola Bahasa

Dua kursus milik sistem Hakgyo yang saling bertautan:

- **Korea → Indo: Paham Pola** (`ki-*`): mulai dari pola Korea, pahami artinya lewat bahasa Indonesia.
- **Indo → Korea: Berani Ngomong** (`ik-*`): mulai dari kata yang biasa diucapkan orang Indonesia, cari cara bilangnya dalam bahasa Korea.

## Struktur (wajib)

Kerangkanya ada di `manifest.ts` dan tidak boleh diubah:

- **Kursus → bab → satu materi per pola.**
- Judul materi diambil dari manifest dengan format `"그리고 • dan, terus · ★"`. Jangan menulis judul lagi di isi materi.
- **Setiap bab ditutup dengan:**
  - 1 **set kosakata**: setiap pola di bab itu menjadi satu entri berisi arti dan satu contoh kalimat;
  - 1 **kuis** berisi 8–12 soal untuk semua materi di bab itu.
- **Satu file per bab:** `content/<bab-key>.ts`, berisi `export default defineBab({ key, materials, vocabulary, quiz })`.

Isi versi lama (satu materi panjang berisi banyak pola) ada di `/home/dev/hakgyo-docs/kurikulum/content-v1/`. Pakai sebagai bahan, lalu **ringkas** ke template di bawah. Catatan awal ada di `/home/dev/hakgyo-docs/kurikulum/korea-indo.md` dan `indo-korea.md`.

## Template satu materi (pendek dan seragam, 2–3 menit baca)

Urutannya selalu sama, dan **setiap materi wajib dibuka dengan satu kartu `grammar({...})`** (custom block "Tata bahasa" di editor). Tidak ada pengecualian, termasuk untuk kata sambung, kata keterangan, dan kursus `ik-*`. Validator menolak materi tanpa kartu. Panjang maksimal sekitar 15 blok.

### 1. Kartu tata bahasa (wajib, blok pertama, tepat satu)

- `theme`: `"amber"` untuk semua materi `ki-*`, dan `"blue"` untuk semua materi `ik-*`.
- `number`: nomor urut materi di babnya, dua digit (`"01"`, `"02"`, …).
- `title`: pola atau kata yang dibahas.
  - `ki-*`: misalnya `"-는데 / -(으)ㄴ데"` atau `"그리고"`.
  - `ik-*`: kata Indonesia beserta bentuk Koreanya, misalnya `"padahal → -는데"`.
- `descriptionKo`: satu kalimat Korea sederhana tentang fungsi pola itu.
- `descriptionTranslation`: penjelasan utama dalam bahasa Indonesia, 2–3 kalimat pendek dan jelas.
- `rules`: 2–6 baris, karena di HP setiap baris tampil ringkas. Isi kolomnya tergantung jenis materi:

| Jenis                      | `condition` (Kalau)                                                       | `form` (Pakai)                                                | `example` (Contoh)   |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| Pola grammar `ki-*`        | kata kerja / sifat / benda, akhiran vokal / konsonan, lampau              | bentuknya                                                     | `먹다 → 먹는데`      |
| Kata `ki-*` (bab 1, 9, 10) | situasi atau posisi pakai, misalnya "Awal kalimat", "Ke atasan", "Santai" | bentuk atau variasinya, misalnya `그리고`, `근데`, `그런데요` | kalimat pendek       |
| 반말 `ki-banmal-*`         | ke siapa atau bentuk sopan                                                | bentuk santainya                                              | `먹어요 → 먹어`      |
| `ik-*`                     | maksud atau situasi, misalnya "Hasil nggak sesuai", "Ke 사장님", "Santai" | pola Korea yang dipakai                                       | kalimat Korea pendek |

- `examples`: 2–4 kalimat Korea natural, dengan `emphasis` berisi bagian polanya.
- `tipKo` dan `tipTranslation`: satu tip pendek. Boleh dikosongkan kalau jebakannya sudah ada di callout.

Isi kartu adalah string biasa, jadi tidak bisa memuat tautan.

### 2. Jembatan

- `ki-*`: `p(b("Artinya apa sih? "), ...)`, 1–3 kalimat yang menjelaskan lewat bahasa Indonesia (_kan, sih, nah, soalnya, ngoko/krama_).
- `ik-*`: `p(...)` berisi kalimat Indonesia yang sering diucapkan, lalu "Gimana bilangnya?". Setelah itu `p(...)` pendek yang menyebut pilihan polanya **dengan tautan** `ref(...)` ke materi `ki-*` masing-masing. Ini pengganti tabel lama; jangan pakai tabel lagi di `ik-*`.

### 3. Contoh

`h3("Contoh")`, lalu 3–5 `ex(korea, indonesia)`. Tulis versi sopan dulu, lalu versi 반말 kalau polanya sering dipakai santai. Di `ik-*`, kalau situasinya memang obrolan, boleh satu `...chat([...])` pendek (maksimal 6 baris).

### 4. Jebakan

Satu `callout("warning", ...)` berisi jebakan khas orang Indonesia. Hanya kalau memang ada.

### 5. Tautan

Satu `callout("tip", ...)`:

- `ki-*`: "Mau praktik ngomong? Cek …" ke materi `ik-*` yang memakai pola ini. Kalau perlu, tambahkan satu pembanding: "Bedanya sama …".
- `ik-*`: kata Indonesia lain yang maknanya bertetangga.

**Jangan dipakai di materi:** `opener()`, tabel, latihan "Coba bikin sendiri", heading level 2, atau lebih dari satu kartu grammar. `culture()` hanya boleh di `ki-banmal-kapan`, dan letaknya setelah kartu grammar. Latihan sudah ada di kuis bab.

## Set kosakata bab

- Satu entri per materi, dengan urutan yang sama seperti di manifest.
- `term`: pola atau kata Korea seperti di judul materi (misalnya `-는데`, `그리고`, `좀`).
  - Untuk `ik-*`, `term` diisi bentuk Korea utama (misalnya `-는데` untuk _padahal_).
- `meanings`: arti dalam bahasa Indonesia, yang paling pendek dulu.
- `example`: satu kalimat Korea yang natural, beserta terjemahan Indonesia yang santai.

## Kuis bab

- Berisi 8–12 soal `SINGLE_CHOICE`. Setiap soal punya 3–4 opsi dengan tepat satu `correct: true`.
- Setiap soal wajib punya `explanation` dalam gaya Gen Z.
- `key` harus unik dan stabil.
- Semua materi di bab sebaiknya kebagian minimal satu soal. Kalau babnya punya lebih dari 12 materi, pilih yang paling penting.

## Gaya bahasa: Gen Z, tapi jelas

- Pakai **aku–kamu**. Kalimat pendek, satu ide per kalimat.
- Kata Gen Z (_literally, jujurly, relate, auto, vibes, gas, santuy, bestie, salting, plot twist, btw, valid_) boleh dipakai, paling banyak 1 per materi.
- Jembatannya selalu bahasa Indonesia (_kan, sih, soalnya, nah, ngoko/krama, di-/ter-_), tidak pernah bahasa Inggris.
- Bahasa Korea harus natural dan benar. Kalau ragu, pilih kalimat yang lebih sederhana.
- Situasinya dekat dengan pembaca: kerja di Korea (사장님, 반장님), part-time di 편의점, kampus, chat sama bestie Korea, drakor, makanan halal, ibadah.
- Tulis versi sopan (-요) dulu. Tambahkan versi 반말 kalau polanya memang sering dipakai santai.

## Teknis

- `ref(teks, materialKey)` hanya menerima kunci yang ada di `manifest.ts`. TypeScript dan importer akan menolak kunci yang salah.
- Kartu `grammar` paling banyak 12 baris aturan dan 12 contoh. Prop kartu berupa string biasa, jadi tautan tidak bisa dipasang di dalamnya.
- Cek pekerjaanmu dengan `bun run --cwd apps/web pola:validate`.
