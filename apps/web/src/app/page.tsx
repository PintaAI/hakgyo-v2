import type { ComponentType } from "react";
import type { Metadata } from "next";

import { slides, type SlideId } from "~/components/landing/deck";
import { LandingHeader } from "~/components/landing/header";
import { SlideNavigator } from "~/components/landing/slide-navigator";
import { AiSlide } from "~/components/landing/slides/ai";
import { AudiencesSlide } from "~/components/landing/slides/audiences";
import { ComparisonSlide } from "~/components/landing/slides/comparison";
import { ContactSlide } from "~/components/landing/slides/contact";
import { FaqSlide } from "~/components/landing/slides/faq";
import { GettingStartedSlide } from "~/components/landing/slides/getting-started";
import { HeroSlide } from "~/components/landing/slides/hero";
import { ImportSlide } from "~/components/landing/slides/import";
import { IntegrationsSlide } from "~/components/landing/slides/integrations";
import { LearnerAppSlide } from "~/components/landing/slides/learner-app";
import { ManagementSlide } from "~/components/landing/slides/management";
import { ProblemSlide } from "~/components/landing/slides/problem";
import { PromoSlide } from "~/components/landing/slides/promo";
import { SolutionSlide } from "~/components/landing/slides/solution";
import { StarterMaterialsSlide } from "~/components/landing/slides/starter-materials";
import { TryoutSlide } from "~/components/landing/slides/tryout";

const title = "LMS siap pakai untuk program kelas bahasa Korea";
const description =
  "Hakgyo menyatukan kurikulum, group belajar, aplikasi murid, halaman promosi, serta tryout dan tugas dalam satu platform untuk lembaga dan pengajar bahasa Korea.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `Hakgyo | ${title}`,
    description,
    type: "website",
    locale: "id_ID",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: `Hakgyo | ${title}`,
    description:
      "Kelola kelas, aplikasi murid, halaman promosi, dan tryout dalam satu platform.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hakgyo",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description,
  inLanguage: "id-ID",
};

/** Each slide's component; the order comes from `slides` in deck.ts. */
const slideComponents: Record<SlideId, ComponentType> = {
  mulai: HeroSlide,
  masalah: ProblemSlide,
  solusi: SolutionSlide,
  manajemen: ManagementSlide,
  aplikasi: LearnerAppSlide,
  promosi: PromoSlide,
  tryout: TryoutSlide,
  materi: StarterMaterialsSlide,
  impor: ImportSlide,
  ai: AiSlide,
  integrasi: IntegrationsSlide,
  "untuk-siapa": AudiencesSlide,
  perbandingan: ComparisonSlide,
  "cara-mulai": GettingStartedSlide,
  faq: FaqSlide,
  hubungi: ContactSlide,
};

export default function Home() {
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
      <LandingHeader />
      <SlideNavigator slides={slides} />
      <main id="isi" data-slide-deck>
        {slides.map(({ id }) => {
          const SlideComponent = slideComponents[id];
          return <SlideComponent key={id} />;
        })}
      </main>
    </div>
  );
}
