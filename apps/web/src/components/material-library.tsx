"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  FileTextIcon,
  LibraryIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
  WorkflowIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export function MaterialLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const materials = api.content.listMaterials.useQuery({ organizationId });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const visibleMaterials =
    materials.data?.filter((material) =>
      `${material.title} ${material.description ?? ""}`
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
            Materi
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Susun pelajaran yang dapat dipakai ulang di BlockNote, lalu tambahkan
            ke course mana pun di workspace ini.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationSlug}/library/materials/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          Materi baru
        </Link>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Cari materi"
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari materi"
          value={search}
        />
      </div>

      {materials.isPending ? (
        <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Memuat materi
        </div>
      ) : materials.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-destructive text-sm">{materials.error.message}</p>
          <Button variant="outline" onClick={() => materials.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : visibleMaterials.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleMaterials.map((material) => (
            <Link
              href={`/workspace/${organizationSlug}/library/materials/${material.id}`}
              key={material.id}
              className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/20 group-hover:bg-muted/20 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      <FileTextIcon className="size-5" />
                    </div>
                    <Badge variant="outline">
                      {Array.isArray(material.content)
                        ? material.content.length
                        : 0}{" "}
                      blok
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-heading truncate font-semibold">
                      {material.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                      {material.description ?? "Belum ada deskripsi."}
                    </p>
                  </div>
                  <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <WorkflowIcon className="size-3.5" />
                      {material.completionRequirements.length} requirement
                    </span>
                    <span className="flex items-center gap-1.5">
                      <PaperclipIcon className="size-3.5" />
                      {material.assets.length} assets
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
            <FileTextIcon className="size-5" />
          </div>
          <h2 className="font-heading font-semibold">
            {deferredSearch
              ? "Materi tidak ditemukan"
              : "Buat materi pertama Anda"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {deferredSearch
              ? "Coba judul atau deskripsi yang berbeda."
              : "Tulis pelajaran yang dapat dipakai ulang dengan teks kaya, media, daftar, dan blok terstruktur."}
          </p>
          {!deferredSearch && (
            <Link
              href={`/workspace/${organizationSlug}/library/materials/new`}
              className={buttonVariants({ className: "mt-4" })}
            >
              <PlusIcon data-icon="inline-start" />
              Materi baru
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
