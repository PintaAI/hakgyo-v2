import {
  BookOpenIcon,
  DownloadIcon,
  GamepadIcon,
  TimerIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { AppDownloadButtons } from "../app-download";
import { LearnerAppDemo } from "../demos/learner-app";
import { landingContainer } from "../layout";
import { reveal } from "../reveal";

const sections = [
  { slide: "belajar", icon: BookOpenIcon, name: "Belajar di ponsel" },
  { slide: "game", icon: GamepadIcon, name: "Game latihan" },
  { slide: "ujian", icon: TimerIcon, name: "Latihan ujian" },
  { slide: "pasang", icon: DownloadIcon, name: "Cara pasang" },
] as const;

/** The opening slide of the app page: the download buttons first. */
export function AppHeroSlide() {
  return (
    <section
      id="unduh"
      data-slide
      data-active
      aria-labelledby="unduh-title"
      className="border-border relative flex flex-col justify-center overflow-hidden border-b pt-20 pb-6 sm:pt-32 sm:pb-16 lg:pt-24 lg:pb-8"
    >
      <div
        className="animate-landing-drift pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
        aria-hidden="true"
      />
      <div className={cn(landingContainer, "relative")}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
          <div>
            <p
              {...reveal(0)}
              className="text-muted-foreground mb-4 flex items-center gap-2.5 text-[10px] font-medium tracking-[0.2em] uppercase sm:mb-7 sm:gap-3 sm:text-xs"
            >
              <span className="bg-primary h-px w-8" />
              Aplikasi Hakgyo untuk murid
            </p>
            <h1
              {...reveal(1)}
              id="unduh-title"
              className="max-w-4xl text-[clamp(2.5rem,6.2vw,5.75rem)] leading-[1.04] font-medium tracking-[-0.06em] sm:leading-[1.02] sm:tracking-[-0.065em]"
            >
              Belajar bahasa Korea,
              <br />
              <span className="text-muted-foreground">
                langsung dari ponsel.
              </span>
            </h1>
            <p
              {...reveal(2)}
              className="text-muted-foreground mt-5 max-w-xl text-[15px] leading-6 sm:mt-9 sm:text-lg sm:leading-8"
            >
              Materi kelas, kosakata, game latihan, dan tryout dari lembagamu
              dalam satu aplikasi. Tetap bisa dipakai saat offline.
            </p>
            <AppDownloadButtons {...reveal(3)} className="mt-6 sm:mt-9" />
            <p
              {...reveal(4)}
              className="text-muted-foreground mt-3 text-xs sm:mt-4 sm:text-sm"
            >
              Versi beta. Masuk dengan akun Hakgyo yang sama seperti di web.
            </p>
          </div>
          <div {...reveal(3)} className="hidden lg:mr-32 lg:block">
            <LearnerAppDemo brandCallout={false} />
          </div>
        </div>
        <div
          {...reveal(5)}
          className="border-border bg-border mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:mt-14 lg:mt-10 lg:grid-cols-4"
        >
          {sections.map(({ slide, icon: Icon, name }, index) => (
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
