import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import Link from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { landingContainer } from "../layout";
import { reveal } from "../reveal";
import { WhatsAppLink } from "../slide";
import { TeaserVideo, TeaserVideoButton } from "../teaser-video";
import { pillars } from "./solution";

/** The opening slide, active before any script runs. */
export function HeroSlide() {
  return (
    <section
      id="mulai"
      data-slide
      data-active
      aria-labelledby="mulai-title"
      className="border-border relative flex flex-col justify-center overflow-hidden border-b pt-20 pb-6 sm:pt-32 sm:pb-16 lg:pt-24 lg:pb-8"
    >
      <div
        className="animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
        aria-hidden="true"
      />
      <div className={cn(landingContainer, "relative")}>
        <p
          {...reveal(0)}
          className="text-muted-foreground mb-4 flex items-center gap-2.5 text-[10px] font-medium tracking-[0.2em] uppercase sm:mb-7 sm:gap-3 sm:text-xs"
        >
          <span className="bg-primary h-px w-8" />
          LMS untuk program kelas bahasa Korea
        </p>
        <h1
          {...reveal(1)}
          id="mulai-title"
          className="max-w-6xl text-[clamp(2.5rem,6.2vw,5.75rem)] leading-[1.04] font-medium tracking-[-0.06em] sm:leading-[1.02] sm:tracking-[-0.065em]"
        >
          Kelas bahasa Korea Anda,
          <br />
          <span className="text-muted-foreground">
            dikelola dari satu tempat.
          </span>
        </h1>
        <div
          {...reveal(3)}
          className="mt-5 grid gap-6 sm:mt-9 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-end lg:gap-10"
        >
          <div className="flex flex-col gap-6 sm:gap-8">
            <p className="text-muted-foreground max-w-xl text-[15px] leading-6 sm:text-lg sm:leading-8">
              Kurikulum, kelas, aplikasi untuk murid, halaman promosi, serta
              tryout dan tugas dalam satu platform siap pakai. Tanpa membangun
              sistem sendiri.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <WhatsAppLink className="h-11 px-5 sm:h-12 sm:px-6" />
              <TeaserVideoButton className="h-11 sm:h-12 lg:hidden" />
              <Link
                href="/docs"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 gap-2 px-5 sm:h-12 sm:px-6",
                )}
              >
                <BookOpenIcon aria-hidden="true" />
                Pelajari lengkap
              </Link>
              <a
                href="#solusi"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "hidden h-11 gap-2 px-3 sm:h-12 sm:px-4 xl:inline-flex",
                )}
              >
                Lihat fitur <ArrowRightIcon aria-hidden="true" />
              </a>
            </div>
          </div>
          <TeaserVideo className="hidden lg:block" />
        </div>
        <div
          {...reveal(5)}
          className="border-border bg-border mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:mt-14 lg:mt-8 lg:grid-cols-4"
        >
          {pillars.map(({ slide, icon: Icon, name }, index) => (
            <a
              key={name}
              href={`#${slide}`}
              className="bg-card hover:bg-muted flex items-center gap-2.5 p-3.5 transition-colors sm:gap-4 sm:p-5"
            >
              <span className="text-muted-foreground hidden font-mono text-xs sm:inline">
                0{index + 1}
              </span>
              <Icon
                className="size-4 shrink-0 sm:size-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="text-[13px] leading-tight font-medium sm:text-sm">
                {name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
