import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CheckIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  Layers3Icon,
  UsersRoundIcon,
  VideoIcon,
} from "lucide-react";

import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: "Platform belajar dan mengajar yang lebih terarah",
  description:
    "Kelola course, materi, tugas, cohort, dan perkembangan peserta dalam satu ruang belajar bersama Hakgyo.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hakgyo | Ruang belajar yang tumbuh bersama",
    description:
      "Satu ruang untuk merancang pembelajaran, mendampingi peserta, dan melihat perkembangan mereka.",
    type: "website",
    locale: "id_ID",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Hakgyo | Ruang belajar yang tumbuh bersama",
    description:
      "Kelola pembelajaran dari materi hingga perkembangan peserta dalam satu tempat.",
  },
};

const features = [
  {
    icon: Layers3Icon,
    number: "01",
    title: "Kurikulum yang jelas",
    description:
      "Susun bab, materi, vocabulary, dan tugas dalam alur yang mudah diikuti.",
  },
  {
    icon: UsersRoundIcon,
    number: "02",
    title: "Cohort yang terhubung",
    description:
      "Kelola peserta dan kelas belajar tanpa kehilangan konteks setiap kelompok.",
  },
  {
    icon: ClipboardCheckIcon,
    number: "03",
    title: "Progres yang terlihat",
    description:
      "Tinjau submission dan perkembangan belajar dari ruang kerja yang sama.",
  },
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hakgyo",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "Platform pembelajaran untuk mengelola course, materi, tugas, cohort, dan perkembangan peserta.",
  inLanguage: "id-ID",
};

export default function Home() {
  return (
    <main className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground min-h-screen overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="border-border relative z-20 border-b">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group flex items-center gap-3 font-bold tracking-tight"
            aria-label="Hakgyo, beranda"
          >
            <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-[0.9rem] shadow-[3px_3px_0_var(--foreground)] transition-transform group-hover:-rotate-6">
              <GraduationCapIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl">hakgyo</span>
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm font-medium md:flex"
            aria-label="Navigasi utama"
          >
            <a className="hover:text-primary transition" href="#fitur">
              Fitur
            </a>
            <a className="hover:text-primary transition" href="#cara-kerja">
              Cara kerja
            </a>
            <Link className="hover:text-primary transition" href="/catalog">
              Katalog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Masuk
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] [background-size:42px_42px]" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 pt-16 pb-24 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pt-28 lg:pb-32">
          <div>
            <div className="border-border bg-card inline-flex -rotate-1 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase shadow-[3px_3px_0_var(--border)]">
              <span className="bg-primary size-2 rounded-full" />
              Ruang belajar digital
            </div>
            <h1 className="mt-8 max-w-3xl text-[clamp(3.5rem,8vw,7.4rem)] leading-[0.86] font-black tracking-[-0.065em]">
              Belajar,
              <span className="text-primary block font-serif font-normal italic">
                bertumbuh,
              </span>
              bersama.
            </h1>
            <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-8 sm:text-xl">
              Hakgyo membantu pendidik merancang pengalaman belajar yang rapi,
              mendampingi setiap cohort, dan melihat progres tanpa
              berpindah-pindah alat.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth"
                className="bg-primary text-primary-foreground group focus-visible:outline-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-7 font-bold shadow-[5px_5px_0_var(--foreground)] transition hover:-translate-y-1 hover:shadow-[7px_7px_0_var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Mulai belajar
                <ArrowRightIcon
                  className="size-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/catalog"
                className="border-border bg-card/70 hover:bg-card focus-visible:outline-ring inline-flex min-h-14 items-center justify-center rounded-full border px-7 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Jelajahi course
              </Link>
            </div>
            <ul
              className="text-muted-foreground mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm"
              aria-label="Keunggulan Hakgyo"
            >
              {[
                "Kurikulum terstruktur",
                "Progres terpantau",
                "Web dan mobile",
              ].map((item) => (
                <li className="flex items-center gap-2" key={item}>
                  <span className="bg-secondary text-secondary-foreground grid size-5 place-items-center rounded-full">
                    <CheckIcon className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:translate-x-6">
            <div className="bg-secondary text-secondary-foreground absolute -top-10 -right-5 hidden rotate-6 rounded-lg px-4 py-3 font-serif text-sm italic shadow-lg sm:block">
              kelas hari ini
            </div>
            <div className="border-foreground bg-accent text-accent-foreground absolute -bottom-8 -left-5 z-10 hidden -rotate-3 rounded-full border-2 px-5 py-2 text-sm font-bold sm:block">
              Semua progres, satu tempat
            </div>
            <div className="bg-primary border-foreground rotate-[1.5deg] rounded-[2rem] border-2 p-2 shadow-[14px_18px_0_var(--border)]">
              <div className="bg-card overflow-hidden rounded-[1.45rem]">
                <div className="border-border flex items-center justify-between border-b px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary size-2.5 rounded-full" />
                    <span className="bg-secondary size-2.5 rounded-full" />
                    <span className="bg-muted-foreground size-2.5 rounded-full" />
                  </div>
                  <span className="text-muted-foreground text-[0.65rem] font-bold tracking-[0.18em] uppercase">
                    Workspace kelas
                  </span>
                </div>
                <div className="grid min-h-[27rem] grid-cols-[4.25rem_1fr] sm:grid-cols-[10rem_1fr]">
                  <aside className="bg-muted border-border border-r p-3 sm:p-5">
                    <div className="mb-8 flex items-center gap-2 font-bold">
                      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg text-[0.65rem]">
                        H
                      </span>
                      <span className="hidden sm:inline">Bahasa 101</span>
                    </div>
                    <div className="text-muted-foreground space-y-2 text-xs font-medium">
                      {[
                        BookOpenCheckIcon,
                        Layers3Icon,
                        UsersRoundIcon,
                        ClipboardCheckIcon,
                      ].map((Icon, index) => (
                        <div
                          className={`bg-card flex items-center gap-2 rounded-lg p-2 ${index === 1 ? "text-foreground shadow-sm" : ""}`}
                          key={index}
                        >
                          <Icon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline">
                            {
                              ["Ringkasan", "Kurikulum", "Peserta", "Review"][
                                index
                              ]
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </aside>
                  <div className="p-5 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-primary text-[0.65rem] font-bold tracking-[0.15em] uppercase">
                          Kurikulum
                        </p>
                        <h2 className="mt-2 text-xl font-black sm:text-2xl">
                          Percakapan dasar
                        </h2>
                      </div>
                      <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-[0.65rem] font-bold">
                        72% selesai
                      </span>
                    </div>
                    <div className="mt-7 space-y-3">
                      {[
                        ["01", "Salam dan perkenalan", "3 materi"],
                        ["02", "Kehidupan sehari-hari", "5 materi"],
                        ["03", "Latihan percakapan", "Tugas"],
                      ].map(([number, title, meta], index) => (
                        <div
                          className={`flex items-center gap-4 rounded-2xl border p-4 ${index === 1 ? "bg-accent border-primary/40" : "bg-background border-border"}`}
                          key={number}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-black ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          >
                            {number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {title}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {meta}
                            </p>
                          </div>
                          {index === 0 ? (
                            <CheckIcon
                              className="text-primary size-4"
                              aria-label="Selesai"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="bg-secondary rounded-2xl p-4">
                        <p className="text-2xl font-black">24</p>
                        <p className="text-muted-foreground text-xs">
                          Peserta aktif
                        </p>
                      </div>
                      <div className="bg-accent rounded-2xl p-4">
                        <p className="text-2xl font-black">8</p>
                        <p className="text-muted-foreground text-xs">
                          Tugas direview
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="fitur"
        className="bg-primary text-primary-foreground border-border border-y py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-primary-foreground/70 text-xs font-bold tracking-[0.2em] uppercase">
                Dari rencana ke hasil
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl leading-tight font-black tracking-[-0.04em] sm:text-6xl">
                Pembelajaran yang terasa manusiawi.
              </h2>
            </div>
            <p className="text-primary-foreground/70 max-w-xl text-lg leading-8 lg:justify-self-end">
              Teknologi seharusnya merapikan pekerjaan pendidik, bukan menambah
              kerumitan. Hakgyo menyatukan proses penting dalam alur yang fokus.
            </p>
          </div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[2rem] border border-white/15 bg-white/15 lg:grid-cols-3">
            {features.map(({ icon: Icon, number, title, description }) => (
              <article
                className="bg-primary hover:bg-primary-foreground/5 p-7 transition sm:p-9"
                key={number}
              >
                <div className="flex items-center justify-between">
                  <span className="bg-primary-foreground text-primary grid size-12 place-items-center rounded-2xl transition-transform group-hover:-rotate-6">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-primary-foreground/60 font-mono text-xs">
                    /{number}
                  </span>
                </div>
                <h3 className="mt-12 text-2xl font-bold">{title}</h3>
                <p className="text-primary-foreground/70 mt-4 leading-7">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
              Satu ekosistem
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-black tracking-[-0.04em] sm:text-5xl">
              Siap untuk kelas yang bergerak dinamis.
            </h2>
            <p className="text-muted-foreground mt-6 text-lg leading-8">
              Dari sesi langsung hingga belajar mandiri, setiap aktivitas tetap
              berada dalam konteks course dan cohort.
            </p>
            <Link
              href="/auth"
              className="border-foreground mt-9 inline-flex items-center gap-2 border-b-2 pb-1 font-bold transition hover:gap-4"
            >
              Buat ruang belajar
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="bg-card border-border rounded-[2rem] border p-7 shadow-[5px_5px_0_var(--border)]">
              <VideoIcon className="text-primary size-7" aria-hidden="true" />
              <h3 className="mt-8 text-xl font-bold">Belajar sinkron</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Hubungkan kelas dan sesi Zoom dengan alur belajar peserta.
              </p>
            </article>
            <article className="bg-secondary text-secondary-foreground border-border rounded-[2rem] border p-7 sm:translate-y-8">
              <BookOpenCheckIcon className="size-7" aria-hidden="true" />
              <h3 className="mt-8 text-xl font-bold">Belajar mandiri</h3>
              <p className="mt-3 leading-7">
                Materi dan tugas tetap mudah diakses, kapan pun peserta siap.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
        <div className="bg-primary text-primary-foreground mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-6 py-14 text-center sm:px-12 sm:py-20">
          <GraduationCapIcon className="mx-auto size-9" aria-hidden="true" />
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight font-black tracking-[-0.04em] sm:text-6xl">
            Bangun ruang belajar yang layak dirindukan.
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-5 max-w-xl text-lg leading-8">
            Mulai susun pengalaman belajar yang lebih terarah bersama Hakgyo.
          </p>
          <Link
            href="/auth"
            className="bg-primary-foreground text-primary focus-visible:outline-primary-foreground mt-9 inline-flex min-h-14 items-center gap-3 rounded-full px-8 font-bold transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Mulai sekarang
            <ArrowRightIcon className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p className="text-foreground font-bold">
            hakgyo{" "}
            <span className="text-muted-foreground font-normal">
              / belajar bersama
            </span>
          </p>
          <nav className="flex gap-6" aria-label="Navigasi footer">
            <Link className="hover:text-foreground" href="/catalog">
              Katalog
            </Link>
            <Link className="hover:text-foreground" href="/auth">
              Masuk
            </Link>
          </nav>
          <p>&copy; {new Date().getFullYear()} Hakgyo</p>
        </div>
      </footer>
    </main>
  );
}
