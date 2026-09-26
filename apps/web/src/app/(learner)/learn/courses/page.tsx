import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookCheckIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  CompassIcon,
  Layers3Icon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import { requireSession } from "~/server/auth/dal";
import { api } from "~/trpc/server";
import { getMyCourses } from "../learner-data";

export const metadata: Metadata = { title: "Dashboard belajar" };

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-lg p-5 ring-1">
      <span className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
          {label}
        </span>
        <Icon className="text-muted-foreground size-4" />
      </span>
      <span className="font-[family-name:var(--font-hanken-grotesk)] text-4xl font-medium tracking-tight tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default async function LearningCoursesPage() {
  const [session, courses, progress] = await Promise.all([
    requireSession(),
    getMyCourses(),
    api.learning.listMyCourseProgress(),
  ]);
  const displayName = session.user.name.trim().split(/\s+/).at(0) ?? "Pelajar";
  const progressByCourse = new Map(
    progress.map((entry) => [entry.courseId, entry]),
  );
  const summaries = courses.map((course) => {
    const courseProgress = progressByCourse.get(course.id);
    const completed = courseProgress?.completedCount ?? 0;
    const total = courseProgress?.totalCount ?? 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {
      ...course,
      completed,
      total,
      next: courseProgress?.next ?? null,
      percent,
    };
  });
  const active = summaries.find((course) => course.next) ?? summaries[0];
  const totalCompleted = summaries.reduce(
    (sum, course) => sum + course.completed,
    0,
  );
  const totalActivities = summaries.reduce(
    (sum, course) => sum + course.total,
    0,
  );

  if (!summaries.length) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Ruang belajar
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            Selamat datang, {displayName}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
            Course, aktivitas, dan progress belajar Anda akan tersedia di sini.
          </p>
        </header>
        <Card className="rounded-lg">
          <div className="m-4 rounded-md border border-dashed px-4 py-14 text-center">
            <CompassIcon className="text-muted-foreground mx-auto size-6" />
            <h2 className="mt-3 font-[family-name:var(--font-hanken-grotesk)] text-base font-medium">
              Belum ada course
            </h2>
            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
              Jelajahi katalog dan pilih course pertama untuk mulai membangun
              progress belajar.
            </p>
            <Link
              href="/catalog"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-4",
              )}
            >
              Jelajahi katalog
              <ArrowUpRightIcon />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Ruang belajar
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            Selamat datang, {displayName}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
            Lanjutkan aktivitas berikutnya dan pantau perkembangan belajar Anda.
          </p>
        </div>
        <Link
          href="/catalog"
          className={buttonVariants({ variant: "outline" })}
        >
          <CompassIcon />
          Jelajahi course
        </Link>
      </header>

      <section
        aria-label="Ringkasan belajar"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
      >
        <StatCard
          icon={BookOpenIcon}
          label="Course aktif"
          value={summaries.length}
        />
        <StatCard
          icon={BookCheckIcon}
          label="Aktivitas selesai"
          value={totalCompleted}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            icon={Layers3Icon}
            label="Total aktivitas"
            value={totalActivities}
          />
        </div>
      </section>

      {active ? (
        <section className="bg-foreground text-background relative overflow-hidden rounded-lg px-5 py-6 sm:px-7 sm:py-8">
          {active.thumbnailUrl ? (
            <Image
              src={active.thumbnailUrl}
              alt=""
              fill
              unoptimized
              priority
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-black/65" />
          <div className="pointer-events-none absolute top-0 right-0 size-52 translate-x-16 -translate-y-20 rounded-full border border-current opacity-10" />
          <div className="pointer-events-none absolute top-0 right-0 size-36 translate-x-10 -translate-y-12 rounded-full border border-current opacity-10" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_14rem] md:items-end">
            <div className="min-w-0">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                Lanjutkan belajar · {active.organization.name}
              </span>
              <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-hanken-grotesk)] text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
                {active.title}
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
                {active.next
                  ? `${active.next.moduleTitle} · ${active.next.title}`
                  : "Semua aktivitas pada course ini telah diselesaikan."}
              </p>
              <Link
                href={
                  active.next
                    ? `/learn/${active.id}/items/${active.next.courseItemId}`
                    : `/learn/${active.id}`
                }
                className={cn(
                  buttonVariants(),
                  "bg-background text-foreground hover:bg-background mt-6",
                )}
              >
                {active.next ? "Lanjutkan aktivitas" : "Lihat course"}
                <ArrowRightIcon />
              </Link>
            </div>
            <div className="border-l border-white/15 pl-5">
              <div className="flex items-end justify-between gap-3">
                <span className="font-[family-name:var(--font-hanken-grotesk)] text-4xl font-medium tabular-nums">
                  {active.percent}%
                </span>
                <span className="text-muted-foreground text-xs">
                  {active.completed}/{active.total}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Progress course
              </p>
              <Progress
                value={active.percent}
                className="[&_[data-slot=progress-indicator]]:bg-background [&_[data-slot=progress-track]]:bg-background/20 mt-4 [&_[data-slot=progress-track]]:h-1.5"
              />
            </div>
          </div>
        </section>
      ) : null}

      <Card className="gap-0 rounded-lg py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
            Course saya
          </CardTitle>
        </CardHeader>
        <ul className="divide-border divide-y">
          {summaries.map((course) => (
            <li key={course.id}>
              <Link
                href={`/learn/${course.id}`}
                className="group/row hover:bg-muted/50 focus-visible:ring-ring flex min-h-24 items-center gap-4 px-4 py-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                <span className="bg-muted relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <BookOpenIcon className="text-muted-foreground size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {course.title}
                    </span>
                    {course.percent === 100 ? (
                      <Badge variant="outline">
                        <CheckCircle2Icon /> Selesai
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground mt-1 block truncate text-xs">
                    {course.organization.name} · {course.completed} dari{" "}
                    {course.total} aktivitas
                  </span>
                  <Progress
                    value={course.percent}
                    className="mt-2 max-w-xs [&_[data-slot=progress-track]]:h-1"
                  />
                </span>
                <span className="text-muted-foreground hidden shrink-0 text-xs tabular-nums sm:block">
                  {course.percent}%
                </span>
                <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
