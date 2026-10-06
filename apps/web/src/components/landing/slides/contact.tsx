import Link from "next/link";

import { landingContainer } from "../layout";
import { reveal } from "../reveal";
import { Eyebrow, WhatsAppLink } from "../slide";

/** The closing call to action and the page footer. */
export function ContactSlide() {
  return (
    <section
      id="hubungi"
      data-slide
      aria-labelledby="hubungi-title"
      className="bg-primary text-primary-foreground flex flex-col"
    >
      <div
        className={`${landingContainer} flex flex-1 flex-col justify-center py-14 sm:py-24`}
      >
        <Eyebrow slide="hubungi" label="Langkah berikutnya" inverted />
        <h2
          {...reveal(1)}
          id="hubungi-title"
          className="mt-3 max-w-4xl text-[clamp(2.25rem,6vw,5.5rem)] leading-[1.05] font-medium tracking-[-0.06em] sm:mt-6 sm:leading-[1.03]"
        >
          Siap memindahkan kelas Anda ke satu tempat?
        </h2>
        <p
          {...reveal(2)}
          className="mt-4 max-w-lg text-[15px] leading-6 opacity-80 sm:mt-6 sm:text-lg sm:leading-7"
        >
          Ceritakan program kelas Anda. Kami bantu siapkan demo dan ruang
          lembaga Anda.
        </p>
        <div {...reveal(3)} className="mt-7 sm:mt-10">
          <WhatsAppLink className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 px-6 text-base sm:h-14 sm:px-7">
            Chat via WhatsApp
          </WhatsAppLink>
        </div>
      </div>
      <footer className={`${landingContainer} pb-8 sm:pb-10 lg:pb-24`}>
        <div className="border-primary-foreground/20 flex flex-col justify-between gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:gap-6 sm:pt-8">
          <p className="font-semibold tracking-[-0.04em]">hakgyo</p>
          <nav
            aria-label="Navigasi footer"
            className="flex flex-wrap gap-6 opacity-80"
          >
            <Link href="/catalog" className="hover:opacity-100">
              Katalog
            </Link>
            <Link href="/docs" className="hover:opacity-100">
              Panduan
            </Link>
            <Link href="/privacy" className="hover:opacity-100">
              Privasi
            </Link>
            <Link href="/terms" className="hover:opacity-100">
              Ketentuan
            </Link>
            <Link href="/support" className="hover:opacity-100">
              Bantuan
            </Link>
            <Link href="/auth" className="hover:opacity-100">
              Masuk
            </Link>
          </nav>
          <p className="opacity-70">© {new Date().getFullYear()} Hakgyo</p>
        </div>
      </footer>
    </section>
  );
}
