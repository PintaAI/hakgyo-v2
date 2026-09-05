import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BookOpen, FileText, Layers, Plus } from "lucide-react";
import { type ReactNode } from "react";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import styles from "./studio-dashboard.module.css";

export type StudioDashboardData = {
  name: string;
  role: string;
  root: string;
  canCreateCourse: boolean;
  stats: { label: string; value: number; href: string }[];
  courses: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    _count: { modules: number; cohorts: number };
  }[];
  cohorts: {
    id: string;
    courseId: string;
    name: string;
    status: string;
    course: { title: string };
    _count: { enrollments: number };
  }[];
  pendingReviews: number;
  activity?: { id: string; title: string; detail: string }[];
};

const statusLabels: Record<string, string> = {
  PUBLISHED: "Terbit",
  DRAFT: "Draf",
  ARCHIVED: "Arsip",
  OPEN: "Dibuka",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
function Status({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium",
        value === "PUBLISHED" || value === "IN_PROGRESS" || value === "OPEN"
          ? "border-primary/20 bg-muted text-primary"
          : "text-muted-foreground",
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {statusLabels[value] ?? value}
    </span>
  );
}
function Action({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: primary ? "default" : "outline",
          size: "sm",
        }),
        "gap-2",
      )}
    >
      {children}
    </Link>
  );
}
function Title({
  number,
  title,
  href,
}: {
  number?: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-base font-semibold tracking-tight">
        {number && (
          <span className="text-muted-foreground font-mono text-[11px] font-normal">
            {number}
          </span>
        )}
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          Lihat semua <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm leading-relaxed">
      {children}
    </p>
  );
}
function Groups({ data }: { data: StudioDashboardData }) {
  return (
    <>
      {data.cohorts.length ? (
        <ul className="divide-y">
          {data.cohorts.slice(0, 5).map((group) => (
            <li key={group.id}>
              <Link
                href={`${data.root}/courses/${group.courseId}/cohorts/${group.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 py-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {group.name}
                  </span>
                  <span className="text-muted-foreground mt-1 block truncate text-xs">
                    {group.course.title} · {group._count.enrollments} siswa
                  </span>
                </span>
                <Status value={group.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Belum ada Group belajar. Buka course untuk menyiapkan kelompok
          pertama.
        </Empty>
      )}
    </>
  );
}
function Activity({ data }: { data: StudioDashboardData }) {
  return (
    <section>
      <Title title={data.activity ? "Aktivitas terbaru" : "Bahan ajar"} />
      {data.activity ? (
        data.activity.length ? (
          <ul className="space-y-5">
            {data.activity.slice(0, 4).map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{item.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aktivitas belajar akan muncul di sini.</Empty>
        )
      ) : (
        <div className="grid gap-3">
          <Action href={`${data.root}/library/materials`}>
            <FileText className="size-4" />
            Materi saya
          </Action>
          <Action href={`${data.root}/library/assessments`}>
            <Layers className="size-4" />
            Tugas saya
          </Action>
        </div>
      )}
    </section>
  );
}
export function StudioDashboard({ data }: { data: StudioDashboardData }) {
  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-8">
        <div>
          <p className={styles.eyebrow}>Workspace / {data.role}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Ruang untuk bertumbuh.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {data.name} · Semua yang Anda perlukan untuk mengajar lebih baik.
          </p>
        </div>
        <Action
          href={
            data.canCreateCourse
              ? `${data.root}/courses/new`
              : `${data.root}/library/materials/new`
          }
          primary
        >
          <Plus className="size-4" />
          {data.canCreateCourse ? "Buat course" : "Tulis materi"}
        </Action>
      </header>
      <section
        aria-label="Ringkasan workspace"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {data.stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="hover:border-primary rounded-lg border p-6"
          >
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              {stat.label}
              <ArrowUpRight className="size-3.5" />
            </div>
            <p className="mt-5 text-4xl font-medium tracking-tight tabular-nums">
              {stat.value}
              <span className="bg-primary ml-2 inline-block size-1.5 rounded-full" />
            </p>
          </Link>
        ))}
      </section>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <Title
            number="01"
            title="Course Anda"
            href={`${data.root}/courses`}
          />
          {data.courses.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.courses.slice(0, 4).map((course, index) => (
                <Link
                  key={course.id}
                  href={`${data.root}/courses/${course.id}`}
                  className={cn(
                    styles.courseCard,
                    "group overflow-hidden rounded-lg border",
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      styles.courseArt,
                      index % 2 === 1 && styles.alternateArt,
                    )}
                  >
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 360px, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    <span className="relative z-10 font-serif text-6xl opacity-80">
                      {["가", "나", "다", "라"][index]}
                    </span>
                    <span className="absolute right-4 bottom-3 text-[10px] tracking-[0.2em] uppercase">
                      Hakgyo / {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <Status value={course.status} />
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                    <h3 className="truncate text-base font-semibold">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {course._count.modules} bab{" "}
                      <span className="mx-2">/</span>
                      {course._count.cohorts} Group belajar
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Mulai cerita belajar Anda dengan course pertama.</Empty>
          )}
          <div className="mt-8">
            <Title
              number="02"
              title="Group belajar"
              href={`${data.root}/courses`}
            />
            <Groups data={data} />
          </div>
        </section>
        <aside className="space-y-7">
          <section className="bg-muted rounded-lg border p-6">
            <p className={styles.eyebrow}>Butuh perhatian</p>
            <div className="my-5 flex items-end gap-3">
              <span className="text-5xl font-medium tracking-tight">
                {data.pendingReviews}
              </span>
              <span className="text-muted-foreground pb-1 text-xs">
                jawaban menunggu
                <br />
                review Anda
              </span>
            </div>
            <Action href={`${data.root}/reviews`} primary>
              Buka antrean <ArrowUpRight className="size-4" />
            </Action>
          </section>
          <Activity data={data} />
          <div className="border-t pt-5">
            <Action href={`${data.root}/library/materials`}>
              <BookOpen className="size-4" />
              Jelajahi bahan ajar
            </Action>
          </div>
        </aside>
      </div>
    </div>
  );
}
