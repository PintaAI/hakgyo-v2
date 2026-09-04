import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheckIcon, ConstructionIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Hafalkan kosakata" };

export default async function VocabularyPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ vocabularySetId: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const [{ vocabularySetId }, { source }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!source) notFound();

  const vocabulary = await api.learning
    .getVocabularyPractice({
      vocabularySetId,
      sourceCourseItemId: source,
    })
    .catch(() => null);
  if (!vocabulary) notFound();

  return (
    <div className="mx-auto max-w-2xl py-10">
      <section className="bg-card rounded-2xl border p-8 text-center shadow-sm">
        <span className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-2xl">
          <BookOpenCheckIcon className="size-7" />
        </span>
        <p className="text-primary mt-5 text-xs font-bold tracking-wider uppercase">
          Hafalkan kosakata
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold">
          {vocabulary.title}
        </h1>
        {vocabulary.description ? (
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            {vocabulary.description}
          </p>
        ) : null}
        <div className="bg-muted/40 mt-7 rounded-xl border border-dashed p-6">
          <ConstructionIcon className="text-muted-foreground mx-auto size-6" />
          <p className="mt-3 font-semibold">Mode hafalan sedang disiapkan</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {vocabulary._count.entries} kosakata sudah siap untuk fitur latihan
            berikutnya.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "mt-7")}
          href={`/learn/${vocabulary.courseId}/items/${source}`}
        >
          Kembali ke materi
        </Link>
      </section>
    </div>
  );
}
