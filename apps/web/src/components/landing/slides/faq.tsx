import { PlusIcon } from "lucide-react";

import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

const questions = [
  [
    "Berapa biaya memakai Hakgyo?",
    "Paket disesuaikan dengan kebutuhan program Anda. Hubungi kami via WhatsApp untuk penawaran.",
  ],
  [
    "Materi saya sudah ada. Repot tidak memindahkannya?",
    "Tidak. Impor modul PDF menjadi pelajaran, atau foto soal dan daftar kosakata untuk disusun AI menjadi tugas dan set kosakata.",
  ],
  [
    "Saya pengajar perorangan. Bisa memakai Hakgyo?",
    "Bisa. Mulai dengan beberapa murid, lalu tambahkan pengajar dan kelas ketika program Anda berkembang.",
  ],
  [
    "Bagaimana murid membayar kelas saya?",
    "Pembayaran tetap lewat cara yang Anda pakai sekarang. Setelah membayar, murid diundang lewat link atau didaftarkan langsung ke kelas.",
  ],
  [
    "Apakah murid wajib mengunduh aplikasi?",
    "Tidak. Murid juga bisa belajar lewat browser. Aplikasi mobile menambahkan mode offline, game latihan, dan notifikasi.",
  ],
  [
    "Bisa punya aplikasi atas nama lembaga sendiri?",
    "Bisa, sebagai layanan pengembangan terpisah yang tetap terhubung ke Hakgyo. Hubungi kami untuk mendiskusikannya.",
  ],
] as const;

/** Common questions. */
export function FaqSlide() {
  return (
    <Slide id="faq">
      <div className="grid gap-5 sm:gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SlideHeading id="faq" title="Yang sering" muted="ditanyakan." />
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
