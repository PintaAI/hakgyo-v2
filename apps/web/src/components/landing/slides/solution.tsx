import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  SmartphoneIcon,
  type LucideIcon,
} from "lucide-react";

import type { SlideId } from "../deck";
import { Panel, SlidePanels } from "../panels";
import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";

/** The four pillars, also linked from the opening slide. */
export const pillars = [
  {
    slide: "manajemen",
    icon: LayoutDashboardIcon,
    name: "Manajemen kelas",
    description:
      "Kurikulum, kelas, pengajar, jadwal, dan penilaian dari satu dashboard.",
  },
  {
    slide: "aplikasi",
    icon: SmartphoneIcon,
    name: "Aplikasi murid",
    description:
      "Aplikasi mobile dengan logo dan warna lembaga Anda, bisa dipakai offline.",
  },
  {
    slide: "promosi",
    icon: MegaphoneIcon,
    name: "Halaman promosi",
    description:
      "Landing page lembaga yang didesain AI, dengan daftar kelas yang selalu terbaru.",
  },
  {
    slide: "tryout",
    icon: ClipboardCheckIcon,
    name: "Tryout & tugas",
    description:
      "Simulasi ujian berwaktu, soal acak, peringkat peserta, dan review jawaban esai.",
  },
] as const satisfies readonly {
  slide: SlideId;
  icon: LucideIcon;
  name: string;
  description: string;
}[];

/** The four pillars of the platform, each linking to its slide. */
export function SolutionSlide() {
  return (
    <Slide id="solusi">
      <SlidePanels labels={["Solusi", "Empat pilar"]} className="lg:gap-12">
        <Panel>
          <SlideHeading
            id="solusi"
            title="Semua yang dibutuhkan program kelas Anda,"
            muted="sudah jadi."
            description="Empat pilar dalam satu platform. Lembaga fokus mengajar, sistemnya Hakgyo yang urus."
            className="max-w-4xl"
          />
        </Panel>
        <Panel>
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {pillars.map(({ slide, icon: Icon, name, description }, index) => (
              <a
                key={name}
                href={`#${slide}`}
                {...reveal(3 + index)}
                className="group border-border bg-card hover:border-foreground/30 flex items-start gap-4 rounded-2xl border p-4 transition-colors sm:flex-col sm:gap-0 sm:p-6"
              >
                <div className="flex shrink-0 items-center justify-between sm:w-full">
                  <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl sm:size-11">
                    <Icon
                      className="size-5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-muted-foreground hidden font-mono text-xs sm:inline">
                    0{index + 1}
                  </span>
                </div>
                <div className="min-w-0 sm:mt-10 sm:flex sm:flex-1 sm:flex-col">
                  <h3 className="text-base font-medium tracking-tight sm:text-xl">
                    {name}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6 sm:mt-3 sm:flex-1">
                    {description}
                  </p>
                  <span className="mt-6 hidden items-center gap-2 text-sm font-medium sm:inline-flex">
                    Lihat detail
                    <ArrowRightIcon
                      className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Panel>
      </SlidePanels>
    </Slide>
  );
}
