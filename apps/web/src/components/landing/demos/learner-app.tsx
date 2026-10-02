"use client";

import Image from "next/image";
import { BellIcon, PaletteIcon, WifiOffIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { demoShadow } from "./frame";
import { useTimeline } from "../motion";

const screens = [
  {
    name: "today",
    alt: "Tab Hari Ini di aplikasi Hakgyo: streak mingguan, XP, kartu kosakata bergambar, dan tugas hari ini.",
  },
  {
    name: "learn",
    alt: "Tab Belajar di aplikasi Hakgyo: kelas EPS-TOPIK dengan tombol grup WhatsApp, lanjutkan belajar, dan kurikulum per bab.",
  },
  {
    name: "practice",
    alt: "Tab Latihan di aplikasi Hakgyo: game penguasaan Hangeul serta game kosakata dan kuis.",
  },
] as const;
const timeline = [3600, 3600, 3600] as const;
// The push notification appears while the Belajar screen is showing.
const notificationScreen = 1;

/** Real screenshots of the learner app in an iPhone frame, one tab at a time. */
export function LearnerAppDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(timeline);

  return (
    <div ref={ref} className="relative mx-auto w-fit">
      <div
        className={cn(
          "relative w-[236px] rounded-[2.7rem] bg-[#1d1e22] p-[9px] ring-1 ring-black/10 sm:w-[272px] sm:rounded-[3rem] dark:ring-white/15",
          demoShadow,
        )}
      >
        {/* Side buttons: action and volume on the left, power on the right. */}
        <span className="absolute top-[88px] -left-[3px] h-6 w-[3px] rounded-l bg-[#2b2c31]" />
        <span className="absolute top-[128px] -left-[3px] h-11 w-[3px] rounded-l bg-[#2b2c31]" />
        <span className="absolute top-[182px] -left-[3px] h-11 w-[3px] rounded-l bg-[#2b2c31]" />
        <span className="absolute top-[150px] -right-[3px] h-16 w-[3px] rounded-r bg-[#2b2c31]" />
        <div className="relative aspect-[1179/2556] overflow-hidden rounded-[2.15rem] bg-black sm:rounded-[2.45rem]">
          {screens.map(({ name, alt }, index) => (
            <Image
              key={name}
              src={`/images/landing/app-${name}.webp`}
              alt={alt}
              width={886}
              height={1921}
              sizes="(min-width: 40rem) 254px, 218px"
              aria-hidden={index !== step}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                index === step
                  ? "translate-x-0 opacity-100"
                  : index < step
                    ? "-translate-x-6 opacity-0"
                    : "translate-x-6 opacity-0",
              )}
            />
          ))}
          <span className="absolute top-[9px] left-1/2 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
      <div
        className={cn(
          "border-border bg-card absolute top-[30%] right-[calc(100%-2rem)] hidden w-56 items-start gap-2.5 rounded-2xl border p-3 transition-[opacity,translate] duration-500 ease-out sm:flex",
          demoShadow,
          step === notificationScreen
            ? "opacity-100"
            : "-translate-x-4 opacity-0",
        )}
      >
        <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-lg">
          <BellIcon className="size-3.5" />
        </span>
        <span>
          <span className="block text-xs font-semibold">
            Tryout Bab 1 sudah dibuka
          </span>
          <span className="text-muted-foreground block text-[11px]">
            Kerjakan sebelum ditutup.
          </span>
        </span>
      </div>
      <div
        className={cn(
          "border-border bg-card animate-landing-float absolute bottom-[18%] left-[calc(100%-2rem)] hidden items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium whitespace-nowrap sm:flex",
          demoShadow,
        )}
      >
        <WifiOffIcon className="size-3.5" />
        Tetap jalan saat offline
      </div>
      <div
        className={cn(
          "border-border bg-card absolute -top-5 left-[calc(100%-4.5rem)] hidden items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium whitespace-nowrap sm:flex",
          demoShadow,
        )}
      >
        <PaletteIcon className="size-3.5" />
        Logo & warna lembaga Anda
      </div>
    </div>
  );
}
