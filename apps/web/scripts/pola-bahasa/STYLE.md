# Panduan menulis kurikulum Pola Bahasa

Dua kursus milik sistem Hakgyo yang saling bertautan:

- **Korea → Indo: Paham Pola** (`ki-*`): mulai dari pola Korea, pahami artinya lewat bahasa Indonesia.
- **Indo → Korea: Berani Ngomong** (`ik-*`): mulai dari kata yang biasa diucapkan orang Indonesia, cari cara bilangnya dalam bahasa Korea.

Kerangka materi dan bagian ada di `manifest.ts`. Sumber isi dan contoh awal ada di `/home/dev/hakgyo-docs/kurikulum/` (`korea-indo.md`, `indo-korea.md`, `README.md`). Pakai itu sebagai titik awal, lalu kembangkan jauh lebih detail.

## Pembaca

Orang Indonesia umur 17–30-an: calon pekerja EPS di LPK, mahasiswa, penggemar drakor dan K-pop. Mereka tahu Hangeul dan partikel dasar (은/는, 이/가, 을/를, 에/에서, -아요/어요), tapi kaku waktu ngomong.

## Gaya bahasa: Gen Z, tapi jelas

- Pakai **aku–kamu**. Kalimat pendek. Satu ide per kalimat.
- Nada santai seperti kakak tingkat yang jago bahasa Korea dan lagi jelasin ke adik kelas, bukan dosen.
- Boleh pakai kata Gen Z secukupnya, maksimal 1–2 per bagian supaya tidak cringe: _literally, jujurly, relate, auto, vibes, red flag, green flag, no debat, gas, santuy, ngab, bestie, healing, salting, overthinking, plot twist, kuy, btw, valid_.
- Emoji boleh, tapi jarang: paling banyak satu, dan hanya di callout.
- Jangan pernah mengorbankan kejelasan demi gaya. Istilah tata bahasa (kata kerja, akhiran, konjugasi) boleh dipakai, tapi langsung dijelaskan dengan bahasa sehari-hari.
- Jangan pakai penjelasan berbasis bahasa Inggris (_"like 'because' in English"_). Jembatannya selalu bahasa Indonesia: _kan, sih, soalnya, nah, ngoko/krama, di-/ter-, -kan_.

## Contoh kalimat

- Korea harus **natural dan benar**, seperti yang diucapkan orang Korea betulan. Kalau ragu, pilih kalimat yang lebih sederhana. Pendiri Hakgyo meninjau semua bahasa Korea sebelum tayang.
- Setiap contoh punya terjemahan Indonesia yang santai (_"Aku udah makan, tapi masih laper"_), bukan terjemahan kaku.
- Situasinya dekat dengan kehidupan pembaca: kerja di pabrik atau kebun di Korea (사장님, 반장님), part-time di 편의점, kampus, kafe, chat sama bestie Korea, nonton drakor, naik subway, makan halal, salat dan puasa, kirim uang ke rumah.
- Tulis versi sopan (-요) dulu. Tambahkan versi 반말 kalau polanya sering dipakai santai.

## Isi satu bagian pola (kurikulum `ki-*`)

Urutan yang disarankan. Bagian yang terlalu kecil boleh lebih ringkas.

1. `grammar({...})`: kartu pola.
   - `descriptionKo`: satu kalimat Korea sederhana.
   - `descriptionTranslation`: penjelasan utama dalam bahasa Indonesia Gen Z, 2–4 kalimat.
   - `rules`: cara menempel (akhiran vokal, akhiran konsonan, 하다, bentuk lampau, kata sifat dan kata kerja kalau beda).
   - `examples`: 3–5 contoh, dengan `emphasis` berisi bagian polanya.
   - `tipKo` dan `tipTranslation` (opsional).
2. `p(...)` "Artinya apa sih?": jembatan ke bahasa Indonesia.
3. `h3("Contoh")` lalu 4–6 `ex(korea, indonesia)`, atau `chat([...])` untuk obrolan pendek.
4. `callout("warning", ...)`: jebakan khas orang Indonesia. Wajib kalau memang ada.
5. Perbandingan dengan pola yang mirip, sambil menautkan pola itu dengan `ref(...)`. Contoh: -아서 vs -(으)니까, -는데 vs -지만.
6. `callout("tip", ...)` atau `p(...)` berisi tautan ke kurikulum seberang: _"Mau langsung praktik ngomong? Cek "_ + `ref("padahal", "ik-padahal")`.
7. Opsional `h3("Coba bikin sendiri")`: 1–2 soal kecil, jawabannya di `callout("success", ...)`.

Kata keterangan (`ki-kata-kecil`) tidak perlu kartu `grammar`. Cukup penjelasan, contoh, dan jebakan.

## Isi satu bagian kata (kurikulum `ik-*`)

Formatnya **maksud → pilihan bahasa Korea → nuansa → jebakan**. Lihat entri _padahal_ di `indo-korea.md` sebagai contoh lengkap.

1. Pembuka: kalimat Indonesia yang sering diucapkan, lalu "Gimana bilangnya?"
2. Untuk setiap maksud kata itu: `h3` dengan nama maksudnya, lalu `table([...])` atau beberapa `ex(...)` berisi pilihan bahasa Korea dan nuansanya. Setiap pola Korea **ditautkan** ke bagiannya di kurikulum `ki-*` dengan `ref(...)`.
3. Jebakan (`callout("warning", ...)`), terutama soal urutan kata dan kata yang maknanya ganda.
4. Contoh obrolan nyata dengan `chat([...])`.
5. Opsional "Coba bikin sendiri".

## Tautan

- Gunakan `ref(teks, materialKey, sectionKey)`. Kuncinya harus ada di `manifest.ts`. TypeScript dan importer akan menolak kunci yang salah.
- Setiap bagian `ki-*` sebaiknya menautkan bagian `ik-*` yang memakai pola itu (lihat kolom "Indo → Korea" di `korea-indo.md`). Setiap pola Korea di bagian `ik-*` harus menautkan bagiannya di `ki-*`.
- Tautan juga boleh dipakai di dalam materi yang sama untuk membandingkan pola.

## Blok yang tersedia

- `p`, `h3`, `bullet`, `numbered`, `quote`, `divider`, `table`, `callout`, `ex`: teks biasa.
- `grammar({...})`: kartu pola.
- `opener({...})`: pembuka materi (blok `lessonPage`, tanpa gambar). **Wajib jadi blok pertama di `intro`.** Isinya judul Korea, subjudul Indonesia, obrolan pembuka (tanya–jawab), tiga kartu fokus, dan dua tujuan belajar.
- `...chat(lines, { questions?, tip?, theme? })`: satu blok obrolan (`conversation`). Paling banyak 16 baris dan 8 pertanyaan. Selalu di-spread.
- `culture({...})`: artikel budaya/etika dua bahasa (blok `culture`, tanpa banner). Setiap paragraf wajib punya teks Korea dan Indonesia. `checklist` opsional.
- `quizRef()`: menyematkan kuis materi ini. Taruh di `outro`, tepat satu kali, dan hanya kalau materinya punya `quiz`.

## Kuis

`quiz: { title, description, passingScore?, questions }` di `defineMaterial`. Isinya 5–15 soal. Setiap soal punya `key` kebab-case yang unik dan **tidak boleh diganti** setelah tayang (jawaban murid menempel di situ), `prompt`, 3–4 `options` dengan tepat satu `correct: true`, dan `explanation` yang menjelaskan kenapa jawabannya benar. Nilai lulus bawaan 70. Importer membuat kuisnya sebagai tugas yang muncul tepat setelah materi di modul yang sama.

## Teknis

- Satu file per materi: `content/<material-key>.ts` berisi `export default defineMaterial({ key, title, description, intro, sections, outro })`.
- `sections` harus persis sama dan berurutan seperti di `manifest.ts`. Judul bagian ada di `title`, dan heading-nya dibuat otomatis oleh importer, jadi jangan tambahkan heading level 2 sendiri.
- Kartu `grammar` paling banyak 12 baris aturan dan 12 contoh. Prop-nya berupa string biasa, jadi tautan tidak bisa dipasang di dalam kartu. Taruh tautan di paragraf, list, callout, atau tabel.
