"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGridIcon, ListIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { EntryImage } from "./entry-image";
import { VocabularyAudioButton } from "./vocabulary-audio-button";

const VIEW_MODE_KEY = "hakgyo:vocab-view-mode:v1";

export type VocabularySetEntry = {
  id: string;
  term: string;
  definition: string;
  audioAsset?: { id: string } | null;
  imageAsset?: { id: string } | null;
};

export function VocabularySetDetail({
  courseId,
  courseItemId,
  vocabulary,
  footer,
}: {
  courseId: string;
  courseItemId: string;
  vocabulary: {
    id: string;
    title: string;
    description: string | null;
    entries: VocabularySetEntry[];
  };
  footer?: React.ReactNode;
}) {
  const [viewMode, setViewModeState] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });
  const total = vocabulary.entries.length;
  const entryHref = (entryId: string) =>
    `/learn/vocabulary/${vocabulary.id}/items/${entryId}?source=${courseItemId}`;
  const practiceHref = `/learn/assessments?${new URLSearchParams({
    courseId,
    sourceCourseItemId: courseItemId,
    vocabularySetId: vocabulary.id,
    vocabularyTitle: vocabulary.title,
  })}`;

  function setViewMode(mode: "list" | "grid") {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // The display preference is optional.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section className="bg-card ring-foreground/10 flex flex-col gap-5 rounded-[20px] p-5 ring-1 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-black tracking-[2px] uppercase">
            Kosakata · {total} kata
          </p>
          <h1 className="text-3xl leading-10 font-black tracking-tight">
            {vocabulary.title}
          </h1>
          {vocabulary.description ? (
            <p className="text-muted-foreground text-sm leading-6">
              {vocabulary.description}
            </p>
          ) : null}
        </div>
        <Link href={practiceHref} className={buttonVariants({ size: "lg" })}>
          Mulai latihan
        </Link>
      </section>

      {total > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-bold tracking-[1.2px] uppercase">
            Kata ({total})
          </h2>
          <div className="bg-muted flex items-center rounded-full p-1">
            {(
              [
                ["list", "Tampilan daftar", ListIcon],
                ["grid", "Tampilan kisi", LayoutGridIcon],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  viewMode === mode
                    ? "bg-background text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Set ini belum memiliki kata.
        </p>
      )}

      {viewMode === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vocabulary.entries.map((entry) => (
            <li
              key={entry.id}
              className="bg-card border-border flex flex-col gap-2 rounded-[20px] border p-4"
            >
              <Link
                href={entryHref(entry.id)}
                aria-label={`Lihat detail ${entry.term}`}
                className="flex flex-col gap-2"
              >
                {entry.imageAsset ? (
                  <EntryImage assetId={entry.imageAsset.id} variant="grid" />
                ) : null}
                <span className="text-[15px] leading-5 font-bold">
                  {entry.term}
                </span>
                <span className="text-muted-foreground text-xs leading-4">
                  {entry.definition}
                </span>
              </Link>
              {entry.audioAsset ? (
                <div className="flex justify-end pt-1">
                  <VocabularyAudioButton assetId={entry.audioAsset.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {vocabulary.entries.map((entry, index) => (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 py-3",
                index !== total - 1 && "border-border/60 border-b",
              )}
            >
              <Link
                href={entryHref(entry.id)}
                aria-label={`Lihat detail ${entry.term}`}
                className="hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors"
              >
                <span className="text-muted-foreground w-6 text-xs font-bold tabular-nums">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {entry.term}
                  </span>
                  <span className="text-muted-foreground text-xs leading-4">
                    {entry.definition}
                  </span>
                </span>
                {entry.imageAsset ? (
                  <EntryImage assetId={entry.imageAsset.id} variant="list" />
                ) : null}
              </Link>
              {entry.audioAsset ? (
                <VocabularyAudioButton assetId={entry.audioAsset.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {footer ? <div className="mt-5">{footer}</div> : null}
    </div>
  );
}
