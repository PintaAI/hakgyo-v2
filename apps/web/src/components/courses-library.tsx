"use client";

import { useDeferredValue, useState, type ComponentType } from "react";
import Image from "next/image";
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

import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import type { OrganizationRole } from "~/lib/access";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type Course = RouterOutputs["course"]["list"][number];
type CourseFilter = "ALL" | Course["status"];

const statusMeta = {
  DRAFT: { label: "Draf", className: "border-border text-muted-foreground" },
  PUBLISHED: {
    label: "Terbit",
    className: "border-foreground/70 text-foreground",
  },
  ARCHIVED: {
    label: "Arsip",
    className: "border-border text-muted-foreground",
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
        "group/stat bg-card focus-visible:ring-ring flex min-w-0 flex-col gap-3 rounded-lg p-4 text-left ring-1 transition-colors outline-none sm:p-5",
        active
          ? "ring-foreground/40"
          : "ring-foreground/10 hover:bg-muted/60 hover:ring-foreground/20",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
          {label}
        </span>
        <Icon
          className={cn(
            "size-4 transition-colors",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover/stat:text-foreground",
          )}
        />
      </span>
      <span className="font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
        {count}
      </span>
    </button>
  );
}

function StatusChip({
  status,
  inverted = false,
}: {
  status: Course["status"];
  inverted?: boolean;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        meta.className,
        inverted && "border-white/40 text-white",
      )}
    >
      {meta.label}
    </span>
  );
}

export function CoursesLibrary({
  courses,
  organizationSlug,
  role,
}: {
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
    ARCHIVED: courses.filter((course) => course.status === "ARCHIVED").length,
  };
  const visibleCourses = courses.filter((course) => {
    const matchesFilter = filter === "ALL" || course.status === filter;
    const searchable =
      `${course.title} ${course.description ?? ""} ${course.owner.user.name}`.toLocaleLowerCase();
    return matchesFilter && searchable.includes(deferredSearch);
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Workspace · {organizationSlug}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            Courses
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
            {role === "TEACHER"
              ? "Temukan dan kelola course yang menjadi tanggung jawab Anda."
              : "Kelola kurikulum, cohort, dan peserta dari satu tempat."}
          </p>
        </div>
        <Link href={`${root}/new`} className={buttonVariants()}>
          <PlusIcon data-icon="inline-start" />
          Buat course
        </Link>
      </header>

      {courses.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <div className="rounded-md border border-dashed px-4 py-12 text-center">
              <BookOpenIcon className="text-muted-foreground mx-auto size-6" />
              <h2 className="mt-3 font-[family-name:var(--font-hanken-grotesk)] text-base font-medium">
                Belum ada course
              </h2>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
                Course menyatukan materi, cohort, dan peserta agar semuanya
                mudah ditemukan.
              </p>
              <Link
                href={`${root}/new`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-4",
                })}
              >
                <PlusIcon data-icon="inline-start" />
                Buat course pertama
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section
            aria-label="Ringkasan course"
            className={cn(
              "grid grid-cols-2 gap-3 sm:gap-4",
              counts.ARCHIVED > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3",
            )}
          >
            <FilterStat
              active={filter === "ALL"}
              count={counts.ALL}
              icon={BookOpenIcon}
              label="Semua course"
              onClick={() => setFilter("ALL")}
            />
            <FilterStat
              active={filter === "PUBLISHED"}
              count={counts.PUBLISHED}
              icon={BookCheckIcon}
              label="Diterbitkan"
              onClick={() => setFilter("PUBLISHED")}
            />
            <FilterStat
              active={filter === "DRAFT"}
              count={counts.DRAFT}
              icon={FilePenLineIcon}
              label="Draf"
              onClick={() => setFilter("DRAFT")}
            />
            {counts.ARCHIVED > 0 ? (
              <FilterStat
                active={filter === "ARCHIVED"}
                count={counts.ARCHIVED}
                icon={BookOpenIcon}
                label="Arsip"
                onClick={() => setFilter("ARCHIVED")}
              />
            ) : null}
          </section>

          <Card className="gap-0 rounded-lg py-0">
            <CardHeader className="gap-4 border-b py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
                Daftar course
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  aria-label="Cari course"
                  className="pr-8 pl-8"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari course"
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
                      className={cn(
                        "group/row focus-visible:ring-ring relative flex min-h-28 items-center gap-3 overflow-hidden px-4 py-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:gap-4",
                        course.thumbnailUrl
                          ? "bg-[#171915] text-white"
                          : "hover:bg-muted/50 focus-visible:bg-muted/50",
                      )}
                    >
                      {course.thumbnailUrl ? (
                        <span className="absolute inset-0">
                          <Image
                            src={course.thumbnailUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="(max-width: 1152px) 100vw, 1152px"
                            className="object-cover transition-transform duration-500 group-hover/row:scale-[1.02]"
                          />
                          <span className="absolute inset-0 bg-black/65 transition-colors group-hover/row:bg-black/60" />
                        </span>
                      ) : null}
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {course.title}
                          </span>
                          <StatusChip
                            status={course.status}
                            inverted={Boolean(course.thumbnailUrl)}
                          />
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-xs",
                            course.thumbnailUrl
                              ? "text-white/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {course.description ?? "Belum ada deskripsi."}
                        </span>
                        <span
                          className={cn(
                            "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:hidden",
                            course.thumbnailUrl
                              ? "text-white/70"
                              : "text-muted-foreground",
                          )}
                        >
                          <span>{course._count.modules} modul</span>
                          <span>{course._count.cohorts} cohort</span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          "relative z-10 hidden shrink-0 items-center gap-4 text-xs sm:flex",
                          course.thumbnailUrl
                            ? "text-white/70"
                            : "text-muted-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Layers3Icon className="size-3.5" />
                          {course._count.modules} modul
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UsersIcon className="size-3.5" />
                          {course._count.cohorts} cohort
                        </span>
                      </span>
                      <span
                        className={cn(
                          "relative z-10 hidden w-32 shrink-0 truncate text-right text-xs lg:block",
                          course.thumbnailUrl
                            ? "text-white/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {course.owner.user.name}
                      </span>
                      <ArrowUpRightIcon
                        className={cn(
                          "relative z-10 size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5",
                          course.thumbnailUrl
                            ? "text-white/70 group-hover/row:text-white"
                            : "text-muted-foreground group-hover/row:text-foreground",
                        )}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent>
                <div className="rounded-md border border-dashed px-4 py-10 text-center">
                  <SearchIcon className="text-muted-foreground mx-auto size-6" />
                  <p className="mt-3 text-sm font-medium">
                    Course tidak ditemukan
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                    Coba kata lain atau tampilkan kembali semua course.
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
