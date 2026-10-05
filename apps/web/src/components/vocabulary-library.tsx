"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import {
  LanguagesIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function VocabularyLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const [search, setSearch] = useState("");
  // Entry terms and definitions are matched on the server, so the list does
  // not need to ship every entry.
  const debouncedSearch = useDebouncedValue(search.trim().slice(0, 200));
  const vocabularySets = api.content.listVocabularySets.useQuery(
    {
      organizationId,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    { placeholderData: keepPreviousData },
  );
  const visibleSets = vocabularySets.data ?? [];

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="Bahan ajar"
        title="Kosakata"
        description="Buat kumpulan kata dengan definisi dan contoh untuk pelajaran dan persyaratan kurikulum."
        actions={
          <Link
            href={`/workspace/${organizationSlug}/library/vocabulary/new`}
            className={buttonVariants()}
          >
            <PlusIcon data-icon="inline-start" />
            Set kosakata baru
          </Link>
        }
      />

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
        <div className="grid gap-3 max-sm:gap-0 md:grid-cols-2 xl:grid-cols-3 max-sm:[&>*+*]:-mt-px">
          {visibleSets.map((set) => (
            <Link
              href={`/workspace/${organizationSlug}/library/vocabulary/${set.id}`}
              key={set.id}
              className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/20 group-hover:bg-muted/20 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-3 sm:gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg border sm:size-10">
                      <LanguagesIcon className="size-4 sm:size-5" />
                    </div>
                    <Badge variant="outline">
                      {set._count.entries} istilah
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-heading truncate font-semibold">
                      {set.title}
                    </h2>
                    <p
                      className={cn(
                        "text-muted-foreground line-clamp-2 text-sm sm:min-h-10",
                        !set.description && "max-sm:hidden",
                      )}
                    >
                      {set.description ?? "Belum ada deskripsi."}
                    </p>
                  </div>
                  <div className="mt-auto flex min-h-7 flex-wrap gap-1.5 sm:border-t sm:pt-4">
                    {set.entries.slice(0, 3).map((entry) => (
                      <Badge key={entry.id} variant="secondary">
                        {entry.term}
                      </Badge>
                    ))}
                    {set._count.entries > set.entries.length && (
                      <span className="text-muted-foreground self-center text-xs">
                        +{set._count.entries - set.entries.length} lainnya
                      </span>
                    )}
                    {!set._count.entries && (
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
        <EmptyState
          icon={LanguagesIcon}
          title={
            debouncedSearch
              ? "Kosakata tidak ditemukan"
              : "Buat set kosakata pertama Anda"
          }
          description={
            debouncedSearch
              ? "Coba judul set, istilah, atau definisi yang berbeda."
              : "Kelompokkan istilah terkait menjadi satu set yang dapat dipakai ulang lintas kurikulum."
          }
          action={
            debouncedSearch ? null : (
              <Link
                href={`/workspace/${organizationSlug}/library/vocabulary/new`}
                className={buttonVariants({ className: "mt-4" })}
              >
                <PlusIcon data-icon="inline-start" />
                Set kosakata baru
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
