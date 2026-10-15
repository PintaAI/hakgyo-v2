# Landing Page dengan AI

Landing page adalah halaman depan lembaga Anda di internet, misalnya `hakgyo.id/nama-lembaga`. Di sini calon murid melihat profil lembaga, daftar kurikulum yang dibuka, dan tombol untuk mendaftar.

Anda tidak perlu bisa mendesain atau membuat kode. Claude atau ChatGPT yang mendesain halamannya, Anda tinggal memeriksa, merapikan teks, lalu menerbitkan.

## Sebelum mulai

- Hanya **pemilik** organisasi yang bisa mengelola landing page. Menu **Landing page** tidak muncul untuk admin dan pengajar.
- Hubungkan Claude atau ChatGPT ke Hakgyo lebih dulu. Ikuti [Hubungkan Claude/ChatGPT](/docs/pengajar/konektor-ai).
- Periksa alamat halaman Anda di **Pengaturan**, tab **Umum**, kolom **Slug**. Slug adalah bagian akhir alamat, misalnya `akademi-hangeul` pada `hakgyo.id/akademi-hangeul`. Gunakan huruf kecil, angka, dan tanda hubung.

## Langkah 1: Buka editor landing page

1. Di menu samping, pada bagian **Organisasi**, klik **Landing page**.
2. Editor terbuka. Jika ini pertama kali, Anda melihat template awal yang bisa langsung dipakai atau didesain ulang.

Bagian kiri adalah pratinjau halaman. Bagian kanan berisi tab **Teks**, **Desain dengan AI**, **Gambar**, dan **Riwayat**. Di ponsel, pratinjau ada di tab **Pratinjau** dan tab desain hanya bertuliskan **AI**.

## Langkah 2: Unggah foto (opsional)

AI tidak bisa mengambil gambar dari internet. Jika ingin memakai foto kelas, pengajar, atau suasana belajar, unggah dulu:

1. Buka tab **Gambar**.
2. Klik **Unggah gambar** dan pilih file JPEG, PNG, atau WebP berukuran maksimal 10 MB.
3. Muncul pesan **Gambar ditambahkan. AI sekarang bisa memakainya.**

## Langkah 3: Minta AI mendesain

1. Buka tab **Desain dengan AI**.
2. Di bagian **Kirim prompt ini**, klik tombol salin **Prompt**, yaitu teks perintah yang sudah disiapkan untuk AI. Teks ini sudah berisi nama dan kode organisasi Anda, jadi jangan diubah.
3. Buka Claude atau ChatGPT yang sudah tersambung, tempel prompt tersebut.
4. Tambahkan keinginan Anda di kalimat berikutnya, misalnya:
   - warna dan suasana: "nuansa hangat, warna biru dan krem";
   - fakta lembaga: alamat, nomor WhatsApp, jam belajar, testimoni murid.
5. Kirim. AI akan membaca aturan Hakgyo, membuat halaman, lalu menyimpannya sebagai draf.

> AI tidak akan mengarang alamat, nomor telepon, atau testimoni. Tuliskan sendiri fakta yang ingin ditampilkan.

## Langkah 4: Periksa hasilnya

1. Kembali ke editor Hakgyo. Pratinjau berganti sendiri dalam beberapa detik setelah AI selesai.
2. Gunakan tombol **Pratinjau desktop** dan **Pratinjau mobile** untuk melihat tampilan di komputer dan ponsel.
3. Kurang cocok? Minta revisi di percakapan yang sama, misalnya "perbesar foto utama" atau "pindahkan testimoni ke atas".

> **Penting:** jika Anda sedang mengubah teks dan AI mengirim versi baru, muncul pesan **Ada versi draft baru**. Tombol **Muat** akan membuang ketikan Anda yang belum disimpan. Simpan teks dulu sebelum menekan **Muat**.

## Langkah 5: Rapikan teks sendiri

Anda bisa mengubah tulisan tanpa bantuan AI:

1. Klik langsung tulisan di pratinjau, lalu ketik. Atau buka tab **Teks** dan ubah kolom per bagian, misalnya **Bagian pembuka**, **Tentang lembaga**, **FAQ**, atau **Kontak**.
2. Klik **Simpan teks**. Klik **Batal** untuk membuang perubahan.

Lewat editor Anda hanya bisa mengubah tulisan. Untuk mengubah tata letak, warna, gambar, atau tautan, minta ke AI.

## Langkah 6: Terbitkan

1. Klik **Publikasikan**. Muncul pesan **Landing page dipublikasikan.**
2. Klik **Lihat live** untuk membuka halaman publik Anda.
3. Bagikan alamatnya, misalnya di bio Instagram atau grup WhatsApp.

Perubahan dari AI atau editor disimpan sebagai draf dan tidak langsung tampil ke publik. Halaman publik baru berubah setiap kali Anda menekan **Publikasikan** lagi. Status di atas editor menunjukkan keadaannya:

| Status | Artinya |
|---|---|
| **Belum dipublikasikan** | Halaman belum bisa dilihat publik |
| **Live** | Halaman publik sama dengan draf terakhir |
| **Live · ada perubahan draft** | Ada perubahan yang belum diterbitkan |

## Kembali ke versi sebelumnya

Setiap kali AI atau Anda menyimpan, Hakgyo menyimpan satu versi. Hakgyo menyimpan 50 versi terakhir.

1. Buka tab **Riwayat**.
2. Klik salah satu versi untuk melihatnya.
3. Klik **Pulihkan** untuk menjadikannya draf, atau **Kembali ke draft** untuk batal.
4. Terbitkan ulang dengan **Publikasikan** jika ingin versi itu tampil ke publik.

## Menyembunyikan halaman

Klik **Nonaktifkan**, lalu konfirmasi. Halaman publik langsung hilang, tetapi draf dan riwayat tetap tersimpan. Anda bisa menerbitkannya lagi kapan saja.

## Kurikulum mana yang tampil

Daftar kurikulum di landing page diperbarui otomatis setiap kali halaman dibuka. Yang tampil hanya kurikulum yang:

- sudah **dipublikasikan**, dan
- **publik**, artinya murid bisa mendaftar sendiri tanpa undangan.

Kurikulum yang hanya bisa diikuti lewat undangan tidak tampil di landing page. Setiap kurikulum menautkan ke halaman katalognya, tempat murid memilih kelas dan mendaftar.

## Hal yang perlu diketahui

- Halaman tidak boleh berisi formulir, video atau peta yang ditempel, iklan, atau jendela chat dari layanan lain. AI sudah tahu aturan ini.
- Mengganti slug juga mengganti alamat halaman. Alamat lama tidak lagi berfungsi, jadi perbarui tautan yang sudah Anda bagikan.
- Jika penerbitan gagal dengan pesan berbahasa Inggris, biasanya ada kurikulum yang ditautkan sudah disembunyikan atau tidak lagi terbuka. Minta AI memperbarui desain, lalu terbitkan ulang.
- Gambar yang sedang dipakai di draf atau halaman publik tidak bisa dihapus.
