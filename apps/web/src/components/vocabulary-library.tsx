"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  LanguagesIcon,
  LibraryIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export function VocabularyLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const vocabularySets = api.content.listVocabularySets.useQuery({
    organizationId,
  });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const visibleSets =
    vocabularySets.data?.filter((set) =>
      `${set.title} ${set.description ?? ""} ${set.entries
        .map((entry) => `${entry.term} ${entry.definition}`)
        .join(" ")}`
        .toLocaleLowerCase()
        .includes(deferredSearch),
    ) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <LibraryIcon className="size-4" />
            Perpustakaan konten
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Kosakata
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Buat kumpulan kata dengan definisi dan contoh untuk pelajaran dan
            persyaratan course.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationSlug}/library/vocabulary/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          Set kosakata baru
        </Link>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Cari set kosakata"
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari set, istilah, atau definisi"
          value={search}
        />
      </div>

      {vocabularySets.isPending ? (
        <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Memuat kosakata
        </div>
      ) : vocabularySets.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-destructive text-sm">
            {vocabularySets.error.message}
          </p>
          <Button variant="outline" onClick={() => vocabularySets.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : visibleSets.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSets.map((set) => (
            <Link
              href={`/workspace/${organizationSlug}/library/vocabulary/${set.id}`}
              key={set.id}
              className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/20 group-hover:bg-muted/20 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      <LanguagesIcon className="size-5" />
                    </div>
                    <Badge variant="outline">
                      {set.entries.length} istilah
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-heading truncate font-semibold">
                      {set.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                      {set.description ?? "Belum ada deskripsi."}
                    </p>
                  </div>
                  <div className="mt-auto flex min-h-7 flex-wrap gap-1.5 border-t pt-4">
                    {set.entries.slice(0, 3).map((entry) => (
                      <Badge key={entry.id} variant="secondary">
                        {entry.term}
                      </Badge>
                    ))}
                    {set.entries.length > 3 && (
                      <span className="text-muted-foreground self-center text-xs">
                        +{set.entries.length - 3} lainnya
                      </span>
                    )}
                    {!set.entries.length && (
                      <span className="text-muted-foreground text-xs">
                        Belum ada istilah
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
            <LanguagesIcon className="size-5" />
          </div>
          <h2 className="font-heading font-semibold">
            {deferredSearch
              ? "Kosakata tidak ditemukan"
              : "Buat set kosakata pertama Anda"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {deferredSearch
              ? "Coba judul set, istilah, atau definisi yang berbeda."
              : "Kelompokkan istilah terkait menjadi satu set yang dapat dipakai ulang lintas course."}
          </p>
          {!deferredSearch && (
            <Link
              href={`/workspace/${organizationSlug}/library/vocabulary/new`}
              className={buttonVariants({ className: "mt-4" })}
            >
              <PlusIcon data-icon="inline-start" />
              Set kosakata baru
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
