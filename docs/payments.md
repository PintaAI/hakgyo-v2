# Pembayaran Group Belajar

Hakgyo menerima pembayaran Group belajar (cohort) berbayar secara manual:
learner membayar ke QRIS atau rekening bank milik organisasi, mengunggah
bukti, lalu staff memeriksa dan menyetujuinya. Modelnya sudah disiapkan untuk
payment gateway (Midtrans, Xendit), tetapi gateway belum diimplementasikan.

## Ringkasan Alur

```text
Owner/admin                    Learner                         Staff cohort
-----------                    -------                         ------------
Atur QRIS / rekening  ──►  Katalog atau undangan
                           /learn/checkout/[cohortId]
                           pilih metode ──► Payment PENDING
                           bayar, unggah bukti ──► SUBMITTED ──► tab Pembayaran
                                                                 setujui ──► PAID
                                                                   + CohortEnrollment
                                                                     ACTIVE / PURCHASE
                                                                 tolak ──► REJECTED
```

- Harga efektif cohort adalah `Cohort.price`, atau `Course.price` jika cohort
  tidak mengisi harga. Harga 0 berarti gratis: checkout langsung membuat
  membership.
- Cohort bisa di-checkout bila status `OPEN`/`IN_PROGRESS`, belum berakhir,
  course `PUBLISHED`, kapasitas belum penuh, dan mode enrollment efektif
  (`cohort → course → organisasi`) `OPEN` atau learner membawa invite valid ke
  cohort tersebut.
- Kapasitas hanya menghitung member aktif; checkout yang belum dibayar tidak
  menahan kursi. Staff tetap dapat menyetujui pembayaran walau kuota penuh.
- Invite ke cohort berbayar tidak lagi memberi akses gratis. Halaman undangan
  mengarahkan learner ke checkout, dan satu pemakaian invite terpakai saat
  payment dibuat. Penambahan learner manual oleh staff tetap gratis.

## Pengaturan Organisasi

`/workspace/[slug]/settings/payments`, hanya OWNER dan ADMIN
(`organization.manage`).

- **QRIS**: owner mengunggah gambar QRIS statis. Browser membaca kode QR
  (`jsqr`), server memvalidasi payload EMVCo (tag wajib, mata uang 360,
  negara ID, CRC16) dan menolak QRIS dinamis. Setiap payment membuat QRIS
  dinamis dengan nominal terisi (`toDynamicQris` di `src/lib/qris.ts`).
- **Rekening bank**: daftar bank Indonesia dengan sandi Bank Indonesia ada di
  `src/lib/payments/banks.ts`. Bank yang tidak terdaftar memakai kode `OTHER`
  dengan nama bebas. Rekening dapat dinonaktifkan tanpa dihapus.
  Bank ditampilkan dengan badge inisial berwarna merek (`bankBadge`,
  `BankBadge`), bukan logo: logo bank adalah merek dagang, dan koleksi logo
  terbuka seperti `idn-finlogos` berlisensi CC BY-NC (non-komersial).

Instruksi bayar (payload QRIS atau daftar rekening) disalin ke
`Payment.instructions` saat checkout, sehingga perubahan pengaturan tidak
mengubah payment yang sudah dibuat.

## Status Payment

| Status      | Arti                                          | Transisi                                                         |
| ----------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `PENDING`   | Checkout dibuat, menunggu learner membayar    | `SUBMITTED`, `PAID`, `REJECTED`, `CANCELLED`, `EXPIRED`          |
| `SUBMITTED` | Learner mengunggah bukti, menunggu verifikasi | `SUBMITTED` (ganti bukti), `PAID`, `REJECTED`, `CANCELLED`       |
| `PAID`      | Disetujui; learner menjadi member `PURCHASE`  | `REJECTED` (batalkan persetujuan, membership `PURCHASE` dicabut) |
| `REJECTED`  | Ditolak dengan alasan                         | `SUBMITTED` (learner kirim bukti baru), `PAID`                   |
| `CANCELLED` | Dibatalkan learner/staff, atau digantikan     | `PAID`                                                           |
| `EXPIRED`   | Kedaluwarsa (dipakai gateway)                 | `PAID`                                                           |

Aturan ada di `canTransitionPayment` (`src/lib/payments/payment.ts`). Setiap
perubahan memegang advisory lock per learner dan cohort
(`lockLearnerCohortPayments`), sehingga learner hanya punya satu payment
terbuka (`PENDING`/`SUBMITTED`) per cohort. Persetujuan membatalkan payment
terbuka lain milik learner yang sama.

## Siapa Memverifikasi

Permission cohort `payments.manage` (`managePayments`): pengelola semua
cohort, pengelola invite cohort, instructor (mode ADVANCED) atau staff yang
ditugaskan (mode SIMPLE). Owner/admin dan staff cohort mendapat notifikasi saat
bukti baru masuk; learner mendapat notifikasi saat disetujui atau ditolak.

Bukti pembayaran disimpan privat di R2 (`payment-proofs/[paymentId]/...`) dan
hanya dibuka lewat signed URL untuk learner pemiliknya dan verifikator.

## API (`payment` router)

| Procedure                                                       | Pemanggil         |
| --------------------------------------------------------------- | ----------------- |
| `getSettings`, `saveQris`, `setQrisEnabled`, `removeQris`       | Owner/admin       |
| `createBankAccount`, `updateBankAccount`, `deleteBankAccount`   | Owner/admin       |
| `getCohortCheckout`, `startCohortCheckout`                      | Learner           |
| `listMine`, `get`, `cancel`, `createProofUpload`, `submitProof` | Learner pemilik   |
| `getProofUrl`                                                   | Pemilik/staff     |
| `listForCohort`, `approve`, `reject`, `cancelForCohort`         | `payments.manage` |

`course.getPublished` menyertakan `cohorts`: cohort kelas yang bisa diikuti
publik beserta harga efektif dan sisa kursi.

## Menambahkan Payment Gateway

Struktur yang sudah disiapkan:

- `PaymentProvider` (`MANUAL`, `MIDTRANS`, `XENDIT`) dan kolom
  `providerPaymentId` (unik per provider), `providerData`, `expiresAt` pada
  `Payment`.
- `PaymentProviderAdapter` di `src/server/payment/providers.ts`. Adapter
  gateway membuat charge di gateway dan mengembalikan instruksi (misalnya
  `{ kind: "QRIS", payload }` dari QR string gateway), `providerPaymentId`,
  dan `expiresAt`. Pilih adapter di `paymentProviderFor`.
- `markPaymentPaid` (`src/server/payment/lifecycle.ts`) adalah satu-satunya
  jalur yang memberi akses. Webhook gateway cukup memverifikasi signature,
  mencari payment lewat `provider` + `providerPaymentId`, lalu memanggil
  `markPaymentPaid` tanpa `reviewerUserId`, atau mengubah status ke `EXPIRED`.

Yang perlu ditambahkan untuk gateway: kredensial di `src/env.js` dan
`.env.example`, adapter, route webhook (misalnya
`/api/payments/[provider]/webhook`), job kedaluwarsa untuk payment `PENDING`
yang melewati `expiresAt`, dan pemanggilan gateway di luar transaksi database
jika request ke gateway lambat.
