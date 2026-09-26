import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  CheckIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  LanguagesIcon,
  LayersIcon,
  PlusIcon,
  UsersRoundIcon,
} from "lucide-react";

import { LandingProductPreview } from "~/components/landing-product-preview";
import { ThemeToggle } from "~/components/theme-toggle";
import { buttonVariants } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Satu ruang untuk setiap langkah belajar",
  description:
    "Rancang kurikulum, buat materi dan kosakata, kelola group belajar, serta tinjau tugas peserta dalam satu platform pembelajaran Hakgyo.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hakgyo | Satu ruang untuk setiap langkah belajar",
    description:
      "Dari menyusun materi hingga mendampingi peserta. Temukan ruang untuk belajar dan mengajar bersama Hakgyo.",
    type: "website",
    locale: "id_ID",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Hakgyo | Satu ruang untuk setiap langkah belajar",
    description:
      "Kurikulum, materi, kosakata, dan group belajar dalam satu ruang.",
  },
};

const capabilities = [
  { icon: LayersIcon, name: "Kurikulum terstruktur" },
  { icon: BookOpenIcon, name: "Materi interaktif" },
  { icon: LanguagesIcon, name: "Latihan kosakata" },
  { icon: ClipboardCheckIcon, name: "Tugas & review" },
  { icon: UsersRoundIcon, name: "Group belajar" },
];
const steps = [
  {
    number: "01",
    title: "Rancang jalurnya.",
    description:
      "Susun course menjadi bab. Hubungkan materi, set kosakata, dan tugas, lalu tentukan urutan belajar peserta.",
    tag: "COURSE & KURIKULUM",
    icon: LayersIcon,
  },
  {
    number: "02",
    title: "Hidupkan kelasnya.",
    description:
      "Kelompokkan peserta dalam cohort, atur pengajar, dan jadwalkan pertemuan Zoom sesuai kebutuhan kelas.",
    tag: "COHORT & PERTEMUAN",
    icon: UsersRoundIcon,
  },
  {
    number: "03",
    title: "Dampingi prosesnya.",
    description:
      "Tinjau jawaban tugas dan ikuti perkembangan peserta. Beri perhatian pada langkah belajar berikutnya.",
    tag: "ASSESSMENT & REVIEW",
    icon: ClipboardCheckIcon,
  },
];
const questions = [
  [
    "Untuk siapa Hakgyo dibuat?",
    "Hakgyo menyediakan ruang kerja untuk organisasi, pengajar, dan pengelola kelas, serta area belajar untuk peserta. Course, bahan ajar, dan group belajar terhubung dalam platform yang sama.",
  ],
  [
    "Apa saja yang bisa dimasukkan ke dalam course?",
    "Anda dapat menyusun bab berisi materi, set kosakata, dan tugas atau assessment. Editor materi mendukung konten pembelajaran, termasuk blok percakapan dan pelafalan untuk pembelajaran bahasa.",
  ],
  [
    "Apakah peserta bisa belajar sesuai urutannya?",
    "Ya. Course mendukung pengaturan progresi bertahap untuk mengarahkan peserta mengikuti urutan pembelajaran. Peserta mengakses course dan melanjutkan aktivitas melalui area belajar.",
  ],
  [
    "Bagaimana cara mulai menggunakan Hakgyo?",
    "Buka katalog untuk menjelajahi course, atau masuk dan buat akun untuk mengakses area belajar. Untuk mengelola pembelajaran, Anda dapat membuat organisasi dan mulai menyusun course di workspace.",
  ],
];
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hakgyo",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description: metadata.description,
  inLanguage: "id-ID",
};
const container = "mx-auto max-w-7xl px-6 sm:px-10 lg:px-16";

function Brand() {
  return (
    <Link
      href="/"
      aria-label="Hakgyo, beranda"
      className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.06em]"
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-lg"
      />
      hakgyo
    </Link>
  );
}

export default function Home() {
  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <a
        href="#konten"
        className="bg-primary text-primary-foreground sr-only fixed top-3 left-3 z-50 rounded-lg px-4 py-3 focus:not-sr-only"
      >
        Lewati navigasi
      </a>
      <header className="border-border border-b">
        <div
          className={`${container} flex h-20 items-center justify-between gap-4`}
        >
          <Brand />
          <nav
            aria-label="Navigasi utama"
            className="text-muted-foreground hidden items-center gap-8 text-sm md:flex"
          >
            <a
              href="#platform"
              className="hover:text-foreground transition-colors"
            >
              Platform
            </a>
            <a
              href="#cara-kerja"
              className="hover:text-foreground transition-colors"
            >
              Cara kerja
            </a>
            <Link
              href="/catalog"
              className="hover:text-foreground transition-colors"
            >
              Katalog course
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth"
              className={buttonVariants({
                variant: "outline",
                className: "h-10 gap-3 px-5",
              })}
            >
              Masuk <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
      <main id="konten">
        <section
          className={`${container} pt-16 pb-14 sm:pt-24 sm:pb-20`}
          aria-labelledby="hero-title"
        >
          <div className="text-muted-foreground mb-7 flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] uppercase sm:text-xs">
            <span className="bg-primary h-px w-8" />
            Ruang untuk belajar. Ruang untuk tumbuh.
          </div>
          <h1
            id="hero-title"
            className="max-w-5xl text-[clamp(3.15rem,7.6vw,6.75rem)] leading-[1.03] font-medium tracking-[-0.065em]"
          >
            Setiap langkah belajar,
            <br />
            <span className="text-muted-foreground">punya tempatnya.</span>
          </h1>
          <div className="mt-9 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <p className="text-muted-foreground max-w-lg text-base leading-7 sm:text-lg sm:leading-8">
              Dari materi pertama hingga pencapaian berikutnya. Satukan
              kurikulum, latihan, dan kelas dalam satu ruang belajar yang
              terarah.
            </p>
            <div className="flex flex-wrap items-center gap-3 lg:pb-1">
              <Link
                href="/auth"
                className={buttonVariants({ className: "h-12 gap-5 px-6" })}
              >
                Mulai bersama Hakgyo <ArrowRightIcon aria-hidden="true" />
              </Link>
              <Link
                href="/catalog"
                className={buttonVariants({
                  variant: "ghost",
                  className: "h-12 gap-2 px-4",
                })}
              >
                Jelajahi course <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="platform"
          aria-label="Pratinjau platform Hakgyo"
          className="bg-muted/45 border-border scroll-mt-6 border-y"
        >
          <div className={`${container} py-8 sm:py-12`}>
            <LandingProductPreview />
          </div>
        </section>
        <div className={`${container} py-8 sm:py-10`}>
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-8 gap-y-5 lg:justify-between">
            {capabilities.map(({ icon: Icon, name }) => (
              <span
                key={name}
                className="flex items-center gap-2.5 text-xs font-medium sm:text-sm"
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                {name}
              </span>
            ))}
          </div>
        </div>

        <section
          id="cara-kerja"
          className={`${container} scroll-mt-8 py-16 sm:py-24`}
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                01 / Dari persiapan ke pendampingan
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl leading-[1.12] font-medium tracking-[-0.045em] sm:text-5xl">
                Lebih teratur mengajar.
                <br />
                <span className="text-muted-foreground">
                  Lebih leluasa berkembang.
                </span>
              </h2>
            </div>
            <ArrowDownIcon
              className="text-muted-foreground hidden size-9 md:block"
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>
          <div className="border-border mt-12 grid border-t md:grid-cols-3">
            {steps.map(({ number, title, description, tag, icon: Icon }) => (
              <article
                key={number}
                className="border-border border-b py-8 md:border-r md:border-b-0 md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono text-xs">
                    {number}
                  </span>
                  <Icon
                    className="size-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-10 text-2xl font-medium tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-4 text-sm leading-7">
                  {description}
                </p>
                {number === "02" ? (
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <span className="text-muted-foreground text-xs">
                      Terhubung dengan
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Image
                        src="/brands/zoom.png"
                        alt=""
                        width={24}
                        height={24}
                        className="size-6 rounded-full"
                      />
                      Zoom
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Image
                        src="/brands/whatsapp.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="size-5"
                      />
                      WhatsApp
                    </span>
                  </div>
                ) : null}
                <p className="text-muted-foreground mt-8 text-[10px] tracking-[0.16em]">
                  {tag}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-muted/45 border-border border-y">
          <div
            className={`${container} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-20`}
          >
            <div>
              <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                02 / Bukan sekadar membaca
              </p>
              <h2 className="mt-5 text-4xl leading-[1.12] font-medium tracking-[-0.045em] sm:text-5xl">
                Materi yang mengajak
                <br />
                <span className="text-muted-foreground">ikut berlatih.</span>
              </h2>
              <p className="text-muted-foreground mt-6 max-w-md leading-7">
                Bangun pemahaman lewat percakapan, kosakata, dan latihan. Setiap
                bagian punya peran dalam perjalanan belajar peserta.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Percakapan dengan terjemahan",
                  "Kosakata, arti, dan contoh penggunaan",
                  "Latihan pelafalan dan pemahaman",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckIcon className="size-4" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/catalog"
                className="mt-9 inline-flex items-center gap-4 border-b border-current pb-2 text-sm font-medium"
              >
                Temukan course Anda{" "}
                <ArrowUpRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <figure className="min-w-0">
              <div className="border-border bg-card overflow-hidden rounded-2xl border p-3 shadow-[0_20px_60px_-30px_color-mix(in_oklch,var(--foreground)_20%,transparent)] sm:p-5">
                <div className="border-border text-muted-foreground mb-5 flex items-center justify-between border-b pb-4 text-[10px] tracking-[0.12em]">
                  <span>DI DALAM MATERI</span>
                  <LanguagesIcon className="size-4" aria-hidden="true" />
                </div>
                <Image
                  src="/images/landing/conversation-light.jpg"
                  alt="Contoh blok percakapan Korea dengan terjemahan Indonesia dan pertanyaan pemahaman di Hakgyo."
                  width={602}
                  height={570}
                  sizes="(max-width: 1024px) 90vw, 500px"
                  className="h-auto w-full dark:hidden"
                />
                <Image
                  src="/images/landing/conversation-dark.jpg"
                  alt="Contoh blok percakapan Korea dengan terjemahan Indonesia dan pertanyaan pemahaman di Hakgyo."
                  width={602}
                  height={570}
                  sizes="(max-width: 1024px) 90vw, 500px"
                  className="hidden h-auto w-full dark:block"
                />
              </div>
              <figcaption className="text-muted-foreground mt-4 text-center text-xs">
                Cuplikan asli blok percakapan · contoh materi bahasa Korea
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={`${container} py-16 sm:py-24`}>
          <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
            03 / Dua peran, satu tujuan
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <article className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl p-8 sm:p-10">
              <UsersRoundIcon
                className="size-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="mt-10 text-xs tracking-[0.15em] uppercase opacity-70">
                Untuk pengajar & organisasi
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight">
                Ruang untuk merancang.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 opacity-80">
                Kelola bahan ajar, anggota, dan group belajar. Bangun identitas
                organisasi lewat tema dan halaman publik Anda sendiri.
              </p>
              <Link
                href="/organizations/new"
                className={buttonVariants({
                  variant: "secondary",
                  className: "mt-8 h-11 gap-4 px-5",
                })}
              >
                Buat ruang belajar <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            </article>
            <article className="bg-secondary text-secondary-foreground rounded-2xl p-8 sm:p-10">
              <GraduationCapIcon
                className="size-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-muted-foreground mt-10 text-xs tracking-[0.15em] uppercase">
                Untuk peserta
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight">
                Ruang untuk melangkah.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-md text-sm leading-7">
                Ikuti alur course, pelajari materi, dan kerjakan latihan.
                Lanjutkan perjalanan dari area belajar yang menyimpan progres
                Anda.
              </p>
              <Link
                href="/catalog"
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-8 h-11 gap-4 px-5",
                })}
              >
                Lihat katalog course <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section
          className={`${container} grid gap-10 pt-4 pb-20 sm:pb-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
              Sebelum mulai
            </p>
            <h2
              id="faq-title"
              className="mt-5 text-4xl font-medium tracking-[-0.045em]"
            >
              Kenali lebih dekat.
            </h2>
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-2 text-sm"
            >
              Baca panduan aplikasi{" "}
              <ArrowUpRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="border-border border-t">
            {questions.map(([question, answer]) => (
              <details key={question} className="group border-border border-b">
                <summary className="focus-visible:outline-ring flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {question}
                  <PlusIcon
                    className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <p className="text-muted-foreground max-w-xl pr-8 pb-6 text-sm leading-7">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-muted/50 border-border border-y">
          <div
            className={`${container} flex flex-col items-start justify-between gap-8 py-14 sm:py-20 lg:flex-row lg:items-center`}
          >
            <div>
              <p className="text-muted-foreground mb-4 text-xs tracking-[0.18em] uppercase">
                Langkah berikutnya, bersama.
              </p>
              <h2 className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
                Belajar punya banyak arah.
                <br />
                <span className="text-muted-foreground">Mulai dari sini.</span>
              </h2>
            </div>
            <Link
              href="/auth"
              className={buttonVariants({ className: "h-14 gap-8 px-7" })}
            >
              Mulai bersama Hakgyo <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <footer className={`${container} py-10`}>
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <Brand />
          <nav
            aria-label="Navigasi footer"
            className="text-muted-foreground flex flex-wrap gap-6 text-sm"
          >
            <Link href="/catalog" className="hover:text-foreground">
              Katalog
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              Panduan
            </Link>
            <Link href="/auth" className="hover:text-foreground">
              Masuk
            </Link>
          </nav>
        </div>
        <div className="border-border text-muted-foreground mt-8 flex flex-wrap justify-between gap-3 border-t pt-6 text-xs">
          <p>© {new Date().getFullYear()} Hakgyo</p>
          <p>Dibangun untuk proses. Dirancang untuk progres.</p>
        </div>
      </footer>
    </div>
  );
}
