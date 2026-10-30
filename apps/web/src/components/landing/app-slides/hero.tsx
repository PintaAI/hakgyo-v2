import { cn } from "~/lib/utils";

import { AppDownloadButtons } from "../app-download";
import { LearnerAppDemo } from "../demos/learner-app";
import { landingContainer } from "../layout";
import { reveal } from "../reveal";

/**
 * The opening slide of the app page: a short promise, the two downloads, and
 * the app itself. On phones the app rises from the bottom edge and fades out.
 */
export function AppHeroSlide() {
  return (
    <section
      id="unduh"
      data-slide
      data-active
      aria-labelledby="unduh-title"
      className="border-border relative flex flex-col overflow-hidden border-b pt-20 sm:justify-center sm:pt-32 lg:pt-24 lg:pb-8"
    >
      <div
        className="animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
        aria-hidden="true"
      />
      <div
        className={cn(
          landingContainer,
          "relative grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16",
        )}
      >
        <div>
          <p
            {...reveal(0)}
            className="text-muted-foreground flex items-center gap-2.5 font-mono text-[10px] tracking-[0.18em] uppercase sm:gap-3 sm:text-xs"
          >
            <span className="bg-primary h-px w-6 sm:w-8" />
            Aplikasi Hakgyo
          </p>
          <h1
            {...reveal(1)}
            id="unduh-title"
            className="mt-3 text-[clamp(2rem,8.6vw,2.75rem)] leading-[1.06] font-medium tracking-[-0.055em] sm:mt-7 sm:text-[clamp(2.75rem,5.4vw,4.75rem)] sm:leading-[1.02] sm:tracking-[-0.06em]"
          >
            Persiapan <span className="whitespace-nowrap">EPS-TOPIK,</span>
            <br />
            <span className="text-muted-foreground">
              <span className="whitespace-nowrap">di mana aja,</span>{" "}
              <span className="whitespace-nowrap">kapan aja.</span>
            </span>
          </h1>
          <p
            {...reveal(2)}
            className="text-muted-foreground mt-2.5 text-sm leading-6 sm:mt-7 sm:text-lg sm:leading-8"
          >
            Latihan soal, kosakata, tryout, dan materi.
          </p>
          <AppDownloadButtons
            {...reveal(3)}
            compact
            className="mt-5 max-w-md sm:mt-10"
          />
        </div>
        <div
          {...reveal(4)}
          className="relative mt-6 h-[max(22rem,calc(100svh-18.5rem))] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)] sm:mt-14 sm:h-[30rem] lg:mt-0 lg:mr-32 lg:h-auto lg:overflow-visible lg:[mask-image:none] lg:pl-36"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-16 mx-auto size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)] lg:hidden"
            aria-hidden="true"
          />
          <LearnerAppDemo brandCallout={false} />
        </div>
      </div>
    </section>
  );
}
