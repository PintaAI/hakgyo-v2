# Grup WhatsApp Cohort

Integrasi Hakgyo dengan [Evolution API](https://github.com/EvolutionAPI/evolution-api)
agar organisasi dapat menghubungkan nomor WhatsApp, membuat grup WhatsApp per
cohort, dan mengirim pemberitahuan ke grup itu.

## Tujuan

- Owner/admin menghubungkan satu nomor WhatsApp organisasi lewat scan QR.
- Staff membuat grup WhatsApp untuk sebuah cohort dengan nama cohort dan foto
  thumbnail course. Link undangannya otomatis tersimpan di
  `Cohort.whatsappGroupUrl`, yang sudah tampil sebagai tombol untuk learner di
  web (`components/learner/learn/cohort-card.tsx`) dan mobile
  (`apps/mobile/src/components/learn/cohort-card.tsx`).
- Organisasi dapat memilih agar grup dibuat otomatis saat cohort dibuka.
- Hakgyo mengirim ke grup cohort:
  - pengingat meeting yang akan dimulai, dan
  - pemberitahuan Latihan/Tryout yang dijadwalkan.

Di luar cakupan: menambahkan learner ke grup (learner bergabung sendiri lewat
link), membaca atau membalas pesan masuk, dan pesan 1:1 ke learner.

## Keputusan

| Topik              | Keputusan                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Hosting            | Satu server Evolution API milik Hakgyo; tiap organisasi punya satu instance di server itu      |
| Versi              | Evolution API v2.4+ (dengan aktivasi lisensi satu kali, lihat [Server](#server-evolution-api)) |
| Akses              | OWNER dan ADMIN (`organization.manage`) menghubungkan nomor dan mengubah pengaturan            |
| Foto grup          | `Course.thumbnailUrl`; tanpa field gambar baru di `Cohort`                                     |
| Pembuatan grup     | Tombol manual per cohort, plus opsi organisasi untuk membuat otomatis saat cohort dibuka       |
| Peserta awal       | Wajib satu nomor selain nomor organisasi: default organisasi, bisa diganti saat membuat grup   |
| Notifikasi ke grup | Pengingat meeting dan Latihan/Tryout dijadwalkan                                               |

Evolution API menolak `group/create` tanpa peserta (`participants` punya
`minItems: 1` di skema validasinya), jadi grup tidak bisa dibuat hanya dengan
nomor organisasi. Organisasi menyimpan **nomor peserta awal** (misalnya nomor
pengajar) di pengaturan WhatsApp; dialog buat grup terisi nomor itu dan boleh
diganti. Pembuatan otomatis selalu memakai nomor default.

## Risiko dan Batasan

Evolution API memakai protokol WhatsApp Web (Baileys), bukan WhatsApp Business
Platform resmi. Ini melanggar ketentuan WhatsApp, dan nomor yang dihubungkan
bisa dibatasi atau diblokir permanen. Yang menanggung risiko adalah nomor
organisasi, bukan Hakgyo.

- Kartu WhatsApp menampilkan peringatan ini dan meminta owner/admin memakai
  nomor khusus organisasi, bukan nomor pribadi.
- Volume pesan kecil (beberapa pesan per meeting atau event per cohort), dan
  pengiriman diberi jeda serta batas (lihat [Rate Limiting](#rate-limiting)).
- Jalur resmi (Cloud API Groups) tidak dipakai karena grup dibatasi 8 peserta
  termasuk nomor bisnis, sehingga tidak muat untuk cohort.

Integrasi ini bersifat tambahan: push dan inbox Hakgyo tetap jalan apa pun
status WhatsApp. Pemicu WhatsApp hanya memasukkan baris outbox setelah
perubahan domain tersimpan, dan kegagalannya tidak pernah menggagalkan
perubahan meeting, event atau cohort maupun push lain.

## Arsitektur

```text
Hakgyo web (Vercel)                         Evolution API (server Hakgyo)
-------------------                         -----------------------------
tRPC whatsapp router  ── REST + apikey ──►  instance per organisasi
cron notifications    ── REST (outbox) ──►  ── WhatsApp Web ──► WhatsApp
/api/whatsapp/webhook ◄── webhook ───────   CONNECTION_UPDATE saja
```

Vercel hanya memanggil REST API dan menerima webhook. Koneksi WhatsApp yang
terus hidup berada di server Evolution API, karena Vercel Functions tidak bisa
menahan koneksi keluar 24/7.

### Server Evolution API

- Dijalankan sebagai container (Docker) dengan PostgreSQL dan Redis, misalnya
  di Railway atau VM. Saat ini server uji berjalan di `https://wa.hakgyo.id`
  (record A di DNS Vercel ke VPS pengembangan), dari `/opt/evolution-api`:
  Evolution API, PostgreSQL, Redis, dan Caddy untuk HTTPS di Docker Compose.
- v2.4+ menolak semua endpoint bisnis dengan HTTP 503 `LICENSE_REQUIRED` sampai
  server diaktifkan ke server lisensi Evolution Foundation. Aktivasi gratis,
  dilakukan satu kali lewat `/manager/login`, atau tanpa API key lewat
  `GET /license/register?redirect_uri=<server>/license/activate` yang
  mengembalikan halaman registrasi (nama dan email, lalu magic link). Kuncinya
  disimpan di tabel `RuntimeConfig` dan dipakai ulang saat restart maupun saat
  container dibuat ulang
  ([dokumentasi lisensi](https://docs.evolutionfoundation.com.br/en/licensing)).
  Karena hanya ada satu server, aktivasi manual sekali sudah cukup. Data yang
  dikirim saat aktivasi: nama dan email operator, versi, dan UUID instance.
  Hakgyo menampilkan 503 sebagai "Server WhatsApp belum diaktifkan".
- Lisensi: Apache-2.0 dengan dua syarat tambahan (`LICENSE`). Hakgyo hanya
  memakai Evolution API sebagai backend, tanpa komponen frontend-nya, jadi
  syarat logo tidak berlaku. Syarat **pemberitahuan penggunaan** berlaku: sistem
  harus menyatakan bahwa ia memakai Evolution API, terlihat oleh admin dan bisa
  ditemukan di dokumentasi atau halaman pengaturan. Kartu WhatsApp dan panduan
  pengajar menyebutnya. Penyebutan "Evolution API" hanya boleh deskriptif dan
  tidak boleh menyiratkan dukungan resmi (`TRADEMARKS.md`).
- Instance dibuat dengan webhook untuk `CONNECTION_UPDATE` saja, dan dengan
  `groupsIgnore`, tanpa membaca pesan atau status. Setiap webhook adalah satu
  pemanggilan Vercel Function yang ditagih.

### Konfigurasi

Di `apps/web/src/env.js` dan `apps/web/.env.example`. Semua opsional: fitur
WhatsApp tersembunyi sampai keempatnya terisi (`isWhatsappEnabled`).

| Variabel                        | Isi                                                                       |
| ------------------------------- | ------------------------------------------------------------------------- |
| `EVOLUTION_API_URL`             | Origin server Evolution API, tanpa garis miring akhir                     |
| `EVOLUTION_API_KEY`             | API key global (`AUTHENTICATION_API_KEY` di server) untuk kelola instance |
| `WHATSAPP_WEBHOOK_SECRET`       | Dikirim Evolution API sebagai header `x-hakgyo-webhook-secret`            |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Kunci base64 32 byte untuk mengenkripsi token instance                    |

Kunci global hanya dipakai untuk membuat dan menghapus instance. Route instance
lain memakai token instance masing-masing, yang disimpan terenkripsi dengan
`encryptToken`/`decryptToken` (`src/server/integrations/token-crypto.ts`),
seperti token Zoom.

## Model Data

Migrasi `20261020000000_whatsapp_cohort_groups`:

- `WhatsappConnection`: satu per organisasi. `instanceName`
  (`hakgyo-<organizationId>`), `encryptedInstanceToken`, `phoneJid` (nomor
  terhubung), `initialParticipantPhone`, `status` (`PENDING`, `CONNECTED`,
  `DISCONNECTED`), `autoCreateGroups`, `connectedAt`, `disconnectedAt`, dan
  `connectedByMembershipId`.
- `Cohort.whatsappGroupJid` (unik, `<id>@g.us`) dan `whatsappGroupCreatedAt`:
  hanya untuk grup yang dibuat Hakgyo. `whatsappGroupUrl` yang sudah ada diisi
  otomatis dari link undangan, atau tetap diisi manual untuk grup lain.
- `WhatsappOutbox`: `kind` (`CREATE_GROUP`, `GROUP_MESSAGE`), `dedupeKey`
  (unik), `payload` (`{ text }` atau `{ participant?, auto? }`), `status`
  (`PENDING`, `SENDING`, `SENT`, `FAILED`, `CANCELLED`), `attempts`,
  `sendAfter`, `expiresAt`, `claimedAt`, `lastError`, `sentAt`.

`dedupeKey` (`src/server/whatsapp/keys.ts`) membuat setiap pemicu aman
dipanggil ulang:

| Pemicu             | `dedupeKey`                                          |
| ------------------ | ---------------------------------------------------- |
| Buat grup manual   | `create-group:<cohortId>:<jumlah permintaan lalu>`   |
| Buat grup otomatis | `create-group:<cohortId>:auto`                       |
| Pengingat meeting  | `meeting-reminder:<meetingId>:<startsAt ISO>`        |
| Event dijadwalkan  | `event-scheduled:<eventId>:<cohortId>:<opensAt ISO>` |

Waktu di kunci membuat meeting yang dipindah atau event yang dijadwal ulang
mengirim pesan baru, sementara pemanggilan ulang untuk waktu yang sama tidak.
Untuk buat grup manual, dua klik bersamaan menghitung jumlah yang sama dan
bertabrakan di kunci, sehingga hanya satu grup yang dibuat.

## Alur

### Menghubungkan nomor

Kartu WhatsApp di `/workspace/[slug]/settings/integrations`, di bawah Zoom dan
Google Meet (`components/whatsapp-integration.tsx`).

1. `whatsapp.connect` membuat instance `hakgyo-<organizationId>` dengan webhook
   ke `/api/whatsapp/webhook`, header rahasia, dan event `CONNECTION_UPDATE`.
   Instance yang masih menunggu scan dipakai ulang; instance yang hilang dari
   server dibuat lagi. Status `PENDING`.
2. Dialog menampilkan QR. Selama dialog terbuka, klien memanggil
   `whatsapp.getPairing` setiap 4 detik, paling lama dua menit, karena status
   berubah dari ponsel, bukan dari Hakgyo. `getPairing` membaca
   `instance/fetchInstances`; bila `open`, koneksi menjadi `CONNECTED` dengan
   nomornya, jika belum, ia mengembalikan QR terbaru. Setelah dua menit dialog
   menawarkan **Minta QR baru**.
3. Webhook `CONNECTION_UPDATE` juga mengubah status: `open` ke `CONNECTED`;
   `close`/`refused` pada koneksi yang terhubung ke `DISCONNECTED`. Percobaan
   pairing yang tertutup tetap `PENDING`. Polling di dialog membuat pairing
   tetap berjalan bila webhook tidak sampai (misalnya di development).
4. `whatsapp.disconnect` memanggil logout dan menghapus instance, membatalkan
   outbox `PENDING` organisasi itu, lalu menghapus koneksinya. Grup yang sudah
   ada tetap ada di WhatsApp, dan `whatsappGroupUrl` tetap tersimpan.

Kartu menampilkan status, nomor terhubung, sakelar **Buat grup otomatis saat
kelas dibuka**, **Nomor peserta awal**, tombol putuskan, peringatan risiko
(sebelum terhubung), dan keterangan "Koneksi WhatsApp memakai Evolution API".
Nomor dinormalisasi ke format internasional (`0812…` menjadi `62812…`,
`src/lib/whatsapp.ts`).

### Membuat grup cohort

Di tab Pengaturan cohort, kartu **Jadwal & tautan**
(`components/cohort-whatsapp-group.tsx`):

- Belum ada grup Hakgyo: field **WhatsApp URL** untuk link manual, dan tombol
  **Buat grup WhatsApp** bila nomor organisasi terhubung (jika belum, tautan ke
  pengaturan integrasi). Dialognya meminta nomor peserta awal, terisi nomor
  default.
- Sudah dibuat Hakgyo (`whatsappGroupJid` terisi): link, tombol **Buka**, dan
  **Lepaskan grup**. `cohort.update` menolak mengganti link selama grup
  tertaut. Melepas grup mengosongkan `whatsappGroupJid` dan membatalkan pesan
  yang antre; link tetap ada dan kembali bisa diedit manual.

`whatsapp.createCohortGroup` (permission cohort `update`) memasukkan outbox
`CREATE_GROUP` dan langsung menjalankannya bila batas per jam masih ada, jadi
staff melihat hasil atau error dalam beberapa detik. Kegagalan langsung menjadi
`FAILED` dan tampil di bawah tombol; staff bisa mencoba lagi. Bila batas
tercapai, baris tetap antre untuk cron. Prosesnya (`src/server/whatsapp/groups.ts`):

1. `POST /group/create/{instance}` dengan `subject` = nama cohort (maksimal 100
   karakter), `description` = deskripsi cohort plus link kurikulum di Hakgyo
   (maksimal 2048 karakter), dan `participants` = nomor peserta awal. JID grup
   langsung disimpan, sehingga percobaan ulang tidak membuat grup kedua.
2. `POST /group/updateGroupPicture/{instance}` dengan URL `Course.thumbnailUrl`
   (server Evolution API mengunduhnya). Gagal pasang foto hanya dicatat.
3. `GET /group/inviteCode/{instance}?groupJid=…` lalu simpan `inviteUrl` ke
   `whatsappGroupUrl`.

Cohort self-paced (`defaultForCourseId`) tidak bisa punya grup.

### Pembuatan otomatis

Bila `autoCreateGroups` aktif, `cohort.create` dengan status `OPEN` dan
`cohort.update` yang mengubah status ke `OPEN` memasukkan outbox
`CREATE_GROUP` (`enqueueAutoCohortGroup`) setelah transaksi selesai, kecuali
cohort sudah punya link grup. Baris ini diproses cron dengan batas yang sama,
jadi membuka banyak cohort sekaligus tidak membuat banyak grup dalam waktu
singkat.

### Pemberitahuan ke grup

Pesan ke grup dimasukkan ke outbox di samping push, tidak menggantikannya
(`src/server/whatsapp/cohort.ts`, teks di `messages.ts`). Cohort tanpa
`whatsappGroupJid` dilewati.

- **Pengingat meeting**: setelah `notifyMeetingStartingSoon` mengklaim
  `CohortMeeting.reminderSentAt` (sekitar satu jam sebelum mulai), satu
  `GROUP_MESSAGE` untuk cohort meeting itu, kedaluwarsa saat meeting mulai.
  Isi: judul, waktu mulai dalam zona meeting, `joinUrl` bila ada, dan link
  kelas. Memindah waktu atau menghapus meeting membatalkan pesan yang antre.
- **Latihan/Tryout dijadwalkan**: setelah `scheduleEvent` dan
  `createAssessmentEvent` dengan jadwal (`event-management.ts`), satu
  `GROUP_MESSAGE` per kelas target yang punya grup, kedaluwarsa saat event
  dibuka, bila "Beri tahu peserta" (`notifyOnOpen`) aktif. Isi: jenis dan judul
  event, course, waktu buka dan tutup dalam WIB, dan link
  `/learn/assessments/<eventId>`. Menjadwal ulang membatalkan pesan untuk waktu
  lama; menambah kelas ke event terjadwal mengirim ke grup kelas baru;
  membuka lebih awal, membatalkan, atau menghapus event membatalkan pesan yang
  antre.

Push memakai waktu relatif karena zona waktu learner tidak tersimpan andal.
Pesan grup dibaca kemudian, jadi memakai waktu absolut berlabel zona.

### Memproses outbox

`processWhatsappOutbox` di `src/server/whatsapp/outbox.ts`, dipanggil cron
`/api/cron/notifications` (setiap 10 menit) setelah pengingat, sehingga
pengingat meeting terkirim di putaran yang sama:

- Baris `SENDING` yang diklaim lebih dari 10 menit lalu kembali ke `PENDING`;
  baris yang `expiresAt`-nya lewat menjadi `CANCELLED`.
- Baris `PENDING` yang jatuh tempo, milik organisasi yang `CONNECTED`, dikelompokkan
  per nomor. Nomor diproses paralel; dalam satu nomor berurutan dengan jeda
  acak dan dalam batasnya. Koneksi yang tidak `CONNECTED` membiarkan barisnya
  antre sampai kedaluwarsa atau koneksi kembali.
- Setiap baris diklaim lewat update bersyarat ke `SENDING`, seperti klaim
  pengingat, sehingga cron yang tumpang tindih tidak mengirim dua kali.
- Gagal sementara (server tidak terjangkau, 5xx): `sendAfter` mundur 10 menit,
  30 menit, lalu 2 jam. Setelah 5 percobaan, atau ditolak (400/404): `FAILED`
  dengan `lastError`. Pesan grup yang ditolak memeriksa `group/findGroupInfos`;
  bila grup sudah tidak ada untuk nomor itu (404), link dan JID grup dikosongkan
  dari cohort.
- Tidak ada `maxDuration` baru; putaran berhenti memulai kiriman setelah 180
  detik.

## Rate Limiting

Evolution API tidak punya pembatas laju bawaan untuk pengiriman keluar; opsi
`delay` di pesan hanya simulasi mengetik. Pembatas ada di outbox Hakgyo
(`src/server/whatsapp/pacing.ts`):

| Batas                              | Nilai                  |
| ---------------------------------- | ---------------------- |
| Kiriman per nomor per putaran cron | 10                     |
| Jeda antar kiriman satu nomor      | 3–8 detik, acak        |
| Grup baru per nomor                | 3 per jam, 10 per hari |
| Pesan grup per nomor per hari      | 100                    |

Nilai ini dugaan aman, bukan angka resmi WhatsApp. Batas dihitung dari baris
`SENT` (`sentAt`). Baris yang melewati batas tetap `PENDING` dan `sendAfter`-nya
digeser satu jam (grup) atau tiga jam (pesan).

## Webhook

`POST /api/whatsapp/webhook`:

- Menolak permintaan tanpa header `x-hakgyo-webhook-secret` yang cocok
  (`timingSafeEqual`, seperti route cron). Header ini dipasang di konfigurasi
  webhook setiap instance saat dibuat.
- Event dinormalisasi (`connection.update` dan `CONNECTION_UPDATE` sama). Hanya
  `CONNECTION_UPDATE` yang diproses; instance yang tidak dikenal diabaikan.

## API (`whatsapp` router)

Router `src/server/api/routers/whatsapp.ts`, didaftarkan di `root.ts` dengan
`lazy(() => import(...))`. Logika di `src/server/whatsapp/`: `client.ts` (REST
Evolution API), `config.ts`, `connection.ts`, `cohort.ts` (pemicu), `groups.ts`,
`outbox.ts`, `pacing.ts`, `keys.ts`, `messages.ts`.

| Procedure                                                                | Pemanggil                  |
| ------------------------------------------------------------------------ | -------------------------- |
| `getConnection`, `connect`, `getPairing`, `disconnect`, `updateSettings` | `organization.manage`      |
| `getCohortStatus`, `createCohortGroup`, `unlinkCohortGroup`              | Permission cohort `update` |

Halaman integrasi dan tab Pengaturan cohort mem-prefetch query-nya saat render
server. Kontrak mobile hanya bertambah router baru; learner sudah menerima
`whatsappGroupUrl`.

## Endpoint yang Dipakai

Diperiksa dari source Evolution API `2.4.0-rc2` (`src/api/routes`,
`src/validate`, `whatsapp.baileys.service.ts`):

| Kebutuhan        | Endpoint                                                            | Catatan                                                            |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Buat instance    | `POST /instance/create`                                             | Kunci global; `webhook: { url, headers, events, enabled }`         |
| QR               | `GET /instance/connect/{instance}`                                  | `base64` berupa data URL PNG                                       |
| Status dan nomor | `GET /instance/fetchInstances?instanceName=…`                       | `connectionStatus`, `ownerJid`                                     |
| Putus            | `DELETE /instance/logout/{instance}`, `/instance/delete/{instance}` |                                                                    |
| Buat grup        | `POST /group/create/{instance}`                                     | `participants` minimal satu; nomor yang tidak di WhatsApp disaring |
| Foto grup        | `POST /group/updateGroupPicture/{instance}`                         | `image` berupa URL atau base64                                     |
| Link undangan    | `GET /group/inviteCode/{instance}?groupJid=…`                       | Mengembalikan `inviteUrl`                                          |
| Info grup        | `GET /group/findGroupInfos/{instance}?groupJid=…`                   | 404 bila grup tidak bisa dibaca nomor itu                          |
| Kirim teks       | `POST /message/sendText/{instance}`                                 | `number` boleh JID grup                                            |

Route instance menerima token instance di header `apikey`. Webhook mengirim
`{ event, instance, data: { state, statusReason, wuid } }` dengan header
kustom dari konfigurasi instance.

Belum diuji dengan nomor sungguhan: perilaku WhatsApp saat ponsel melepas
perangkat tertaut atau nomor dibatasi. Uji ini dengan nomor khusus sebelum
dipakai organisasi sungguhan.

## Pengujian

- Unit: `src/lib/whatsapp.test.ts` (nomor), `src/server/whatsapp/messages.test.ts`,
  `keys.test.ts`, `pacing.test.ts`.
- Integrasi: `src/server/whatsapp/whatsapp.integration.test.ts` memakai
  `DATABASE_URL` dan server Evolution API tiruan lokal: pairing, webhook,
  pengaturan, pembuatan grup (nama, foto, link), foto gagal, pengingat meeting,
  event terjadwal dan jadwal ulang, retry dan grup hilang, batas per jam,
  pembuatan otomatis, dan memutus koneksi.

## Panduan Pengguna dan Landing Page

- Pengajar: halaman baru `pengajar/11-[MessageCircleIcon]-grup-whatsapp.md`,
  plus `04-…-kelas-jadwal.md` (grup di Pengaturan kelas) dan
  `07-…-latihan-tryout.md` ("Beri tahu peserta" juga ke grup WhatsApp).
- Murid: `01-…-mulai-belajar.md` dan `03-…-belajar-materi.md` menyebut bahwa
  pengingat kelas bisa datang di grup WhatsApp.
- Landing page: kartu WhatsApp di `slides/integrations.tsx` menyebut grup kelas
  otomatis dan pengingat ke grup. Tidak memakai logo Evolution API, dan tidak
  menjanjikan pesan pribadi ke murid atau penambahan murid otomatis ke grup.
