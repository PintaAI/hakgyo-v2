"use client";

import { useState, type FormEvent } from "react";
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
  ClockIcon,
  CrownIcon,
  FilePenLineIcon,
  Layers3Icon,
  LayoutDashboardIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  TrophyIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import Link from "~/components/link";
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
import { CourseCoverEditor } from "~/components/course-cover-editor";
import { CreateClassDialog } from "~/components/create-class-dialog";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getErrorMessage } from "~/lib/error-message";
import { TabRail } from "~/components/ui/tab-rail";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type CourseView =
  "overview" | "cohorts" | "tryouts" | "reviews" | "access" | "settings";

type CourseWorkspaceData = RouterOutputs["course"]["getWorkspaceOverview"];
type Course = CourseWorkspaceData["course"];
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
  { value: "cohorts", label: "Kelas", icon: CalendarDaysIcon },
  { value: "reviews", label: "Hasil & review tugas", icon: ClipboardCheckIcon },
  { value: "tryouts", label: "Latihan & tryout", icon: TrophyIcon },
  { value: "access", label: "Akses", icon: ShieldCheckIcon },
  { value: "settings", label: "Pengaturan", icon: Settings2Icon },
] satisfies Array<{
  value: CourseView;
  label: string;
  icon: typeof LayoutDashboardIcon;
}>;

const validViews = new Set<CourseView>(views.map(({ value }) => value));

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
  // Learners and invites now live in each class; old links open the Kelas tab.
  const requestedView = (
    rawRequestedView === "learners" || rawRequestedView === "invites"
      ? "cohorts"
      : rawRequestedView
  ) as CourseView | null;
  const view =
    requestedView &&
    validViews.has(requestedView) &&
    availableViews.some(({ value }) => value === requestedView)
      ? requestedView
      : "overview";
  const viewCounts: Partial<Record<CourseView, number>> = {
    cohorts: overview?.stats.cohortCount,
  };
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
      enabled: canViewCohorts && view === "cohorts",
    },
  );
  const cohortItems = cohorts.data?.pages.flatMap((page) => page.items);
  const access = api.course.getAccess.useQuery(
    { courseId: course.id },
    { enabled: canManageAccess && view === "access" },
  );

  const updateCourse = api.course.update.useMutation();

  async function refreshWorkspace() {
    await utils.course.getWorkspaceOverview.invalidate(workspaceInput);
  }

  async function refreshThumbnail() {
    await Promise.all([
      utils.course.get.invalidate({ courseId: course.id }),
      utils.course.list.invalidate({ organizationId }),
      refreshWorkspace(),
    ]);
    router.refresh();
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
          ? "Kurikulum dipublikasikan."
          : "Publikasi kurikulum dibatalkan. Semua item disembunyikan dari murid.",
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
        Semua kurikulum
      </Link>

      <PageHeader
        eyebrow={`Kurikulum · ${courseStatus[course.status].label}`}
        title={course.title}
        description={
          course.description ??
          "Belum ada deskripsi. Tambahkan konteks kurikulum melalui Pengaturan."
        }
        media={
          canManageCourse ? (
            <CourseCoverEditor
              courseId={course.id}
              title={course.title}
              thumbnailUrl={course.thumbnailUrl}
              onChange={refreshThumbnail}
            />
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
                Edit materi kurikulum
              </Link>
            ) : (
              <Link
                href={`/learn/${course.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Layers3Icon data-icon="inline-start" />
                Lihat materi kurikulum
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
        <TabRail activeKey={view}>
          <TabsList
            variant="line"
            aria-label="Pengelolaan kurikulum"
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
        </TabRail>

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
            hasKelasMandiri={Boolean(overview?.kelasMandiriId)}
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
              Akses kurikulum bersama
            </CardTitle>
            <CardDescription>
              Anda memiliki akses melalui assignment kurikulum atau cohort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManageContent ? (
              <Link
                href={`${root}/kurikulum`}
                className={buttonVariants({ variant: "outline" })}
              >
                <FilePenLineIcon data-icon="inline-start" />
                Edit materi kurikulum
              </Link>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Curriculum tersedia sebagai referensi mengajar. Minta
                  kurikulum manager menambahkan Anda sebagai editor bila perlu
                  mengubahnya.
                </p>
                <Link
                  href={`/learn/${course.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Layers3Icon data-icon="inline-start" />
                  Lihat materi kurikulum
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pemilik kurikulum</CardTitle>
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
  const curriculumHref = canManageContent
    ? `${root}/kurikulum`
    : `/learn/${course.id}`;

  return (
    <div className="space-y-4">
      <StatStrip
        label="Ringkasan kurikulum"
        items={[
          { label: "Bab", value: stats.moduleCount },
          { label: "Kelas", value: stats.cohortCount },
          { label: "Murid aktif", value: stats.activeLearnerCount },
          { label: "Undangan aktif", value: stats.activeInviteCount },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle className="text-lg font-medium">
                Materi kurikulum
              </CardTitle>
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
                title="Materi kurikulum masih kosong"
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
                return (
                  <li key={module.id}>
                    <Link
                      href={curriculumHref}
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
              {stats.moduleCount > modules.length ? (
                <li>
                  <Link
                    href={curriculumHref}
                    className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors"
                  >
                    Lihat {stats.moduleCount - modules.length} bab selengkapnya
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </li>
              ) : null}
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
                  label: "Buat kelas dan undang murid",
                },
                {
                  view: "settings" as const,
                  icon: Settings2Icon,
                  label: "Atur akses kurikulum",
                },
              ].map(({ view, icon: Icon, label }) => (
                <button
                  type="button"
                  key={view}
                  onClick={() => onNavigate(view)}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
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
              <CardTitle className="text-sm">Pemilik kurikulum</CardTitle>
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
  hasKelasMandiri,
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
  hasKelasMandiri: boolean;
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
  const [open, setOpen] = useState(false);
  const hasActiveFilters = Boolean(appliedSearch || statusFilter !== "ALL");

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Kelas
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Murid bergabung lewat kelas: kelas berjadwal, atau Kelas Mandiri
            untuk belajar kapan saja.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Buat kelas
          </Button>
        ) : null}
      </div>

      <div className="sm:bg-card flex flex-col gap-2 sm:gap-3 sm:rounded-xl sm:border sm:p-3 sm:shadow-xs lg:flex-row lg:items-center">
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
              aria-label="Cari kelas"
              className="pl-8"
              placeholder="Cari nama kelas"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            <SearchIcon />
            Cari
          </Button>
        </form>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:flex">
          <Select
            value={statusFilter}
            items={{ ALL: "Semua status", ...cohortStatus }}
            onValueChange={(value) => {
              if (value) onStatusFilterChange(value);
            }}
          >
            <SelectTrigger
              aria-label="Filter status"
              className="w-full sm:w-40 max-sm:[&>svg:first-child]:hidden"
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
              aria-label="Urutkan kelas"
              className="w-full sm:w-44 max-sm:[&>svg:first-child]:hidden"
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
              className="sm:w-36 max-sm:[&>[data-slot=select-value]]:sr-only"
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
                hasActiveFilters ? "Kelas tidak ditemukan" : "Belum ada kelas"
              }
              description={
                hasActiveFilters
                  ? "Coba kata kunci atau status yang berbeda."
                  : "Murid hanya bisa belajar lewat kelas. Buat kelas berjadwal dengan pengajar dan pertemuan, atau Kelas Mandiri untuk belajar kapan saja."
              }
              action={
                canCreate && !hasActiveFilters ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setOpen(true)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Buat kelas pertama
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
                        {cohort.defaultForCourseId ? (
                          <Badge variant="secondary">Kelas Mandiri</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {cohortStatus[cohort.status]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                        {cohort.description ?? "Belum ada deskripsi kelas."}
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
              Muat kelas berikutnya
            </Button>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <CreateClassDialog
          courseId={courseId}
          open={open}
          onOpenChange={setOpen}
          hasKelasMandiri={hasKelasMandiri}
          title={data?.length === 0 ? "Buat kelas pertama" : "Buat kelas"}
          onCreated={async () => {
            await onWorkspaceChange();
            setOpen(false);
          }}
        />
      ) : null}
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
      toast.success("Kurikulum manager utama diperbarui.");
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
          Akses kurikulum
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tentukan siapa yang mengelola kurikulum ini dan apa yang dapat mereka
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
                Editor dapat menyusun bab dan materi, tanpa akses ke murid,
                undangan, atau pengaturan kurikulum.
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
                    Mengelola materi kurikulum, murid, kelas, undangan,
                    pengaturan, dan status kurikulum.
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
                    Hanya menyusun bab, materi, dan tugas di materi kurikulum.
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
                  aria-label="Manager kurikulum baru"
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
            <AlertDialogTitle>Ganti manager kurikulum?</AlertDialogTitle>
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
      toast.success("Pengaturan kurikulum disimpan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  async function removeCourse() {
    try {
      await deleteCourse.mutateAsync({ courseId: course.id });
      await utils.course.list.invalidate({ organizationId });
      toast.success("Kurikulum berhasil dihapus.");
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
          Metadata, tipe kurikulum (public/private), dan lifecycle kurikulum.
        </p>
      </div>

      <form onSubmit={submit}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Informasi kurikulum</CardTitle>
            <CardDescription>
              Informasi yang terlihat oleh pengelola dan murid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="settings-title">Nama kurikulum</Label>
              <Input
                id="settings-title"
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
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
          <CardContent className="border-t pt-5">
            <h3 className="font-heading font-medium">Aturan akses</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Siapa yang bisa mengikuti kurikulum dan bagaimana murid membuka
              materinya.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="settings-enrollment">Tipe kurikulum</Label>
                  <FieldHelp content="Ikuti organisasi untuk memakai pengaturan default, atau timpa khusus kurikulum ini. Public bisa ditemukan dan diikuti murid, private hanya untuk murid yang diundang." />
                </div>
                <Select
                  value={enrollmentMode}
                  onValueChange={(value) => {
                    if (value) setEnrollmentMode(value);
                  }}
                >
                  <SelectTrigger
                    id="settings-enrollment"
                    aria-label="Tipe kurikulum"
                    className="w-full"
                  >
                    <span className="flex flex-1 text-left">
                      {
                        {
                          INHERIT: "Ikuti organisasi",
                          OPEN: "Kurikulum publik",
                          INVITE_ONLY: "Kurikulum privat",
                        }[enrollmentMode]
                      }
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INHERIT">Ikuti organisasi</SelectItem>
                    <SelectItem value="OPEN">Kurikulum publik</SelectItem>
                    <SelectItem value="INVITE_ONLY">
                      Kurikulum privat
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="settings-progression">Alur belajar</Label>
                  <FieldHelp content="Terbuka membebaskan murid membuka semua materi, bertahap mengharuskan menyelesaikan item sebelumnya secara berurutan." />
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
                    className="w-full"
                  >
                    <span className="flex flex-1 text-left">
                      {progressionMode === "SEQUENTIAL"
                        ? "Bertahap"
                        : "Terbuka"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Terbuka</SelectItem>
                    <SelectItem value="SEQUENTIAL">Bertahap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button
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
          </CardFooter>
        </Card>
      </form>

      <Card className="border-destructive/20 ring-0">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Zona berbahaya</CardTitle>
          <CardDescription>
            Action lifecycle yang berdampak pada akses murid.
          </CardDescription>
        </CardHeader>
        <div className="divide-border divide-y">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="text-sm font-medium">Hapus kurikulum</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Penghapusan dapat ditolak bila kurikulum masih memiliki data
                terkait.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Hapus kurikulum
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
              Action ini permanen. Batalkan publikasi kurikulum bila kurikulum
              mungkin diperlukan kembali.
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
