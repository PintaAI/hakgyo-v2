"use client";

import Image from "next/image";
import { useState } from "react";
import { BookOpenIcon, LanguagesIcon, ArrowUpRightIcon } from "lucide-react";

const views = [
  {
    id: "curriculum",
    title: "Susun kurikulum",
    icon: BookOpenIcon,
    caption: "Materi, kosakata, dan tugas dalam satu alur belajar.",
    alt: "Pembuat kurikulum Hakgyo dengan bab Mengenal Hangul, materi, kuis, dan kosakata Sapaan Dasar.",
  },
  {
    id: "vocabulary",
    title: "Bangun kosakata",
    icon: LanguagesIcon,
    caption: "Kumpulan kata, arti, dan contoh untuk bahan ajar Anda.",
    alt: "Editor kosakata Hakgyo untuk set Sapaan Sehari-hari dalam bahasa Korea.",
  },
] as const;

export function LandingProductPreview() {
  const [selected, setSelected] = useState(0);
  const view = views[selected]!;
  return (
    <div>
      <div className="mb-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div
          className="bg-background border-border flex max-w-full gap-1 rounded-full border p-1"
          aria-label="Pilih tampilan produk"
        >
          {views.map(({ title, icon: Icon }, index) => (
            <button
              key={title}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={`focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-5 sm:text-sm ${selected === index ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {title}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="bg-primary size-1.5 rounded-full" />
          Tampilan asli Hakgyo{" "}
          <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-[0_24px_80px_-32px_color-mix(in_oklch,var(--foreground)_20%,transparent)]">
        <div
          className="bg-muted/50 border-border flex items-center gap-2 border-b px-5 py-3"
          aria-hidden="true"
        >
          <span className="border-muted-foreground/40 size-2 rounded-full border" />
          <span className="border-muted-foreground/40 size-2 rounded-full border" />
          <span className="border-muted-foreground/40 size-2 rounded-full border" />
          <span className="text-muted-foreground mx-auto pr-10 text-[10px] tracking-[0.12em]">
            HAKGYO / WORKSPACE
          </span>
        </div>
        <div aria-live="polite">
          <Image
            src={`/images/landing/${view.id}-light.jpg`}
            alt={view.alt}
            width={1176}
            height={888}
            sizes="(max-width: 768px) 100vw, 1120px"
            preload={selected === 0}
            className="block h-auto w-full dark:hidden"
          />
          <Image
            src={`/images/landing/${view.id}-dark.jpg`}
            alt={view.alt}
            width={1176}
            height={888}
            sizes="(max-width: 768px) 100vw, 1120px"
            className="hidden h-auto w-full dark:block"
          />
        </div>
      </div>
      <p
        className="text-muted-foreground mt-4 text-center text-xs"
        aria-live="polite"
      >
        {view.caption}{" "}
        <span className="hidden sm:inline">
          Ditampilkan dengan data contoh.
        </span>
      </p>
    </div>
  );
}
