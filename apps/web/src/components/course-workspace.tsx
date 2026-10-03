"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownAZIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  CheckIcon,
  CircleHelpIcon,
  ClipboardIcon,
  ClockIcon,
  CrownIcon,
  FilePenLineIcon,
  Layers3Icon,
  LayoutDashboardIcon,
  LinkIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  PlusIcon,
  SearchIcon,
  ImageIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  TrophyIcon,
  UserPlusIcon,
  UserRoundCheckIcon,
  UsersIcon,
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
import { AssessmentEventManager } from "~/components/assessment-event-manager";
import {
  CoursePublicationControl,
  coursePublicationLabels,
} from "~/components/course-readiness";
import { CourseThumbnailField } from "~/components/course-thumbnail-field";
import { PageHeader } from "~/components/ui/page-header";
import { CourseCover } from "~/components/course-cover";
import { ReviewQueue } from "~/components/review-queue";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
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
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { StatStrip } from "~/components/ui/stat-strip";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getErrorMessage } from "~/lib/error-message";
import { cn } from "~/lib/utils";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { api, type RouterOutputs } from "~/trpc/react";

type CourseView =
  | "overview"
  | "cohorts"
  | "learners"
  | "tryouts"
  | "reviews"
  | "access"
  | "settings";

type CourseWorkspaceData = RouterOutputs["course"]["getWorkspaceOverview"];
type Course = CourseWorkspaceData["course"];
type Enrollment =
  RouterOutputs["enrollment"]["listCourseEnrollments"]["items"][number];
type Cohort = RouterOutputs["cohort"]["list"]["items"][number];
type CohortStatus = Cohort["status"];
type CohortSort = "updatedAt" | "createdAt" | "name";
type SortDirection = "asc" | "desc";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const courseStatus = {
  DRAFT: {
    label: coursePublicationLabels.DRAFT,
    variant: "secondary" as const,
  },
  PUBLISHED: {
    label: coursePublicationLabels.PUBLISHED,
    variant: "default" as const,
  },
};

const enrollmentStatus = {
  PENDING: "Menunggu",
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const courseCurrencies = [
  { code: "IDR", symbol: "Rp", flag: "🇮🇩" },
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬" },
  { code: "MYR", symbol: "RM", flag: "🇲🇾" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺" },
] as const;

const cohortStatus = {
  // Cohort DRAFT: set up but not visible to learners yet.
  DRAFT: "Persiapan",
  OPEN: "Dibuka",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const views = [
  { value: "overview", label: "Ringkasan", icon: LayoutDashboardIcon },
  { value: "cohorts", label: "Group belajar", icon: CalendarDaysIcon },
  { value: "learners", label: "Siswa", icon: UsersIcon },
  { value: "reviews", label: "Hasil & review", icon: ClipboardCheckIcon },
  { value: "tryouts", label: "Tryout", icon: TrophyIcon },
  { value: "access", label: "Akses", icon: ShieldCheckIcon },
  { value: "settings", label: "Pengaturan", icon: Settings2Icon },
] satisfies Array<{
  value: CourseView;
  label: string;
  icon: typeof LayoutDashboardIcon;
}>;

const validViews = new Set<CourseView>(views.map(({ value }) => value));

/** The settings field that every thumbnail action leads to. */
const courseThumbnailFieldId = "course-thumbnail";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function LearnerAvatarStack({
  learners,
  total,
}: {
  learners: RouterOutputs["cohort"]["list"]["items"][number]["learnerPreview"];
  total: number;
}) {
  const remaining = Math.max(total - learners.length, 0);

  return (
    <AvatarGroup aria-label={`${total} peserta`}>
      {learners.map((learner) => (
        <Avatar key={learner.id} size="sm" title={learner.name}>
          {learner.image ? (
            <AvatarImage src={learner.image} alt={learner.name} />
          ) : null}
          <AvatarFallback>{getInitials(learner.name)}</AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 ? (
        <AvatarGroupCount className="text-[0.65rem] font-medium">
          +{remaining}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
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

export function CourseWorkspace({
  workspace: initialWorkspace,
}: {
  workspace: CourseWorkspaceData;
}) {
  const workspaceInput = {
    courseId: initialWorkspace.course.id,
    organizationSlug: initialWorkspace.organization.slug,
  };
  const workspaceQuery = api.course.getWorkspaceOverview.useQuery(
    workspaceInput,
    { initialData: initialWorkspace },
  );
  const workspace = workspaceQuery.data;
  const { access: courseAccess, course, organization, overview } = workspace;
  const organizationId = organization.id;
  const organizationSlug = organization.slug;
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const root = `/workspace/${organizationSlug}/courses/${course.id}`;
  const canManageCourse = courseAccess.canManageCourse;
  const canViewCohorts = courseAccess.canViewCohorts;
  const canManageContent = courseAccess.canManageContent;
  const canManageAccess =
    canManageCourse && courseAccess.usesAdvancedPermissions;
  const availableViews = canManageCourse
    ? views.filter(({ value }) => value !== "access" || canManageAccess)
    : views.filter(
        ({ value }) =>
          value === "overview" || (canViewCohorts && value === "cohorts"),
      );
  const rawRequestedView = searchParams.get("view");
  // Legacy `?view=invites` now lives inside the Siswa tab.
  const requestedView = (
    rawRequestedView === "invites" ? "learners" : rawRequestedView
  ) as CourseView | null;
  const view =
    requestedView &&
    validViews.has(requestedView) &&
    availableViews.some(({ value }) => value === requestedView)
      ? requestedView
      : "overview";
  const viewCounts: Partial<Record<CourseView, number>> = {
    cohorts: overview?.stats.cohortCount,
    learners: overview?.stats.activeLearnerCount,
  };
  const [learnerSearch, setLearnerSearch] = useState("");
  const debouncedLearnerSearch = useDebouncedValue(
    learnerSearch.trim().toLowerCase(),
  );
  const [cohortSearch, setCohortSearch] = useState("");
  const [appliedCohortSearch, setAppliedCohortSearch] = useState("");
  const [cohortStatusFilter, setCohortStatusFilter] = useState<
    CohortStatus | "ALL"
  >("ALL");
  const [cohortSort, setCohortSort] = useState<CohortSort>("updatedAt");
  const [cohortSortDirection, setCohortSortDirection] =
    useState<SortDirection>("desc");

  function navigate(nextView: CourseView) {
    if (nextView === view) return;
    window.history.pushState(
      null,
      "",
      nextView === "overview" ? root : `${root}?view=${nextView}`,
    );
  }

  const cohorts = api.cohort.list.useInfiniteQuery(
    {
      courseId: course.id,
      search: appliedCohortSearch || undefined,
      status: cohortStatusFilter === "ALL" ? undefined : cohortStatusFilter,
      sort: cohortSort,
      sortDirection: cohortSortDirection,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: canViewCohorts && (view === "cohorts" || view === "learners"),
    },
  );
  const learners = api.enrollment.listCourseEnrollments.useInfiniteQuery(
    {
      courseId: course.id,
      search: debouncedLearnerSearch || undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: canManageCourse && view === "learners",
    },
  );
  const invites = api.enrollment.listInvites.useInfiniteQuery(
    { courseId: course.id },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: canManageCourse && view === "learners",
    },
  );
  const cohortItems = cohorts.data?.pages.flatMap((page) => page.items);
  const learnerItems = learners.data?.pages.flatMap((page) => page.items);
  const inviteItems = invites.data?.pages.flatMap((page) => page.items);
  const access = api.course.getAccess.useQuery(
    { courseId: course.id },
    { enabled: canManageAccess && view === "access" },
  );

  const updateCourse = api.course.update.useMutation();

  async function refreshWorkspace() {
    await utils.course.getWorkspaceOverview.invalidate(workspaceInput);
  }

  // Every thumbnail action lives in the settings tab; this opens it there.
  function editThumbnail() {
    navigate("settings");
    window.setTimeout(() => {
      // The id is on the hidden file input; scroll to the visible field.
      document
        .getElementById(courseThumbnailFieldId)
        ?.closest("[data-thumbnail-field]")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  async function changeCourseStatus(status: Course["status"]) {
    try {
      await updateCourse.mutateAsync({ courseId: course.id, status });
      await Promise.all([
        utils.course.get.invalidate({ courseId: course.id }),
        refreshWorkspace(),
        utils.course.list.invalidate({ organizationId }),
        utils.content.getCurriculumReadiness.invalidate({
          courseId: course.id,
        }),
        // Publishing changes which assessments are live (read-only).
        utils.assessment.get.invalidate(),
        utils.assessment.list.invalidate(),
      ]);
      toast.success(
        status === "PUBLISHED"
          ? "Kursus dipublikasikan."
          : "Publikasi kursus dibatalkan. Semua item disembunyikan dari siswa.",
      );
      router.refresh();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
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
        Semua kursus
      </Link>

      <PageHeader
        eyebrow={`Kursus · ${courseStatus[course.status].label}`}
        title={course.title}
        description={
          course.description ??
          "Belum ada deskripsi. Tambahkan konteks kursus melalui Pengaturan."
        }
        media={
          canManageCourse ? (
            // The cover opens the one place every thumbnail action lives.
            <button
              type="button"
              onClick={editThumbnail}
              className="group/cover focus-visible:ring-ring relative block w-full overflow-hidden rounded-2xl outline-none focus-visible:ring-2"
            >
              <CourseCover
                title={course.title}
                thumbnailUrl={course.thumbnailUrl}
                priority
                sizes="352px"
                className="aspect-video w-full transition-transform duration-500 group-hover/cover:scale-[1.02]"
              />
              <span className="bg-background/90 absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                <ImageIcon className="size-3.5" aria-hidden="true" />
                {course.thumbnailUrl ? "Ganti thumbnail" : "Tambah thumbnail"}
              </span>
            </button>
          ) : (
            <CourseCover
              title={course.title}
              thumbnailUrl={course.thumbnailUrl}
              priority
              sizes="352px"
              className="aspect-video w-full rounded-2xl"
            />
          )
        }
        actions={
          <>
            {canManageContent ? (
              <Link
                href={`${root}/kurikulum`}
                className={buttonVariants({ variant: "outline" })}
              >
                <FilePenLineIcon data-icon="inline-start" />
                Edit kurikulum
              </Link>
            ) : (
              <Link
                href={`/learn/${course.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Layers3Icon data-icon="inline-start" />
                Lihat kurikulum
              </Link>
            )}
            {canManageCourse ? (
              <CoursePublicationControl
                courseId={course.id}
                status={course.status}
                curriculumHref={`${root}/kurikulum`}
                pending={updateCourse.isPending}
                onChangeStatus={changeCourseStatus}
              />
            ) : null}
          </>
        }
      />

      <Tabs
        value={view}
        onValueChange={(nextView) => navigate(nextView as CourseView)}
        className="gap-8"
      >
        <div className="max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList
            variant="line"
            aria-label="Pengelolaan kursus"
            className="h-11 min-w-max justify-start rounded-none p-0"
          >
            {availableViews.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-11 flex-none rounded-none px-3 py-0 group-data-horizontal/tabs:after:inset-x-3 group-data-horizontal/tabs:after:bottom-0"
              >
                <Icon className="size-4" />
                {label}
                {viewCounts[value] !== undefined && viewCounts[value] > 0 ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ({viewCounts[value]})
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewSection
            course={course}
            overview={overview}
            root={root}
            canManageContent={canManageContent}
            canManageCourse={canManageCourse}
            onNavigate={navigate}
          />
        </TabsContent>
        <TabsContent value="cohorts">
          <CohortsSection
            canCreate={canManageCourse}
            courseId={course.id}
            data={cohortItems}
            error={cohorts.error}
            isPending={cohorts.isPending}
            hasMore={cohorts.hasNextPage}
            isLoadingMore={cohorts.isFetchingNextPage}
            search={cohortSearch}
            appliedSearch={appliedCohortSearch}
            statusFilter={cohortStatusFilter}
            sort={cohortSort}
            sortDirection={cohortSortDirection}
            onSearchChange={setCohortSearch}
            onSearch={() => setAppliedCohortSearch(cohortSearch.trim())}
            onStatusFilterChange={setCohortStatusFilter}
            onSortChange={setCohortSort}
            onSortDirectionChange={setCohortSortDirection}
            onLoadMore={() => void cohorts.fetchNextPage()}
            onWorkspaceChange={refreshWorkspace}
            root={root}
          />
        </TabsContent>
        <TabsContent value="learners">
          <div className="space-y-10">
            <LearnersSection
              courseId={course.id}
              data={learnerItems}
              error={learners.error}
              isPending={learners.isPending}
              search={learnerSearch}
              onSearchChange={setLearnerSearch}
              hasMore={learners.hasNextPage}
              isLoadingMore={learners.isFetchingNextPage}
              onLoadMore={() => void learners.fetchNextPage()}
              onWorkspaceChange={refreshWorkspace}
            />
            <div className="border-t pt-8">
              <InvitesSection
                courseId={course.id}
                cohorts={cohortItems}
                data={inviteItems}
                error={invites.error}
                isPending={invites.isPending}
                hasMore={invites.hasNextPage}
                isLoadingMore={invites.isFetchingNextPage}
                onLoadMore={() => void invites.fetchNextPage()}
                onWorkspaceChange={refreshWorkspace}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tryouts">
          <AssessmentEventManager courseId={course.id} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewQueue organizationId={organizationId} courseId={course.id} />
        </TabsContent>
        <TabsContent value="access">
          <AccessSection
            courseId={course.id}
            data={access.data}
            error={access.error}
            isPending={access.isPending}
            onWorkspaceChange={refreshWorkspace}
          />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsSection
            course={course}
            coursesHref={`/workspace/${organizationSlug}/courses`}
            organizationId={organizationId}
            onWorkspaceChange={refreshWorkspace}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewSection({
  course,
  overview,
  root,
  canManageContent,
  canManageCourse,
  onNavigate,
}: {
  course: Course;
  overview: CourseWorkspaceData["overview"];
  root: string;
  canManageContent: boolean;
  canManageCourse: boolean;
  onNavigate: (view: CourseView) => void;
}) {
  if (!canManageCourse) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-medium">
              Akses kursus bersama
            </CardTitle>
            <CardDescription>
              Anda memiliki akses melalui assignment kursus atau cohort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageContent ? (
              <Link
                href={`${root}/kurikulum`}
                className={buttonVariants({ variant: "outline" })}
              >
                <FilePenLineIcon data-icon="inline-start" />
                Edit kurikulum
              </Link>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Curriculum tersedia sebagai referensi mengajar. Minta kursus
                  manager menambahkan Anda sebagai editor bila perlu
                  mengubahnya.
                </p>
                <Link
                  href={`/learn/${course.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Layers3Icon data-icon="inline-start" />
                  Lihat kurikulum
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pemilik kursus</CardTitle>
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

  if (!overview) return null;

  const { modules, stats } = overview;

  return (
    <div className="space-y-4">
      <StatStrip
        label="Ringkasan kursus"
        items={[
          { label: "Bab", value: stats.moduleCount },
          { label: "Group belajar", value: stats.cohortCount },
          { label: "Siswa aktif", value: stats.activeLearnerCount },
          { label: "Undangan aktif", value: stats.activeInviteCount },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle className="text-lg font-medium">Kurikulum</CardTitle>
              <CardDescription>
                Struktur pembelajaran yang tersedia saat ini.
              </CardDescription>
            </div>
            <CardAction>
              <Link
                href={`${root}/kurikulum`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Kelola
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </CardAction>
          </CardHeader>
          {modules.length === 0 ? (
            <CardContent>
              <EmptyState
                size="sm"
                icon={Layers3Icon}
                title="Kurikulum masih kosong"
                description="Susun bab pertama, lalu hubungkan bahan ajar."
                action={
                  <Link
                    href={`${root}/kurikulum`}
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
              {modules.map((module, index) => {
                const href = canManageContent
                  ? `${root}/kurikulum`
                  : `/learn/${course.id}`;
                return (
                  <li key={module.id}>
                    <Link
                      href={href}
                      className="hover:bg-muted/50 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {module.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {module.itemCount} item
                        </span>
                      </span>
                      <ArrowRightIcon className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg font-medium">
                Langkah berikutnya
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
                  label: "Buat dan kelola Group belajar",
                },
                {
                  view: "learners" as const,
                  icon: MailPlusIcon,
                  label: "Undang siswa",
                },
                {
                  view: "settings" as const,
                  icon: Settings2Icon,
                  label: "Atur akses kursus",
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pemilik kursus</CardTitle>
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
  canCreate,
  courseId,
  data,
  error,
  isPending,
  search,
  appliedSearch,
  statusFilter,
  sort,
  sortDirection,
  hasMore,
  isLoadingMore,
  onSearchChange,
  onSearch,
  onStatusFilterChange,
  onSortChange,
  onSortDirectionChange,
  onLoadMore,
  onWorkspaceChange,
  root,
}: {
  canCreate: boolean;
  courseId: string;
  data?: RouterOutputs["cohort"]["list"]["items"];
  error: { message: string } | null;
  isPending: boolean;
  search: string;
  appliedSearch: string;
  statusFilter: CohortStatus | "ALL";
  sort: CohortSort;
  sortDirection: SortDirection;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onStatusFilterChange: (value: CohortStatus | "ALL") => void;
  onSortChange: (value: CohortSort) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onLoadMore: () => void;
  onWorkspaceChange: () => Promise<void>;
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
  const hasActiveFilters = Boolean(appliedSearch || statusFilter !== "ALL");

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
      await Promise.all([
        utils.cohort.list.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
      setOpen(false);
      setName("");
      setDescription("");
      setCapacity("");
      setStartsAt("");
      setEndsAt("");
      toast.success("Group belajar berhasil dibuat.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Group belajar
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola kelas, kapasitas, periode, dan staff kursus.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Buat Group belajar
          </Button>
        ) : null}
      </div>

      <div className="bg-card flex flex-col gap-3 rounded-xl border p-3 lg:flex-row lg:items-center">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Cari Group belajar"
              className="pl-8"
              placeholder="Cari nama Group belajar"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            <SearchIcon />
            Cari
          </Button>
        </form>
        <div className="grid gap-2 sm:flex">
          <Select
            value={statusFilter}
            items={{ ALL: "Semua status", ...cohortStatus }}
            onValueChange={(value) => {
              if (value) onStatusFilterChange(value);
            }}
          >
            <SelectTrigger
              aria-label="Filter status"
              className="w-full sm:w-40"
            >
              <ListFilterIcon className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="ALL">Semua status</SelectItem>
              {Object.entries(cohortStatus).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            items={{
              updatedAt: "Aktivitas terakhir",
              createdAt: "Tanggal dibuat",
              name: "Nama",
            }}
            onValueChange={(value) => {
              if (value) onSortChange(value);
            }}
          >
            <SelectTrigger
              aria-label="Urutkan Group belajar"
              className="w-full sm:w-44"
            >
              {sort === "name" ? (
                <ArrowDownAZIcon className="text-muted-foreground" />
              ) : sort === "createdAt" ? (
                <CalendarDaysIcon className="text-muted-foreground" />
              ) : (
                <ClockIcon className="text-muted-foreground" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="updatedAt">
                <ClockIcon /> Aktivitas terakhir
              </SelectItem>
              <SelectItem value="createdAt">
                <CalendarDaysIcon /> Tanggal dibuat
              </SelectItem>
              <SelectItem value="name">
                <ArrowDownAZIcon /> Nama
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortDirection}
            items={{ asc: "Naik", desc: "Turun" }}
            onValueChange={(value) => {
              if (value) onSortDirectionChange(value);
            }}
          >
            <SelectTrigger
              aria-label="Arah pengurutan"
              className="w-full sm:w-36"
            >
              {sortDirection === "asc" ? (
                <ArrowUpIcon className="text-muted-foreground" />
              ) : (
                <ArrowDownIcon className="text-muted-foreground" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="asc">
                <ArrowUpIcon /> Naik
              </SelectItem>
              <SelectItem value="desc">
                <ArrowDownIcon /> Turun
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending || error ? <QueryState error={error} /> : null}
      {!isPending && !error && data?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={hasActiveFilters ? SearchIcon : CalendarDaysIcon}
              title={
                hasActiveFilters
                  ? "Group belajar tidak ditemukan"
                  : "Belum ada Group belajar"
              }
              description={
                hasActiveFilters
                  ? "Coba kata kunci atau status yang berbeda."
                  : "Group belajar membantu mengatur periode belajar, pengajar, meeting, dan kelompok siswa."
              }
              action={
                canCreate && !hasActiveFilters ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setOpen(true)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Buat Group belajar pertama
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <div className="space-y-3">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="divide-y">
              {data.map((cohort) => (
                <Link
                  key={cohort.id}
                  href={`${root}/cohorts/${cohort.id}`}
                  className="group hover:bg-muted/40 grid gap-4 px-5 py-4 transition-colors md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                      <CalendarDaysIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading truncate font-medium">
                          {cohort.name}
                        </h3>
                        <Badge variant="outline">
                          {cohortStatus[cohort.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                        {cohort.description ??
                          "Belum ada deskripsi Group belajar."}
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-5 pl-13 text-xs md:pl-0">
                    <span className="flex items-center gap-2.5">
                      <LearnerAvatarStack
                        learners={cohort.learnerPreview}
                        total={cohort._count.enrollments}
                      />
                      {cohort._count.enrollments} peserta
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="size-3.5" />
                      <strong className="text-foreground font-medium tabular-nums">
                        {cohort._count.meetings}
                      </strong>
                      meeting
                    </span>
                    <span className="hidden min-w-28 xl:block">
                      {sort === "updatedAt" ? "Aktivitas" : "Dibuat"}{" "}
                      <strong className="text-foreground font-medium">
                        {dateFormatter.format(
                          sort === "updatedAt"
                            ? cohort.updatedAt
                            : cohort.createdAt,
                        )}
                      </strong>
                    </span>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground group-hover:text-foreground hidden size-4 transition-transform group-hover:translate-x-1 md:block" />
                </Link>
              ))}
            </div>
          </Card>

          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Muat Group belajar berikutnya
            </Button>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Buat Group belajar</DialogTitle>
                <DialogDescription>
                  Buat Group belajar baru untuk kursus ini.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cohort-name">Nama Group belajar</Label>
                  <Input
                    id="cohort-name"
                    autoFocus
                    maxLength={200}
                    placeholder="Contoh: Group belajar September 2026"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cohort-description">Deskripsi</Label>
                  <Textarea
                    id="cohort-description"
                    maxLength={10000}
                    placeholder="Fokus dan konteks Group belajar ini"
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
                    <DatePicker
                      id="cohort-start"
                      value={startsAt}
                      onChange={setStartsAt}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cohort-end">Selesai</Label>
                    <DatePicker
                      id="cohort-end"
                      min={startsAt || undefined}
                      value={endsAt}
                      onChange={setEndsAt}
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
                  Buat Group belajar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

function LearnersSection({
  courseId,
  data,
  error,
  isPending,
  search,
  onSearchChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onWorkspaceChange,
}: {
  courseId: string;
  data?: RouterOutputs["enrollment"]["listCourseEnrollments"]["items"];
  error: { message: string } | null;
  isPending: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onWorkspaceChange: () => Promise<void>;
}) {
  const utils = api.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Enrollment["status"]>("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");
  const updateEnrollment = api.enrollment.setCourseEnrollment.useMutation();
  const removeEnrollment = api.enrollment.removeCourseEnrollment.useMutation();
  const [removing, setRemoving] = useState<Enrollment | null>(null);
  const visible = data;

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
      await Promise.all([
        utils.enrollment.listCourseEnrollments.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
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
      await Promise.all([
        utils.enrollment.listCourseEnrollments.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
      setAddOpen(false);
      setEmail("");
      setStatus("ACTIVE");
      setExpiresAt("");
      toast.success("Siswa berhasil ditambahkan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function removeLearner(enrollment: Enrollment) {
    try {
      await removeEnrollment.mutateAsync({
        courseId,
        userId: enrollment.user.id,
      });
      await Promise.all([
        utils.enrollment.listCourseEnrollments.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
      setRemoving(null);
      toast.success(
        `Siswa ${enrollment.user.name} dihapus dari belajar mandiri.`,
      );
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Siswa
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Siswa yang belajar mandiri tanpa Group belajar. Siswa Group belajar
            dikelola di halaman group masing-masing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddOpen(true)}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah siswa
          </Button>
        </div>
      </div>

      {isPending || error ? <QueryState error={error} /> : null}
      {!isPending && !error && data?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={UserRoundCheckIcon}
              title="Belum ada siswa"
              description="Tambahkan akun Hakgyo dengan email atau bagikan invite agar siswa mendaftar sendiri."
              action={
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlusIcon data-icon="inline-start" />
                  Tambah siswa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!isPending && !error && data && data.length > 0 ? (
        <Card>
          <CardHeader className="gap-4 border-b sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <CardTitle>Belajar mandiri</CardTitle>
              <CardDescription>{data.length} siswa terdaftar</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Cari siswa"
                className="pl-8"
                placeholder="Cari nama atau email"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </CardHeader>
          {visible?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Siswa</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="pr-4 text-right">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="max-w-64 pl-4 whitespace-normal">
                      <div className="flex items-center gap-3">
                        <Avatar className="shrink-0">
                          {enrollment.user.image ? (
                            <AvatarImage
                              src={enrollment.user.image}
                              alt={enrollment.user.name}
                            />
                          ) : null}
                          <AvatarFallback>
                            {getInitials(enrollment.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {enrollment.user.name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {enrollment.user.email}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{enrollment.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateFormatter.format(enrollment.enrolledAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={enrollment.status}
                        disabled={updateEnrollment.isPending}
                        onValueChange={(value) => {
                          if (value) void updateStatus(enrollment, value);
                        }}
                      >
                        <SelectTrigger
                          aria-label={`Status ${enrollment.user.name}`}
                        >
                          <span className="flex flex-1 text-left">
                            {enrollmentStatus[enrollment.status]}
                          </span>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {Object.entries(enrollmentStatus).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        aria-label={`Hapus ${enrollment.user.name}`}
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={removeEnrollment.isPending}
                        onClick={() => setRemoving(enrollment)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <EmptyState
                size="sm"
                icon={SearchIcon}
                title="Siswa tidak ditemukan"
                description="Coba nama atau alamat email yang berbeda."
              />
            </CardContent>
          )}
          {hasMore ? (
            <div className="border-t p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                Muat siswa berikutnya
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addLearner}>
            <DialogHeader>
              <DialogTitle>Tambah siswa</DialogTitle>
              <DialogDescription>
                Masukkan email akun Hakgyo yang akan diberi akses ke kursus ini.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="learner-email">Email siswa</Label>
                <Input
                  id="learner-email"
                  autoComplete="email"
                  autoFocus
                  maxLength={320}
                  placeholder="siswa@example.com"
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
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      if (value) setStatus(value);
                    }}
                  >
                    <SelectTrigger id="learner-status" className="w-full">
                      <span className="flex flex-1 text-left">
                        {enrollmentStatus[status]}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(enrollmentStatus).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="learner-expiry">Akses hingga</Label>
                  <DatePicker
                    id="learner-expiry"
                    value={expiresAt}
                    onChange={setExpiresAt}
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
                Tambah siswa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removing)}
        onOpenChange={(value) => {
          if (!value) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Hapus {removing?.user.name} dari belajar mandiri?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Akses belajar mandiri siswa ke kursus ini dicabut. Jika siswa
              masih terdaftar di Group belajar kursus ini, aksesnya tetap
              berlaku lewat group tersebut. Status lama tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeEnrollment.isPending}
              onClick={() => removing && removeLearner(removing)}
            >
              {removeEnrollment.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function InvitesSection({
  courseId,
  cohorts,
  data,
  error,
  isPending,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onWorkspaceChange,
}: {
  courseId: string;
  cohorts?: RouterOutputs["cohort"]["list"]["items"];
  data?: RouterOutputs["enrollment"]["listInvites"]["items"];
  error: { message: string } | null;
  isPending: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onWorkspaceChange: () => Promise<void>;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [cohortId, setCohortId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [oneTime, setOneTime] = useState(true);
  const [newToken, setNewToken] = useState<string | null>(null);
  const createInvite = api.enrollment.createInvite.useMutation();
  const revokeInvite = api.enrollment.revokeInvite.useMutation();
  const deleteInvite = api.enrollment.deleteInvite.useMutation();
  const actionPending = revokeInvite.isPending || deleteInvite.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const invite = await createInvite.mutateAsync({
        courseId,
        cohortId: cohortId || null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
        maxUses: oneTime ? 1 : maxUses ? Number(maxUses) : null,
      });
      await Promise.all([
        utils.enrollment.listInvites.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
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
      await Promise.all([
        utils.enrollment.listInvites.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
      toast.success("Invite dicabut.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function remove(inviteId: string) {
    try {
      await deleteInvite.mutateAsync({ inviteId });
      await Promise.all([
        utils.enrollment.listInvites.invalidate({ courseId }),
        onWorkspaceChange(),
      ]);
      toast.success("Invite dihapus.");
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
    setOneTime(true);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Invites
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Buat link akses untuk kursus atau Group belajar tertentu.
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
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={MailPlusIcon}
              title="Belum ada invite"
              description="Buat link terbatas untuk mengundang siswa ke kursus atau Group belajar."
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Target</TableHead>
                <TableHead>Pemakaian</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Aksi</span>
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
                            ? "Group belajar"
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
                      {active ? (
                        <Button
                          aria-label="Cabut invite"
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={actionPending}
                          onClick={() => revoke(invite.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      ) : (
                        <Button
                          aria-label="Hapus invite"
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={actionPending}
                          onClick={() => remove(invite.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {hasMore ? (
            <div className="border-t p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                Muat invite berikutnya
              </Button>
            </div>
          ) : null}
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
                <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                  <div className="grid gap-1">
                    <Label htmlFor="invite-one-time">Link sekali pakai</Label>
                    <p className="text-muted-foreground text-xs">
                      Link otomatis tidak berlaku setelah berhasil digunakan.
                    </p>
                  </div>
                  <Switch
                    id="invite-one-time"
                    checked={oneTime}
                    onCheckedChange={setOneTime}
                    aria-label="Link sekali pakai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-cohort">Target</Label>
                  <Select
                    value={cohortId || "ALL"}
                    onValueChange={(value) => {
                      if (value) setCohortId(value === "ALL" ? "" : value);
                    }}
                  >
                    <SelectTrigger id="invite-cohort" className="w-full">
                      <span className="flex flex-1 text-left">
                        {cohorts?.find((cohort) => cohort.id === cohortId)
                          ?.name ?? "Seluruh kursus"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Seluruh kursus</SelectItem>
                      {cohorts?.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-expiry">Berlaku hingga</Label>
                    <DatePicker
                      id="invite-expiry"
                      value={expiresAt}
                      onChange={setExpiresAt}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-uses">Maksimal penggunaan</Label>
                    <Input
                      id="invite-uses"
                      disabled={oneTime}
                      min={1}
                      placeholder={oneTime ? "1" : "Tanpa batas"}
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

function AccessSection({
  courseId,
  data,
  error,
  isPending,
  onWorkspaceChange,
}: {
  courseId: string;
  data?: RouterOutputs["course"]["getAccess"];
  error: { message: string } | null;
  isPending: boolean;
  onWorkspaceChange: () => Promise<void>;
}) {
  const utils = api.useUtils();
  const [editorMembershipId, setEditorMembershipId] = useState("");
  const [ownerMembershipId, setOwnerMembershipId] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const addEditor = api.course.addEditor.useMutation();
  const removeEditor = api.course.removeEditor.useMutation();
  const updateCourse = api.course.update.useMutation();

  async function refresh() {
    await Promise.all([
      utils.course.get.invalidate({ courseId }),
      utils.course.getAccess.invalidate({ courseId }),
      onWorkspaceChange(),
    ]);
  }

  async function grantEditor() {
    if (!editorMembershipId) return;
    try {
      await addEditor.mutateAsync({
        courseId,
        organizationMemberId: editorMembershipId,
      });
      setEditorMembershipId("");
      await refresh();
      toast.success("Editor kurikulum ditambahkan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function revokeEditor(collaboratorId: string) {
    try {
      await removeEditor.mutateAsync({ courseId, collaboratorId });
      await refresh();
      toast.success("Akses editor dicabut.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function transferOwnership() {
    if (!ownerMembershipId) return;
    try {
      await updateCourse.mutateAsync({ courseId, ownerMembershipId });
      setTransferOpen(false);
      setOwnerMembershipId("");
      await refresh();
      toast.success("Kursus manager utama diperbarui.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  if (isPending || error || !data) return <QueryState error={error} />;

  const editorMembershipIds = new Set(
    data.collaborators.map(
      (collaborator) => collaborator.organizationMember.id,
    ),
  );
  const availableEditors = data.organization.members.filter(
    (member) => !editorMembershipIds.has(member.id),
  );
  const selectedOwner = data.organization.members.find(
    (member) => member.id === ownerMembershipId,
  );
  const selectedEditor = availableEditors.find(
    (member) => member.id === editorMembershipId,
  );
  const editorTriggerLabel = selectedEditor
    ? `${selectedEditor.user.name} · ${selectedEditor.role}`
    : availableEditors.length === 0
      ? "Semua member sudah memiliki akses"
      : "Pilih member organisasi";

  return (
    <section className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="font-heading text-2xl font-medium tracking-tight">
          Akses kursus
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tentukan siapa yang mengelola kursus ini dan apa yang dapat mereka
          ubah.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b">
            <CardTitle>Tim pengelola</CardTitle>
            <CardDescription>
              {data.collaborators.length + 1} orang memiliki akses ke course
              ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="flex items-center gap-3 p-4">
                <Avatar size="lg">
                  {data.owner.user.image ? (
                    <AvatarImage
                      src={data.owner.user.image}
                      alt={data.owner.user.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(data.owner.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {data.owner.user.name}
                    </p>
                    <Badge variant="secondary">
                      <CrownIcon /> Manager
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {data.owner.user.email}
                  </p>
                </div>
                <span className="text-muted-foreground hidden text-xs sm:block">
                  Kontrol penuh
                </span>
              </div>

              {data.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="hover:bg-muted/30 flex items-center gap-3 p-4 transition-colors"
                >
                  <Avatar size="lg">
                    {collaborator.organizationMember.user.image ? (
                      <AvatarImage
                        src={collaborator.organizationMember.user.image}
                        alt={collaborator.organizationMember.user.name}
                      />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(collaborator.organizationMember.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {collaborator.organizationMember.user.name}
                      </p>
                      <Badge variant="outline">Editor</Badge>
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {collaborator.organizationMember.user.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removeEditor.isPending}
                    aria-label={`Cabut akses ${collaborator.organizationMember.user.name}`}
                    onClick={() => revokeEditor(collaborator.id)}
                  >
                    {removeEditor.isPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <Trash2Icon />
                    )}
                    <span className="hidden sm:inline">Cabut</span>
                  </Button>
                </div>
              ))}
            </div>

            <div className="bg-muted/35 border-t p-4">
              <Label htmlFor="new-course-editor">Tambah editor kurikulum</Label>
              <p className="text-muted-foreground mt-1 text-xs">
                Editor dapat menyusun bab dan materi, tanpa akses ke siswa,
                undangan, atau pengaturan kursus.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Select
                  value={editorMembershipId || "NONE"}
                  disabled={
                    availableEditors.length === 0 || addEditor.isPending
                  }
                  onValueChange={(value) => {
                    if (value && value !== "NONE") setEditorMembershipId(value);
                  }}
                >
                  <SelectTrigger
                    id="new-course-editor"
                    className="min-w-0 flex-1"
                  >
                    <span className="flex min-w-0 flex-1 text-left">
                      {editorTriggerLabel}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableEditors.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.user.name} · {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!editorMembershipId || addEditor.isPending}
                  onClick={grantEditor}
                >
                  {addEditor.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <UserPlusIcon />
                  )}
                  Tambah editor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Hak akses</CardTitle>
              <CardDescription>
                Setiap peran memiliki ruang kerja yang berbeda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-3">
                <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <CrownIcon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Manager</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    Mengelola kurikulum, siswa, group belajar, undangan,
                    pengaturan, dan status kursus.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <FilePenLineIcon className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Editor kurikulum</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    Hanya menyusun bab, materi, dan tugas di kurikulum.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Ganti manager</CardTitle>
              <CardDescription>
                Serahkan kontrol penuh kepada member organisasi lain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={ownerMembershipId || "NONE"}
                disabled={updateCourse.isPending}
                onValueChange={(value) => {
                  if (value)
                    setOwnerMembershipId(value === "NONE" ? "" : value);
                }}
              >
                <SelectTrigger
                  aria-label="Manager kursus baru"
                  className="w-full"
                >
                  <span className="flex flex-1 text-left">
                    {selectedOwner
                      ? `${selectedOwner.user.name} · ${selectedOwner.role}`
                      : "Pilih manager baru"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Pilih manager baru</SelectItem>
                  {data.organization.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name} · {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                variant="outline"
                disabled={!ownerMembershipId || updateCourse.isPending}
                onClick={() => setTransferOpen(true)}
              >
                Ganti manager
              </Button>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Anda dapat kehilangan akses pengelolaan setelah manager diganti.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CrownIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Ganti manager kursus?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedOwner?.user.name ?? "Member terpilih"} akan mendapat
              kontrol penuh atas course ini. Perubahan ini dapat menghilangkan
              akses pengelolaan Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={!ownerMembershipId || updateCourse.isPending}
              onClick={transferOwnership}
            >
              {updateCourse.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Ya, ganti manager
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function FieldHelp({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Penjelasan"
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help transition-colors"
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

/** Editable course settings as form values (strings for inputs). */
function courseSettingsValues(course: Course) {
  return {
    title: course.title,
    description: course.description ?? "",
    price: String(course.price),
    currency: course.currency,
    enrollmentMode: course.enrollmentMode ?? "INHERIT",
    progressionMode: course.progressionMode,
  };
}

function SettingsSection({
  course,
  coursesHref,
  organizationId,
  onWorkspaceChange,
}: {
  course: Course;
  coursesHref: string;
  organizationId: string;
  onWorkspaceChange: () => Promise<void>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const loaded = courseSettingsValues(course);
  const [title, setTitle] = useState(loaded.title);
  const [description, setDescription] = useState(loaded.description);
  const [price, setPrice] = useState(loaded.price);
  const [currency, setCurrency] = useState(loaded.currency);
  const selectedCurrency = courseCurrencies.find(
    (item) => item.code === currency,
  );
  const [enrollmentMode, setEnrollmentMode] = useState(loaded.enrollmentMode);
  const [progressionMode, setProgressionMode] = useState(
    loaded.progressionMode,
  );
  // The values the form was loaded from. When the record changes underneath
  // (another tab, the curriculum editor, a refetch), re-sync only the fields
  // that changed on the server so unrelated unsaved edits are kept.
  const [source, setSource] = useState(loaded);
  if (
    (Object.keys(loaded) as (keyof typeof loaded)[]).some(
      (key) => loaded[key] !== source[key],
    )
  ) {
    setSource(loaded);
    if (loaded.title !== source.title) setTitle(loaded.title);
    if (loaded.description !== source.description) {
      setDescription(loaded.description);
    }
    if (loaded.price !== source.price) setPrice(loaded.price);
    if (loaded.currency !== source.currency) setCurrency(loaded.currency);
    if (loaded.enrollmentMode !== source.enrollmentMode) {
      setEnrollmentMode(loaded.enrollmentMode);
    }
    if (loaded.progressionMode !== source.progressionMode) {
      setProgressionMode(loaded.progressionMode);
    }
  }
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateCourse = api.course.update.useMutation();
  const deleteCourse = api.course.delete.useMutation();

  async function refreshCourse() {
    await Promise.all([
      utils.course.get.invalidate({ courseId: course.id }),
      utils.course.list.invalidate({ organizationId }),
      onWorkspaceChange(),
    ]);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Send only the fields changed in this form (compared with the values it
    // was loaded from), so saving never reverts changes made elsewhere.
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    const nextCurrency = currency.trim().toUpperCase();
    const changes = {
      ...(nextTitle !== source.title ? { title: nextTitle } : {}),
      ...(nextDescription !== source.description.trim()
        ? { description: nextDescription || null }
        : {}),
      ...(Number(price) !== Number(source.price)
        ? { price: Number(price) }
        : {}),
      ...(nextCurrency !== source.currency ? { currency: nextCurrency } : {}),
      ...(enrollmentMode !== source.enrollmentMode
        ? {
            enrollmentMode:
              enrollmentMode === "INHERIT"
                ? null
                : (enrollmentMode as "OPEN" | "INVITE_ONLY"),
          }
        : {}),
      ...(progressionMode !== source.progressionMode
        ? { progressionMode }
        : {}),
    };
    if (Object.keys(changes).length === 0) {
      toast.info("Tidak ada perubahan untuk disimpan.");
      return;
    }
    try {
      await updateCourse.mutateAsync({ courseId: course.id, ...changes });
      await refreshCourse();
      toast.success("Pengaturan kursus disimpan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function removeCourse() {
    try {
      await deleteCourse.mutateAsync({ courseId: course.id });
      await utils.course.list.invalidate({ organizationId });
      toast.success("Kursus berhasil dihapus.");
      router.replace(coursesHref);
      router.refresh();
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-medium tracking-tight">
          Pengaturan
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Metadata, tipe kursus (public/private), dan lifecycle kursus.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Informasi kursus</CardTitle>
            <CardDescription>
              Informasi yang terlihat oleh pengelola dan siswa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="settings-title">Nama kursus</Label>
              <Input
                id="settings-title"
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
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
              <div className="space-y-2">
                <Label htmlFor={courseThumbnailFieldId}>Thumbnail kursus</Label>
                <CourseThumbnailField
                  id={courseThumbnailFieldId}
                  courseId={course.id}
                  thumbnailUrl={course.thumbnailUrl}
                  onChange={refreshCourse}
                />
              </div>
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
                <Select
                  value={selectedCurrency?.code}
                  onValueChange={(value) => {
                    if (value) setCurrency(value);
                  }}
                >
                  <SelectTrigger id="settings-currency" className="w-full">
                    <span className="flex flex-1 items-center gap-2 text-left">
                      {selectedCurrency ? (
                        <>
                          <span aria-hidden="true">
                            {selectedCurrency.flag}
                          </span>
                          <span>
                            {selectedCurrency.code} · {selectedCurrency.symbol}
                          </span>
                        </>
                      ) : (
                        currency || "Pilih currency"
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {courseCurrencies.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        <span aria-hidden="true">{item.flag}</span>
                        {item.code} · {item.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Aturan akses</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Label htmlFor="settings-enrollment">Tipe kursus</Label>
                  <FieldHelp content="Ikuti organisasi untuk memakai pengaturan default, atau timpa khusus kursus ini. Public bisa ditemukan dan diikuti siswa, private hanya untuk siswa yang diundang." />
                </div>
                <Select
                  value={enrollmentMode}
                  onValueChange={(value) => {
                    if (value) setEnrollmentMode(value);
                  }}
                >
                  <SelectTrigger
                    id="settings-enrollment"
                    aria-label="Tipe kursus"
                    className="w-44 shrink-0"
                  >
                    <span className="flex flex-1 text-left">
                      {
                        {
                          INHERIT: "Ikuti organisasi",
                          OPEN: "Kursus publik",
                          INVITE_ONLY: "Kursus privat",
                        }[enrollmentMode]
                      }
                    </span>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="INHERIT">Ikuti organisasi</SelectItem>
                    <SelectItem value="OPEN">Kursus publik</SelectItem>
                    <SelectItem value="INVITE_ONLY">Kursus privat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4 border-t py-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Label htmlFor="settings-progression">Alur belajar</Label>
                  <FieldHelp content="Terbuka membebaskan siswa membuka semua materi, bertahap mengharuskan menyelesaikan item sebelumnya secara berurutan." />
                </div>
                <Select
                  value={progressionMode}
                  onValueChange={(value) => {
                    if (value) setProgressionMode(value);
                  }}
                >
                  <SelectTrigger
                    id="settings-progression"
                    aria-label="Alur belajar"
                    className="w-44 shrink-0"
                  >
                    <span className="flex flex-1 text-left">
                      {progressionMode === "SEQUENTIAL"
                        ? "Bertahap"
                        : "Terbuka"}
                    </span>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="OPEN">Terbuka</SelectItem>
                    <SelectItem value="SEQUENTIAL">Bertahap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Button
            className="w-full"
            type="submit"
            disabled={
              updateCourse.isPending ||
              !title.trim() ||
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

      <Card className="border-destructive/20 ring-0">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Zona berbahaya</CardTitle>
          <CardDescription>
            Action lifecycle yang berdampak pada akses siswa.
          </CardDescription>
        </CardHeader>
        <div className="divide-border divide-y">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-medium">Hapus kursus</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Penghapusan dapat ditolak bila kursus masih memiliki data
                terkait.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Hapus kursus
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
              Action ini permanen. Batalkan publikasi kursus bila kursus mungkin
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
