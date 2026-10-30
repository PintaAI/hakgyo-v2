import type { ComponentType } from "react";
import type { Metadata } from "next";

import { AppClosingSlide } from "~/components/landing/app-slides/closing";
import { AppExamSlide } from "~/components/landing/app-slides/exam";
import { AppFaqSlide } from "~/components/landing/app-slides/faq";
import { AppGamesSlide } from "~/components/landing/app-slides/games";
import { AppHeroSlide } from "~/components/landing/app-slides/hero";
import { AppInstallSlide } from "~/components/landing/app-slides/install";
import { AppLearnSlide } from "~/components/landing/app-slides/learn";
import { LandingAtmosphere } from "~/components/landing/atmosphere";
import { appSlides, type AppSlideId } from "~/components/landing/deck";
import { LandingHeader } from "~/components/landing/header";
import { SlideNavigator } from "~/components/landing/slide-navigator";

const title = "Aplikasi Hakgyo untuk belajar bahasa Korea";
const description =
  "Unduh aplikasi Hakgyo untuk iPhone dan Android: materi kelas, kosakata, game latihan, dan tryout EPS-TOPIK dari lembagamu, tetap bisa dipakai offline.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/aplikasi" },
  openGraph: {
    title: `Hakgyo | ${title}`,
    description,
    type: "website",
    locale: "id_ID",
    url: "/aplikasi",
  },
  twitter: {
    card: "summary",
    title: `Hakgyo | ${title}`,
    description: "Unduh aplikasi Hakgyo untuk iPhone dan Android.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Hakgyo",
  applicationCategory: "EducationalApplication",
  operatingSystem: "iOS, Android",
  description,
  inLanguage: "id-ID",
};

/** Each slide's component; the order comes from `appSlides` in deck.ts. */
const slideComponents: Record<AppSlideId, ComponentType> = {
  unduh: AppHeroSlide,
  belajar: AppLearnSlide,
  game: AppGamesSlide,
  ujian: AppExamSlide,
  pasang: AppInstallSlide,
  tanya: AppFaqSlide,
  "mulai-belajar": AppClosingSlide,
};

const headerLinks = [
  { href: "#belajar", label: "Fitur" },
  { href: "#game", label: "Game" },
  { href: "#pasang", label: "Cara pasang" },
  { href: "#tanya", label: "FAQ" },
];

/** The learner app's own landing page, laid out like the main one. */
export default function AppPage() {
  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        // Hides slide content until its slide is active; only with JavaScript.
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('landing-motion')",
        }}
      />
      <a
        href="#isi"
        className="bg-primary text-primary-foreground sr-only fixed top-3 left-3 z-50 rounded-lg px-4 py-3 focus:not-sr-only"
      >
        Lewati navigasi
      </a>
      <LandingAtmosphere />
      <LandingHeader links={headerLinks} />
      <SlideNavigator slides={appSlides} />
      <main id="isi" data-slide-deck>
        {appSlides.map(({ id }) => {
          const SlideComponent = slideComponents[id];
          return <SlideComponent key={id} />;
        })}
      </main>
    </div>
  );
}
