# Analitik Workspace

Halaman Analitik (`/workspace/[slug]/analitik`) merangkum hasil belajar,
pertumbuhan murid, dan pendapatan sebuah organisasi. Halaman ini punya tiga tab
dengan periode yang sama untuk ketiganya.

| Tab        | Route                  | Siapa                                |
| ---------- | ---------------------- | ------------------------------------ |
| Performa   | `/analitik/performa`   | OWNER, ADMIN, TEACHER                |
| Murid      | `/analitik/murid`      | OWNER, ADMIN, TEACHER                |
| Pendapatan | `/analitik/pendapatan` | OWNER, ADMIN (`organization.manage`) |

## Cakupan Data

- **OWNER/ADMIN** melihat seluruh organisasi, termasuk Kelas Mandiri setiap
  kurikulum (cohort default dengan `defaultForCourseId`).
- **TEACHER** hanya melihat kelas yang ia pegang, dengan aturan yang sama
  dengan daftar kelasnya (`getOrganizationCohortScope`): mode SIMPLE memakai
  kelas tempat ia menjadi staf, mode ADVANCED juga kelas dari kurikulum yang
  ia miliki. Kelas Mandiri ikut bila ia memegangnya, seperti kelas lain.
  Attempt tanpa kelas (`cohortId` kosong, termasuk attempt lewat Kelas
  Mandiri) tidak masuk ke cakupan pengajar.
- Kelas Mandiri tampil sebagai baris kelas biasa di perbandingan per kelas.
  Attempt-nya tetap tanpa `cohortId`, jadi rata-rata nilai baris Kelas
  Mandiri dihitung dari attempt tanpa kelas pada item kurikulum tersebut.
- Cakupan dihitung di `src/server/analytics/scope.ts` dan dipakai oleh
  semua query lewat `cohortFilter`.
- Tab Pendapatan tidak ditampilkan untuk TEACHER. Halamannya mengalihkan ke
  dashboard dan prosedurnya mengembalikan `FORBIDDEN`.

## Periode

Periode disimpan di parameter `?periode=` dan dipertahankan saat berpindah
tab. Nilai default `30h`.

| Nilai       | Rentang                | Kelompok grafik  | Pembanding                         |
| ----------- | ---------------------- | ---------------- | ---------------------------------- |
| `7h`        | 7 hari sampai sekarang | harian           | 7 hari sebelumnya                  |
| `30h`       | 30 hari                | harian           | 30 hari sebelumnya                 |
| `90h`       | 90 hari                | mingguan (Senin) | 90 hari sebelumnya                 |
| `bulan-ini` | sejak tanggal 1        | harian           | bulan lalu, sampai titik yang sama |
| `12b`       | 12 bulan kalender      | bulanan          | 12 bulan sebelumnya                |

- Semua tanggal memakai zona `Asia/Jakarta` (WIB, UTC+7 tanpa DST). Kolom
  `DateTime` Prisma disimpan sebagai UTC, jadi SQL mengelompokkan dengan
  `(kolom AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'` (`localBucket`).
- Pembanding selalu menutup durasi yang sama dengan periode berjalan, jadi
  bulan yang belum selesai tidak dibandingkan dengan bulan penuh.
- Logika periode ada di `src/lib/analytics/period.ts` (dengan unit test).

## Definisi

### Performa

- **Rata-rata nilai**: rata-rata `score / maxScore` dari pengerjaan terbaik
  tiap murid per tugas kurikulum, di antara pengerjaan `GRADED` yang dinilai
  (`gradedAt`) dalam periode. Pengerjaan dengan `maxScore` 0 diabaikan.
- **Tingkat lulus**: bagian dari pengerjaan terbaik itu yang mencapai
  `Assessment.passingScore`. Tugas tanpa `passingScore` tidak dihitung.
- **Penyelesaian materi** (saat ini, bukan per periode): item terbit yang
  diselesaikan (`ContentProgress` `COMPLETED`) dibagi jumlah item terbit
  dikali murid aktif dan lulus. Tugas kurikulum selesai saat lulus.
- **Review**: median `gradedAt − submittedAt` untuk pengerjaan yang punya
  jawaban direview, dan jumlah pengerjaan `IN_REVIEW`/`SUBMITTED` saat ini.
- **Latihan & tryout** dihitung terpisah: nilai terbaik tiap peserta per
  event, tanpa peserta yang hasilnya dibatalkan. Event tidak memengaruhi
  rata-rata tugas atau penyelesaian.
- "Tugas paling sulit" hanya memuat tugas dengan minimal tiga murid.

### Murid

- **Murid terdaftar**: murid berbeda dengan keanggotaan `ACTIVE` atau
  `COMPLETED`.
- **Murid aktif**: murid terdaftar yang punya aktivitas dalam periode.
  Aktivitas adalah `UserActivityEvent` (materi selesai, kosakata, tugas
  dikumpulkan/lulus) ditambah pengerjaan tugas yang dimulai atau
  dikumpulkan. Login dan membuka halaman tidak dicatat.
- **Pendaftaran baru**: `CohortEnrollment.enrolledAt` dalam periode, dirinci
  per sumber (pembelian, undangan, ditambahkan staf, daftar sendiri).
- **Tidak aktif 30+ hari** (saat ini): murid dengan keanggotaan `ACTIVE`
  yang aktivitas terakhirnya, atau pendaftaran terakhirnya bila belum pernah
  aktif, lebih dari 30 hari lalu. Daftar memuat 20 murid yang paling lama.
- **XP tertinggi**: jumlah `xpAwarded` dalam periode di organisasi ini.

### Pendapatan

- **Pendapatan**: jumlah `Payment.amount` berstatus `PAID` menurut `paidAt`.
  Membatalkan persetujuan (`PAID → REJECTED`) mengosongkan `paidAt`, jadi
  pembayaran itu hilang dari semua periode, termasuk periode lampau.
- **Menunggu verifikasi** (saat ini): pembayaran `SUBMITTED`.
- **Konversi checkout**: pasangan murid–kelas yang memulai checkout dalam
  periode dan sudah lunas. Percobaan ulang murid untuk kelas yang sama
  dihitung sekali.
- Semua pembayaran IDR. Kelas gratis tidak membuat baris `Payment`, jadi
  tidak muncul di tab ini.

## Ringkasan Dashboard dan Laporan Mingguan

- Dashboard menampilkan kartu "Analitik · 30 hari" dari
  `analytics.summary`: murid aktif, rata-rata nilai, dan pendapatan untuk
  OWNER/ADMIN. Angkanya memakai definisi yang sama dengan halaman Analitik.
- Setiap Senin 08:00 WIB, workflow `.github/workflows/analytics-digest.yml`
  memanggil `/api/cron/analytics-digest` (`Authorization: Bearer
${CRON_SECRET}`). Setiap OWNER, ADMIN, dan TEACHER yang punya murid dalam
  cakupannya mendapat notifikasi `analytics-weekly` (inbox dan push browser)
  berisi ringkasan 7 hari, dengan tautan ke Analitik.
- Run yang diulang aman: anggota yang sudah menerima ringkasan untuk
  organisasi yang sama dalam 6 hari terakhir dilewati.

## Kode

- Service: `src/server/analytics/` (`revenue.ts`, `learners.ts`,
  `performance.ts`, `summary.ts`, `weekly-digest.ts`, `scope.ts`, `sql.ts`).
- Router: `src/server/api/routers/analytics.ts` (`revenue`, `learners`,
  `performance`, `summary`), input `{ organizationId, period }`.
- UI: `src/app/(workspace)/workspace/[organizationId]/analitik/` dan
  `src/components/analytics/`. Grafik memakai Recharts lewat
  `src/components/ui/chart.tsx` dan warna `--primary`/`--chart-N`.
- Indeks: `Payment [organizationId, status, paidAt]` dan
  `AssessmentAttempt [organizationId, status, gradedAt]`.

## Data Demo

`bun run --cwd apps/web db:seed:analytics` membuat organisasi terpisah
"Akademi Hangeul Nusantara" (`/workspace/akademi-hangeul`) berisi data
sintetis 12 bulan: tiga kurikulum, delapan kelas, sekitar 100 murid,
pembayaran, pengerjaan tugas, latihan/tryout, aktivitas, dan ringkasan
mingguan di inbox. Jalankan `db:seed` lebih dulu karena demo memakai akun
`owner@hakgyo.test` (OWNER) dan `teacher@hakgyo.test` (TEACHER, pengajar dua
kelas). Menjalankan ulang mengganti organisasi demo tanpa menyentuh data
lain.
