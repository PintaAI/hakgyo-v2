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

Urutannya selalu sama. Maksimal sekitar 15 blok.

**Kursus `ki-*` (pola Korea):**

1. `grammar({...})`: kartu pola.
   - `descriptionKo`: 1 kalimat Korea sederhana.
   - `descriptionTranslation`: penjelasan dalam bahasa Indonesia, 2–3 kalimat.
   - `rules`: cara menempel (akhiran vokal, akhiran konsonan, 하다, lampau), hanya kalau relevan.
   - `examples`: 2–3 contoh, dengan `emphasis` berisi bagian polanya.
   - Kata keterangan dan kata kecil (bab 9–10) tidak memakai kartu. Ganti dengan `callout("info", ...)` berisi arti dan cara pakainya.
2. `p(b("Artinya apa sih? "), ...)`: jembatan ke bahasa Indonesia, 1–3 kalimat.
3. `h3("Contoh")`, lalu 3–5 `ex(korea, indonesia)`.
4. `callout("warning", ...)`: **satu** jebakan khas orang Indonesia. Hanya kalau memang ada.
5. Satu baris tautan: `callout("tip", "Mau praktik ngomong? Cek ", ref("padahal", "ik-padahal-hasil"), ".")`, ke materi `ik-*` yang memakai pola ini. Kalau perlu, tambahkan satu pembanding: `"Bedanya sama ", ref("-지만", "ki-jiman"), ": ..."`.

**Kursus `ik-*` (kata Indonesia):**

1. `p(...)`: kalimat Indonesia yang sering diucapkan, lalu "Gimana bilangnya?"
2. `table([...])` berisi pilihan bahasa Korea. Kolomnya: **Korea | Nuansa**. Setiap pola Korea **ditautkan** ke materi `ki-*`-nya dengan `ref(...)`. Maksimal 2 kolom supaya muat di HP.
3. `h3("Contoh")`, lalu 3–4 `ex(...)`. Kalau situasinya memang obrolan, boleh satu `...chat([...])` pendek (maksimal 6 baris).
4. `callout("warning", ...)`: satu jebakan, misalnya urutan kata atau kata yang maknanya ganda.

**Jangan dipakai di materi:** `opener()`, `culture()`, latihan "Coba bikin sendiri", tabel 3 kolom, atau heading level 2. Latihan sudah ada di kuis bab.

Pengecualian: materi `ki-banmal-kapan` boleh memakai satu `culture({...})`.

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
