import Image from "next/image";
import Link from "next/link";
import { Hanken_Grotesk, Inter } from "next/font/google";

import { type ReactNode } from "react";
import {
  ArrowUpRightIcon,
  ActivityIcon,
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
import { organizationRoles } from "~/lib/access";
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
    label: "Published",
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

const activityLabels = {
  MATERIAL_COMPLETED: "Menyelesaikan materi",
  ASSESSMENT_SUBMITTED: "Mengumpulkan tugas",
  ASSESSMENT_PASSED: "Lulus assessment",
  VOCABULARY_REVIEWED: "Meninjau kosakata",
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
      className="group/stat hover:bg-muted/50 focus-visible:ring-ring focus-visible:outline-ring flex min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="bg-muted text-muted-foreground group-hover/stat:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="text-muted-foreground block truncate font-sans text-[10px] font-semibold tracking-[0.12em] uppercase">
          {label}
        </span>
        <span
          className={cn(
            headline,
            "text-foreground block text-xl leading-none font-medium tracking-tight tabular-nums",
          )}
        >
          {value}
        </span>
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

function CourseThumbnail({ thumbnailUrl }: { thumbnailUrl: string | null }) {
  return (
    <span className="border-border bg-muted relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="44px"
          className="object-cover transition-transform duration-300 group-hover/row:scale-105"
        />
      ) : (
        <BookOpenIcon className="text-muted-foreground size-4" />
      )}
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

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group/action border-border hover:bg-muted/50 focus-visible:ring-ring flex items-start gap-3 border-t py-4 transition-colors outline-none first:border-t-0 focus-visible:ring-2"
    >
      <span className="bg-foreground text-background inline-flex size-9 shrink-0 items-center justify-center rounded-md">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block text-sm font-medium">
          {title}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
          {description}
        </span>
      </span>
      <ArrowUpRightIcon className="text-muted-foreground group-hover/action:text-foreground mt-1 size-4 shrink-0 transition-all group-hover/action:translate-x-0.5 group-hover/action:-translate-y-0.5" />
    </Link>
  );
}

function RecentActivity({
  items,
}: {
  items: Array<{
    id: string;
    action: keyof typeof activityLabels;
    occurredAt: Date;
    xpAwarded: number;
    user: { name: string };
  }>;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div>
          <CardTitle className={cn(headline, "text-lg font-medium")}>
            Aktivitas terbaru
          </CardTitle>
          <CardDescription>
            Aktivitas pembelajaran terakhir di workspace ini.
          </CardDescription>
        </div>
      </CardHeader>
      {items.length === 0 ? (
        <CardContent>
          <EmptyState
            icon={ActivityIcon}
            title="Belum ada aktivitas"
            description="Aktivitas pembelajaran anggota akan muncul di sini."
          />
        </CardContent>
      ) : (
        <ul className="divide-border divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-md">
                <ActivityIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-medium">
                  {item.user.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {activityLabels[item.action]}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-right text-xs">
                <span className="text-foreground block font-medium tabular-nums">
                  +{item.xpAwarded} XP
                </span>
                <time dateTime={item.occurredAt.toISOString()}>
                  {dateFormatter.format(item.occurredAt)}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function TeacherDashboard({
  membership,
  organizationSlug,
}: {
  membership: Awaited<ReturnType<typeof requireOrganizationRole>>;
  organizationSlug: string;
}) {
  const { organizationId, organization } = membership;
  const [courses, cohortsPage, materials, assessments, reviewQueue] =
    await Promise.all([
      api.course.list({ organizationId }),
      api.cohort.listForCurrentMember({
        organizationId,
        includeTotal: true,
        limit: 50,
      }),
      api.content.listMaterials({ organizationId }),
      api.assessment.list({ organizationId }),
      api.assessment.listAttemptsNeedingReview({
        organizationId,
        includeTotal: true,
        limit: 4,
      }),
    ]);
  const root = `/workspace/${organizationSlug}`;
  const cohorts = cohortsPage.items;
  const reviewItems = reviewQueue.items;
  const pendingReviews = reviewQueue.total ?? reviewItems.length;
  const cohortCount = cohortsPage.total ?? cohorts.length;
  const canCreateCourse =
    organization.permissionMode === "SIMPLE" ||
    organization.teacherCanCreateCourse;

  return (
    <div
      className={cn(hanken.variable, inter.variable, body, "w-full space-y-10")}
    >
      <header className="border-foreground/15 relative overflow-hidden rounded-xl border p-6 sm:p-8">
        <div className="bg-muted/70 pointer-events-none absolute -top-20 -right-16 size-56 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-muted-foreground font-sans text-xs font-semibold tracking-[0.18em] uppercase">
              Ruang pengajar · {organization.slug}
            </p>
            <h1
              className={cn(
                headline,
                "text-foreground mt-2 text-3xl font-medium tracking-tight sm:text-4xl",
              )}
            >
              Siap mengajar hari ini?
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              Pantau course yang menjadi tanggung jawab Anda, siapkan bahan
              ajar, dan selesaikan penilaian yang masih menunggu.
            </p>
          </div>
          <span className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-medium">
            <BookCheckIcon className="size-3.5" />
            Pengajar
          </span>
        </div>
        <section
          aria-label="Ringkasan pengajar"
          className="border-foreground/15 relative mt-6 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <StatCard
            icon={BookOpenIcon}
            label="Course saya"
            value={courses.length}
            href={`${root}/courses`}
          />
          <StatCard
            icon={BookCheckIcon}
            label="Sudah terbit"
            value={
              courses.filter((course) => course.status === "PUBLISHED").length
            }
            href={`${root}/courses`}
          />
          <StatCard
            icon={CalendarDaysIcon}
            label="Group belajar"
            value={cohortCount}
            href={`${root}/courses`}
          />
          <StatCard
            icon={FileTextIcon}
            label="Materi saya"
            value={materials.length}
            href={`${root}/library/materials`}
          />
          <StatCard
            icon={LibraryIcon}
            label="Tugas saya"
            value={assessments.length}
            href={`${root}/library/assessments`}
          />
          <StatCard
            icon={ClipboardCheckIcon}
            label="Perlu direview"
            value={pendingReviews}
            href={`${root}/reviews`}
          />
        </section>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
        <Card className="rounded-lg">
          <CardHeader>
            <div>
              <CardTitle className={cn(headline, "text-lg font-medium")}>
                Course dalam tanggung jawab Anda
              </CardTitle>
              <CardDescription>
                Course yang Anda miliki, edit, atau dampingi sebagai staf.
              </CardDescription>
            </div>
            <CardAction>
              <TextAction href={`${root}/courses`}>Lihat semua</TextAction>
            </CardAction>
          </CardHeader>
          {courses.length === 0 ? (
            <CardContent>
              <EmptyState
                icon={BookOpenIcon}
                title="Belum ada course"
                description="Course yang Anda buat atau yang ditugaskan kepada Anda akan muncul di sini."
                action={
                  canCreateCourse ? (
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
                  ) : undefined
                }
              />
            </CardContent>
          ) : (
            <ul className="divide-border divide-y">
              {courses.slice(0, 5).map((course) => {
                const courseCohorts = cohorts.filter(
                  (cohort) => cohort.courseId === course.id,
                );

                return (
                  <li key={course.id}>
                    <Link
                      href={`${root}/courses/${course.id}`}
                      className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <CourseThumbnail thumbnailUrl={course.thumbnailUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {course.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {course._count.modules} bab · {course._count.cohorts}{" "}
                          Group belajar
                        </span>
                      </span>
                      <StatusChip status={course.status} />
                      <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                    </Link>
                    {courseCohorts.length > 0 ? (
                      <ul className="border-border bg-muted/20 border-t px-4 py-1.5 sm:pl-[4.75rem]">
                        {courseCohorts.slice(0, 3).map((cohort) => (
                          <li key={cohort.id}>
                            <Link
                              href={`${root}/courses/${course.id}/cohorts/${cohort.id}`}
                              className="group/cohort hover:bg-muted/70 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                            >
                              <span className="border-border bg-background inline-flex size-7 shrink-0 items-center justify-center rounded-md border">
                                <UsersIcon className="text-muted-foreground size-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-foreground block truncate text-xs font-medium">
                                  {cohort.name}
                                </span>
                                <span className="text-muted-foreground block text-[11px]">
                                  {cohort._count.enrollments} siswa ·{" "}
                                  {cohort._count.meetings} meeting
                                </span>
                              </span>
                              <StatusChip status={cohort.status} />
                            </Link>
                          </li>
                        ))}
                        {course._count.cohorts > 3 ? (
                          <li>
                            <Link
                              href={`${root}/courses/${course.id}/cohorts`}
                              className="text-muted-foreground hover:text-foreground block px-2 py-2 text-xs font-medium transition-colors"
                            >
                              +{course._count.cohorts - 3} Group belajar lainnya
                            </Link>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <div>
              <CardTitle className={cn(headline, "text-lg font-medium")}>
                Mulai cepat
              </CardTitle>
              <CardDescription>
                Jalan pintas untuk pekerjaan pengajar yang paling umum.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {canCreateCourse ? (
              <QuickAction
                icon={BookOpenIcon}
                title="Buat course baru"
                description="Mulai susun kurikulum dan Group belajar."
                href={`${root}/courses/new`}
              />
            ) : null}
            <QuickAction
              icon={FileTextIcon}
              title="Tulis materi"
              description="Siapkan bahan ajar yang dapat dipakai di course."
              href={`${root}/library/materials/new`}
            />
            <QuickAction
              icon={ClipboardCheckIcon}
              title="Buka antrean review"
              description={`${pendingReviews} attempt menunggu perhatian Anda.`}
              href={`${root}/reviews`}
            />
            <QuickAction
              icon={LibraryIcon}
              title="Kelola bahan ajar"
              description="Temukan materi, kosakata, dan tugas Anda."
              href={`${root}/library/materials`}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg">
        <CardHeader>
          <div>
            <CardTitle className={cn(headline, "text-lg font-medium")}>
              Antrean review Anda
            </CardTitle>
            <CardDescription>
              Jawaban tulisan dari course dan Group belajar yang Anda tangani.
            </CardDescription>
          </div>
          <CardAction>
            <TextAction href={`${root}/reviews`}>Buka antrean</TextAction>
          </CardAction>
        </CardHeader>
        {reviewItems.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={ClipboardCheckIcon}
              title="Semua sudah diperiksa"
              description="Belum ada jawaban tulisan yang menunggu penilaian Anda."
            />
          </CardContent>
        ) : (
          <ul className="divide-border grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
            {reviewItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${root}/reviews`}
                  className="group/row hover:bg-muted/50 flex items-center gap-4 px-4 py-4 transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm font-medium">
                      {item.user.name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                      {item.assessment.title}
                    </span>
                  </span>
                  <ArrowUpRightIcon className="text-muted-foreground group-hover/row:text-foreground size-4 shrink-0 transition-all group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
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
    organizationRoles,
  );
  if (membership.role === "TEACHER") {
    return (
      <TeacherDashboard
        membership={membership}
        organizationSlug={organizationSlug}
      />
    );
  }
  const { organizationId, organization, role } = membership;

  const [analytics, courses, cohortsPage, reviewQueue, activity] =
    await Promise.all([
    api.organization.getDashboardAnalytics({ organizationId }),
    api.course.list({ organizationId }),
    api.cohort.listByOrganization({ organizationId, limit: 5 }),
    api.assessment.listAttemptsNeedingReview({
      organizationId,
      limit: 3,
    }),
      api.organization.getRecentActivity({ organizationId }),
    ]);
  const cohorts = cohortsPage.items;
  const reviewItems = reviewQueue.items;

  const root = `/workspace/${organizationSlug}`;

  return (
    <div
      className={cn(hanken.variable, inter.variable, body, "w-full space-y-10")}
    >
      <header className="border-border relative overflow-hidden rounded-xl border p-6 sm:p-8">
        <div className="bg-muted/50 pointer-events-none absolute -top-20 -right-16 size-56 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
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
            Gambaran umum course, Group belajar, anggota, bahan ajar, dan
            antrean review untuk organisasi Anda.
          </p>
        </div>
          <span className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-medium">
            <ShieldCheckIcon className="size-3.5" />
            {role === "OWNER" ? "Pemilik" : "Admin"}
          </span>
        </div>
        <section
          aria-label="Ringkasan organisasi"
          className="border-border relative mt-6 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <StatCard
            icon={BookOpenIcon}
            label="Total course"
            value={analytics.courses.total}
            href={`${root}/courses`}
          />
          <StatCard
            icon={BookCheckIcon}
            label="Published"
            value={analytics.courses.byStatus.PUBLISHED ?? 0}
            href={`${root}/courses`}
          />
          <StatCard
            icon={CalendarDaysIcon}
            label="Total Group belajar"
            value={analytics.cohorts.total}
            href={`${root}/courses`}
          />
          <StatCard
            icon={UsersIcon}
            label="Group belajar berjalan"
            value={
              (analytics.cohorts.byStatus.OPEN ?? 0) +
              (analytics.cohorts.byStatus.IN_PROGRESS ?? 0)
            }
            href={`${root}/courses`}
          />
          <StatCard
            icon={UsersIcon}
            label="Anggota"
            value={analytics.members}
            href={`${root}/members`}
          />
          <StatCard
            icon={ClipboardCheckIcon}
            label="Menunggu review"
            value={analytics.actionItems.attemptsInReview}
            href={`${root}/reviews`}
            />
          </section>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Card className="rounded-lg">
            <CardHeader>
              <div>
                <CardTitle className={cn(headline, "text-lg font-medium")}>
                  Course terbaru
                </CardTitle>
                <CardDescription>
                  Course yang paling baru dibuat.
                </CardDescription>
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
                      <CourseThumbnail thumbnailUrl={course.thumbnailUrl} />
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
                <TextAction href={`${root}/courses`}>Semua course</TextAction>
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
                count={analytics.content.materials}
                href={`${root}/library/materials`}
              />
              <LibraryRow
                icon={LanguagesIcon}
                label="Set kosakata"
                detail="Istilah, definisi, dan contoh"
                count={analytics.content.vocabularySets}
                href={`${root}/library/vocabulary`}
              />
              <LibraryRow
                icon={LibraryIcon}
                label="Tugas"
                detail="Kuis, ujian, dan soal latihan"
                count={analytics.content.assessments}
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
            {reviewItems.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={ClipboardCheckIcon}
                  title="Tidak ada yang menunggu"
                  description="Attempt dengan jawaban tulisan yang perlu dinilai akan muncul di sini."
                />
              </CardContent>
            ) : (
              <ul className="divide-border divide-y">
                {reviewItems.map((item) => (
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
      <RecentActivity items={activity} />
    </div>
  );
}
