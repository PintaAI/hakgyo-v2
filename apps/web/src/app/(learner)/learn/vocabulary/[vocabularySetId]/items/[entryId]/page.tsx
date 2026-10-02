import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntryImage } from "~/components/learner/learn/entry-image";
import { VocabularyAudioButton } from "~/components/learner/learn/vocabulary-audio-button";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Detail kata" };

function exampleLines(value: unknown) {
  if (Array.isArray(value))
    return value.filter(
      (example): example is string =>
        typeof example === "string" && Boolean(example.trim()),
    );
  return typeof value === "string"
    ? value.split("\n").filter((example) => Boolean(example.trim()))
    : [];
}

export default async function VocabularyEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ vocabularySetId: string; entryId: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const [{ vocabularySetId, entryId }, { source }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!source) notFound();

  const vocabulary = await api.learning
    .getVocabularyPractice({ vocabularySetId, sourceCourseItemId: source })
    .catch(() => null);
  if (!vocabulary) notFound();
  const index = vocabulary.entries.findIndex((entry) => entry.id === entryId);
  const entry = vocabulary.entries[index];
  if (!entry) notFound();
  const examples = exampleLines(entry.examples);
  const total = vocabulary.entries.length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-primary text-center text-[11px] font-bold tracking-[1.5px] uppercase">
            Word {index + 1} of {total}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="min-w-0 flex-1 text-[28px] leading-8 font-black tracking-tight">
              {entry.term}
            </h1>
            {entry.audioAssetId ? (
              <VocabularyAudioButton assetId={entry.audioAssetId} />
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{vocabulary.title}</p>
        </div>
        <div
          role="progressbar"
          aria-label="Posisi kata"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          className="bg-muted h-1 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {entry.imageAssetId ? (
        <EntryImage
          assetId={entry.imageAssetId}
          variant="detail"
          label={`${entry.term} illustration`}
        />
      ) : null}

      <section className="border-border flex flex-col gap-1.5 border-t pt-5">
        <h2 className="text-primary text-[11px] font-bold tracking-[1.5px] uppercase">
          Arti
        </h2>
        <p className="text-base leading-6 font-bold">{entry.definition}</p>
      </section>

      {examples.length > 0 ? (
        <section className="border-border flex flex-col gap-2 border-t pt-5">
          <h2 className="text-primary text-[11px] font-bold tracking-[1.5px] uppercase">
            Contoh
          </h2>
          {examples.map((example, exampleIndex) => (
            <p
              key={`${exampleIndex}:${example}`}
              className="text-muted-foreground text-sm"
            >
              “{example}”
            </p>
          ))}
        </section>
      ) : null}

      <Link
        href={`/learn/${vocabulary.courseId}/items/${source}`}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
      >
        Kembali ke daftar kata
      </Link>
    </div>
  );
}
