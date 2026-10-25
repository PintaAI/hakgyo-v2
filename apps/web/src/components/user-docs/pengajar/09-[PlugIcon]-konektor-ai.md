# Hubungkan Claude/ChatGPT

Anda bisa menyambungkan akun Hakgyo ke Claude atau ChatGPT. Setelah tersambung, Anda cukup meminta dalam bahasa sehari-hari, misalnya "buatkan materi perkenalan diri untuk Bab 2", dan AI langsung mengerjakannya di Hakgyo atas nama Anda.

AI hanya bisa melakukan apa yang memang boleh Anda lakukan sendiri. Jika peran Anda tidak boleh mengubah sesuatu, AI juga tidak bisa.

## Apa yang bisa dibantu AI

Beberapa contoh permintaan:

- **Menyusun kurikulum:** "Buat kurikulum Bahasa Korea Dasar dengan 8 bab, lalu isi tiap bab dengan satu materi dan satu tugas."
- **Menulis materi:** "Tulis materi tentang partikel 은/는 dengan contoh percakapan."
- **Membuat kosakata:** "Buat 20 kosakata tentang makanan beserta arti dan contoh kalimat." Jika sebuah kata punya beberapa arti, AI bisa menyimpan semuanya, misalnya "Tambahkan 배 dengan arti perut, kapal, dan buah pir."
- **Membuat soal tugas:** "Buat 10 soal pilihan tunggal (satu jawaban benar) untuk menguji materi Bab 3."
- **Mengatur kelas:** "Buat Kelas Malam November dengan kapasitas 15 murid." atau "Jadwalkan pertemuan Zoom setiap Sabtu pukul 10.00."
- **Membantu review:** "Tunjukkan jawaban tertulis yang belum saya nilai." AI akan menunjukkan usulan nilai dan meminta persetujuan Anda sebelum menyimpan.
- **Mendesain landing page:** lihat [Landing Page dengan AI](/docs/pengajar/landing-page).

## Yang tidak bisa dilakukan AI

Agar aman, AI sengaja dibatasi:

- Tidak bisa menghapus apa pun.
- Tidak bisa mengunggah file atau gambar. Unggah sendiri dari Hakgyo, lalu minta AI memakainya.
- Tidak bisa melihat kata sandi, tautan undangan rahasia, atau tautan Zoom.
- Tidak bisa mengerjakan tugas atas nama murid.
- Tidak bisa menerbitkan landing page. Tombol **Publikasikan** hanya ada di Hakgyo.
- Tidak bisa mengubah organisasi yang bukan milik Anda.

## Sebelum mulai

- Anda punya akun Hakgyo dan sudah bisa masuk.
- Anda punya akun Claude atau ChatGPT. Fitur menyambungkan aplikasi luar bisa berbeda per paket langganan, jadi periksa paket Anda jika menunya tidak muncul.
- Pakai versi terbaru Claude atau ChatGPT.

## Langkah 1: Salin alamat sambungan Hakgyo

Alamat ini dipakai Claude atau ChatGPT untuk menemukan Hakgyo. Alamatnya selalu sama untuk semua pengguna. Salin alamat ini:

```text
https://hakgyo.id/api/mcp
```

Pemilik dan admin juga bisa menyalinnya dari **Pengaturan**, tab **MCP Server**, bagian **Endpoint**. MCP adalah nama teknis untuk sambungan AI; Anda tidak perlu memahaminya.

## Langkah 2: Tambahkan Hakgyo di Claude

1. Buka Claude (situs claude.ai atau aplikasi desktop).
2. Buka **Settings**, lalu **Connectors**.
3. Pilih **Add custom connector**.
4. Isi nama, misalnya `Hakgyo`, lalu tempel alamat dari Langkah 1.
5. Klik **Add**, lalu **Connect**.
6. Lanjut ke [Langkah 4](#langkah-4-masuk-dan-beri-izin).

> Nama menu di Claude bisa sedikit berbeda karena Claude terus diperbarui. Cari menu yang berhubungan dengan "Connectors".

## Langkah 3: Tambahkan Hakgyo di ChatGPT

1. Buka ChatGPT, lalu **Settings**.
2. Buka **Apps & Connectors**.
3. Jika Hakgyo tersedia di daftar aplikasi, pilih **Hakgyo**, lalu **Connect**.
4. Jika tidak ada, buka **Advanced settings**, lalu aktifkan **Developer mode**. Ini aman; mode ini hanya membuka menu untuk menambah konektor (sambungan aplikasi) sendiri. Buat konektor baru dan tempel alamat dari Langkah 1. Jika diminta memilih cara masuk (*Authentication*), pilih **OAuth**, artinya Anda akan masuk lewat halaman Hakgyo.
5. Lanjut ke [Langkah 4](#langkah-4-masuk-dan-beri-izin).

> Nama menu di ChatGPT bisa sedikit berbeda karena ChatGPT terus diperbarui.

## Langkah 4: Masuk dan beri izin

1. Halaman masuk Hakgyo terbuka. Masuk dengan akun Hakgyo Anda.
2. Muncul layar **Hubungkan** dengan nama aplikasi AI.
3. Baca penjelasannya, lalu klik **Izinkan**. Klik **Tolak** jika Anda berubah pikiran.
4. Anda kembali ke Claude atau ChatGPT. Sambungan siap dipakai.

Layar izin menampilkan beberapa kode teknis, misalnya `openid` atau `hakgyo:mcp`. Itu wajar. Artinya AI boleh mengenali akun Anda dan memakai Hakgyo sesuai peran Anda.

> Jika setelah masuk Anda tidak melihat layar **Hubungkan**, kembali ke Claude atau ChatGPT lalu klik **Connect** sekali lagi.

## Langkah 5: Mulai meminta

1. Di percakapan baru, pastikan sambungan Hakgyo aktif. Biasanya ada di menu alat atau ikon colokan di kolom chat.
2. Tulis permintaan Anda. Sebutkan nama organisasi atau kurikulum agar AI tidak salah tempat, misalnya "Di kurikulum Bahasa Korea Dasar 1, tambahkan materi...".
3. Periksa hasilnya di Hakgyo. Kurikulum baru dibuat dalam keadaan **Belum dipublikasikan**, dan item baru bisa tersembunyi, jadi murid belum melihatnya sampai Anda menampilkannya.

> **Tips:** untuk langkah yang berdampak besar, misalnya menerbitkan kurikulum atau mengubah peran anggota, AI akan meminta konfirmasi Anda dulu. Baca ringkasannya sebelum menjawab "ya".

## Melihat dan memutus sambungan

Pemilik dan admin bisa melihat aplikasi AI yang tersambung ke akun mereka:

1. Buka **Pengaturan**, lalu tab **MCP Server**.
2. Lihat bagian **Aplikasi terotorisasi**. Setiap aplikasi menampilkan nama dan tanggal disambungkan.
3. Untuk memutus, klik **Cabut akses**, lalu konfirmasi dengan **Cabut akses**.

Setelah dicabut, AI tidak bisa lagi memakai akun Anda. Untuk menyambung kembali, ulangi dari Langkah 2.

Daftar ini hanya menampilkan sambungan milik akun Anda sendiri, bukan milik anggota lain.

## Siapa yang bisa

| Kegiatan | Pemilik | Admin | Pengajar |
|---|---|---|---|
| Menyambungkan Claude/ChatGPT | Ya | Ya | Ya |
| Melihat alamat di menu Pengaturan | Ya | Ya | Tidak* |
| Melihat dan mencabut sambungan di Hakgyo | Ya | Ya | Tidak |
| Mendesain landing page lewat AI | Ya | Tidak | Tidak |

\* Pengajar memakai alamat di Langkah 1.

Apa yang bisa diubah AI selalu mengikuti peran Anda. Lihat [Peran dan Akses](/docs/pengajar/peran-akses).

## Jika ada masalah

- **Menu konektor tidak ada di Claude/ChatGPT:** fitur ini bergantung pada paket langganan Anda. Jika akun Anda dikelola kantor, tanyakan ke pengelolanya.
- **AI menjawab bahwa Anda tidak punya izin:** peran Anda memang tidak boleh melakukan hal itu. Minta pemilik organisasi mengerjakannya atau mengubah peran Anda.
- **AI membalas dengan pesan bahasa Inggris dari Hakgyo:** pesan kesalahan dari sistem memang masih berbahasa Inggris. Minta AI menjelaskan artinya, atau coba lagi dengan permintaan yang lebih jelas.
- **Sambungan tiba-tiba berhenti:** pemilik dan admin bisa mencabut akses di **Pengaturan**, tab **MCP Server**, lalu menyambungkan ulang. Pengajar bisa memutus konektor Hakgyo dari pengaturan Claude atau ChatGPT, lalu mengulang dari Langkah 2.
