"use client";

import { useDeferredValue, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BookCheckIcon,
  BookOpenIcon,
  FilePenLineIcon,
  Layers3Icon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { PageHeader } from "~/components/ui/page-header";
import { EmptyState } from "~/components/ui/empty-state";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import type { OrganizationRole } from "~/lib/access";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type Course = RouterOutputs["course"]["list"][number];
type CourseFilter = "ALL" | Course["status"];

const statusMeta = {
  DRAFT: {
    label: "Belum dipublikasikan",
    className: "border-border text-muted-foreground",
  },
  PUBLISHED: {
    label: "Dipublikasikan",
    className: "border-foreground/70 text-foreground",
  },
} as const;

function FilterStat({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group/stat bg-card focus-visible:ring-ring flex min-w-0 flex-col justify-between gap-2 rounded-lg p-3 text-left ring-1 transition-colors outline-none sm:gap-3 sm:p-5",
        active
          ? "ring-foreground/40"
          : "ring-foreground/10 hover:bg-muted/60 hover:ring-foreground/20",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs leading-snug font-medium sm:font-semibold sm:tracking-[0.14em] sm:uppercase">
          {label}
        </span>
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors max-sm:hidden",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover/stat:text-foreground",
          )}
        />
      </span>
      <span className="font-heading text-2xl font-medium tracking-tight tabular-nums sm:text-4xl">
        {count}
      </span>
    </button>
  );
}

function StatusChip({ status }: { status: Course["status"] }) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function CoursesLibrary({
  canCreate,
  courses,
  organizationSlug,
  role,
}: {
  canCreate: boolean;
  courses: Course[];
  organizationSlug: string;
  role: OrganizationRole;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("ALL");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const root = `/workspace/${organizationSlug}/courses`;
  const counts = {
    ALL: courses.length,
    PUBLISHED: courses.filter((course) => course.status === "PUBLISHED").length,
    DRAFT: courses.filter((course) => course.status === "DRAFT").length,
  };

  const accessLabels = {
    MANAGER: "Pengelola",
    COHORT_MANAGER: "Pengelola kelas",
    EDITOR: "Editor",
    COHORT_STAFF: "Staf kelas",
    VIEWER: "Hanya lihat",
  } as const;
  const visibleCourses = courses.filter((course) => {
    const matchesFilter = filter === "ALL" || course.status === filter;
    const searchable =
      `${course.title} ${course.description ?? ""} ${course.owner.user.name}`.toLocaleLowerCase();
    return matchesFilter && searchable.includes(deferredSearch);
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Kurikulum"
        description={
          role === "TEACHER"
            ? "Temukan dan kelola kurikulum yang menjadi tanggung jawab Anda."
            : "Kelola kurikulum, kelas, dan peserta dari satu tempat."
        }
        actions={
          canCreate ? (
            <Link href={`${root}/new`} className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              Kurikulum baru
            </Link>
          ) : null
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="Belum ada kurikulum"
          description="Kurikulum menyatukan materi, kelas, dan peserta agar semuanya mudah ditemukan."
          action={
            canCreate ? (
              <Link
                href={`${root}/new`}
                className={buttonVariants({ className: "mt-4" })}
              >
                <PlusIcon data-icon="inline-start" />
                Kurikulum baru
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <section
            aria-label="Ringkasan kurikulum"
            className="grid grid-cols-3 gap-2 sm:gap-4"
          >
            <FilterStat
              active={filter === "ALL"}
              count={counts.ALL}
              icon={BookOpenIcon}
              label="Semua kurikulum"
              onClick={() => setFilter("ALL")}
            />
            <FilterStat
              active={filter === "PUBLISHED"}
              count={counts.PUBLISHED}
              icon={BookCheckIcon}
              label="Dipublikasikan"
              onClick={() => setFilter("PUBLISHED")}
            />
            <FilterStat
              active={filter === "DRAFT"}
              count={counts.DRAFT}
              icon={FilePenLineIcon}
              label="Belum dipublikasikan"
              onClick={() => setFilter("DRAFT")}
            />
          </section>

          <Card className="gap-0 py-0">
            <CardHeader className="gap-4 border-b py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <CardTitle className="font-heading text-lg font-medium">
                Daftar kurikulum
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  aria-label="Cari kurikulum"
                  className="pr-8 pl-8"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari kurikulum"
                  value={search}
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="Hapus pencarian"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-2"
                    onClick={() => setSearch("")}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </CardHeader>

            <p className="sr-only" aria-live="polite">
              {visibleCourses.length} course ditampilkan
            </p>

            {visibleCourses.length > 0 ? (
              <ul className="divide-border divide-y">
                {visibleCourses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`${root}/${course.id}`}
                      className="group/row focus-visible:ring-ring hover:bg-muted/50 focus-visible:bg-muted/50 flex items-center gap-3 px-4 py-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:gap-4"
                    >
                      <CourseCover
                        title={course.title}
                        thumbnailUrl={course.thumbnailUrl}
                        sizes="128px"
                        className="aspect-video w-24 rounded-lg sm:w-32"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {course.title}
                          </span>
                          <StatusChip status={course.status} />
                          <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                            {accessLabels[course.accessRole]}
                          </span>
                        </span>
                        <span className="text-muted-foreground mt-1 block truncate text-xs">
                          {course.description ?? "Belum ada deskripsi."}
                        </span>
                        <span className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:hidden">
                          <span>{course._count.modules} bab</span>
                          <span>{course._count.cohorts} kelas</span>
                        </span>
                      </span>
                      <span className="text-muted-foreground hidden shrink-0 items-center gap-4 text-xs sm:flex">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers3Icon className="size-3.5" />
                          {course._count.modules} bab
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UsersIcon className="size-3.5" />
                          {course._count.cohorts} kelas
                        </span>
                      </span>
                      <span className="text-muted-foreground hidden w-32 shrink-0 truncate text-right text-xs lg:block">
                        {course.owner.user.name}
                      </span>
                      <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent>
                <div className="rounded-md border border-dashed px-4 py-10 text-center">
                  <SearchIcon className="text-muted-foreground mx-auto size-6" />
                  <p className="mt-3 text-sm font-medium">
                    Kurikulum tidak ditemukan
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                    Coba kata lain atau tampilkan kembali semua kurikulum.
                  </p>
                  <Button
                    className="mt-4"
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setFilter("ALL");
                    }}
                  >
                    Hapus pencarian dan filter
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
