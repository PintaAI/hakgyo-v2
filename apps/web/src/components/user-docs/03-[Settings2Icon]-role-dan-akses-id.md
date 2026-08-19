# Panduan Role dan Akses di Hakgyo

Role menentukan apa yang dapat dilihat dan dikerjakan seseorang di Hakgyo. Supaya mudah dipahami, akses dibagi menjadi tiga tingkat: **organisasi**, **kursus**, dan **Group belajar**.

Satu orang dapat memiliki beberapa role sekaligus. Sebagai contoh, Siti dapat menjadi **Teacher** di organisasi, **Curriculum Editor** pada Kursus Bahasa Korea, dan **Instructor** pada Group belajar September.

## Cara Mudah Memahami Akses

Gunakan tiga pertanyaan berikut:

1. Apa role orang tersebut di organisasi?
2. Kursus apa yang dia kelola atau edit?
3. Group belajar apa yang dia ajar atau bantu?

<div class="my-6 grid max-w-2xl gap-3 rounded-xl border p-4 sm:grid-cols-3">
  <div class="rounded-lg bg-muted p-3">
    <div class="text-sm font-semibold">Organisasi</div>
    <div class="mt-1 text-xs text-muted-foreground">Mengatur workspace dan member</div>
  </div>
  <div class="rounded-lg bg-muted p-3">
    <div class="text-sm font-semibold">Kursus</div>
    <div class="mt-1 text-xs text-muted-foreground">Mengatur kurikulum dan settings kursus</div>
  </div>
  <div class="rounded-lg bg-muted p-3">
    <div class="text-sm font-semibold">Group belajar</div>
    <div class="mt-1 text-xs text-muted-foreground">Mengatur pelaksanaan kelas</div>
  </div>
</div>

Role organisasi tidak perlu dipakai untuk mengatur setiap kursus. Role kursus dan Group belajar diberikan hanya pada tempat yang memang menjadi tanggung jawab orang tersebut.

## Ringkasan Semua Role

| Tingkat       | Role              | Penjelasan singkat                                         |
| ------------- | ----------------- | ---------------------------------------------------------- |
| Organisasi    | Owner             | Pemilik workspace dengan kontrol tertinggi                 |
| Organisasi    | Admin             | Mengelola seluruh operasional organisasi                   |
| Organisasi    | Teacher           | Member pengajar yang mendapat akses melalui assignment     |
| Kursus        | Course Manager    | Mengelola seluruh bagian sebuah kursus                     |
| Kursus        | Curriculum Editor | Mengubah kurikulum tanpa mengatur settings kursus          |
| Group belajar | Instructor        | Menjalankan kegiatan belajar pada satu Group belajar       |
| Group belajar | Assistant         | Membantu pengelolaan peserta dan melihat jadwal            |
| Pembelajaran  | Peserta didik     | Mengikuti konten yang sudah diterbitkan melalui enrollment |

## Role Tingkat Organisasi

Role organisasi berlaku pada seluruh workspace. Role ini dikelola dari halaman **Anggota**.

### Owner

Owner adalah pemilik utama organisasi. Gunakan role ini hanya untuk orang yang benar-benar bertanggung jawab terhadap workspace.

Owner dapat:

- Mengubah profile dan pengaturan organisasi.
- Mengelola seluruh member dan role organisasi.
- Menambahkan atau menghapus Admin dan Teacher.
- Menambahkan Owner lain atau mengubah role Owner.
- Menghubungkan integration organisasi seperti Zoom.
- Melihat dan mengelola seluruh kursus, kurikulum, dan Group belajar.
- Mengatur Course Manager dan Curriculum Editor.
- Menghapus kursus atau Group belajar.

Owner tidak boleh dihapus langsung selama masih memegang role Owner. Ubah atau pindahkan ownership terlebih dahulu agar organisasi selalu mempunyai setidaknya satu Owner.

**Cocok untuk:** pendiri, pemilik lembaga, atau penanggung jawab utama platform.

### Admin

Admin membantu Owner menjalankan organisasi sehari-hari. Admin memiliki akses operasional yang luas, tetapi tidak dapat mengambil alih atau mengubah role Owner.

Admin dapat:

- Mengubah pengaturan organisasi.
- Mengelola Admin dan Teacher.
- Menghubungkan integration organisasi seperti Zoom.
- Melihat dan mengelola seluruh kursus dan Group belajar.
- Mengatur Course Manager, Curriculum Editor, dan staff cohort.
- Mengelola peserta, undangan, meeting, dan review tugas.
- Membuat, menerbitkan, mengarsipkan, atau menghapus kursus.

Admin tidak dapat:

- Menambahkan Owner baru.
- Menurunkan role Owner.
- Menghapus Owner dari organisasi.

**Cocok untuk:** kepala akademik, administrator program, atau tim operasional inti.

### Teacher

Teacher adalah member pengajar. Role ini menjadi identitas dasar di organisasi, bukan izin untuk mengelola semua kursus.

Teacher dapat:

- Membuat dan mengelola konten miliknya sendiri di Pustaka Konten.
- Membuka kursus yang dia miliki atau yang ditugaskan kepadanya.
- Membuka Group belajar tempat dia menjadi Instructor atau Assistant.
- Membaca seluruh kurikulum, termasuk bahan yang masih disiapkan, pada kursus yang dia ajar.
- Membuat kursus baru jika kebijakan organisasi mengizinkannya.

Teacher tidak otomatis dapat:

- Melihat semua kursus organisasi.
- Mengubah kurikulum semua kursus.
- Mengelola member atau settings organisasi.
- Mengatur staff atau menghapus Group belajar.

Ketika Teacher membuat kursus baru, dia otomatis menjadi **Course Manager** untuk kursus tersebut. Untuk kursus milik orang lain, berikan assignment yang sesuai.

**Cocok untuk:** pengajar, pembuat materi, mentor, atau fasilitator kelas.

## Role Tingkat Kursus

Role kursus berlaku pada satu kursus saja. Role ini dikelola dari tab **Course > Access**.

### Course Manager

Course Manager bertanggung jawab terhadap keseluruhan kursus. Setiap kursus memiliki satu manager utama.

Course Manager dapat:

- Mengubah nama, deskripsi, harga, enrollment, dan progression kursus.
- Membuat dan mengubah kurikulum.
- Membuat, menerbitkan, mengarsipkan, atau menghapus kursus.
- Membuat dan mengelola seluruh Group belajar di dalam kursus.
- Mengelola peserta dan undangan tingkat kursus.
- Menambahkan atau menghapus Curriculum Editor.
- Memindahkan tanggung jawab Course Manager kepada member lain.

Memindahkan Course Manager berarti manager lama tidak lagi otomatis memiliki akses penuh. Tambahkan dia sebagai Curriculum Editor atau staff cohort bila masih perlu terlibat.

**Cocok untuk:** penanggung jawab program atau pemilik kurikulum.

### Curriculum Editor

Curriculum Editor membantu menyusun isi pembelajaran tanpa mendapatkan kontrol administratif terhadap kursus.

Curriculum Editor dapat:

- Membuka kursus.
- Membuat, mengubah, menghapus, dan mengurutkan bab.
- Menambahkan atau menghapus bahan ajar dari kurikulum.
- Mengatur publication bahan ajar.
- Menggunakan konten miliknya dari Pustaka Konten.

Curriculum Editor tidak dapat:

- Mengubah settings, harga, status, atau manager kursus.
- Menghapus atau mengarsipkan kursus.
- Membuat atau menghapus Group belajar.
- Mengelola peserta, undangan, staff, atau meeting hanya karena menjadi editor.

Jika Curriculum Editor juga perlu mengajar kelas, tambahkan dia sebagai **Instructor** pada Group belajar yang sesuai.

**Cocok untuk:** penyusun silabus, instructional designer, atau pengajar yang membantu menyiapkan kurikulum.

## Role Tingkat Group belajar

Role Group belajar hanya berlaku pada satu pelaksanaan kelas. Role ini dikelola dari tab **Group belajar > Staff**.

Menjadi staff Group belajar otomatis memberi akses untuk membuka kursus induk dan membaca seluruh kurikulum sebagai referensi mengajar. Assignment ini tidak otomatis memberi izin mengubah kurikulum.

### Instructor

Instructor adalah pengajar utama pada satu Group belajar.

Instructor dapat:

- Membuka kursus dan membaca seluruh kurikulum.
- Mengubah informasi operasional Group belajar.
- Menambahkan dan memperbarui status peserta.
- Membuat dan mencabut undangan Group belajar.
- Membuat, mengubah, dan menghapus meeting Zoom.
- Melihat dan memeriksa tugas peserta Group belajar.
- Melihat daftar staff yang bertugas.

Instructor tidak dapat:

- Mengubah kurikulum kecuali juga menjadi Curriculum Editor.
- Menambahkan, mengubah, atau menghapus staff Group belajar.
- Menghapus Group belajar.
- Mengubah settings atau status kursus induk.

**Cocok untuk:** pengajar utama atau mentor yang menjalankan kelas.

### Assistant

Assistant membantu pekerjaan peserta tanpa memegang kontrol penuh terhadap pelaksanaan kelas.

Assistant dapat:

- Membuka kursus dan membaca seluruh kurikulum.
- Melihat informasi dan jadwal Group belajar.
- Melihat daftar staff.
- Menambahkan peserta dan memperbarui status peserta.

Assistant tidak dapat:

- Mengubah informasi Group belajar.
- Membuat atau mencabut undangan.
- Membuat, mengubah, atau menghapus meeting.
- Memeriksa tugas tertulis.
- Mengatur staff atau menghapus Group belajar.
- Mengubah kurikulum atau settings kursus.

**Cocok untuk:** asisten pengajar, customer support kelas, atau staf administrasi peserta.

## Peserta Didik

Peserta didik bukan role pengelola organisasi. Akses belajar diperoleh melalui enrollment langsung ke kursus atau melalui Group belajar.

Peserta didik dapat:

- Membuka kursus yang enrollment-nya aktif.
- Mengakses kursus dan bahan ajar yang sudah diterbitkan.
- Mengerjakan materi, kosakata, dan tugas sesuai urutan belajar.
- Melihat progress dan hasil belajar miliknya sendiri.

Peserta didik tidak dapat melihat draft atau mengakses workspace pengelola hanya karena sudah terdaftar sebagai peserta.

## Jika Seseorang Memiliki Beberapa Role

Hakgyo menggabungkan akses dari seluruh assignment yang masih aktif. Akses tidak saling menghapus.

Contoh:

| Assignment seseorang          | Hasil akses                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| Teacher + Curriculum Editor   | Dapat mengubah kurikulum, tetapi tidak mengubah settings kursus |
| Teacher + Instructor          | Dapat menjalankan cohort, tetapi kurikulum hanya dapat dibaca   |
| Teacher + Editor + Instructor | Dapat mengubah kurikulum dan menjalankan cohort                 |
| Teacher + Assistant           | Dapat membantu peserta dan melihat jadwal                       |
| Course Manager + Instructor   | Tetap memiliki full access karena Course Manager lebih luas     |
| Admin + assignment apa pun    | Tetap memiliki full operational access di seluruh organisasi    |

Assignment selalu dibatasi oleh organisasi. Role pada satu organisasi tidak memberikan akses ke organisasi lain.

## Cara Memberikan Akses

### Menambahkan Member Organisasi

1. Buka **Anggota**.
2. Pilih **Tambah member**.
3. Masukkan email akun Hakgyo.
4. Pilih role `Admin` atau `Teacher`.
5. Simpan.

Menambahkan seseorang sebagai Teacher belum otomatis memasukkannya ke kursus atau Group belajar.

### Memberikan Akses Edit Kurikulum

1. Buka kursus yang akan dikelola.
2. Buka tab **Access**.
3. Pada bagian **Curriculum Editors**, pilih member.
4. Pilih **Add editor**.

Hapus editor dari halaman yang sama ketika akses tersebut tidak lagi dibutuhkan.

### Mengganti Course Manager

1. Buka **Course > Access**.
2. Pada bagian **Course Manager**, pilih manager baru.
3. Pilih **Transfer**.
4. Pastikan manager lama masih mempunyai assignment lain bila masih perlu terlibat.

### Menambahkan Staff Group belajar

1. Buka course dan pilih Group belajar.
2. Buka tab **Staff**.
3. Pilih **Tambah staff**.
4. Masukkan email organization member.
5. Pilih `Instructor` atau `Assistant`.
6. Simpan.

Hanya Course Manager, Owner, atau Admin yang dapat mengatur staff Group belajar.

## Panduan Memilih Role

Gunakan pertanyaan berikut sebelum memberikan akses:

| Kebutuhan                                           | Role yang disarankan |
| --------------------------------------------------- | -------------------- |
| Mengelola seluruh organisasi                        | Owner atau Admin     |
| Bertanggung jawab penuh terhadap satu kursus        | Course Manager       |
| Hanya membantu menyusun kurikulum                   | Curriculum Editor    |
| Mengajar dan menjalankan satu Group belajar         | Instructor           |
| Membantu peserta tanpa mengelola meeting atau tugas | Assistant            |
| Hanya mengikuti pembelajaran                        | Peserta didik        |

Jangan memberikan Admin hanya agar seseorang dapat mengedit satu kurikulum. Jangan memberikan Curriculum Editor hanya agar seseorang dapat mengajar satu cohort. Pilih role berdasarkan scope tanggung jawabnya.

## Contoh Pengaturan Tim

Sebuah organisasi memiliki Kursus Bahasa Korea Pemula dan Group belajar September.

1. Rina adalah pemilik lembaga, sehingga mendapat role **Owner**.
2. Budi mengelola operasional semua program, sehingga mendapat role **Admin**.
3. Siti menyusun dan mengajar kursus. Dia menjadi **Teacher**, **Curriculum Editor**, dan **Instructor**.
4. Andi hanya membantu peserta Group belajar September. Dia menjadi **Teacher** dan **Assistant**.
5. Peserta kelas memperoleh akses melalui enrollment Group belajar, tanpa menjadi member organisasi.

Dengan susunan ini, setiap orang mendapat akses sesuai pekerjaannya tanpa memperoleh kontrol yang tidak diperlukan.

## Pemeriksaan Akses Secara Berkala

Owner atau Admin sebaiknya melakukan pemeriksaan rutin:

- Buka **Anggota** untuk melihat role organisasi dan jumlah assignment setiap member.
- Buka **Course > Access** untuk memeriksa manager dan editor.
- Buka **Group belajar > Staff** untuk memeriksa Instructor dan Assistant.
- Cabut assignment ketika seseorang tidak lagi bertanggung jawab.
- Hindari menggunakan satu akun bersama untuk beberapa orang.

Prinsip yang disarankan adalah memberikan akses secukupnya: cukup untuk menyelesaikan pekerjaan, tetapi tidak lebih luas dari tanggung jawab orang tersebut.
