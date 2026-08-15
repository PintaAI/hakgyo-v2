# Konsep Utama Kursus di Hakgyo

Kursus adalah ruang belajar terstruktur yang menghubungkan konten, pengajar, dan peserta didik. Sebuah kursus bukan hanya halaman berisi materi. Kursus menentukan urutan belajar, aturan akses, cara peserta didik menyelesaikan konten, dan kapan bagian berikutnya dapat dibuka.

Dokumen ini menjelaskan hubungan antara **kursus**, **bab**, **bahan ajar**, **Pustaka Konten**, **gabung kursus**, dan **progress**.

## Struktur Dasar Kursus

Setiap kursus tersusun dari beberapa bab. Setiap bab berisi bahan ajar yang menunjuk ke sebuah konten di Pustaka Konten.

<div class="my-6 max-w-xl rounded-xl border p-4">
    <div class="font-heading font-semibold">Kursus</div>
  <div class="ml-3 mt-3 grid gap-4 border-l pl-4">
    <div>
      <div class="mb-2 text-sm font-medium">Bab 1</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded-md bg-muted px-2 py-1">Materi Pembelajaran</span>
        <span class="rounded-md bg-muted px-2 py-1">Kumpulan Kosakata</span>
        <span class="rounded-md bg-muted px-2 py-1">Tugas</span>
      </div>
    </div>
    <div>
      <div class="mb-2 text-sm font-medium">Bab 2</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded-md bg-muted px-2 py-1">Materi Pembelajaran</span>
        <span class="rounded-md bg-muted px-2 py-1">Tugas</span>
      </div>
    </div>
  </div>
</div>

Pemisahan ini membuat struktur kursus tetap rapi:

- **Kursus** menyimpan identitas dan aturan belajar secara keseluruhan.
- **Bab** mengelompokkan satu tahap atau topik pembelajaran.
- **Bahan ajar** menentukan konten yang digunakan dan urutannya dalam bab.
- **Pustaka Konten** menyimpan konten yang dapat dipakai ulang di beberapa kursus.

## Tiga Jenis Konten

### Materi Pembelajaran

Materi pembelajaran adalah isi pelajaran utama yang dibaca atau dipelajari peserta didik. Materi pembelajaran dibuat dengan BlockNote dan dapat berisi paragraf, heading, daftar, media, tabel, dan blok terstruktur lainnya.

Materi pembelajaran dapat memiliki syarat penyelesaian. Sebagai contoh, materi lanjutan baru dapat diselesaikan setelah peserta didik menuntaskan kumpulan kosakata tertentu atau mencapai nilai minimum pada tugas.

### Kumpulan Kosakata

Kumpulan kosakata berisi kata, definisi, contoh penggunaan, dan audio opsional. Satu kumpulan sebaiknya berisi kosakata yang memiliki konteks yang sama, misalnya "Perkenalan Dasar" atau "Istilah di Restoran".

Kumpulan kosakata dapat digunakan sebagai bahan ajar langsung atau sebagai syarat penyelesaian materi pembelajaran.

### Tugas

Tugas mengukur pemahaman peserta didik. Hakgyo mendukung pertanyaan pilihan tunggal, pilihan ganda, dan jawaban tertulis.

Pertanyaan pilihan dapat dinilai otomatis. Jawaban tertulis masuk ke antrean pemeriksaan pengajar. Tugas selesai ketika pengerjaan sudah dinilai dan peserta didik mencapai nilai kelulusan.

| Jenis konten        | Cara selesai                                                |
| ------------------- | ----------------------------------------------------------- |
| Materi Pembelajaran | Peserta didik menandai selesai dan seluruh syarat terpenuhi |
| Kumpulan Kosakata   | Peserta didik menandai progress sebagai selesai             |
| Tugas               | Pengerjaan dinilai dan mencapai nilai kelulusan             |

## Pustaka Konten dan Item Kursus

Membuat konten di Pustaka Konten belum membuatnya terlihat oleh peserta didik. Pengelola harus memasang konten tersebut sebagai bahan ajar di sebuah bab.

<div class="my-6 grid max-w-xl gap-2 rounded-xl border p-4">
  <div class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">1</span>
    Buat konten di Pustaka Konten
  </div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">2</span>
    Buat atau pilih bab
  </div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">3</span>
    Tambahkan konten sebagai bahan ajar
  </div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">4</span>
    Terbitkan bahan ajar
  </div>
  <div class="pl-5 text-muted-foreground">↓</div>
  <div class="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">5</span>
    Terbitkan kursus
  </div>
</div>

Bahan ajar hanya boleh menunjuk ke satu konten: materi pembelajaran, kumpulan kosakata, atau tugas. Urutan bahan ajar di dalam bab menentukan urutan yang ditampilkan kepada peserta didik.

Konten di Pustaka Konten dapat digunakan kembali. Sebagai contoh, kumpulan kosakata "Salam Dasar" dapat dipasang pada kursus Bahasa Jepang Pemula dan kursus Persiapan Percakapan tanpa menduplikasi data.

## Status dan Publication

Kursus mempunyai status `DRAFT`, `PUBLISHED`, atau `ARCHIVED`. Peserta didik hanya dapat belajar pada kursus berstatus `PUBLISHED`.

Bahan ajar juga mempunyai status publication sendiri. Karena itu, pengelola dapat menyiapkan bahan ajar baru di kursus yang sudah aktif tanpa langsung memperlihatkannya kepada peserta didik.

Sebuah item dapat diakses peserta didik jika:

1. Kursus berstatus `PUBLISHED`.
2. Bahan ajar sudah published.
3. Peserta didik sudah gabung kursus dan aksesnya masih aktif.
4. Bab tersebut sudah tersedia untuk peserta didik sesuai cara belajar yang dipilih.

## Gabung Kursus dan Batch Pembelajaran

Gabung kursus adalah cara peserta didik mendapatkan akses ke kursus. Peserta didik dapat bergabung melalui pendaftaran terbuka, undangan, ditambahkan oleh pengelola, atau melalui batch pembelajaran.

Batch pembelajaran adalah kelompok pelaksanaan untuk kursus yang sama. Satu kursus dapat mempunyai beberapa batch dengan peserta didik, pengajar, jadwal, dan meeting yang berbeda.

<div class="my-6 max-w-xl rounded-xl border p-4">
  <div class="font-heading font-semibold">Kursus: Bahasa Jepang Pemula</div>
  <div class="ml-3 mt-3 grid gap-4 border-l pl-4">
    <div>
      <div class="text-sm font-medium">Gabung langsung</div>
      <div class="mt-1 text-xs text-muted-foreground">Pendaftaran terbuka, undangan, atau ditambahkan manual</div>
    </div>
    <div>
      <div class="text-sm font-medium">Batch Januari</div>
      <div class="mt-1 text-xs text-muted-foreground">Pengajar A / 20 peserta didik / jadwal Januari</div>
    </div>
    <div>
      <div class="text-sm font-medium">Batch Februari</div>
      <div class="mt-1 text-xs text-muted-foreground">Pengajar B / 15 peserta didik / jadwal Februari</div>
    </div>
  </div>
</div>

Kursus menyimpan kurikulum, sedangkan batch pembelajaran menyimpan konteks pelaksanaannya.

- **Gabung langsung** cocok untuk peserta didik yang belajar mandiri dan tidak memerlukan kelompok atau jadwal tertentu.
- **Gabung melalui batch** menghubungkan peserta didik ke kursus sekaligus ke kelompok, pengajar, meeting, dan periode belajar tertentu.
- Kedua cara bergabung memberi akses ke kurikulum kursus yang sama. Perbedaannya berada pada cara akses diberikan dan konteks pelaksanaannya.

## Cara Belajar dalam Kursus

Hakgyo menyediakan dua cara untuk mengatur urutan belajar. Nama teknisnya tetap ada di sistem, tetapi maksudnya sederhana:

### Belajar Mandiri (`OPEN`)

Semua bab yang sudah tersedia dapat langsung dibuka. Peserta didik bebas memilih bab mana yang ingin dipelajari terlebih dahulu.

Cara ini cocok untuk:

- Kursus yang bisa dipelajari dengan urutan bebas.
- Materi referensi atau kumpulan pengetahuan.
- Peserta didik yang ingin mengatur jadwal dan urutan belajarnya sendiri.

Contohnya, peserta didik boleh membuka Bab 3 lebih dahulu, lalu kembali ke Bab 1 jika diperlukan.

### Belajar Bertahap (`SEQUENTIAL`)

Bab dipelajari secara berurutan. Bab berikutnya baru terbuka setelah semua bahan ajar di bab sebelumnya selesai.

Cara ini cocok untuk:

- Kursus yang materinya saling menjadi dasar.
- Pelajaran yang dimulai dari konsep sederhana lalu berkembang ke topik yang lebih sulit.
- Program belajar yang ingin memastikan peserta didik mengikuti tahapan yang sudah disusun pengajar.

Contohnya:

```text
Selesaikan Bab 1
-> Bab 2 terbuka
-> Selesaikan Bab 2
-> Bab 3 terbuka
```

Penguncian ini diperiksa oleh server. Peserta didik tidak dapat melewati tahapan dengan membuka URL bahan ajar secara langsung.

## Progress Peserta Didik

Progress konten bergerak satu arah:

```text
Belum dimulai -> IN_PROGRESS -> COMPLETED
```

Completion bersifat monotonic. Setelah sebuah item selesai, statusnya tidak kembali menjadi in progress.

Bab dianggap selesai setelah seluruh bahan ajar yang sudah published di dalamnya selesai. Bab kosong tidak dianggap selesai.

## Contoh Kursus dari Awal sampai Selesai

Bayangkan sebuah kursus bernama **Bahasa Jepang untuk Pemula**.

```text
Bab 1: Perkenalan
1. Materi Pembelajaran: Mengenal Salam Jepang
2. Kumpulan Kosakata: Kosakata Perkenalan
3. Materi Pembelajaran: Membuat Kalimat Perkenalan
4. Tugas: Kuis Perkenalan

Bab 2: Angka dan Umur
1. Materi Pembelajaran: Angka 1-100
2. Kumpulan Kosakata: Angka dan Usia
3. Tugas: Kuis Angka
```

Alur peserta didik pada Bab 1:

1. Peserta didik membaca materi pembelajaran tentang salam dan menandainya selesai.
2. Peserta didik mempelajari kumpulan kosakata perkenalan dan menyelesaikannya.
3. Peserta didik membuka materi pembelajaran tentang kalimat perkenalan. Jika kumpulan kosakata menjadi syarat, server memastikan syarat tersebut sudah selesai.
4. Peserta didik mengerjakan tugas dan memperoleh nilai 60, sedangkan nilai kelulusan adalah 70.
5. Tugas belum selesai sehingga Bab 2 tetap terkunci.
6. Peserta didik mencoba kembali dan memperoleh nilai 80.
7. Tugas menjadi selesai, seluruh bahan ajar Bab 1 selesai, dan Bab 2 otomatis terbuka.

Jika tugas memiliki pertanyaan tertulis, pengerjaan berstatus `IN_REVIEW` sampai pengajar memberikan nilai. Bab berikutnya belum terbuka selama pemeriksaan belum selesai atau nilai kelulusan belum tercapai.

## Pola Penyusunan yang Disarankan

Bab yang mudah dipahami biasanya mengikuti alur berikut:

```text
Pengenalan konsep
-> kumpulan kosakata atau fakta penting
-> contoh penerapan
-> latihan
-> tugas
```

Gunakan materi pembelajaran untuk menjelaskan konsep, kumpulan kosakata untuk membangun bahasa atau istilah yang diperlukan, dan tugas untuk memastikan peserta didik mampu memahami atau menerapkannya.
