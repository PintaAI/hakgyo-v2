import { ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { landingContainer } from "../layout";
import { reveal } from "../reveal";
import { WhatsAppLink } from "../slide";
import { pillars } from "./solution";

/** The opening slide, active before any script runs. */
export function HeroSlide() {
  return (
    <section
      id="mulai"
      data-slide
      data-active
      aria-labelledby="mulai-title"
      className="border-border relative flex flex-col justify-center overflow-hidden border-b pt-24 pb-10 sm:pt-32 sm:pb-16 lg:pt-28"
    >
      <div
        className="bg-primary/10 animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full blur-3xl"
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
          className="mt-5 flex flex-col justify-between gap-6 sm:mt-9 sm:gap-8 lg:flex-row lg:items-end"
        >
          <p className="text-muted-foreground max-w-xl text-[15px] leading-6 sm:text-lg sm:leading-8">
            Kurikulum, group belajar, aplikasi untuk murid, halaman promosi,
            serta tryout dan tugas dalam satu platform siap pakai. Tanpa
            membangun sistem sendiri.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:pb-1">
            <WhatsAppLink className="h-11 px-5 sm:h-12 sm:px-6" />
            <a
              href="#solusi"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "hidden h-11 gap-2 px-3 sm:inline-flex sm:h-12 sm:px-4",
              )}
            >
              Lihat fitur <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
        </div>
        <div
          {...reveal(5)}
          className="border-border bg-border mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:mt-14 lg:mt-20 lg:grid-cols-4"
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
