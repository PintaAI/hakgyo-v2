"use client";

import {
  useDeferredValue,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardIcon,
  FilePenLineIcon,
  Layers3Icon,
  LayoutDashboardIcon,
  LinkIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  UserPlusIcon,
  UserRoundCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type CourseView = "overview" | "cohorts" | "learners" | "invites" | "settings";

type Course = RouterOutputs["course"]["get"];
type Enrollment = RouterOutputs["enrollment"]["listCourseEnrollments"][number];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const courseStatus = {
  DRAFT: { label: "Draf", variant: "secondary" as const },
  PUBLISHED: { label: "Terbit", variant: "default" as const },
  ARCHIVED: { label: "Arsip", variant: "outline" as const },
};

const enrollmentStatus = {
  PENDING: "Menunggu",
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const cohortStatus = {
  DRAFT: "Draf",
  OPEN: "Dibuka",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const views = [
  { value: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { value: "cohorts", label: "Batch pembelajaran", icon: CalendarDaysIcon },
  { value: "learners", label: "Learners", icon: UsersIcon },
  { value: "invites", label: "Invites", icon: MailPlusIcon },
  { value: "settings", label: "Settings", icon: Settings2Icon },
] satisfies Array<{
  value: CourseView;
  label: string;
  icon: typeof LayoutDashboardIcon;
}>;

const validViews = new Set<CourseView>(views.map(({ value }) => value));

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Perubahan belum berhasil disimpan. Silakan coba lagi.";
}

function SectionEmpty({
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
    <div className="rounded-md border border-dashed px-5 py-12 text-center">
      <Icon className="text-muted-foreground mx-auto size-6" />
      <h3 className="mt-3 font-[family-name:var(--font-hanken-grotesk)] text-base font-medium">
        {title}
      </h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}

function QueryState({ error }: { error?: { message: string } | null }) {
  if (error) {
    return (
      <div className="text-destructive bg-destructive/10 rounded-md px-4 py-8 text-center text-sm">
        {error.message}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-foreground/10 flex min-w-0 flex-col border-l pl-4 first:border-l-0 first:pl-0 sm:pl-6">
      <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-xs">
        {label}
      </span>
      <span className="mt-1 font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">
        {value}
      </span>
    </div>
  );
}

export function CourseWorkspace({
  course,
  organizationId,
  organizationSlug,
}: {
  course: Course;
  organizationId: string;
  organizationSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const root = `/workspace/${organizationSlug}/courses/${course.id}`;
  const canManageCourse = course.access.canManageCourse;
  const canManageContent = course.access.canManageContent;
  const availableViews = canManageCourse
    ? views
    : views.filter(({ value }) => value === "overview");
  const requestedView = searchParams.get("view") as CourseView | null;
  const view =
    requestedView &&
    validViews.has(requestedView) &&
    availableViews.some(({ value }) => value === requestedView)
      ? requestedView
      : "overview";
  const isOverview = view === "overview";

  function navigate(nextView: CourseView) {
    if (nextView === view) return;
    window.history.pushState(
      null,
      "",
      nextView === "overview" ? root : `${root}?view=${nextView}`,
    );
  }

  const cohorts = api.cohort.list.useQuery(
    { courseId: course.id },
    {
      enabled:
        canManageCourse &&
        (isOverview || view === "cohorts" || view === "invites"),
    },
  );
  const learners = api.enrollment.listCourseEnrollments.useQuery(
    { courseId: course.id },
    { enabled: canManageCourse && (isOverview || view === "learners") },
  );
  const invites = api.enrollment.listInvites.useQuery(
    { courseId: course.id },
    { enabled: canManageCourse && (isOverview || view === "invites") },
  );

  const updateCourse = api.course.update.useMutation();
  const modules = course.modules.length;
  const items = course.modules.reduce(
    (total, module) => total + module.items.length,
    0,
  );

  async function changeCourseStatus(status: Course["status"]) {
    try {
      await updateCourse.mutateAsync({ courseId: course.id, status });
      await Promise.all([
        utils.course.get.invalidate({ courseId: course.id }),
        utils.course.list.invalidate({ organizationId }),
      ]);
      toast.success(
        status === "PUBLISHED"
          ? "Course berhasil diterbitkan."
          : status === "ARCHIVED"
            ? "Course dipindahkan ke arsip."
            : "Course dikembalikan menjadi draf.",
      );
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href={`/workspace/${organizationSlug}/courses`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Semua courses
      </Link>

      <header className="relative overflow-hidden rounded-lg bg-[#171915] px-5 py-6 text-[#f5f3e9] sm:px-7 sm:py-8">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
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
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[#aaa99f] uppercase dark:text-[#5f605a]">
                Course workspace
              </span>
              <Badge
                variant={courseStatus[course.status].variant}
                className="border-white/20"
              >
                {courseStatus[course.status].label}
              </Badge>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#aaa99f] dark:text-[#5f605a]">
              {course.description ??
                "Belum ada deskripsi. Tambahkan konteks course melalui Settings."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageContent ? (
              <Link
                href={`${root}/curriculum`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-white/20 bg-white/5 text-[#f5f3e9] hover:bg-white/10 hover:text-white",
                )}
              >
                <FilePenLineIcon data-icon="inline-start" />
                Edit curriculum
              </Link>
            ) : null}
            {canManageCourse && course.status === "PUBLISHED" ? (
              <Button
                className="bg-[#f5f3e9] text-[#171915] hover:bg-white"
                disabled={updateCourse.isPending}
                onClick={() => changeCourseStatus("DRAFT")}
              >
                Kembalikan ke draf
              </Button>
            ) : canManageCourse ? (
              <Button
                className="bg-[#f5f3e9] text-[#171915] hover:bg-white"
                disabled={updateCourse.isPending}
                onClick={() => changeCourseStatus("PUBLISHED")}
              >
                {updateCourse.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <CheckIcon />
                )}
                Terbitkan
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        aria-label="Course management"
        className="max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max items-center gap-1">
          {availableViews.map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              aria-current={view === value ? "page" : undefined}
              onClick={() => navigate(value)}
              className={cn(
                "after:bg-foreground focus-visible:bg-muted relative flex h-11 items-center gap-2 px-3 text-sm font-medium transition-colors outline-none after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:opacity-0",
                view === value
                  ? "text-foreground after:opacity-100"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {view === "overview" ? (
        <OverviewSection
          course={course}
          cohorts={cohorts.data}
          cohortsPending={cohorts.isPending}
          learners={learners.data}
          learnersPending={learners.isPending}
          invites={invites.data}
          invitesPending={invites.isPending}
          items={items}
          modules={modules}
          root={root}
          canManageContent={canManageContent}
          canManageCourse={canManageCourse}
          onNavigate={navigate}
        />
      ) : null}
      {view === "cohorts" ? (
        <CohortsSection
          courseId={course.id}
          data={cohorts.data}
          error={cohorts.error}
          isPending={cohorts.isPending}
          root={root}
        />
      ) : null}
      {view === "learners" ? (
        <LearnersSection
          courseId={course.id}
          data={learners.data}
          error={learners.error}
          isPending={learners.isPending}
          onNavigate={navigate}
        />
      ) : null}
      {view === "invites" ? (
        <InvitesSection
          courseId={course.id}
          cohorts={cohorts.data}
          data={invites.data}
          error={invites.error}
          isPending={invites.isPending}
        />
      ) : null}
      {view === "settings" ? (
        <SettingsSection
          course={course}
          coursesHref={`/workspace/${organizationSlug}/courses`}
          organizationId={organizationId}
          onStatusChange={changeCourseStatus}
        />
      ) : null}
    </div>
  );
}

function OverviewSection({
  course,
  cohorts,
  cohortsPending,
  learners,
  learnersPending,
  invites,
  invitesPending,
  items,
  modules,
  root,
  canManageContent,
  canManageCourse,
  onNavigate,
}: {
  course: Course;
  cohorts?: RouterOutputs["cohort"]["list"];
  cohortsPending: boolean;
  learners?: RouterOutputs["enrollment"]["listCourseEnrollments"];
  learnersPending: boolean;
  invites?: RouterOutputs["enrollment"]["listInvites"];
  invitesPending: boolean;
  items: number;
  modules: number;
  root: string;
  canManageContent: boolean;
  canManageCourse: boolean;
  onNavigate: (view: CourseView) => void;
}) {
  const activeLearners = learners?.filter(
    (enrollment) => enrollment.status === "ACTIVE",
  ).length;
  const activeInvites = invites?.filter(
    (invite) =>
      !invite.revokedAt && (!invite.expiresAt || invite.expiresAt > new Date()),
  ).length;

  if (!canManageCourse) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              Shared course access
            </CardTitle>
            <CardDescription>
              This course is shared with teachers in your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageContent ? (
              <Link
                href={`${root}/curriculum`}
                className={buttonVariants({ variant: "outline" })}
              >
                <FilePenLineIcon data-icon="inline-start" />
                Edit curriculum
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm">
                Ask an organization admin to enable shared content editing.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm">Course owner</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {course.owner.user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {course.owner.user.name}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {course.owner.user.email}
              </span>
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Course summary"
        className="grid grid-cols-2 gap-y-6 border-y py-5 sm:grid-cols-4"
      >
        <Stat label="Modules" value={modules} />
        <Stat
          label="Batch pembelajaran"
          value={cohortsPending ? "–" : (cohorts?.length ?? 0)}
        />
        <Stat
          label="Active learners"
          value={learnersPending ? "–" : (activeLearners ?? 0)}
        />
        <Stat
          label="Active invites"
          value={invitesPending ? "–" : (activeInvites ?? 0)}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div>
              <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
                Curriculum pulse
              </CardTitle>
              <CardDescription>
                Struktur pembelajaran yang tersedia saat ini.
              </CardDescription>
            </div>
            <CardAction>
              <Link
                href={`${root}/curriculum`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Kelola
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </CardAction>
          </CardHeader>
          {course.modules.length === 0 ? (
            <CardContent>
              <SectionEmpty
                icon={Layers3Icon}
                title="Curriculum masih kosong"
                description="Susun bab pertama, lalu hubungkan bahan ajar."
                action={
                  <Link
                    href={`${root}/curriculum`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-4",
                    )}
                  >
                    Mulai menyusun
                  </Link>
                }
              />
            </CardContent>
          ) : (
            <ol className="divide-border divide-y">
              {course.modules.slice(0, 5).map((module, index) => (
                <li
                  key={module.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {module.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {module.items.length} item
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="bg-muted/40 text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-xs">
            <span>{items} total learning item</span>
            <span>
              {course.progressionMode === "OPEN" ? "Open access" : "Sequential"}
            </span>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
                Next moves
              </CardTitle>
              <CardDescription>
                Action yang paling sering dibutuhkan.
              </CardDescription>
            </CardHeader>
            <div className="divide-border divide-y border-t">
              {[
                {
                  view: "cohorts" as const,
                  icon: CalendarDaysIcon,
                  label: "Buat dan kelola batch pembelajaran",
                },
                {
                  view: "invites" as const,
                  icon: MailPlusIcon,
                  label: "Undang learner",
                },
                {
                  view: "settings" as const,
                  icon: Settings2Icon,
                  label: "Atur akses course",
                },
              ].map(({ view, icon: Icon, label }) => (
                <button
                  type="button"
                  key={view}
                  onClick={() => onNavigate(view)}
                  className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                >
                  <Icon className="text-muted-foreground size-4" />
                  <span className="flex-1">{label}</span>
                  <ArrowRightIcon className="text-muted-foreground size-4" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-sm">Course owner</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {course.owner.user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {course.owner.user.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {course.owner.user.email}
                </span>
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CohortsSection({
  courseId,
  data,
  error,
  isPending,
  root,
}: {
  courseId: string;
  data?: RouterOutputs["cohort"]["list"];
  error: { message: string } | null;
  isPending: boolean;
  root: string;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const createCohort = api.cohort.create.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await createCohort.mutateAsync({
        courseId,
        name: name.trim(),
        description: description.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`) : null,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`) : null,
      });
      await utils.cohort.list.invalidate({ courseId });
      setOpen(false);
      setName("");
      setDescription("");
      setCapacity("");
      setStartsAt("");
      setEndsAt("");
      toast.success("Batch pembelajaran berhasil dibuat.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
            Batch pembelajaran
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola kelas, kapasitas, periode, dan staff course.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Buat batch pembelajaran
        </Button>
      </div>

      {isPending || error ? <QueryState error={error} /> : null}
      {!isPending && !error && data?.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <SectionEmpty
              icon={CalendarDaysIcon}
              title="Belum ada batch pembelajaran"
              description="Batch pembelajaran membantu mengatur periode belajar, pengajar, meeting, dan kelompok peserta didik."
              action={
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
                  Buat batch pertama
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((cohort) => (
            <Link
              key={cohort.id}
              href={`${root}/cohorts/${cohort.id}`}
              className="group bg-card ring-foreground/10 hover:bg-muted/40 hover:ring-foreground/20 rounded-lg p-5 ring-1 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="outline">{cohortStatus[cohort.status]}</Badge>
                  <h3 className="mt-3 truncate font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
                    {cohort.name}
                  </h3>
                  <p className="text-muted-foreground mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed">
                    {cohort.description ??
                      "Belum ada deskripsi batch pembelajaran."}
                  </p>
                </div>
                <ArrowRightIcon className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="text-muted-foreground mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-xs">
                <span>
                  <strong className="text-foreground block text-base font-medium tabular-nums">
                    {cohort._count.enrollments}
                  </strong>
                  learners
                </span>
                <span>
                  <strong className="text-foreground block text-base font-medium tabular-nums">
                    {cohort._count.staff}
                  </strong>
                  staff
                </span>
                <span>
                  <strong className="text-foreground block text-base font-medium tabular-nums">
                    {cohort._count.meetings}
                  </strong>
                  meetings
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Buat batch pembelajaran</DialogTitle>
              <DialogDescription>
                Buat kelompok belajar baru untuk kursus ini.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cohort-name">Nama batch pembelajaran</Label>
                <Input
                  id="cohort-name"
                  autoFocus
                  maxLength={200}
                  placeholder="Contoh: Batch September 2026"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cohort-description">Deskripsi</Label>
                <Textarea
                  id="cohort-description"
                  maxLength={10000}
                  placeholder="Fokus dan konteks batch pembelajaran ini"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cohort-capacity">Kapasitas</Label>
                  <Input
                    id="cohort-capacity"
                    min={1}
                    type="number"
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cohort-start">Mulai</Label>
                  <Input
                    id="cohort-start"
                    type="date"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cohort-end">Selesai</Label>
                  <Input
                    id="cohort-end"
                    min={startsAt || undefined}
                    type="date"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createCohort.isPending}
              >
                {createCohort.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <PlusIcon />
                )}
                Buat batch pembelajaran
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LearnersSection({
  courseId,
  data,
  error,
  isPending,
  onNavigate,
}: {
  courseId: string;
  data?: RouterOutputs["enrollment"]["listCourseEnrollments"];
  error: { message: string } | null;
  isPending: boolean;
  onNavigate: (view: CourseView) => void;
}) {
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Enrollment["status"]>("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const updateEnrollment = api.enrollment.setCourseEnrollment.useMutation();
  const visible = data?.filter((enrollment) =>
    `${enrollment.user.name} ${enrollment.user.email}`
      .toLocaleLowerCase()
      .includes(deferredSearch),
  );

  async function updateStatus(
    enrollment: Enrollment,
    status: Enrollment["status"],
  ) {
    try {
      await updateEnrollment.mutateAsync({
        courseId,
        email: enrollment.user.email,
        status,
        expiresAt: enrollment.expiresAt,
      });
      await utils.enrollment.listCourseEnrollments.invalidate({ courseId });
      toast.success(`Status ${enrollment.user.name} diperbarui.`);
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function addLearner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateEnrollment.mutateAsync({
        courseId,
        email,
        status,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
      });
      await utils.enrollment.listCourseEnrollments.invalidate({ courseId });
      setAddOpen(false);
      setEmail("");
      setStatus("ACTIVE");
      setExpiresAt("");
      toast.success("Learner berhasil ditambahkan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
            Learners
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pantau entitlement dan status belajar seluruh learner.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNavigate("invites")}>
            <MailPlusIcon data-icon="inline-start" />
            Buat invite
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah learner
          </Button>
        </div>
      </div>

      {isPending || error ? <QueryState error={error} /> : null}
      {!isPending && !error && data?.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <SectionEmpty
              icon={UserRoundCheckIcon}
              title="Belum ada learner"
              description="Tambahkan akun Hakgyo dengan email atau bagikan invite agar learner mendaftar sendiri."
              action={
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlusIcon data-icon="inline-start" />
                  Tambah learner
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <Card className="rounded-lg">
          <CardHeader className="gap-4 border-b sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <CardTitle>Enrollment course</CardTitle>
              <CardDescription>{data.length} learner terdaftar</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Cari learner"
                className="pl-8"
                placeholder="Cari nama atau email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          {visible?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Learner</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="pr-4 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="max-w-64 pl-4 whitespace-normal">
                      <span className="block font-medium">
                        {enrollment.user.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {enrollment.user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{enrollment.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateFormatter.format(enrollment.enrolledAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <select
                        aria-label={`Status ${enrollment.user.name}`}
                        className="border-input bg-background focus-visible:ring-ring h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-2"
                        disabled={updateEnrollment.isPending}
                        value={enrollment.status}
                        onChange={(event) =>
                          updateStatus(
                            enrollment,
                            event.target.value as Enrollment["status"],
                          )
                        }
                      >
                        {Object.entries(enrollmentStatus).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <SectionEmpty
                icon={SearchIcon}
                title="Learner tidak ditemukan"
                description="Coba nama atau alamat email yang berbeda."
              />
            </CardContent>
          )}
        </Card>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addLearner}>
            <DialogHeader>
              <DialogTitle>Tambah learner</DialogTitle>
              <DialogDescription>
                Masukkan email akun Hakgyo yang akan diberi akses ke course ini.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="learner-email">Email learner</Label>
                <Input
                  id="learner-email"
                  autoComplete="email"
                  autoFocus
                  maxLength={320}
                  placeholder="learner@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Email harus sudah terdaftar sebagai akun Hakgyo.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="learner-status">Status awal</Label>
                  <select
                    id="learner-status"
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as Enrollment["status"])
                    }
                  >
                    {Object.entries(enrollmentStatus).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-expiry">Akses hingga</Label>
                  <Input
                    id="learner-expiry"
                    type="date"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!email.trim() || updateEnrollment.isPending}
              >
                {updateEnrollment.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <UserPlusIcon />
                )}
                Tambah learner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InvitesSection({
  courseId,
  cohorts,
  data,
  error,
  isPending,
}: {
  courseId: string;
  cohorts?: RouterOutputs["cohort"]["list"];
  data?: RouterOutputs["enrollment"]["listInvites"];
  error: { message: string } | null;
  isPending: boolean;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [cohortId, setCohortId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const createInvite = api.enrollment.createInvite.useMutation();
  const revokeInvite = api.enrollment.revokeInvite.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const invite = await createInvite.mutateAsync({
        courseId,
        cohortId: cohortId || null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
        maxUses: maxUses ? Number(maxUses) : null,
      });
      await utils.enrollment.listInvites.invalidate({ courseId });
      setNewToken(invite.token);
      toast.success(
        "Invite berhasil dibuat. Salin link sebelum menutup dialog.",
      );
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function copyInvite() {
    if (!newToken) return;
    const url = `${window.location.origin}/invite/${newToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link invite disalin.");
  }

  async function revoke(inviteId: string) {
    try {
      await revokeInvite.mutateAsync({ inviteId });
      await utils.enrollment.listInvites.invalidate({ courseId });
      toast.success("Invite dicabut.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  function closeDialog() {
    setOpen(false);
    setNewToken(null);
    setCohortId("");
    setExpiresAt("");
    setMaxUses("");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
            Invites
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Buat link akses untuk kursus atau batch pembelajaran tertentu.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <LinkIcon data-icon="inline-start" />
          Buat invite
        </Button>
      </div>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg border px-4 py-3 text-xs leading-relaxed">
        <MailPlusIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground">
          Demi keamanan, token hanya ditampilkan satu kali saat invite dibuat.
          Metadata dan pemakaiannya tetap dapat dipantau di bawah.
        </p>
      </div>

      {isPending || error ? <QueryState error={error} /> : null}
      {!isPending && !error && data?.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <SectionEmpty
              icon={MailPlusIcon}
              title="Belum ada invite"
              description="Buat link terbatas untuk mengundang peserta didik ke kursus atau batch pembelajaran."
              action={
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  Buat invite pertama
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <Card className="rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Target</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((invite) => {
                const expired = Boolean(
                  invite.expiresAt && invite.expiresAt <= new Date(),
                );
                const exhausted =
                  invite.maxUses !== null && invite.useCount >= invite.maxUses;
                const active = !invite.revokedAt && !expired && !exhausted;
                const cohort = cohorts?.find(
                  (item) => item.id === invite.cohortId,
                );
                return (
                  <TableRow key={invite.id}>
                    <TableCell className="pl-4">
                      <span className="block font-medium">
                        {cohort?.name ??
                          (invite.cohortId
                            ? "Batch pembelajaran"
                            : "Seluruh kursus")}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        oleh {invite.createdBy.user.name}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {invite.useCount} / {invite.maxUses ?? "∞"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {invite.expiresAt
                        ? dateFormatter.format(invite.expiresAt)
                        : "Tidak dibatasi"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "default" : "outline"}>
                        {invite.revokedAt
                          ? "Dicabut"
                          : expired
                            ? "Expired"
                            : exhausted
                              ? "Habis"
                              : "Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        aria-label="Cabut invite"
                        size="icon-sm"
                        variant="ghost"
                        disabled={!active || revokeInvite.isPending}
                        onClick={() => revoke(invite.id)}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(value) => (value ? setOpen(true) : closeDialog())}
      >
        <DialogContent className="sm:max-w-md">
          {newToken ? (
            <div>
              <DialogHeader>
                <DialogTitle>Invite siap dibagikan</DialogTitle>
                <DialogDescription>
                  Salin sekarang. Token ini tidak dapat ditampilkan kembali.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted mt-5 rounded-lg border p-4">
                <p className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
                  /invite/{newToken}
                </p>
              </div>
              <DialogFooter className="mt-5">
                <Button variant="outline" onClick={closeDialog}>
                  Selesai
                </Button>
                <Button onClick={copyInvite}>
                  <ClipboardIcon data-icon="inline-start" />
                  Salin link
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Buat invite</DialogTitle>
                <DialogDescription>
                  Batasi target, masa berlaku, dan jumlah penggunaan bila perlu.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-cohort">Target</Label>
                  <select
                    id="invite-cohort"
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                    value={cohortId}
                    onChange={(event) => setCohortId(event.target.value)}
                  >
                    <option value="">Entire course</option>
                    {cohorts?.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-expiry">Berlaku hingga</Label>
                    <Input
                      id="invite-expiry"
                      type="date"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-uses">Maksimal penggunaan</Label>
                    <Input
                      id="invite-uses"
                      min={1}
                      placeholder="Tanpa batas"
                      type="number"
                      value={maxUses}
                      onChange={(event) => setMaxUses(event.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-5">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button type="submit" disabled={createInvite.isPending}>
                  {createInvite.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <LinkIcon />
                  )}
                  Buat invite
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SettingsSection({
  course,
  coursesHref,
  organizationId,
  onStatusChange,
}: {
  course: Course;
  coursesHref: string;
  organizationId: string;
  onStatusChange: (status: Course["status"]) => Promise<void>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [description, setDescription] = useState(course.description ?? "");
  const [price, setPrice] = useState(String(course.price));
  const [currency, setCurrency] = useState(course.currency);
  const [enrollmentMode, setEnrollmentMode] = useState(
    course.enrollmentMode ?? "INHERIT",
  );
  const [progressionMode, setProgressionMode] = useState(
    course.progressionMode,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateCourse = api.course.update.useMutation();
  const deleteCourse = api.course.delete.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateCourse.mutateAsync({
        courseId: course.id,
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        price: Number(price),
        currency: currency.trim().toUpperCase(),
        enrollmentMode:
          enrollmentMode === "INHERIT"
            ? null
            : (enrollmentMode as "OPEN" | "INVITE_ONLY"),
        progressionMode,
      });
      await Promise.all([
        utils.course.get.invalidate({ courseId: course.id }),
        utils.course.list.invalidate({ organizationId }),
      ]);
      toast.success("Pengaturan course disimpan.");
      router.refresh();
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function removeCourse() {
    try {
      await deleteCourse.mutateAsync({ courseId: course.id });
      await utils.course.list.invalidate({ organizationId });
      toast.success("Course berhasil dihapus.");
      router.replace(coursesHref);
      router.refresh();
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
          Settings
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Metadata, akses enrollment, dan lifecycle course.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Course information</CardTitle>
            <CardDescription>
              Informasi yang terlihat oleh pengelola dan learner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="settings-title">Nama course</Label>
              <Input
                id="settings-title"
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-slug">Slug</Label>
              <Input
                id="settings-slug"
                maxLength={100}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-description">Deskripsi</Label>
              <Textarea
                id="settings-description"
                className="min-h-28"
                maxLength={10000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-price">Harga</Label>
                <Input
                  id="settings-price"
                  min={0}
                  required
                  type="number"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-currency">Currency</Label>
                <Input
                  id="settings-currency"
                  maxLength={3}
                  minLength={3}
                  required
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle>Access rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="settings-enrollment">Enrollment</Label>
                <select
                  id="settings-enrollment"
                  className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                  value={enrollmentMode}
                  onChange={(event) => setEnrollmentMode(event.target.value)}
                >
                  <option value="INHERIT">Ikuti organization</option>
                  <option value="OPEN">Open enrollment</option>
                  <option value="INVITE_ONLY">Invite only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-progression">Progression</Label>
                <select
                  id="settings-progression"
                  className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
                  value={progressionMode}
                  onChange={(event) =>
                    setProgressionMode(
                      event.target.value as Course["progressionMode"],
                    )
                  }
                >
                  <option value="OPEN">Semua module terbuka</option>
                  <option value="SEQUENTIAL">Berurutan</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Button
            className="w-full"
            type="submit"
            disabled={
              updateCourse.isPending ||
              !title.trim() ||
              !slug.trim() ||
              currency.trim().length !== 3
            }
          >
            {updateCourse.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <CheckIcon />
            )}
            Simpan perubahan
          </Button>
        </div>
      </form>

      <Card className="border-destructive/20 rounded-lg ring-0">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Action lifecycle yang berdampak pada akses learner.
          </CardDescription>
        </CardHeader>
        <div className="divide-border divide-y">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-medium">
                {course.status === "ARCHIVED"
                  ? "Pulihkan course"
                  : "Archive course"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {course.status === "ARCHIVED"
                  ? "Kembalikan course ke status draf untuk dikelola lagi."
                  : "Sembunyikan course dari workflow aktif tanpa menghapus data."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onStatusChange(
                  course.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED",
                )
              }
            >
              <ArchiveIcon data-icon="inline-start" />
              {course.status === "ARCHIVED" ? "Pulihkan" : "Archive"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-medium">Hapus course</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Penghapusan dapat ditolak bila course masih memiliki data
                terkait.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Hapus course
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus {course.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Action ini permanen. Gunakan archive bila course mungkin
              diperlukan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteCourse.isPending}
              onClick={removeCourse}
            >
              {deleteCourse.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
