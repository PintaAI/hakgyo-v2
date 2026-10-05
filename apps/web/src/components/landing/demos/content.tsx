"use client";

import {
  CheckIcon,
  FileTextIcon,
  LoaderCircleIcon,
  SparklesIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { Appear, demoShadow, DemoWindow } from "./frame";
import { useTimeline } from "../motion";

/** The tinted strip both import demos play in. */
const importDemoFrame =
  "bg-muted/50 flex h-36 items-center gap-4 rounded-xl p-3.5 sm:h-40 sm:p-4";

const pdfChapters = [
  "Bab 1 · Hangeul · hal. 11–18",
  "Bab 2 · Sapaan · hal. 19–26",
  "Bab 3 · Angka · hal. 27–34",
];
const pdfTimeline = [1100, 550, 550, 550, 2400] as const;

/** A PDF textbook split into curriculum chapters. */
export function PdfImportDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(pdfTimeline);
  return (
    <div ref={ref} className={importDemoFrame} aria-hidden="true">
      <div className="relative h-24 w-18 shrink-0">
        {[2, 1, 0].map((offset) => (
          <div
            key={offset}
            className={cn(
              "bg-card absolute inset-0 rounded-md border shadow-sm transition-transform duration-700 ease-out",
            )}
            style={{
              transform:
                step >= 1
                  ? `translate(${offset * 5}px, ${offset * -5}px) rotate(${offset * 4}deg)`
                  : undefined,
            }}
          >
            {offset === 0 ? (
              <FileTextIcon className="text-primary m-2 size-5" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="grid min-w-0 flex-1 gap-1.5">
        {pdfChapters.map((chapter, index) => (
          <Appear
            key={chapter}
            shown={step >= index + 1}
            className="bg-card truncate rounded-md border px-2.5 py-1.5 text-[11px] font-medium"
          >
            {chapter}
          </Appear>
        ))}
      </div>
    </div>
  );
}

const photoEntries = [
  ["안녕하세요", "Halo"],
  ["감사합니다", "Terima kasih"],
  ["미안합니다", "Maaf"],
] as const;
const photoTimeline = [1800, 550, 550, 550, 2400] as const;

/** AI reading a photographed vocabulary list into entries. */
export function PhotoImportDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(photoTimeline);
  const scanning = step === 0;
  return (
    <div ref={ref} className={importDemoFrame} aria-hidden="true">
      <div className="bg-card relative h-24 w-20 shrink-0 overflow-hidden rounded-md border p-2 shadow-sm">
        {[80, 60, 72, 50, 66].map((width, index) => (
          <span
            key={index}
            className="bg-muted-foreground/25 mb-1.5 block h-1 rounded-full"
            style={{ width: `${width}%` }}
          />
        ))}
        <span
          className={cn(
            "bg-primary absolute inset-x-0 h-0.5 shadow-[0_0_12px_2px_var(--primary)] transition-opacity",
            scanning
              ? "animate-scan-line opacity-100 motion-reduce:animate-none"
              : "opacity-0",
          )}
        />
      </div>
      <div className="grid min-w-0 flex-1 gap-1.5">
        {photoEntries.map(([korean, meaning], index) => (
          <Appear
            key={korean}
            shown={step >= index + 1}
            className="bg-card flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11px]"
          >
            <span className="font-medium" lang="ko">
              {korean}
            </span>
            <span className="text-muted-foreground truncate">{meaning}</span>
          </Appear>
        ))}
      </div>
    </div>
  );
}

const jamo = [
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅏ",
  "ㅓ",
  "ㅗ",
  "ㅜ",
  "ㅡ",
  "ㅣ",
];
const starterTimeline = jamo.map(() => 700);
const textbookChapters = [
  { chapter: "Bab 1", width: "w-3/5" },
  { chapter: "Bab 2", width: "w-2/5" },
  { chapter: "Bab 3", width: "w-1/2" },
];

/** The ready-made courses a new organization starts with. */
export function StarterMaterialsDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(starterTimeline);
  const card = cn("bg-card rounded-2xl border p-4 sm:p-5", demoShadow);
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Kurikulum Hangeul Mastery dan buku standar EPS-TOPIK dari HRD Korea, siap dipakai di ruang lembaga."
      className="grid gap-3 sm:gap-4"
    >
      <div className={card}>
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl font-semibold">
            한
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Hangeul Mastery</p>
            <p className="text-muted-foreground text-xs">
              Kurikulum dasar, gratis untuk setiap murid
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5" lang="ko">
          {jamo.map((letter, index) => (
            <span
              key={letter}
              className={cn(
                "grid h-9 place-items-center rounded-lg border text-sm transition-colors duration-300",
                index === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40",
              )}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
      <div className={card}>
        <div className="flex items-center gap-3">
          <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-xl text-xs font-semibold">
            EPS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" lang="ko">
              EPS-TOPIK 한국어 표준교재
            </p>
            <p className="text-muted-foreground text-xs">
              Buku standar dari HRD Korea
            </p>
          </div>
          <span className="text-primary ml-auto hidden shrink-0 items-center gap-1 text-[11px] font-medium sm:inline-flex">
            <CheckIcon className="size-3.5" />
            Siap dipakai
          </span>
        </div>
        <div className="mt-4 grid gap-1.5">
          {textbookChapters.map(({ chapter, width }, index) => (
            <Appear
              key={chapter}
              shown={step >= index}
              className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2 text-[11px]"
            >
              <span className="font-medium">{chapter}</span>
              <span
                className={cn(
                  "bg-muted-foreground/20 h-1.5 rounded-full",
                  width,
                )}
              />
            </Appear>
          ))}
        </div>
      </div>
    </div>
  );
}

const sampleCourses = [
  { title: "Korea Dasar A1", price: "Rp350.000", tone: "bg-orange-200" },
  { title: "Persiapan EPS-TOPIK", price: "Rp500.000", tone: "bg-amber-200" },
  { title: "Kelas Percakapan", price: "Gratis", tone: "bg-rose-200" },
];
const promoTimeline = [1200, 1000, 450, 450, 450, 3200] as const;

/** An organization landing page being designed and filled with courses. */
export function PromoPageDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(promoTimeline);
  const designed = step >= 1;
  const synced = step >= 5;
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Halaman promosi lembaga yang didesain AI, dengan daftar kelas yang terisi otomatis dari Hakgyo."
      className="relative"
    >
      <DemoWindow
        label="HAKGYO / LEMBAGA-ANDA"
        className="bg-[#fff8f1] text-[#2b1a12]"
      >
        <div className="px-4 pt-4 pb-5 sm:px-8 sm:pt-5 sm:pb-7">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid size-6 place-items-center rounded-md bg-[#e8572a] text-[9px] text-white">
                LA
              </span>
              Lembaga Anda
            </span>
            <span className="rounded-full bg-[#2b1a12] px-3 py-1 text-white">
              Lihat kelas
            </span>
          </div>
          <div className="relative mt-5 min-h-32 sm:mt-8 sm:min-h-36">
            <div
              className={cn(
                "absolute inset-0 grid content-start gap-3 transition-opacity duration-500",
                designed ? "opacity-0" : "opacity-100",
              )}
            >
              <span className="h-2.5 w-24 animate-pulse rounded-full bg-[#2b1a12]/10" />
              <span className="h-7 w-72 animate-pulse rounded-lg bg-[#2b1a12]/10" />
              <span className="h-3 w-56 animate-pulse rounded-full bg-[#2b1a12]/10" />
            </div>
            <Appear shown={designed}>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#e8572a] uppercase">
                Kelas bahasa Korea
              </p>
              <p className="mt-2 max-w-sm text-2xl leading-[1.05] font-semibold tracking-tight sm:text-3xl">
                Belajar Korea, mulai dari Hangeul.
              </p>
              <p className="mt-3 max-w-xs text-xs leading-5 text-[#6b5448]">
                Kelas kecil, pengajar berpengalaman, dan latihan setiap hari
                lewat aplikasi.
              </p>
            </Appear>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
            {sampleCourses.map(({ title, price, tone }, index) => (
              <Appear
                key={title}
                shown={step >= index + 2}
                className="overflow-hidden rounded-xl border border-[#f0dccb] bg-white"
              >
                <div className={cn("aspect-[16/10]", tone)} />
                <div className="p-2.5">
                  <p className="text-[11px] leading-4 font-semibold">{title}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#e8572a]">
                    {price}
                  </p>
                </div>
              </Appear>
            ))}
          </div>
        </div>
      </DemoWindow>
      <div
        className={cn(
          "border-border bg-card text-card-foreground absolute -top-5 -right-3 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium",
          demoShadow,
        )}
      >
        {designed ? (
          <SparklesIcon className="text-primary size-3.5" />
        ) : (
          <LoaderCircleIcon className="text-primary size-3.5 animate-spin motion-reduce:animate-none" />
        )}
        {designed ? "Didesain dengan AI" : "AI sedang mendesain…"}
      </div>
      <div
        className={cn(
          "border-border bg-card text-card-foreground absolute -bottom-5 -left-3 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-[opacity,translate] duration-500",
          demoShadow,
          synced ? "opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <CheckIcon className="text-primary size-3.5" />
        Daftar kelas sinkron otomatis
      </div>
    </div>
  );
}
