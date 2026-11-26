import { PlusIcon } from "lucide-react";

import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

const questions = [
  [
    "Akun apa yang dipakai untuk masuk?",
    "Akun Hakgyo yang sama seperti di web. Belum punya? Buat akun di halaman masuk, lalu gabung ke kelas lewat link undangan dari lembaga atau pengajarmu.",
  ],
  [
    "Apa bedanya dengan belajar lewat browser?",
    "Kelas dan materinya sama. Aplikasi menambahkan mode offline, game latihan, latihan pengucapan dengan suara, dan notifikasi.",
  ],
  [
    "Kenapa versi iPhone lewat TestFlight?",
    "Aplikasi masih versi beta. TestFlight adalah aplikasi resmi Apple untuk mencoba aplikasi sebelum rilis di App Store.",
  ],
  [
    "Kenapa versi Android harus gabung grup dulu?",
    "Aplikasi masih versi beta di Google Play. Selama beta, Google hanya mengizinkan anggota grup penguji untuk memasangnya. Grupnya terbuka, siapa saja boleh bergabung.",
  ],
  [
    "Halaman pengujian tidak menampilkan tombol Jadi penguji?",
    "Berarti akun yang sedang kamu pakai belum masuk grup penguji. Di Chrome, ketuk foto profil di kanan atas untuk melihat akunnya, ganti ke akun Google yang dipakai di Play Store, lalu ulangi dari langkah Gabung grup.",
  ],
  [
    "Google Play bilang item tidak ditemukan?",
    "Artinya Google Play belum mengenalimu sebagai penguji. Pastikan langkah Jadi penguji sudah menampilkan Anda adalah penguji, lalu di Play Store ketuk foto profil di kanan atas dan pilih akun Google yang sama dengan yang dipakai untuk gabung grup. Jika baru saja gabung, tunggu beberapa menit, tutup Play Store, lalu buka link Google Play lagi.",
  ],
  [
    "Sudah memasang Hakgyo dari file APK?",
    "Buka dulu aplikasinya saat online supaya progresmu terkirim, lalu hapus aplikasinya dan pasang lagi dari Google Play. Progresmu tetap ada di akunmu.",
  ],
  [
    "Bisa belajar tanpa internet?",
    "Bisa. Materi kelas tersimpan di ponsel setelah tersinkron. Jawaban dan progresmu terkirim otomatis saat kamu online lagi.",
  ],
] as const;

/** Common questions about the app. */
export function AppFaqSlide() {
  return (
    <Slide id="tanya">
      <div className="grid gap-5 sm:gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SlideHeading id="tanya" title="Yang sering" muted="ditanyakan." />
        <div {...reveal(2)} className="border-border border-t">
          {questions.map(([question, answer]) => (
            <details key={question} className="group border-border border-b">
              <summary className="focus-visible:outline-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium sm:min-h-16 sm:gap-6 sm:py-4 sm:text-base [&::-webkit-details-marker]:hidden">
                {question}
                <PlusIcon
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="text-muted-foreground max-w-xl pb-4 text-sm leading-6 sm:pr-8 sm:pb-5 sm:leading-7">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Slide>
  );
}
