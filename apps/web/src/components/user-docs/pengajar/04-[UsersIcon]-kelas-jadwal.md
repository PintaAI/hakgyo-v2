# Kelas dan Jadwal

Kelas adalah kelompok murid yang mempelajari satu kurikulum dalam periode tertentu, misalnya "Kelas Malam Oktober". Satu kurikulum bisa punya banyak kelas dengan pengajar, jadwal, dan harga yang berbeda. Isi pelajarannya tetap sama karena berasal dari kurikulum.

## Membuat kelas

1. Buka **Kurikulum**, pilih kurikulumnya, lalu buka tab **Kelas**.
2. Klik **Buat kelas**.
3. Isi **Nama kelas**. Kolom lain boleh dikosongkan:
   - **Deskripsi**.
   - **Kapasitas**: jumlah maksimal murid.
   - **Mulai** dan **Selesai**: periode kelas.
4. Klik **Buat kelas**.

Kelas baru berstatus **Persiapan** dan belum bisa dilihat atau diikuti murid. Harga, grup WhatsApp, dan aturan pendaftaran diatur kemudian di tab **Pengaturan** kelas.

> **Mode sederhana:** pengajar yang membuat kelas belum otomatis menjadi staf kelas tersebut, jadi kelasnya bisa tidak muncul di daftar pengajar itu. Minta pemilik menambahkan Anda di tab **Staf**. Lihat [Peran dan Akses](/docs/pengajar/peran-akses).

## Halaman kelas

Klik nama kelas untuk membukanya. Tab yang tersedia tergantung peran Anda:

| Tab | Isinya |
|---|---|
| **Ringkasan** | Jumlah murid aktif, kapasitas, keterisian, pertemuan mendatang, dan tombol cepat |
| **Siswa** | Daftar murid dan tautan undangan |
| **Pembayaran** | Bukti bayar yang perlu diperiksa. Hanya muncul untuk kelas berbayar |
| **Staf** | Pengajar dan asisten kelas |
| **Jadwal kelas** | Pertemuan online lewat Zoom atau Google Meet |
| **Latihan & tryout** | Kuis bersama untuk kelas ini |
| **Hasil & review tugas** | Jawaban murid kelas ini |
| **Pengaturan** | Nama, harga, kapasitas, periode, dan grup WhatsApp |

Di ponsel, geser baris tab ke samping untuk melihat tab lainnya.

## Status kelas

Ubah status lewat tombol **Status** di bagian atas halaman kelas.

| Status | Murid bisa bergabung? | Murid yang sudah ada |
|---|---|---|
| **Persiapan** | Tidak, kelas belum terlihat | Belum bisa belajar |
| **Dibuka** | Ya | Bisa belajar |
| **Berjalan** | Ya, masih bisa bergabung | Bisa belajar |
| **Selesai** | Tidak | **Tetap** bisa membuka materi |
| **Dibatalkan** | Tidak | **Kehilangan akses**, termasuk yang sudah membayar |

**Dibuka** berarti pendaftaran dibuka dan kelas belum mulai. **Berjalan** berarti kelas sedang berlangsung dan masih menerima murid.

Hal yang perlu diketahui:

- Status tidak berubah sendiri; ubah secara manual saat kelas dimulai dan selesai. Satu-satunya pengaruh tanggal: setelah tanggal **Selesai** lewat, murid baru tidak bisa bergabung, tetapi murid lama tetap bisa belajar.
- Setiap kali status kelas diubah dari **Dibuka** atau **Berjalan** ke status lain, **semua tautan undangan kelas langsung mati**, termasuk jika hanya sebentar dipindah ke **Persiapan**. Membuka kelas lagi tidak menghidupkan tautan lama. Buat tautan baru.
- Seorang murid hanya bisa aktif di satu kelas untuk kurikulum yang sama.

## Mengatur kelas

Di tab **Pengaturan** kelas:

- **Nama kelas** dan **Deskripsi**. Kosongkan deskripsi untuk memakai deskripsi kurikulum.
- **Tipe akses**: **Ikuti kurikulum**, **Kurikulum publik** (bisa diikuti tanpa undangan), atau **Kurikulum privat** (hanya lewat undangan). Walaupun namanya "kurikulum", pilihan di sini hanya berlaku untuk kelas ini.
- **Kapasitas**: kosongkan untuk tanpa batas.
- **Harga (IDR)**: kosongkan untuk memakai harga kurikulum; isi **0** untuk gratis.
- **WhatsApp URL**: tautan grup WhatsApp kelas, misalnya `https://chat.whatsapp.com/...`. Murid melihatnya sebagai tombol **Grup**.
- **Mulai** dan **Selesai**.

Klik **Simpan pengaturan**.

> **Kapasitas** diperiksa saat murid mendaftar sendiri dari katalog atau membuka halaman pembayaran, baik untuk kelas gratis maupun berbayar. Murid yang masuk lewat undangan kelas gratis atau ditambahkan manual tetap masuk walaupun kelas penuh. Kursi baru terisi setelah murid benar-benar menjadi anggota; pembayaran yang belum disetujui tidak memesan kursi.

### Menghapus kelas

Di **Zona berbahaya**, klik **Hapus kelas**. Kelas tidak bisa dihapus jika sudah punya pembayaran lunas atau yang menunggu pemeriksaan, atau jika dipakai di latihan atau tryout. Untuk kelas seperti itu, ubah statusnya menjadi **Selesai**. Pilih **Dibatalkan** hanya jika murid memang harus kehilangan akses.

## Pengajar dan asisten kelas

Di tab **Staf**, tambahkan anggota organisasi sebagai **Instructor** atau **Assistant**. Penjelasan hak masing-masing ada di [Peran dan Akses](/docs/pengajar/peran-akses#peran-di-dalam-kelas).

## Pertemuan online (Zoom atau Google Meet)

### Langkah 1: Sambungkan Zoom atau Google Meet

Hanya pemilik dan admin yang bisa melakukannya, sekali untuk seluruh organisasi.

1. Buka **Pengaturan**, tab **Integrasi**.
2. Klik **Hubungkan Zoom** atau **Hubungkan Google Meet**, lalu masuk dengan akun Zoom atau Google lembaga.
3. Di **Layanan meeting utama**, pilih layanan yang dipakai untuk pertemuan baru.

Pertemuan dibuat atas nama akun yang menyambungkan. Ruang tunggu (*waiting room*) Zoom selalu aktif, jadi pemilik akun Zoom itu harus hadir di pertemuan untuk mengizinkan murid masuk. Pertimbangkan memakai akun Zoom khusus lembaga.

### Langkah 2: Jadwalkan pertemuan

1. Buka halaman kelas, tab **Jadwal kelas**.
2. Klik **Jadwalkan meeting**.
3. Isi:
   - **Modul cohort**: bab yang dibahas (opsional).
   - **Judul** dan **Agenda**.
   - **Mulai**: tanggal dan jam.
   - **Durasi (menit)**.
   - **Timezone**: zona waktu, misalnya `Asia/Jakarta` (WIB), `Asia/Makassar` (WITA), atau `Asia/Jayapura` (WIT).
4. Biarkan **Beri tahu peserta lewat notifikasi** tercentang agar murid mendapat pemberitahuan.
5. Klik **Jadwalkan**.

Hakgyo membuat ruang Zoom atau Meet dan menyimpan tautannya. Murid melihat tombol **Gabung** di halaman belajarnya dan mendapat pengingat sekitar 60 menit sebelum mulai.

### Mengubah dan menghapus pertemuan

- Klik **Edit** untuk mengubah. Murid hanya diberi tahu jika jam, durasi, atau zona waktu berubah.
- Klik ikon tempat sampah untuk menghapus. Centang pemberitahuan agar murid tahu pertemuan dibatalkan.

Hal yang perlu diketahui:

- Label status pertemuan selalu menampilkan **SCHEDULED** dan tidak berubah setelah pertemuan selesai. Abaikan label itu.
- Ubah dan hapus pertemuan dari Hakgyo, bukan langsung dari aplikasi Zoom. Jika pertemuan dihapus di Zoom atau sambungan Zoom terputus, mengubah atau menghapusnya dari Hakgyo bisa gagal.

## Siapa yang bisa

| Kegiatan | Mode sederhana | Mode lanjutan |
|---|---|---|
| Membuat kelas | Pemilik dan pengajar | Pemilik, admin, dan manager kurikulum |
| Mengubah status dan pengaturan kelas | Pemilik dan staf kelas | Pemilik, admin, manager kurikulum, dan Instructor |
| Menjadwalkan pertemuan | Pemilik dan staf kelas | Pemilik, admin, manager kurikulum, dan Instructor |
| Mengatur staf kelas | Pemilik | Pemilik, admin, dan manager kurikulum |
| Menyambungkan Zoom atau Google Meet | Pemilik dan admin | Pemilik dan admin |

Untuk mengurus murid, undangan, dan pembayaran kelas, lanjut ke [Murid, Undangan, dan Pembayaran](/docs/pengajar/murid-undangan-pembayaran).
