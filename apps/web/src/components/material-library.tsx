"use client";

import { useDeferredValue, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CalendarClockIcon,
  FileTextIcon,
  LibraryIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Material = RouterOutputs["content"]["listMaterials"][number];
type Scope = "all" | "unused" | `course:${string}`;
type Sort = "updated-desc" | "updated-asc" | "title-asc";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function getCourseUsages(material: Material) {
  const courses = new Map<
    string,
    {
      id: string;
      title: string;
      thumbnailUrl: string | null;
      modules: Set<string>;
    }
  >();

  for (const item of material.courseItems) {
    const { course } = item.module;
    const usage = courses.get(course.id) ?? {
      id: course.id,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl,
      modules: new Set<string>(),
    };
    usage.modules.add(item.module.title);
    courses.set(course.id, usage);
  }

  return [...courses.values()].map((course) => ({
    ...course,
    modules: [...course.modules],
  }));
}

export function MaterialLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const materials = api.content.listMaterials.useQuery({ organizationId });
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<Sort>("updated-desc");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const allMaterials = materials.data ?? [];
  const courseOptions = [
    ...new Map(
      allMaterials.flatMap((material) =>
        getCourseUsages(material).map(
          (course) =>
            [
              course.id,
              {
                id: course.id,
                title: course.title,
                thumbnailUrl: course.thumbnailUrl,
              },
            ] as const,
        ),
      ),
    ).values(),
  ].sort((a, b) => a.title.localeCompare(b.title, "id"));
  const unusedCount = allMaterials.filter(
    (material) => material.courseItems.length === 0,
  ).length;
  const visibleMaterials = allMaterials
    .filter((material) => {
      const matchesSearch = `${material.title} ${material.description ?? ""}`
        .toLocaleLowerCase()
        .includes(deferredSearch);
      if (!matchesSearch) return false;
      if (scope === "unused") return material.courseItems.length === 0;
      if (scope.startsWith("course:")) {
        const courseId = scope.slice("course:".length);
        return material.courseItems.some(
          (item) => item.module.course.id === courseId,
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "title-asc") return a.title.localeCompare(b.title, "id");
      const difference =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sort === "updated-asc" ? difference : -difference;
    });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <LibraryIcon className="size-4" />
            Bahan ajar
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Materi
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Susun pelajaran yang dapat dipakai ulang di BlockNote, lalu
            tambahkan ke course mana pun di workspace ini.
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-6">
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                Tampilan
              </p>
              <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
                <ScopeButton
                  active={scope === "all"}
                  count={allMaterials.length}
                  label="Semua materi"
                  onClick={() => setScope("all")}
                />
                <ScopeButton
                  active={scope === "unused"}
                  count={unusedCount}
                  label="Belum digunakan"
                  onClick={() => setScope("unused")}
                />
              </div>
            </div>
            {courseOptions.length ? (
              <div>
                <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Berdasarkan course
                </p>
                <div className="grid gap-1">
                  {courseOptions.map((course) => (
                    <ScopeButton
                      key={course.id}
                      active={scope === `course:${course.id}`}
                      isCourse
                      label={course.title}
                      thumbnailUrl={course.thumbnailUrl}
                      onClick={() => setScope(`course:${course.id}`)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  aria-label="Cari materi"
                  className="pl-8"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul atau deskripsi"
                  value={search}
                />
              </div>
              <select
                aria-label="Urutkan materi"
                className="border-input bg-background focus-visible:ring-ring h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                onChange={(event) => setSort(event.target.value as Sort)}
                value={sort}
              >
                <option value="updated-desc">Terakhir diperbarui</option>
                <option value="updated-asc">Paling lama diperbarui</option>
                <option value="title-asc">Judul A-Z</option>
              </select>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                {visibleMaterials.length} dari {allMaterials.length} materi
              </p>
              {scope !== "all" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScope("all")}
                >
                  Hapus filter
                </Button>
              ) : null}
            </div>

            {visibleMaterials.length ? (
              <div className="grid gap-3">
                {visibleMaterials.map((material) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    organizationSlug={organizationSlug}
                  />
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
                    : scope === "unused"
                      ? "Semua materi sudah digunakan"
                      : "Belum ada materi di tampilan ini"}
                </h2>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  {deferredSearch
                    ? "Coba judul atau deskripsi yang berbeda."
                    : "Pilih tampilan lain atau buat materi baru untuk mulai menyusun bahan ajar."}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ScopeButton({
  active,
  count,
  isCourse = false,
  label,
  thumbnailUrl,
  onClick,
}: {
  active: boolean;
  count?: number;
  isCourse?: boolean;
  label: string;
  thumbnailUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        {isCourse ? (
          <CourseThumbnail
            active={active}
            thumbnailUrl={thumbnailUrl ?? null}
          />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined ? (
        <span className={cn("text-xs tabular-nums", !active && "opacity-60")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MaterialRow({
  material,
  organizationSlug,
}: {
  material: Material;
  organizationSlug: string;
}) {
  const usages = getCourseUsages(material);
  const visibleUsages = usages.slice(0, 2);

  return (
    <Link
      href={`/workspace/${organizationSlug}/library/materials/${material.id}`}
      className="group bg-card focus-visible:ring-ring/50 hover:border-foreground/20 hover:bg-muted/20 grid gap-4 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <h2 className="font-heading flex min-w-0 items-center gap-2 truncate font-semibold">
          <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
          {material.title}
        </h2>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
          {material.description ?? "Belum ada deskripsi."}
        </p>
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon className="size-3.5" />
            {dateFormatter.format(new Date(material.updatedAt))}
          </span>
          <span className="flex items-center gap-1.5">
            <UserRoundIcon className="size-3.5" />
            {material.createdBy.user.name || "Tanpa nama"}
          </span>
        </div>
      </div>

      <div className="min-w-0 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
        {visibleUsages.length ? (
          <div className="space-y-2">
            {visibleUsages.map((usage) => (
              <div key={usage.id} className="flex min-w-0 items-center gap-2.5">
                <CourseThumbnail thumbnailUrl={usage.thumbnailUrl} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{usage.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {usage.modules.join(", ")}
                  </p>
                </div>
              </div>
            ))}
            {usages.length > visibleUsages.length ? (
              <p className="text-muted-foreground pl-10 text-[11px]">
                +{usages.length - visibleUsages.length} course lainnya
              </p>
            ) : null}
          </div>
        ) : (
          <Badge variant="outline">Belum digunakan</Badge>
        )}
      </div>

      <ArrowUpRightIcon className="text-muted-foreground hidden size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
    </Link>
  );
}

function CourseThumbnail({
  active = false,
  thumbnailUrl,
}: {
  active?: boolean;
  thumbnailUrl: string | null;
}) {
  return thumbnailUrl ? (
    <Image
      src={thumbnailUrl}
      alt=""
      width={32}
      height={32}
      unoptimized
      className="size-8 shrink-0 rounded-md border object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border",
        active ? "border-white/15 bg-white/10" : "bg-muted",
      )}
    >
      <BookOpenIcon className="size-3.5" />
    </span>
  );
}
