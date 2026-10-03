"use client";

import type { ReactNode } from "react";
import {
  BookOpenIcon,
  CheckIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  GripVerticalIcon,
  LoaderCircleIcon,
  PlusIcon,
  ShuffleIcon,
  TimerIcon,
  TrophyIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

import { Appear, demoShadow, DemoWindow, Expand } from "./frame";
import { useCountdown, useTimeline } from "../motion";

type DemoItem = {
  icon: LucideIcon;
  title: string;
  type: string;
};

function CurriculumItemRow({
  item,
  published,
  highlighted = false,
}: {
  item: DemoItem;
  published: boolean;
  highlighted?: boolean;
}) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-t px-3 py-2.5 transition-colors duration-700 sm:gap-3 sm:px-4",
        highlighted && "bg-primary/5",
      )}
    >
      <GripVerticalIcon className="text-muted-foreground/50 size-4 shrink-0" />
      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="text-muted-foreground mt-0.5 block text-[11px] tracking-wide uppercase">
          {item.type}
        </span>
      </span>
      <span className="text-muted-foreground hidden text-xs sm:inline">
        Tampil
      </span>
      <Switch checked={published} readOnly tabIndex={-1} />
    </div>
  );
}

function CurriculumModule({
  index,
  title,
  count,
  children,
}: {
  index: number;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <li className="bg-card overflow-hidden rounded-xl border">
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVerticalIcon className="text-muted-foreground size-4 shrink-0" />
        <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium">{title}</p>
            <Badge variant="secondary">{count} item</Badge>
          </div>
        </div>
      </div>
      {children}
    </li>
  );
}

const curriculumTimeline = [1600, 1500, 1400, 3200] as const;

/** The course curriculum builder, adding and publishing a new item. */
export function CurriculumDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(curriculumTimeline);
  const added = step >= 1;
  const published = step >= 2;
  const live = step >= 3;
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Pembuat kurikulum Hakgyo: bab berisi materi, tugas, dan kosakata; pengajar menambahkan tugas baru lalu menampilkannya ke murid."
    >
      <DemoWindow label="HAKGYO / KURIKULUM">
        <div className="p-4 sm:p-6 lg:h-[min(62dvh,560px)] lg:overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
                Pembuat kurikulum
              </p>
              <p className="mt-1 text-xl font-medium tracking-tight sm:text-2xl">
                Bahasa Korea Dasar
              </p>
            </div>
            <Badge
              variant={live ? "default" : "outline"}
              className="transition-colors"
            >
              {live ? "Kursus terbit" : "Draft"}
            </Badge>
          </div>
          <div className="bg-muted/40 mt-5 hidden grid-cols-3 divide-x rounded-xl border py-3 sm:grid">
            {[
              ["Bab", "2"],
              ["Learning item", added ? "4" : "3"],
              ["Progresi", "Bertahap"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 px-3 sm:px-4">
                <span className="text-muted-foreground block text-[10px] font-semibold tracking-[0.12em] uppercase">
                  {label}
                </span>
                <span
                  key={value}
                  className="animate-in fade-in slide-in-from-bottom-2 mt-1 block truncate text-base font-medium duration-500 sm:text-lg"
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
          <ol className="mt-4 grid gap-3">
            <CurriculumModule index={1} title="Mengenal Hangeul" count={2}>
              <CurriculumItemRow
                item={{
                  icon: FileTextIcon,
                  title: "Sejarah Singkat Hangeul",
                  type: "Materi",
                }}
                published
              />
              <CurriculumItemRow
                item={{
                  icon: ClipboardCheckIcon,
                  title: "Kuis Hangeul Dasar",
                  type: "Tugas",
                }}
                published
              />
            </CurriculumModule>
            <CurriculumModule
              index={2}
              title="Sapaan Dasar"
              count={added ? 2 : 1}
            >
              <CurriculumItemRow
                item={{
                  icon: BookOpenIcon,
                  title: "Sapaan Sehari-hari",
                  type: "Kosakata",
                }}
                published
              />
              <Expand shown={added}>
                <CurriculumItemRow
                  item={{
                    icon: ClipboardCheckIcon,
                    title: "Latihan Sapaan",
                    type: "Tugas",
                  }}
                  published={published}
                  highlighted={added && !live}
                />
              </Expand>
              <div className="bg-muted/30 border-t px-3 py-2.5 sm:px-4">
                <span
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-shadow duration-500",
                    step === 0 && "ring-primary/40 ring-4",
                  )}
                >
                  <PlusIcon className="size-3.5" />
                  Tambah learning item
                </span>
              </div>
            </CurriculumModule>
          </ol>
        </div>
      </DemoWindow>
    </div>
  );
}

const answerOptions = [
  "Selamat pagi",
  "Terima kasih",
  "Sampai jumpa",
  "Maaf",
] as const;
const participants = ["Peserta A", "Peserta B", "Peserta C", "Peserta D"];
const scoresBefore = [96, 92, 88, 85];
const scoresAfter = [96, 92, 98, 85];
const tryoutTimeline = [1600, 1400, 3400] as const;

function ranking(scores: number[]) {
  return participants
    .map((name, index) => ({ name, score: scores[index]! }))
    .sort((first, second) => second.score - first.score);
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** A timed tryout question and a live ranking that reorders on submit. */
export function TryoutDemo() {
  const { ref, step, playing } = useTimeline<HTMLDivElement>(tryoutTimeline);
  const seconds = useCountdown(42 * 60 + 18, playing);
  const answered = step >= 1;
  const submitted = step >= 2;
  const order = ranking(submitted ? scoresAfter : scoresBefore);
  const rowHeight = 32;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Tryout berwaktu: murid menjawab soal bahasa Korea, lalu peringkat peserta diperbarui."
      className="relative lg:pr-40"
    >
      <div
        className={cn(
          "border-border bg-card rounded-2xl border p-5 sm:p-7",
          demoShadow,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Tryout Bab 1–5</p>
            <p className="text-muted-foreground text-xs">
              Soal {submitted ? 13 : 12} dari 40
            </p>
          </div>
          <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs tabular-nums">
            <TimerIcon className="size-3.5" />
            {formatClock(seconds)}
          </span>
        </div>
        <div className="bg-muted mt-4 h-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-700"
            style={{ width: submitted ? "32.5%" : "30%" }}
          />
        </div>
        <p
          className="mt-4 text-base leading-7 font-medium sm:mt-6 sm:text-lg sm:leading-8"
          lang="ko"
        >
          다음 중 &lsquo;감사합니다&rsquo;의 뜻으로 알맞은 것은?
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-1">
          {answerOptions.map((option, index) => {
            const selected = answered && option === "Terima kasih";
            return (
              <div
                key={option}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors duration-300 sm:gap-3 sm:px-3.5 sm:py-2.5",
                  selected
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[11px] transition-colors duration-300",
                    selected &&
                      "bg-primary text-primary-foreground border-primary",
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs sm:mt-5">
          <ShuffleIcon className="size-3.5" />
          Urutan soal diacak untuk setiap peserta
        </p>
      </div>
      <div
        className={cn(
          "border-border bg-card relative mt-3 w-full rounded-2xl border p-4 sm:ml-auto sm:w-56 lg:absolute lg:top-1/2 lg:right-0 lg:mt-0 lg:-translate-y-1/4",
          demoShadow,
        )}
      >
        <p className="flex items-center gap-2 text-xs font-semibold">
          <TrophyIcon className="size-3.5 text-amber-500" />
          Peringkat
        </p>
        <ol
          className="relative mt-3"
          style={{ height: participants.length * rowHeight }}
        >
          {participants.map((name) => {
            const rank = order.findIndex((entry) => entry.name === name);
            const score = order[rank]!.score;
            const rising = submitted && name === "Peserta C";
            return (
              <li
                key={name}
                className={cn(
                  "absolute inset-x-0 top-0 flex h-7 items-center gap-2.5 rounded-lg px-1.5 text-xs transition-[translate,background-color] duration-700 ease-out motion-reduce:transition-none",
                  rising && "bg-primary/10",
                )}
                style={{ translate: `0 ${rank * rowHeight}px` }}
              >
                <span className="text-muted-foreground w-3 font-mono">
                  {rank + 1}
                </span>
                <span className="bg-muted size-5 rounded-full" />
                <span className="flex-1">{name}</span>
                <span className="font-mono font-medium tabular-nums">
                  {score}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

const assistantSteps = [
  "Bab “Angka Sino-Korea” dibuat",
  "Materi “Menghitung 1–10” ditambahkan",
  "Set kosakata 12 kata ditambahkan",
];
const assistantTimeline = [700, 1300, 1500, 700, 700, 700, 3400] as const;

/** An AI client building course content through Hakgyo's MCP server. */
export function AssistantDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(assistantTimeline);
  const completed = Math.max(0, Math.min(step - 2, assistantSteps.length));
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Asisten AI membuat bab, materi, dan set kosakata di Hakgyo atas permintaan pengajar."
      className={cn(
        "border-border bg-card rounded-2xl border p-5 sm:p-6",
        demoShadow,
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between text-[10px] tracking-[0.14em] uppercase">
        <span>Claude · ChatGPT</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-emerald-500" />
          </span>
          Terhubung ke Hakgyo
        </span>
      </div>
      <Appear
        shown={step >= 1}
        className="bg-primary text-primary-foreground mt-5 ml-auto max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-6"
      >
        Buatkan bab baru tentang angka Korea untuk kelas Dasar A, lengkap dengan
        kosakatanya.
      </Appear>
      <div className="relative mt-3">
        <Appear
          shown={step >= 3}
          className="bg-muted max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-6"
        >
          <p>Selesai. Ini yang saya tambahkan ke kursus Anda:</p>
          <ul className="mt-2 grid gap-1.5">
            {assistantSteps.map((text, index) => (
              <li
                key={text}
                className={cn(
                  "flex items-start gap-2 text-[13px] transition-opacity duration-300",
                  index < completed ? "opacity-100" : "opacity-40",
                )}
              >
                {index < completed ? (
                  <CheckIcon className="text-primary mt-1 size-3.5 shrink-0" />
                ) : (
                  <LoaderCircleIcon className="text-muted-foreground mt-1 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
                )}
                {text}
              </li>
            ))}
          </ul>
        </Appear>
        <div
          className={cn(
            "bg-muted absolute top-0 left-0 flex gap-1 rounded-2xl rounded-bl-md px-4 py-3.5 transition-opacity duration-300",
            step === 2 ? "opacity-100" : "opacity-0",
          )}
        >
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const meetingTimeline = [1600, 3400] as const;

/** A scheduled class getting its meeting link from the provider. */
export function MeetingLinkDemo() {
  const { ref, step } = useTimeline<HTMLDivElement>(meetingTimeline);
  const ready = step >= 1;
  return (
    <div
      ref={ref}
      className="bg-muted/50 mt-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 text-xs sm:mt-6"
      aria-hidden="true"
    >
      <VideoIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Kelas A1 · Kamis, 19.00</span>
        <span className="text-muted-foreground block">
          {ready ? "Link meeting siap" : "Membuat meeting…"}
        </span>
      </span>
      {ready ? (
        <span className="bg-primary text-primary-foreground animate-in zoom-in-50 grid size-5 place-items-center rounded-full duration-300">
          <CheckIcon className="size-3" />
        </span>
      ) : (
        <LoaderCircleIcon className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none" />
      )}
    </div>
  );
}
