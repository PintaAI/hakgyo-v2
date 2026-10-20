# Grup WhatsApp Kelas

Hakgyo bisa membuatkan grup WhatsApp untuk setiap kelas, lengkap dengan nama kelas dan foto kurikulumnya. Link undangannya langsung tampil untuk murid sebagai tombol **Grup** di kartu kelas, dan Hakgyo mengirim pengingat ke grup itu:

- **Pengingat pertemuan** sekitar satu jam sebelum pertemuan online dimulai, berisi jam dan tautan **Gabung**.
- **Jadwal Latihan atau Tryout** saat latihan dijadwalkan, berisi waktu buka dan tutup dalam WIB serta tautan untuk mengerjakannya.

Notifikasi aplikasi tetap terkirim seperti biasa; pesan WhatsApp adalah tambahan.

Hakgyo tidak memasukkan murid ke grup. Murid bergabung sendiri lewat tombol **Grup** atau link undangan.

## Menghubungkan nomor WhatsApp

Hanya **Owner** dan **Admin** yang bisa menghubungkan nomor. Satu organisasi memakai satu nomor.

1. Buka **Pengaturan** › **Integrasi**.
2. Di kartu **WhatsApp**, klik **Hubungkan WhatsApp**.
3. Di ponsel lembaga, buka WhatsApp › **Perangkat tertaut** › **Tautkan perangkat**, lalu arahkan kamera ke kode QR di layar.
4. Setelah tersambung, kartu menampilkan **Terhubung** beserta nomornya.

Kode QR berlaku sekitar dua menit. Jika kedaluwarsa, klik **Minta QR baru**.

> **Penting:** koneksi ini memakai WhatsApp Web lewat Evolution API, bukan API resmi WhatsApp. WhatsApp dapat membatasi atau memblokir nomor yang dipakai dengan cara ini. Gunakan nomor khusus lembaga, jangan nomor pribadi. Hakgyo menjaga jumlah pesan tetap sedikit dan memberi jeda antar pesan untuk mengurangi risikonya.

### Nomor peserta awal

WhatsApp mewajibkan satu peserta selain nomor lembaga saat grup dibuat. Isi **Nomor peserta awal** di kartu WhatsApp, misalnya nomor pengajar atau admin, lalu klik **Simpan nomor**. Nomor ini ikut masuk ke setiap grup baru. Nomor lokal seperti `0812…` otomatis diubah ke format internasional.

### Membuat grup otomatis

Nyalakan **Buat grup otomatis saat kelas dibuka** agar setiap kelas yang statusnya diubah menjadi **Dibuka** langsung mendapat grup, selama kelas itu belum punya link grup. Grup otomatis memakai nomor peserta awal, jadi isi nomor itu lebih dulu.

### Memutus koneksi

Klik **Putuskan koneksi**. Hakgyo berhenti membuat grup dan mengirim pesan, dan pesan yang masih antre dibatalkan. Grup yang sudah ada tetap ada di WhatsApp, dan link grupnya tetap tampil untuk murid.

Jika ponsel melepas perangkat tertaut, kartu menampilkan **Terputus** dan pesan ditahan sampai nomor dihubungkan lagi lewat **Hubungkan ulang**.

## Membuat grup untuk satu kelas

1. Buka kelasnya, lalu tab **Pengaturan**.
2. Di kartu **Jadwal & tautan**, klik **Buat grup WhatsApp**.
3. Periksa **Nomor peserta awal**. Isinya nomor default lembaga dan boleh diganti untuk kelas ini, misalnya dengan nomor pengajarnya.
4. Klik **Buat grup**.

Dalam beberapa detik, kartu menampilkan **Dibuat oleh Hakgyo** dan link undangannya. Jika link grup sebelumnya diisi manual, link itu diganti.

Untuk menjaga nomor lembaga, Hakgyo membuat paling banyak 3 grup per jam dan 10 grup per hari. Jika batas tercapai, grup dibuat otomatis begitu memungkinkan dan halaman menampilkan bahwa pembuatan grup sedang antre.

### Melepas grup

Klik **Lepaskan grup** jika Hakgyo tidak perlu lagi mengirim pesan ke grup itu. Grupnya tetap ada di WhatsApp dan link-nya tetap tampil untuk murid. Setelah dilepas, link bisa diganti manual di **WhatsApp URL**.

### Memakai grup yang sudah ada

Punya grup sendiri? Tempel link undangannya di **WhatsApp URL** lalu klik **Simpan pengaturan**. Murid tetap melihat tombol **Grup**, tetapi Hakgyo tidak mengirim pengingat ke grup yang tidak dibuatnya.

## Pesan yang dikirim ke grup

| Pesan | Kapan | Isi |
|---|---|---|
| Pengingat pertemuan | Sekitar 60 menit sebelum mulai | Judul, jam mulai, tautan **Gabung**, tautan kelas |
| Jadwal Latihan/Tryout | Saat dijadwalkan dengan **Beri tahu murid** dicentang | Jenis dan judul, kurikulum, waktu buka dan tutup (WIB), tautan mengerjakan |

Hakgyo memeriksa pesan yang antre setiap 10 menit, jadi pesan bisa tiba beberapa menit kemudian. Pesan yang sudah tidak relevan tidak dikirim, misalnya pengingat untuk pertemuan yang sudah mulai, dipindah, atau dihapus, dan jadwal latihan yang dibatalkan atau sudah dibuka.
