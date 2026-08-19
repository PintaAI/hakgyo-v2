import Link from "next/link";
import { Hanken_Grotesk, Inter } from "next/font/google";

import { type ReactNode } from "react";
import {
  ArrowUpRightIcon,
  BookCheckIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  LanguagesIcon,
  LibraryIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { organizationManagerRoles } from "~/lib/access";
import { cn } from "~/lib/utils";
import { requireOrganizationRole } from "~/server/auth/dal";
import { api } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const headline = "font-[family-name:var(--font-hanken-grotesk)]";
const body = "font-[family-name:var(--font-inter)]";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const courseStatus = {
  DRAFT: { label: "Draf", chip: "border-border text-muted-foreground" },
  PUBLISHED: {
    label: "Terbit",
    chip: "border-foreground/70 text-foreground",
  },
  ARCHIVED: { label: "Arsip", chip: "border-border text-muted-foreground" },
} as const;

const cohortStatus = {
  DRAFT: { label: "Draf", chip: "border-border text-muted-foreground" },
  OPEN: { label: "Dibuka", chip: "border-foreground/70 text-foreground" },
  IN_PROGRESS: {
    label: "Berjalan",
    chip: "border-foreground/70 text-foreground",
  },
  COMPLETED: { label: "Selesai", chip: "border-border text-muted-foreground" },
  CANCELLED: {
    label: "Dibatalkan",
    chip: "border-border text-muted-foreground",
  },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group/stat bg-card ring-foreground/10 hover:bg-muted/60 focus-visible:ring-ring focus-visible:outline-ring flex flex-col gap-3 rounded-lg p-5 ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-sans text-xs font-semibold tracking-[0.14em] uppercase">
          {label}
        </span>
        <Icon className="text-muted-foreground group-hover/stat:text-foreground size-4 transition-colors" />
      </span>
      <span
        className={cn(
          headline,
          "text-foreground text-4xl font-medium tracking-tight tabular-nums",
        )}
      >
        {value}
      </span>
    </Link>
  );
}

function StatusChip({
  status,
}: {
  status: keyof typeof courseStatus | keyof typeof cohortStatus;
}) {
  const meta =
    courseStatus[status as keyof typeof courseStatus] ??
    cohortStatus[status as keyof typeof cohortStatus];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 font-sans text-[11px] font-medium",
        meta.chip,
      )}
    >
      {meta.label}
    </span>
  );
}

function TextAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-sans text-xs font-medium underline-offset-4 transition-colors hover:underline"
    >
      {children}
      <ArrowUpRightIcon className="size-3.5" />
    </Link>
  );
}

function LibraryRow({
  icon: Icon,
  label,
  detail,
  count,
  href,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  count: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
      >
        <span className="bg-muted/70 text-muted-foreground group-hover/row:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-foreground text-sm font-medium">{label}</span>
            <span
              className={cn(
                headline,
                "text-foreground text-lg font-medium tabular-nums",
              )}
            >
              {count}
            </span>
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {count === 0 ? "Belum ada konten." : detail}
          </span>
        </span>
        <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
      </Link>
    </li>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed px-4 py-8 text-center">
      <Icon className="text-muted-foreground mx-auto size-6" />
      <p className="text-foreground mt-3 text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership = await requireOrganizationRole(
    organizationSlug,
    organizationManagerRoles,
  );
  const { organizationId, organization, role } = membership;

  const [
    courses,
    cohorts,
    members,
    assessments,
    materials,
    vocabularySets,
    reviewQueue,
  ] = await Promise.all([
    api.course.list({ organizationId }),
    api.cohort.listByOrganization({ organizationId }),
    api.organization.listMembers({ organizationId }),
    api.assessment.list({ organizationId }),
    api.content.listMaterials({ organizationId }),
    api.content.listVocabularySets({ organizationId }),
    api.assessment.listAttemptsNeedingReview({ organizationId }),
  ]);

  const root = `/workspace/${organizationSlug}`;
  const publishedCount = courses.filter(
    (course) => course.status === "PUBLISHED",
  ).length;
  const activeCohortCount = cohorts.filter(
    (cohort) =>
      cohort.status === "OPEN" || cohort.status === "IN_PROGRESS",
  ).length;

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        body,
        "mx-auto w-full max-w-6xl space-y-10",
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-muted-foreground font-sans text-xs font-semibold tracking-[0.18em] uppercase">
            Workspace · {organization.slug}
          </p>
          <h1
            className={cn(
              headline,
              "text-foreground mt-2 text-3xl font-medium tracking-tight sm:text-4xl",
            )}
          >
            {organization.name}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
            Gambaran umum course, Group belajar, anggota, bahan ajar,
            dan antrean review untuk organisasi Anda.
          </p>
        </div>
        <span className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-medium">
          <ShieldCheckIcon className="size-3.5" />
          {role === "OWNER" ? "Pemilik" : "Admin"}
        </span>
      </header>

      <section
        aria-label="Ringkasan organisasi"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
      >
        <StatCard
          icon={BookOpenIcon}
          label="Total course"
          value={courses.length}
          href={`${root}/courses`}
        />
        <StatCard
          icon={BookCheckIcon}
          label="Diterbitkan"
          value={publishedCount}
          href={`${root}/courses`}
        />
        <StatCard
          icon={CalendarDaysIcon}
          label="Total Group belajar"
          value={cohorts.length}
          href={`${root}/courses`}
        />
        <StatCard
          icon={UsersIcon}
          label="Group belajar berjalan"
          value={activeCohortCount}
          href={`${root}/courses`}
        />
        <StatCard
          icon={UsersIcon}
          label="Anggota"
          value={members.length}
          href={`${root}/members`}
        />
        <StatCard
          icon={ClipboardCheckIcon}
          label="Menunggu review"
          value={reviewQueue.length}
          href={`${root}/reviews`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Card className="rounded-lg">
            <CardHeader>
              <div>
                <CardTitle className={cn(headline, "text-lg font-medium")}>
                  Course terbaru
                </CardTitle>
                <CardDescription>Course yang paling baru dibuat.</CardDescription>
              </div>
              <CardAction>
                <TextAction href={`${root}/courses`}>Semua course</TextAction>
              </CardAction>
            </CardHeader>
            {courses.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={BookOpenIcon}
                  title="Belum ada course"
                  description="Course pertama belum dibuat untuk organisasi ini. Mulai dengan menyusun materi dan kurikulumnya."
                  action={
                    <Link
                      href={`${root}/courses/new`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-4",
                      )}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Buat course
                    </Link>
                  }
                />
              </CardContent>
            ) : (
              <ul className="divide-border divide-y">
                {courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`${root}/courses/${course.id}`}
                      className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {course.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {course._count.modules} bab · {course._count.cohorts}{" "}
                          Group belajar
                        </span>
                      </span>
                      <time
                        dateTime={course.createdAt.toISOString()}
                        className="text-muted-foreground hidden shrink-0 font-sans text-xs sm:block"
                      >
                        {dateFormatter.format(course.createdAt)}
                      </time>
                      <StatusChip status={course.status} />
                      <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <div>
                <CardTitle className={cn(headline, "text-lg font-medium")}>
                  Group belajar terbaru
                </CardTitle>
                <CardDescription>
                  Group belajar yang paling baru dibuat.
                </CardDescription>
              </div>
              <CardAction>
                <TextAction href={`${root}/courses`}>
                  Semua course
                </TextAction>
              </CardAction>
            </CardHeader>
            {cohorts.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={CalendarDaysIcon}
                  title="Belum ada Group belajar"
                  description="Group belajar membantu mengatur periode belajar, pengajar, meeting, dan kelompok peserta didik."
                />
              </CardContent>
            ) : (
              <ul className="divide-border divide-y">
                {cohorts.slice(0, 5).map((cohort) => (
                  <li key={cohort.id}>
                    <Link
                      href={`${root}/courses/${cohort.courseId}/cohorts/${cohort.id}`}
                      className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {cohort.name}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                          {cohort.course.title} · {cohort._count.enrollments}{" "}
                          siswa
                        </span>
                      </span>
                      <time
                        dateTime={cohort.createdAt.toISOString()}
                        className="text-muted-foreground hidden shrink-0 font-sans text-xs sm:block"
                      >
                        {dateFormatter.format(cohort.createdAt)}
                      </time>
                      <StatusChip status={cohort.status} />
                      <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="rounded-lg">
            <CardHeader>
              <div>
                <CardTitle className={cn(headline, "text-lg font-medium")}>
                  Bahan ajar
                </CardTitle>
                <CardDescription>
                  Konten siap pakai untuk course Anda.
                </CardDescription>
              </div>
            </CardHeader>
            <ul className="divide-border divide-y">
              <LibraryRow
                icon={FileTextIcon}
                label="Materi"
                detail="Dokumen dan aset pembelajaran"
                count={materials.length}
                href={`${root}/library/materials`}
              />
              <LibraryRow
                icon={LanguagesIcon}
                label="Set kosakata"
                detail="Istilah, definisi, dan contoh"
                count={vocabularySets.length}
                href={`${root}/library/vocabulary`}
              />
              <LibraryRow
                icon={LibraryIcon}
                label="Tugas"
                detail="Kuis, ujian, dan soal latihan"
                count={assessments.length}
                href={`${root}/library/assessments`}
              />
            </ul>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <div>
                <CardTitle className={cn(headline, "text-lg font-medium")}>
                  Antrean review
                </CardTitle>
                <CardDescription>
                  Jawaban tulisan yang menunggu penilaian.
                </CardDescription>
              </div>
              <CardAction>
                <TextAction href={`${root}/reviews`}>Buka antrean</TextAction>
              </CardAction>
            </CardHeader>
            {reviewQueue.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={ClipboardCheckIcon}
                  title="Tidak ada yang menunggu"
                  description="Attempt dengan jawaban tulisan yang perlu dinilai akan muncul di sini."
                />
              </CardContent>
            ) : (
              <ul className="divide-border divide-y">
                {reviewQueue.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${root}/reviews`}
                      className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {item.user.name}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                          {item.assessment.title}
                        </span>
                      </span>
                      {item.submittedAt ? (
                        <time
                          dateTime={item.submittedAt.toISOString()}
                          className="text-muted-foreground shrink-0 font-sans text-xs"
                        >
                          {dateFormatter.format(item.submittedAt)}
                        </time>
                      ) : null}
                      <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
