# Konten Hakgyo

Folder ini menyimpan semua bahan content creation Hakgyo: konsep seri, naskah, storyboard, karakter, dan status produksi video. Isinya teks, bukan kode, dan tidak terikat ke tool tertentu: storyboard di sini bisa dikerjakan di editor video apa pun.

**Agent: baca file ini dulu**, lalu README seri yang dikerjakan, baru file episodenya.

## Struktur

```text
content/
  README.md                 Index ini: aturan umum, alur produksi, daftar seri
  <seri>/
    README.md               "Bible" seri: premis, karakter, sistem visual, audio, daftar episode
    epNN-<slug>.md          Satu episode lengkap: storyboard, naskah VO, karakter, kalimat Korea, posting
```

Satu folder untuk satu seri dan satu file markdown untuk satu episode. Nama file `ep01-...`, `ep02-...` supaya urut.

## Daftar seri

| Seri | Folder | Format | Isi | Status |
|---|---|---|---|---|
| Padahal | [`padahal/`](padahal/README.md) | 6 × short 60 detik, 9:16 | Bab "Padahal" kursus Indonesia → Korea | Naskah draf, Korea belum dicek |

## Sumber kebenaran

- **Isi pelajaran** datang dari materi di aplikasi, bukan dikarang ulang. Kursus Pola Bahasa (`pb-indo-korea`, `pb-korea-indo`) ada di database, dan sumber impornya di `apps/web/scripts/pola-bahasa/` (gaya tulisan: `STYLE.md`, latar: `docs/pola-bahasa.md`).
- Database di `apps/web/.env` berisi data live. Untuk riset konten, **query read-only saja** (SELECT).
- Di setiap episode, semua kalimat Korea dicatat di tabel "Kalimat Korea" beserta sumbernya: id materi, atau "rakitan" kalau dibuat untuk video. **Founder harus mengecek semua kalimat Korea sebelum VO direkam atau video dibuat.**

## Alur produksi

1. **Naskah:** tulis atau ubah file episode di sini.
2. **Cek Korea:** founder mencentang kolom "Cek" di tabel kalimat Korea.
3. **VO:** rekam atau buat dengan TTS dari bagian "Naskah VO" di file episode.
4. **Edit:** susun video sesuai storyboard, di tool apa saja.
5. **Publish:** video dikirim dalam keadaan siap posting. Teks cover, caption, dan tagar ada di bagian "Posting" tiap episode.
6. **Update status** di tabel episode README seri dan di header file episode.

## Aturan umum video

- **Tampilan editorial:** premium dan kalem, monokrom di atas latar off-white, satu warna aksen. Tanpa camera shake, confetti, stempel, lampu, neon, atau efek pantul (overshoot). Kreatif lewat komposisi dan gerak, bukan lewat properti gimmick.
- **Teks layar mengikuti VO.** Yang tertulis di layar sama dengan yang sedang diucapkan. Setiap kali naskah berubah, cek ulang semua scene.
- **Area aman 9:16:** semua isi berada di x 60–940, y 250–1440 dari 1080×1920. Sisanya tertutup UI TikTok, Reels, dan Shorts.
- **Ada perubahan visual sekitar tiap 3 detik.** Gerakan kamera tetap tenang: framing ditahan minimal 3 detik dan zoom kecil saja.
- **Short bahasa:** selalu ditutup dengan CTA **Follow**. SFX yang umum dipakai (whoosh, pop, ding, buzzer) dipasang pelan, di potongan atau di kata yang ditandai.
- **TTS:** VoxCPM2 boleh dipakai untuk konten komersial Hakgyo. VoiceStudio dan OmniVoice tidak boleh, karena bobotnya non-komersial.
- **Durasi dan tempo:** waktu di storyboard hanya perkiraan. Panjang sebenarnya ditentukan oleh VO. Tempo VO TTS normal terasa lambat untuk short, dan untuk Ep 1 Padahal founder memilih versi yang dipercepat 1,5×. Kalau masih kepanjangan, pendekkan naskahnya.

## Status

Dipakai di header episode dan di tabel README seri:

`Naskah` → `Cek Korea` → `VO` → `Edit` → `Publish`. Tandai tiap langkah dengan ✅ (selesai), 🟡 (sedang dikerjakan), atau ⬜ (belum).

## Template episode

Salin struktur file episode yang sudah ada (misalnya `padahal/ep01-satu-kata.md`). Bagian wajibnya:

1. Header: seri, nomor, durasi, pola, materi sumber, ubin baru, status
2. Tujuan (satu kalimat: setelah menonton, penonton bisa apa)
3. Rantai: masalah → percobaan → perbaikan → cliffhanger
4. Karakter di episode ini
5. Storyboard per scene: waktu, setting, visual, teks layar, VO, SFX, transisi
6. Naskah VO (`[ID]` untuk narator, `[KO]` untuk suara Korea)
7. Kalimat Korea (kalimat, cara baca, arti, sumber, cek)
8. Posting (teks cover, caption, tagar)
9. Catatan produksi
