# Konsep Utama Batch Pembelajaran di Hakgyo

Batch pembelajaran (**cohort**) adalah satu pelaksanaan terjadwal dari sebuah kursus. Kursus menyimpan kurikulum yang dipelajari, sedangkan batch pembelajaran menyimpan konteks bagaimana kurikulum tersebut dijalankan untuk kelompok tertentu.

Satu kursus dapat memiliki banyak batch pembelajaran. Setiap batch dapat mempunyai periode, peserta didik, pengajar, moderator, kapasitas, harga, grup WhatsApp, undangan, dan jadwal meeting yang berbeda tanpa menduplikasi kurikulum kursus.

Dokumen ini menjelaskan hubungan antara **kursus**, **batch pembelajaran**, **peserta didik**, **staff**, **undangan**, **meeting**, dan **akses belajar**. Di dalam sistem, istilah teknisnya tetap `cohort`.

## Gambaran Dasar

Bayangkan sebuah kursus bernama **Bahasa Korea untuk Pemula**. Kurikulum kursus tersebut dapat dijalankan beberapa kali untuk kelompok yang berbeda.

<div class="my-6 max-w-2xl rounded-xl border p-4">
  <div class="font-heading font-semibold">Kursus: Bahasa Korea untuk Pemula</div>
  <div class="mt-2 text-xs text-muted-foreground">Kurikulum, bab, bahan ajar, dan cara belajar</div>
  <div class="ml-3 mt-4 grid gap-4 border-l pl-4">
    <div class="rounded-lg bg-muted p-3">
      <div class="text-sm font-medium">Batch September</div>
      <div class="mt-1 text-xs text-muted-foreground">20 peserta didik / Pengajar A / September-November</div>
    </div>
    <div class="rounded-lg bg-muted p-3">
      <div class="text-sm font-medium">Batch Akhir Pekan</div>
      <div class="mt-1 text-xs text-muted-foreground">12 peserta didik / Pengajar B / Sabtu-Minggu</div>
    </div>
    <div class="rounded-lg bg-muted p-3">
      <div class="text-sm font-medium">Batch Privat</div>
      <div class="mt-1 text-xs text-muted-foreground">5 peserta didik / Pengajar A / Jadwal khusus</div>
    </div>
  </div>
</div>

Ketiga batch menggunakan kurikulum yang sama. Perubahan pada susunan kursus berlaku untuk seluruh batch karena batch tidak menyimpan salinan materi.

| Disimpan pada kursus                  | Disimpan pada cohort                    |
| ------------------------------------- | --------------------------------------- |
| Judul dan deskripsi kursus            | Nama dan deskripsi batch                |
| Bab dan bahan ajar                    | Periode mulai dan selesai               |
| Urutan belajar                        | Peserta didik cohort                    |
| Publication bahan ajar                | Teacher dan moderator                   |
| Cara belajar open atau sequential     | Meeting dan link Zoom                   |
| Aturan enrollment dasar dan kurikulum | Kapasitas, harga, dan aturan enrollment |

## Kapan Menggunakan Batch Pembelajaran

Gunakan batch pembelajaran ketika sebuah program belajar membutuhkan satu atau lebih konteks berikut:

- Kelompok peserta didik tertentu.
- Tanggal mulai dan selesai.
- Teacher atau moderator khusus.
- Live session atau meeting terjadwal.
- Kapasitas peserta didik.
- Grup komunikasi seperti WhatsApp.
- Harga atau aturan enrollment yang berbeda dari kursus.

Batch pembelajaran tidak wajib digunakan untuk semua kursus. Kursus belajar mandiri dapat memberikan akses langsung kepada peserta didik tanpa memasukkannya ke batch.

### Kursus Langsung atau Batch Pembelajaran

| Kebutuhan                                           | Pilihan yang disarankan |
| --------------------------------------------------- | ----------------------- |
| Belajar mandiri tanpa jadwal                        | Akses kursus langsung   |
| Program dengan tanggal mulai dan selesai            | Cohort                  |
| Semua peserta mengikuti live session yang sama      | Cohort                  |
| Peserta dikelompokkan berdasarkan level atau jadwal | Beberapa cohort         |
| Akses seumur hidup tanpa kelompok                   | Akses kursus langsung   |
| Teacher berbeda untuk setiap pelaksanaan            | Beberapa cohort         |

## Identitas dan Pengaturan Cohort

Setiap cohort memiliki beberapa informasi utama.

### Nama dan Deskripsi

Nama sebaiknya membedakan satu pelaksanaan dari pelaksanaan lainnya. Contoh nama yang jelas:

- Batch September 2026
- Weekend Class A
- Persiapan TOPIK - Gelombang 2
- Private Corporate - Tim Marketing

Deskripsi dapat menjelaskan target peserta, pola jadwal, atau karakter khusus cohort.

### Periode

`Mulai` dan `Selesai` menjelaskan periode operasional cohort. Tanggal ini membantu pengelola dan peserta memahami kapan program berlangsung.

Periode tidak mengubah status cohort secara otomatis. Sebagai contoh, cohort tidak otomatis menjadi `COMPLETED` ketika tanggal selesai terlewati. Pengelola tetap menentukan perubahan status sesuai kondisi sebenarnya.

### Kapasitas

Kapasitas menyatakan jumlah peserta didik yang direncanakan. Dashboard cohort menggunakan nilai ini untuk menghitung occupancy.

```text
Occupancy = peserta didik aktif / kapasitas x 100%
```

Saat ini kapasitas berfungsi sebagai indikator operasional. Sistem belum otomatis menolak penambahan manual atau penggunaan undangan ketika kapasitas tercapai. Pengelola harus memantau jumlah peserta sebelum menambahkan peserta baru.

### Harga

Cohort dapat mengikuti harga kursus atau mempunyai harga sendiri. Harga cohort berguna ketika setiap batch memiliki paket, fasilitas, atau biaya yang berbeda.

Pembayaran belum tersedia di Hakgyo. Nilai harga saat ini adalah metadata dan belum melakukan penagihan atau konfirmasi pembayaran otomatis.

### Grup WhatsApp

URL grup WhatsApp dapat disimpan sebagai jalur komunikasi eksternal. Hakgyo hanya menyimpan link dan tidak membaca pesan, anggota grup, atau aktivitas WhatsApp.

## Status Cohort

Cohort memiliki lima status yang menggambarkan lifecycle operasionalnya.

```text
DRAFT -> OPEN -> IN_PROGRESS -> COMPLETED
                  |
                  -> CANCELLED
```

| Status        | Makna                                                   |
| ------------- | ------------------------------------------------------- |
| `DRAFT`       | Cohort masih disiapkan dan belum siap menerima peserta. |
| `OPEN`        | Cohort siap menerima peserta atau undangan.             |
| `IN_PROGRESS` | Program belajar sedang berjalan.                        |
| `COMPLETED`   | Program telah selesai dijalankan.                       |
| `CANCELLED`   | Program dibatalkan dan tidak dilanjutkan.               |

Status cohort tidak sama dengan status akses setiap peserta. Cohort dapat berstatus `COMPLETED`, tetapi riwayat enrollment dan progress peserta tetap disimpan.

Perubahan status dilakukan oleh pengelola. Tanggal, meeting, dan progress peserta tidak memindahkan status cohort secara otomatis.

## Aturan Enrollment

Cohort mempunyai aturan enrollment sendiri dan dapat memilih salah satu dari tiga perilaku:

- **Ikuti kursus**: cohort tidak mempunyai override dan menggunakan aturan dasar kursus.
- **Open**: cohort ditandai untuk pendaftaran terbuka.
- **Invite only**: peserta masuk melalui undangan atau ditambahkan pengelola.

Saat ini penambahan peserta cohort yang tersedia di workspace dilakukan dengan dua cara:

1. Pengelola menambahkan email akun Hakgyo secara manual.
2. Pengelola membuat undangan yang ditargetkan ke cohort.

Alur pendaftaran terbuka langsung ke cohort belum tersedia. Nilai `Open` sudah dapat disimpan sebagai kebijakan cohort, tetapi flow peserta untuk memilih dan masuk ke cohort terbuka masih akan dikembangkan.

## Peserta Didik dan Akses Kursus

Ketika peserta didik aktif di sebuah cohort, Hakgyo juga memastikan peserta tersebut mempunyai akses ke kursus induknya.

<div class="my-6 grid max-w-xl gap-2 rounded-xl border p-4">
  <div class="rounded-lg bg-muted px-3 py-2 text-sm">Peserta ditambahkan ke cohort</div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="rounded-lg bg-muted px-3 py-2 text-sm">Enrollment cohort menjadi aktif</div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="rounded-lg bg-muted px-3 py-2 text-sm">Hakgyo memastikan akses ke kursus induk</div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="rounded-lg bg-muted px-3 py-2 text-sm">Peserta dapat membuka kurikulum kursus</div>
</div>

Peserta harus sudah memiliki akun Hakgyo sebelum dapat ditambahkan melalui email. Email dinormalisasi menjadi lowercase dan harus cocok dengan akun yang terdaftar.

### Status Enrollment Peserta

| Status      | Perilaku umum                                            |
| ----------- | -------------------------------------------------------- |
| `PENDING`   | Peserta tercatat tetapi belum memiliki akses aktif.      |
| `ACTIVE`    | Peserta mempunyai akses aktif melalui cohort.            |
| `COMPLETED` | Peserta telah menyelesaikan konteks enrollment tersebut. |
| `CANCELLED` | Enrollment cohort dibatalkan.                            |

Mengubah enrollment cohort menjadi `ACTIVE` atau `COMPLETED` memastikan entitlement kursus tetap aktif.

Ketika enrollment cohort dibatalkan, Hakgyo hanya mencabut entitlement kursus yang memang berasal dari cohort dan tidak lagi didukung cohort aktif lain. Akses mandiri dari undangan kursus, open enrollment, atau penambahan manual tidak ikut dicabut.

### Satu Peserta di Beberapa Cohort

Peserta dapat tergabung dalam beberapa cohort untuk kursus yang sama. Hal ini berguna jika peserta berpindah batch atau mengikuti kelompok tambahan.

Jika satu enrollment cohort dibatalkan tetapi peserta masih aktif pada cohort lain di kursus yang sama, akses kursus tetap aktif.

## Undangan Cohort

Undangan cohort menghubungkan peserta ke kursus sekaligus cohort yang dituju.

```text
Pengelola membuat undangan cohort
-> link dibagikan kepada peserta
-> peserta login atau membuat akun
-> peserta membuka link
-> enrollment kursus dan cohort dibuat
```

Undangan dapat mempunyai:

- Tanggal kedaluwarsa.
- Batas jumlah penggunaan.
- Target cohort tertentu.
- Status aktif atau dicabut.

Token undangan hanya ditampilkan ketika undangan dibuat. Pengelola harus langsung menyalin link tersebut. Daftar undangan setelahnya hanya menampilkan metadata dan jumlah penggunaan, bukan token rahasia.

## Staff Cohort

Staff adalah organization member yang ditugaskan untuk mengelola pelaksanaan cohort. Staff harus sudah menjadi member organization sebelum dapat ditambahkan menggunakan email.

Hakgyo menyediakan dua label role staff:

### Teacher

Teacher bertanggung jawab terhadap proses pembelajaran, misalnya:

- Menjalankan live session.
- Memantau peserta didik.
- Membantu proses belajar.
- Memeriksa tugas tertulis sesuai scope yang dimiliki.

### Moderator

Moderator berfokus pada dukungan operasional, misalnya:

- Membantu mengelola peserta.
- Menjaga komunikasi kelompok.
- Membantu meeting dan administrasi cohort.

Pada implementasi saat ini, teacher dan moderator sama-sama memperoleh akses pengelolaan cohort. Perbedaannya masih berupa tanggung jawab operasional, bukan pembatasan permission yang berbeda.

Course owner, owner/admin organization, dan assigned cohort staff dapat mengelola cohort sesuai scope masing-masing. Akses tidak pernah berlaku lintas organization.

## Meeting dan Zoom

Meeting adalah live session yang terhubung dengan Zoom organization. Setiap meeting menyimpan:

- Judul.
- Agenda opsional.
- Tanggal dan waktu mulai.
- Durasi dalam menit.
- Timezone.
- Join URL dari Zoom.

### Membuat Meeting

Sebelum meeting dapat dibuat, owner atau admin harus menghubungkan akun Zoom pada pengaturan organization.

```text
Hubungkan Zoom organization
-> buka cohort
-> pilih Meetings
-> jadwalkan meeting
-> Hakgyo membuat meeting di Zoom
-> join URL disimpan di cohort
```

Create, edit, dan delete dilakukan ke Zoom terlebih dahulu, kemudian metadata lokal diperbarui. Jika koneksi Zoom tidak tersedia atau sudah kedaluwarsa, action meeting dapat gagal dan menampilkan pesan error.

### Status Meeting

Meeting baru berstatus `SCHEDULED`. Hakgyo belum mempunyai webhook lifecycle Zoom, sehingga perubahan yang terjadi langsung di Zoom tidak otomatis mengubah status lokal menjadi started atau ended.

Gunakan join URL untuk membuka meeting. Link tersebut berasal dari Zoom dan tidak dibuat secara manual oleh pengelola.

## Hubungan Cohort dan Progress

Progress belajar tetap melekat pada peserta dan bahan ajar kursus, bukan pada salinan kurikulum cohort. Artinya:

- Peserta dari cohort berbeda mengerjakan bahan ajar yang sama.
- Setiap peserta tetap mempunyai progress sendiri.
- Perpindahan cohort tidak menghapus progress kursus.
- Pembatalan enrollment cohort tidak menghapus jawaban, nilai, atau progress yang sudah tercatat.

Cara belajar `OPEN` atau `SEQUENTIAL` berasal dari kursus dan berlaku bagi peserta seluruh cohort.

## Workflow Operasional yang Disarankan

### 1. Siapkan Kursus

Pastikan judul, kurikulum, bahan ajar, dan cara belajar kursus sudah sesuai. Cohort tidak menggantikan proses penyusunan kurikulum.

### 2. Buat Cohort sebagai Draft

Isi nama, deskripsi, periode, kapasitas, harga, dan link komunikasi. Gunakan status `DRAFT` selama persiapan.

### 3. Tambahkan Staff

Pastikan teacher atau moderator sudah menjadi organization member. Tambahkan mereka menggunakan email dan tentukan role operasionalnya.

### 4. Siapkan Meeting

Pastikan Zoom organization sudah terhubung. Buat meeting sesuai jadwal program dan periksa kembali timezone serta durasinya.

### 5. Buka Cohort

Ubah status menjadi `OPEN` ketika cohort siap menerima peserta. Tentukan apakah cohort mengikuti aturan kursus atau menggunakan kebijakan enrollment sendiri.

### 6. Tambahkan Peserta

Gunakan email untuk peserta yang sudah mempunyai akun atau bagikan undangan cohort. Pantau kapasitas sebelum menambahkan peserta baru.

### 7. Jalankan Program

Ubah status menjadi `IN_PROGRESS`, jalankan meeting, pantau enrollment, dan gunakan antrean review untuk tugas tertulis.

### 8. Selesaikan Cohort

Setelah program selesai, ubah status menjadi `COMPLETED`. Riwayat peserta, meeting, dan progress tetap tersedia.

## Contoh End-to-End

Sebuah organisasi membuka **Cohort September** untuk kursus Bahasa Korea Pemula.

1. Pengelola membuat cohort berstatus `DRAFT` dengan kapasitas 20 peserta.
2. Periode diatur dari 1 September sampai 30 November.
3. Seorang teacher dan moderator ditambahkan menggunakan email organization member.
4. Organization menghubungkan Zoom dan membuat 12 meeting mingguan.
5. Cohort diubah menjadi `OPEN`.
6. Sepuluh peserta ditambahkan melalui email dan delapan peserta masuk melalui undangan cohort.
7. Dashboard menunjukkan 18 peserta aktif dan occupancy 90%.
8. Cohort diubah menjadi `IN_PROGRESS` ketika kelas pertama dimulai.
9. Peserta mengikuti kurikulum yang sama, tetapi progress masing-masing disimpan terpisah.
10. Setelah program berakhir, cohort diubah menjadi `COMPLETED`.

## Batasan yang Perlu Diketahui

- Kapasitas belum memblokir enrollment secara otomatis.
- Payment dan penagihan harga cohort belum tersedia.
- Open enrollment langsung ke cohort belum tersedia.
- Status cohort tidak berubah otomatis berdasarkan tanggal.
- Status meeting belum tersinkron otomatis dari aktivitas Zoom.
- Teacher dan moderator saat ini mempunyai kemampuan pengelolaan cohort yang sama.
- Peserta dan staff harus mempunyai akun atau membership yang sesuai sebelum ditambahkan melalui email.

Memahami batasan ini membantu pengelola menggunakan cohort sebagai pusat operasi program tanpa menganggap metadata sebagai automation yang belum tersedia.
