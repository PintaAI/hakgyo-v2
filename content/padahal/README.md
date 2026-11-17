# Seri "Padahal"

**Premis:** Korea itu simple. Padahal, tapi, nih, sampai koma cukup satu kata: **-는데**, yang bekerja seperti titik-titik di chat. Selama enam episode, penonton mengumpulkan cara bilang "padahal" di situasi yang makin sulit, dan di akhir ternyata hampir semuanya kembali ke -는데.

**Pola cerita:** rantai *masalah → perbaikan → masalah baru*. Setiap perbaikan memunculkan masalah berikutnya, dan masalah itu menjadi cliffhanger ("tapi…") yang membuka episode selanjutnya. Penghubungnya selalu "tapi" dan "makanya", jangan "terus".

| | |
|---|---|
| Format | 6 short, ±60 detik, 9:16 (1080×1920) |
| Kursus sumber | Indonesia → Korea (`pb-indo-korea`), bab 1 "Padahal" (module position 0) |
| Penonton | Orang Indonesia yang sudah bisa baca Hangeul, banyak di antaranya pekerja atau calon pekerja di Korea (EPS) |
| Bahasa VO | Indonesia santai (aku–kamu, gaya Gen Z ringan), contoh dalam bahasa Korea |
| Tokoh dan suara | Default: "kamu" tanpa wajah (kartu kata + layar chat), narator VO TTS. Bisa diganti, lihat [Pertanyaan terbuka](#pertanyaan-terbuka) |
| Status | Naskah draf. Kalimat Korea belum dicek founder |

## Daftar episode

| Ep | File | Judul | Rantai | Ubin baru | Status |
|---|---|---|---|---|---|
| 1 | [ep01-satu-kata.md](ep01-satu-kata.md) | Satu kata, empat arti | "-는데 = padahal" patah di 비싼데 맛있어 → -는데 itu "…" di chat, polanya alasan + 는데 + akibatnya. Teaser: bedanya dengan -아/어서 dan -(으)니까? | -는데 | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |
| 2 | [ep02-kurang-nendang.md](ep02-kurang-nendang.md) | -는데 kurang nendang | -는데 terlalu kalem → -는데도 | -는데도 | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |
| 3 | [ep03-protes.md](ep03-protes.md) | Dia udah janji, kok nggak dateng? | Heran saja tidak cukup untuk protes → -(으)면서 왜 / -잖아 | -(으)면서 · -잖아 | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |
| 4 | [ep04-dua-jam.md](ep04-dua-jam.md) | Aku udah nunggu DUA JAM | Menyalahkan bikin ribut → angka + 이나 + -는데 digantung | -이나 …-는데 | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |
| 5 | [ep05-banjangnim.md](ep05-banjangnim.md) | Protes ke 반장님 | -(으)면서 ke atasan terdengar nyolot → fakta dengan bentuk hormat, digantung | -(으)셨는데요… | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |
| 6 | [ep06-tadinya-mau.md](ep06-tadinya-mau.md) | Padahal tadinya mau dateng… | 하는데 berarti rencana masih jalan → 했는데. Twist -잖아, lalu peta | -(으)려고 했는데 | Naskah 🟡 · Cek Korea ⬜ · VO ⬜ · Edit ⬜ · Publish ⬜ |

### Video bonus

| File | Judul | Isi | Status |
|---|---|---|---|
| belum dibuat | -는데 vs -아/어서 vs -(으)니까 | Menjawab teaser Ep 1 ("kalau sebab-akibat, apa bedanya?"). Sekaligus meluruskan penyederhanaan Ep 1: -는데 memasang latar, sedangkan -아/어서 dan -(으)니까 yang benar-benar "karena". Sumber: `pb-ik-soalnya-material`, `pb-ki-aseo-karena-material`, `pb-ki-nikka-material` | Naskah ⬜ |

Video bonus berdiri sendiri, di luar hitungan 6 episode. Posting setelah Ep 1 supaya janji "jawabannya di part berikutnya" terpenuhi.

Urutan episode **tidak sama** dengan urutan materi di aplikasi. Materi 3 ("tadinya mau") sengaja ditaruh di akhir supaya cerita mengalir dalam satu minggu dan twist-nya kena.

## Materi sumber (database, read-only)

| Materi | Id | Dipakai di |
|---|---|---|
| Padahal (hasil nggak sesuai) • -는데, -는데도 · ★ | `pb-ik-padahal-hasil-material` | Ep 1, 2 |
| Padahal (nyalahin) • -(으)면서, -잖아 | `pb-ik-padahal-protes-material` | Ep 3, 5 |
| Padahal udah ... (kesel) • -이나 ...-는데 | `pb-ik-padahal-kesal-material` | Ep 4 |
| Padahal tadinya mau • -(으)려고 했는데 | `pb-ik-padahal-rencana-material` | Ep 6 |
| Kosakata: padahal | `pb-ik-01-padahal-vocab` | CTA Ep 6 (latihan di app) |
| Kuis: padahal | `pb-ik-01-padahal-quiz` | CTA Ep 6 (latihan di app) |

Isi materi bisa dibaca dari tabel `Material` (kolom `content`, berupa blok editor). Kartu tata bahasa ada di blok pertama dengan `type: "grammar"`.

## Alur cerita (satu minggu)

| Hari | Ep | Kejadian |
|---|---|---|
| Minggu pagi | 1 | Kamu sudah sarapan, tapi masih lapar |
| Minggu siang | 2 | Kamu flu dan sudah minum obat, tapi demamnya tidak turun |
| Minggu sore | 3 | Janjian dengan 지훈 jam 2, dia tidak datang |
| Minggu sore | 4 | Kamu sudah menunggu dua jam |
| Kamis | 5 | Di kalender: Sabtu ulang tahun 지훈. 반장님 menyuruh masuk Sabtu, padahal dulu bilang Sabtu libur |
| Sabtu | 6 | Kamu batal datang ke ulang tahun 지훈. Dia membalas "온다고 했잖아!", kalimat yang dulu kamu pakai ke dia |

## Karakter

| Karakter | Siapa | Tampil sebagai | Bahasa | Muncul |
|---|---|---|---|---|
| **Kamu** (POV) | Orang Indonesia umur 20-an yang kerja di pabrik di Korea dan belajar bahasa Korea di Hakgyo | Tanpa wajah. Kalimat Indonesianya tampil sebagai kartu; di chat, gelembung kanan | Indonesia (di kartu), Korea (di chat) | Semua episode |
| **지훈 (Jihun)** | Teman Korea seumuran. Santai, suka telat, akrab sehingga boleh 반말 | Kontak chat dengan monogram "지" di lingkaran abu-abu, tanpa foto | Korea 반말 | Ep 3, 4, 5 (kalender), 6 |
| **반장님** | Kepala regu di tempat kerja. Formal dan sopan, bukan orang jahat | Kontak chat dengan monogram "반", tanpa foto | Korea formal (-요 / -습니다) | Ep 5 |
| **Narator** | Teman yang menjelaskan, bukan guru. Kalem, sedikit jahil, tidak heboh | Suara saja | Indonesia santai | Semua episode |
| **Suara contoh Korea** | Pembaca kalimat contoh, netral dan jelas | Suara saja | Korea | Semua episode |

Karakter tidak punya wajah supaya produksinya tidak bergantung pada aktor atau ilustrasi. Kalau nanti memakai karakter bergambar, ubah tabel ini dulu, baru file episodenya.

## Sistem visual

Mengikuti tampilan editorial di [aturan umum](../README.md#aturan-umum-video).

**Tata letak 9:16 (semua di dalam area aman x 60–940, y 250–1440):**

```text
y 250–330    Label seri:  PADAHAL · n/6
y 340–440    Rak ubin: ubin akhiran yang sudah dikumpulkan, berjajar dari kiri
y 480–1240   Panggung: kartu kalimat, layar chat, atau peta
y 1280–1440  Caption VO
```

- **Warna:** latar off-white dan tinta monokrom. Satu aksen **biru**, sama dengan kartu tata bahasa ik-* di aplikasi, khusus untuk akhiran Korea yang sedang diajarkan.
- **Kartu kalimat:** kartu putih dengan bayangan lembut. Satu kartu berisi satu potongan kalimat (misalnya "Aku laper" | "padahal" | "udah makan"). Kartu bisa digeser dengan gerak *ease-in-out* tanpa pantul.
- **Gerak khas seri:** titik-titik "…" di antara dua potongan kalimat (atau di gelembung chat) berubah jadi ubin biru `는데`. Ini visualisasi inti Ep 1 ("-는데 = titik-titik di chat"), dan dipakai lagi setiap kali -는데 muncul.
- **Ubin akhiran:** pil kecil biru berisi akhiran Korea (`-는데`). Ubin muncul di kalimat, lalu terbang pelan ke rak di atas. Rak ini berlanjut antar episode: Ep 3 dibuka dengan dua ubin di rak, dan seterusnya.
- **Kalimat salah:** garis coret tipis merah redup melintas dari kiri ke kanan, lalu kalimat memudar ke abu-abu 40%. Tanpa stempel ❌ dan tanpa getar.
- **Kalimat benar:** tinta penuh. Akhiran yang diajarkan diberi garis bawah biru yang tergambar dari kiri, ditambah *focus ring* lembut.
- **Layar chat:** bingkai ponsel polos dengan UI chat generik (bukan KakaoTalk atau merek lain). Gelembung muncul satu per satu.
- **Peta (Ep 6):** keenam ubin menyusun diri mengelilingi **-는데** di tengah, dihubungkan garis tipis.
- **CTA Ep 6:** rekaman asli aplikasi mobile yang membuka bab Padahal, dalam bingkai ponsel. Rekaman asli menjadi bintang di akhir seri.

## Audio

- **Narator (ID):** kalem, hangat, seperti ngobrol, dengan suara yang sama di semua episode (rekaman sendiri atau TTS). Akhiran Korea yang diucapkan di tengah kalimat Indonesia ditulis fonetis di naskah VO (misalnya *neunde*), sedangkan di layar tetap Hangeul.
- **Suara contoh Korea (KO):** satu suara Korea netral untuk semua kalimat contoh. Kalimat 지훈 di Ep 6 boleh memakai suara laki-laki muda yang berbeda.
- **Musik:** satu track berlisensi komersial yang sama untuk keenam episode, tanpa drum, pelan di bawah VO.
- **SFX (pelan):** whoosh saat kartu bergeser, buzzer kecil saat garis coret, ding saat garis bawah biru, pop saat ubin masuk rak, tick untuk gelembung chat.

## Aturan seri

- **0–3 detik: hook.** Kalimat Indonesia atau situasi yang langsung terasa. Tanpa logo dan tanpa "halo guys".
- **Recap 1 baris** (mulai Ep 2): "Kemarin: …", sambil rak ubin menyala.
- **Cliffhanger** sebelum CTA selalu dimulai dengan "Tapi…" dan menyebut masalah episode berikutnya.
- **CTA:** "Follow, part berikutnya." Ep 1 memakai CTA komentar: "Komen 🇰🇷, nanti aku kirim link kelas Indonesia–Korea", plus Follow untuk jawaban teaser. Ep 6 ditutup dengan "Latihan semuanya di bab Padahal, di Hakgyo. Follow buat seri berikutnya."
- **Teks layar mengikuti VO.** Kalimat Korea selalu tampil dengan artinya dalam bahasa Indonesia (lebih kecil, abu-abu), tanpa romanisasi.

## Elemen berulang

Empat elemen ini muncul di hampir semua episode. Buat sekali dan pakai ulang supaya tampilan seri konsisten:

| Elemen | Fungsi |
|---|---|
| Kartu kalimat | Potongan kalimat yang bisa ditukar urutannya, ditempeli ubin, dicoret, atau digarisbawahi |
| Rak ubin | Deretan ubin akhiran di atas layar yang berlanjut antar episode |
| Layar chat | Bingkai ponsel dengan chat generik: kontak bermonogram, gelembung muncul satu per satu |
| Peta -는데 | Keluarga pola di Ep 6: -는데 di tengah, ubin lain di sekelilingnya |

## Pertanyaan terbuka

- **Tokoh:** tetap "kamu" tanpa wajah, atau karakter pekerja Indonesia bergambar?
- **Suara:** VO TTS, atau teks layar dan musik saja?
- **Cek Korea:** semua kalimat di tabel tiap episode, terutama yang bertanda "rakitan".
- **Jadwal posting:** setiap hari, atau beberapa kali seminggu? Recap "Kemarin:" mengandaikan posting harian.
