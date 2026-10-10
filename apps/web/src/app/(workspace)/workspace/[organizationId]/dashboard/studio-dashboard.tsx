import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Layers,
  Plus,
  Users,
} from "lucide-react";
import { type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { CourseCover } from "~/components/course-cover";
import { StatStrip } from "~/components/ui/stat-strip";
import { Kicker } from "~/components/brand/typography";
import styles from "./studio-dashboard.module.css";

export type StatIcon = "course" | "cohort" | "member" | "material" | "review";

export type StudioDashboardData = {
  name: string;
  organizationLogoUrl: string | null;
  userName: string;
  userImage: string | null;
  role: string;
  root: string;
  canCreateCourse: boolean;
  stats: { label: string; value: number; href: string; icon: StatIcon }[];
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
    course: { title: string; thumbnailUrl?: string | null };
    _count: { enrollments: number };
  }[];
  pendingReviews: number;
  activity?: { id: string; title: string; detail: string }[];
};

const courseStatusLabels: Record<string, string> = {
  PUBLISHED: "Dipublikasikan",
  DRAFT: "Belum dipublikasikan",
};
const cohortStatusLabels: Record<string, string> = {
  // Cohort DRAFT: being set up, not visible to learners yet.
  DRAFT: "Persiapan",
  OPEN: "Dibuka",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
function Status({ value, kind }: { value: string; kind: "course" | "cohort" }) {
  const statusLabels =
    kind === "course" ? courseStatusLabels : cohortStatusLabels;
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
                <CourseCover
                  title={group.course.title}
                  thumbnailUrl={group.course.thumbnailUrl}
                  sizes="40px"
                  className="size-10 rounded-md border"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {group.name}
                  </span>
                  <span className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="min-w-0 truncate">
                      {group.course.title}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Users className="size-3" />
                      {group._count.enrollments} siswa
                    </span>
                  </span>
                </span>
                <Status kind="cohort" value={group.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Belum ada kelas. Buka kurikulum untuk menyiapkan kelompok pertama.
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
  const organizationInitial = data.name.trim().charAt(0).toUpperCase() || "?";
  const userInitials = data.userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <Kicker>Workspace · {data.role}</Kicker>
          <h1 className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                {data.organizationLogoUrl ? (
                  <AvatarImage
                    src={data.organizationLogoUrl}
                    alt={`Logo ${data.name}`}
                    className="rounded-lg"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg font-semibold">
                  {organizationInitial}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{data.name}</span>
            </span>
            <span
              aria-hidden="true"
              className="text-muted-foreground font-normal max-sm:hidden"
            >
              ·
            </span>
            {/* Phones show the organization; the eyebrow already names the role. */}
            <span className="inline-flex min-w-0 items-center gap-2 max-sm:hidden">
              <Avatar className="size-8">
                {data.userImage ? (
                  <AvatarImage src={data.userImage} alt="" />
                ) : null}
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="truncate">{data.userName}</span>
              <Badge variant="secondary">{data.role}</Badge>
            </span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm max-sm:hidden">
            Semua yang Anda perlukan untuk mengajar lebih baik.
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
          {data.canCreateCourse ? "Buat kurikulum" : "Tulis materi"}
        </Action>
      </header>
      <StatStrip
        label="Ringkasan workspace"
        items={data.stats.map(({ label, value, href, icon }) => ({
          label,
          value,
          href,
          attention: icon === "review" && value > 0,
        }))}
      />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <Title
            number="01"
            title="Kurikulum Anda"
            href={`${data.root}/courses`}
          />
          {data.courses.length ? (
            <div className="max-sm:-mx-4 max-sm:divide-y max-sm:border-y sm:grid sm:grid-cols-2 sm:gap-4">
              {data.courses.slice(0, 4).map((course) => (
                <Link
                  key={course.id}
                  href={`${data.root}/courses/${course.id}`}
                  className={cn(
                    styles.courseCard,
                    // Phones list the courses as rows; cards return from sm.
                    "group hover:bg-muted/50 sm:bg-card sm:hover:bg-card flex items-center gap-3 px-4 py-3 sm:block sm:overflow-hidden sm:rounded-lg sm:border sm:p-0 sm:shadow-xs sm:hover:shadow-sm",
                  )}
                >
                  <CourseCover
                    title={course.title}
                    thumbnailUrl={course.thumbnailUrl}
                    sizes="(min-width: 640px) 360px, 48px"
                    className="size-12 shrink-0 rounded-md border sm:h-36 sm:w-full sm:rounded-none sm:border-0"
                  />
                  <div className="min-w-0 flex-1 sm:p-6">
                    <div className="mb-3 flex items-center justify-between max-sm:hidden">
                      <Status kind="course" value={course.status} />
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                    <h3 className="truncate text-sm font-semibold sm:text-base">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs sm:mt-2">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3" />
                        {course._count.modules} bab
                      </span>
                      <span aria-hidden="true" className="mx-1">
                        /
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Users className="size-3 shrink-0" />
                        <span className="truncate">
                          {course._count.cohorts} kelas
                        </span>
                      </span>
                    </p>
                    <span className="mt-2 flex sm:hidden">
                      <Status kind="course" value={course.status} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Mulai cerita belajar Anda dengan kurikulum pertama.</Empty>
          )}
          <div className="mt-8">
            <Title number="02" title="Kelas" href={`${data.root}/courses`} />
            <Groups data={data} />
          </div>
        </section>
        <aside className="space-y-7">
          <Activity data={data} />
          {/* Phones already flag reviews in the stat strip and bottom nav. */}
          <section className="bg-muted rounded-lg border p-6 shadow-xs max-sm:hidden">
            <Kicker>Butuh perhatian</Kicker>
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
          <div className="max-sm:hidden">
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
