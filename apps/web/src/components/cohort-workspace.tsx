"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  UserPlusIcon,
  UserRoundCogIcon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CohortInvites } from "~/components/cohort-invites";
import {
  CohortPayments,
  usePendingPaymentReviews,
} from "~/components/cohort-payments";
import { AssessmentEventManager } from "~/components/assessment-event-manager";
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
import { EmptyState } from "~/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ReviewQueue } from "~/components/review-queue";
import {
  Card,
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
import { DateTimePicker } from "~/components/ui/datetime-picker";
import { Checkbox } from "~/components/ui/checkbox";
import { useDialogs } from "~/components/ui/use-dialogs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
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
import { cn } from "~/lib/utils";
import {
  formatZonedDateTimeInput,
  parseZonedDateTimeInput,
} from "~/lib/zoned-date-time";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { formatRupiah } from "~/lib/payments/payment";
import { api, type RouterOutputs } from "~/trpc/react";

type Cohort = RouterOutputs["cohort"]["get"];
type CohortEnrollment =
  RouterOutputs["enrollment"]["listCohortEnrollments"]["items"][number];
type Meeting = RouterOutputs["cohort"]["listMeetings"]["items"][number];
type CohortView =
  | "overview"
  | "learners"
  | "payments"
  | "staff"
  | "meetings"
  | "assessments"
  | "reviews"
  | "settings";

const views = [
  { value: "overview", label: "Ringkasan", icon: LayoutDashboardIcon },
  { value: "learners", label: "Siswa", icon: UsersIcon },
  { value: "payments", label: "Pembayaran", icon: WalletIcon },
  { value: "staff", label: "Staff", icon: UserRoundCogIcon },
  { value: "meetings", label: "Pertemuan", icon: VideoIcon },
  { value: "assessments", label: "Event tugas", icon: ClipboardListIcon },
  { value: "reviews", label: "Hasil & review", icon: ClipboardCheckIcon },
  { value: "settings", label: "Pengaturan", icon: Settings2Icon },
] satisfies Array<{ value: CohortView; label: string; icon: LucideIcon }>;

const validViews = new Set<CohortView>(views.map(({ value }) => value));
const statusLabels = {
  // Cohort DRAFT: being set up, not visible to learners yet.
  DRAFT: "Persiapan",
  OPEN: "Dibuka",
  IN_PROGRESS: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;
const enrollmentLabels = {
  PENDING: "Menunggu",
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatMeetingDateTime(value: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(value);
  } catch {
    return dateTimeFormatter.format(value);
  }
}

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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function LoadingRows({ error }: { error?: { message: string } | null }) {
  if (error) {
    return (
      <div className="text-destructive bg-destructive/10 rounded-md p-6 text-center text-sm">
        {error.message}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-foreground/10 flex flex-col border-l pl-4 first:border-l-0 first:pl-0 sm:pl-6">
      <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-xs">
        {label}
      </span>
      <span className="font-heading mt-1 text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">
        {value}
      </span>
    </div>
  );
}

export function CohortWorkspace({
  initialCohort,
  organizationSlug,
  canManagePaymentSettings,
}: {
  initialCohort: Cohort;
  organizationSlug: string;
  canManagePaymentSettings: boolean;
}) {
  const searchParams = useSearchParams();
  const cohortQuery = api.cohort.get.useQuery(
    { cohortId: initialCohort.id },
    { initialData: initialCohort },
  );
  const cohort = cohortQuery.data;
  const availableViews = views.filter(({ value }) => {
    if (value === "learners")
      return cohort.access.manageLearners || cohort.access.manageInvites;
    if (value === "payments") return cohort.access.managePayments;
    if (value === "assessments") return cohort.access.reviewAssessments;
    if (value === "reviews") return cohort.access.reviewAssessments;
    if (value === "settings") return cohort.access.update;
    return true;
  });
  const rawRequestedView = searchParams.get("view");
  // Legacy `?view=invites` now lives inside the Siswa tab.
  const requestedView = (
    rawRequestedView === "invites" ? "learners" : rawRequestedView
  ) as CohortView | null;
  const view =
    requestedView &&
    validViews.has(requestedView) &&
    availableViews.some(({ value }) => value === requestedView)
      ? requestedView
      : "overview";
  const root = `/workspace/${organizationSlug}/courses/${cohort.courseId}/cohorts/${cohort.id}`;
  const courseRoot = `/workspace/${organizationSlug}/courses/${cohort.courseId}`;
  const [learnerSearch, setLearnerSearch] = useState("");
  const debouncedLearnerSearch = useDebouncedValue(
    learnerSearch.trim().toLowerCase(),
  );
  const learners = api.enrollment.listCohortEnrollments.useInfiniteQuery(
    {
      cohortId: cohort.id,
      search: debouncedLearnerSearch || undefined,
      includeTotal: true,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled:
        cohort.access.manageLearners &&
        (view === "overview" || view === "learners"),
    },
  );
  const meetings = api.cohort.listMeetings.useInfiniteQuery(
    { cohortId: cohort.id, includeTotal: true },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: view === "overview" || view === "meetings",
    },
  );
  const learnerItems = learners.data?.pages.flatMap((page) => page.items);
  const meetingItems = meetings.data?.pages.flatMap((page) => page.items);
  const learnerActiveTotal = learners.data?.pages[0]?.activeTotal;
  const meetingTotal = meetings.data?.pages[0]?.total;
  const paymentsToReview = usePendingPaymentReviews(
    cohort.id,
    cohort.access.managePayments,
  );
  const viewCounts: Partial<Record<CohortView, number>> = {
    learners: learnerActiveTotal,
    payments: paymentsToReview,
    staff: cohort.staff.length,
    meetings: meetingTotal,
  };

  function navigate(nextView: CohortView) {
    if (nextView === view) return;
    window.history.pushState(
      null,
      "",
      nextView === "overview" ? root : `${root}?view=${nextView}`,
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href={`${courseRoot}?view=cohorts`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Kembali ke {cohort.course.title}
      </Link>

      <header className="border-border bg-background text-foreground relative overflow-hidden rounded-lg border px-5 py-6 sm:px-7 sm:py-8">
        {cohort.course.thumbnailUrl ? (
          <Image
            src={cohort.course.thumbnailUrl}
            alt=""
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, 1152px"
            className="object-cover"
          />
        ) : null}
        <div className="bg-background/85 pointer-events-none absolute inset-0 backdrop-blur-[2px]" />
        <div className="border-border pointer-events-none absolute top-0 right-0 size-48 translate-x-14 -translate-y-16 rounded-full border" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                {cohort.course.title} · Group belajar
              </span>
              <Badge className="border-border bg-muted text-muted-foreground">
                {statusLabels[cohort.status]}
              </Badge>
            </div>
            <h1 className="text-foreground font-heading mt-4 text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
              {cohort.name}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
              {cohort.description ??
                "Kelola peserta didik, pengajar, dan jadwal Group belajar dari workspace ini."}
            </p>
          </div>
        </div>
      </header>

      <Tabs
        value={view}
        onValueChange={(nextView) => navigate(nextView as CohortView)}
        className="gap-8"
      >
        <div className="max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList
            variant="line"
            aria-label="Pengelolaan Group belajar"
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
          <Overview
            cohort={cohort}
            learners={learnerItems}
            learnersActiveTotal={learnerActiveTotal}
            learnersPending={learners.isPending}
            meetings={meetingItems}
            meetingsPending={meetings.isPending}
            canManageMeetings={cohort.access.manageMeetings}
            canManagePayments={cohort.access.managePayments}
            paymentsToReview={paymentsToReview}
            onNavigate={navigate}
          />
        </TabsContent>
        <TabsContent value="payments">
          {cohort.access.managePayments ? (
            <CohortPayments
              cohortId={cohort.id}
              organizationSlug={organizationSlug}
              canManageSettings={canManagePaymentSettings}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="learners">
          <div className="space-y-10">
            {cohort.access.manageLearners ? (
              <Learners
                cohortId={cohort.id}
                data={learnerItems}
                error={learners.error}
                pending={learners.isPending}
                search={learnerSearch}
                onSearchChange={setLearnerSearch}
                hasMore={learners.hasNextPage}
                isLoadingMore={learners.isFetchingNextPage}
                onLoadMore={() => void learners.fetchNextPage()}
              />
            ) : null}
            {cohort.access.manageInvites ? (
              <div className="border-t pt-8">
                <CohortInvites
                  courseId={cohort.courseId}
                  cohortId={cohort.id}
                  cohortName={cohort.name}
                  cohortStatus={cohort.status}
                  cohortEndsAt={cohort.endsAt}
                />
              </div>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="staff">
          <Staff canManage={cohort.access.manageStaff} cohort={cohort} />
        </TabsContent>
        <TabsContent value="meetings">
          <Meetings
            cohortId={cohort.id}
            data={meetingItems}
            error={meetings.error}
            organizationSlug={organizationSlug}
            canManage={cohort.access.manageMeetings}
            pending={meetings.isPending}
            hasMore={meetings.hasNextPage}
            isLoadingMore={meetings.isFetchingNextPage}
            onLoadMore={() => void meetings.fetchNextPage()}
          />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewQueue
            organizationId={cohort.organizationId}
            courseId={cohort.courseId}
            cohortId={cohort.id}
            cohortName={cohort.name}
          />
        </TabsContent>
        <TabsContent value="assessments">
          <AssessmentEventManager
            courseId={cohort.courseId}
            cohortId={cohort.id}
            cohortName={cohort.name}
          />
        </TabsContent>
        <TabsContent value="settings">
          <Settings
            canDelete={cohort.access.delete}
            cohort={cohort}
            courseRoot={courseRoot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Overview({
  cohort,
  learners,
  learnersActiveTotal,
  learnersPending,
  meetings,
  meetingsPending,
  canManageMeetings,
  canManagePayments,
  paymentsToReview,
  onNavigate,
}: {
  cohort: Cohort;
  learners?: RouterOutputs["enrollment"]["listCohortEnrollments"]["items"];
  learnersActiveTotal?: number;
  learnersPending: boolean;
  meetings?: RouterOutputs["cohort"]["listMeetings"]["items"];
  meetingsPending: boolean;
  canManageMeetings: boolean;
  canManagePayments: boolean;
  paymentsToReview?: number;
  onNavigate: (view: CohortView) => void;
}) {
  const price = cohort.price ?? cohort.course.price;
  const active =
    learnersActiveTotal ??
    learners?.filter(({ status }) => status === "ACTIVE").length ??
    0;
  const upcoming =
    meetings?.filter(({ startsAt }) => startsAt > new Date()).length ?? 0;
  const nextMeeting = meetings?.find(
    ({ startsAt, status, joinUrl }) =>
      joinUrl && (status === "STARTED" || startsAt > new Date()),
  );
  const occupancy = cohort.capacity
    ? `${Math.round((active / cohort.capacity) * 100)}%`
    : "–";

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-y-6 border-y py-5 sm:grid-cols-4">
        <Stat label="Siswa aktif" value={learnersPending ? "–" : active} />
        <Stat label="Kapasitas" value={cohort.capacity ?? "∞"} />
        <Stat label="Keterisian" value={learnersPending ? "–" : occupancy} />
        <Stat label="Akan datang" value={meetingsPending ? "–" : upcoming} />
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card className="gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-heading text-lg">
              Detail Group belajar
            </CardTitle>
            <CardDescription>
              Periode dan aturan Group belajar saat ini.
            </CardDescription>
          </CardHeader>
          <dl className="divide-border divide-y">
            {[
              [
                "Mulai",
                cohort.startsAt
                  ? dateFormatter.format(cohort.startsAt)
                  : "Belum diatur",
              ],
              [
                "Selesai",
                cohort.endsAt
                  ? dateFormatter.format(cohort.endsAt)
                  : "Belum diatur",
              ],
              [
                "Enrollment",
                cohort.enrollmentMode === "OPEN"
                  ? "Open"
                  : cohort.enrollmentMode === "INVITE_ONLY"
                    ? "Invite only"
                    : "Ikuti course",
              ],
              [
                "Harga",
                `${price > 0 ? formatRupiah(price) : "Gratis"}${cohort.price === null ? " (ikuti course)" : ""}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {cohort.whatsappGroupUrl ? (
            <div className="border-t p-4">
              <a
                href={cohort.whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                Buka grup WhatsApp
                <ExternalLinkIcon data-icon="inline-end" />
              </a>
            </div>
          ) : null}
        </Card>
        <Card className="gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-heading text-lg">Operasi</CardTitle>
            <CardDescription>
              Kelola bagian Group belajar tanpa berpindah halaman.
            </CardDescription>
          </CardHeader>
          <div className="divide-border divide-y">
            {[
              {
                target: "learners" as const,
                icon: UsersIcon,
                label: "Kelola peserta didik dan status",
              },
              ...(canManagePayments
                ? [
                    {
                      target: "payments" as const,
                      icon: WalletIcon,
                      label: paymentsToReview
                        ? `Verifikasi ${paymentsToReview} pembayaran`
                        : "Kelola pembayaran siswa",
                    },
                  ]
                : []),
              {
                target: "staff" as const,
                icon: UserRoundCogIcon,
                label: "Atur pengajar dan moderator",
              },
              {
                target: "meetings" as const,
                icon: VideoIcon,
                label: "Jadwalkan meeting",
              },
            ].map(({ target, icon: Icon, label }) => (
              <button
                key={target}
                type="button"
                onClick={() => onNavigate(target)}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
              >
                <Icon className="text-muted-foreground size-4" />
                <span className="flex-1">{label}</span>
                <ArrowRightIcon className="text-muted-foreground size-4" />
              </button>
            ))}
          </div>
        </Card>
      </div>
      <Card className="gap-0 rounded-lg py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="font-heading text-lg">Aksi cepat</CardTitle>
          <CardDescription>
            Akses tindakan yang paling sering digunakan untuk Group belajar ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {nextMeeting ? (
            <a
              href={nextMeeting.joinUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants()}
            >
              <VideoIcon />
              Gabung meeting
              <ExternalLinkIcon />
            </a>
          ) : null}
          {canManageMeetings ? (
            <Button variant="outline" onClick={() => onNavigate("meetings")}>
              <PlusIcon />
              Buat meeting
            </Button>
          ) : null}
          {cohort.whatsappGroupUrl ? (
            <a
              href={cohort.whatsappGroupUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              Buka grup WhatsApp
              <ExternalLinkIcon />
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Learners({
  cohortId,
  data,
  error,
  pending,
  search,
  onSearchChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  cohortId: string;
  data?: RouterOutputs["enrollment"]["listCohortEnrollments"]["items"];
  error: { message: string } | null;
  pending: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<CohortEnrollment["status"]>("ACTIVE");
  const mutation = api.enrollment.setCohortEnrollment.useMutation();
  const removeEnrollment = api.enrollment.removeCohortEnrollment.useMutation();
  const [removing, setRemoving] = useState<CohortEnrollment | null>(null);
  const visible = data;

  async function save(email: string, status: CohortEnrollment["status"]) {
    try {
      await mutation.mutateAsync({ cohortId, email, status });
      await utils.enrollment.listCohortEnrollments.invalidate({ cohortId });
      toast.success("Status siswa diperbarui.");
      return true;
    } catch (cause) {
      toast.error(getErrorMessage(cause));
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await save(email, status)) {
      setOpen(false);
      setEmail("");
      setStatus("ACTIVE");
    }
  }

  async function removeLearner(enrollment: CohortEnrollment) {
    try {
      await removeEnrollment.mutateAsync({
        cohortId,
        userId: enrollment.user.id,
      });
      await Promise.all([
        utils.enrollment.listCohortEnrollments.invalidate({ cohortId }),
        utils.cohort.get.invalidate({ cohortId }),
      ]);
      setRemoving(null);
      toast.success(
        `Siswa ${enrollment.user.name} dihapus dari Group belajar.`,
      );
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title="Siswa"
        description="Kelola peserta didik yang tergabung langsung dalam Group belajar."
        action={
          <Button onClick={() => setOpen(true)}>
            <UserPlusIcon data-icon="inline-start" /> Tambah siswa
          </Button>
        }
      />
      {pending || error ? <LoadingRows error={error} /> : null}
      {!pending && !error && data?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={UsersIcon}
              title="Belum ada siswa"
              description="Tambahkan akun Hakgyo menggunakan alamat email."
              action={
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setOpen(true)}
                >
                  Tambah siswa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
      {!pending && !error && data && data.length > 0 ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <CardTitle>Peserta Group belajar</CardTitle>
              <CardDescription>{data.length} siswa terdaftar</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
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
                  <TableHead>Source</TableHead>
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
                    <TableCell className="pl-4">
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
                          <span className="text-muted-foreground block text-xs">
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
                        disabled={
                          mutation.isPending || removeEnrollment.isPending
                        }
                        onValueChange={(value) => {
                          if (value) void save(enrollment.user.email, value);
                        }}
                      >
                        <SelectTrigger
                          aria-label={`Status ${enrollment.user.name}`}
                        >
                          <span className="flex flex-1 text-left">
                            {enrollmentLabels[enrollment.status]}
                          </span>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {Object.entries(enrollmentLabels).map(
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
                        aria-label={`Hapus ${enrollment.user.name} dari Group belajar`}
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
                description="Coba nama atau email yang berbeda."
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Tambah siswa</DialogTitle>
              <DialogDescription>
                Email harus sudah terdaftar sebagai akun Hakgyo.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cohort-learner-email">Email</Label>
                <Input
                  id="cohort-learner-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cohort-learner-status">Status awal</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value) setStatus(value);
                  }}
                >
                  <SelectTrigger id="cohort-learner-status" className="w-full">
                    <span className="flex flex-1 text-left">
                      {enrollmentLabels[status]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(enrollmentLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                disabled={!email.trim() || mutation.isPending}
              >
                {mutation.isPending ? (
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
              Hapus {removing?.user.name} dari Group belajar?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Siswa akan dikeluarkan dari Group belajar ini dan kehilangan akses
              course yang berasal dari group ini. Akses lewat Group belajar lain
              atau belajar mandiri pada course yang sama tetap berlaku.
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

function Staff({ canManage, cohort }: { canManage: boolean; cohort: Cohort }) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"INSTRUCTOR" | "ASSISTANT">("INSTRUCTOR");
  const add = api.cohort.addStaff.useMutation();
  const update = api.cohort.updateStaff.useMutation();
  const remove = api.cohort.removeStaff.useMutation();

  async function refresh() {
    await utils.cohort.get.invalidate({ cohortId: cohort.id });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await add.mutateAsync({
        cohortId: cohort.id,
        email,
        role,
      });
      await refresh();
      setOpen(false);
      setEmail("");
      toast.success("Staff ditambahkan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  async function changeRole(staffId: string, role: "INSTRUCTOR" | "ASSISTANT") {
    try {
      await update.mutateAsync({ cohortId: cohort.id, staffId, role });
      await refresh();
      toast.success("Role staff diperbarui.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  async function removeStaff(staffId: string) {
    try {
      await remove.mutateAsync({ cohortId: cohort.id, staffId });
      await refresh();
      toast.success("Staff dihapus dari Group belajar.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  return (
    <section className="space-y-5">
      <SectionHeading
        title="Staff"
        description="Instructor mengelola aktivitas kelas. Assistant membantu siswa dan melihat jadwal."
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <UserPlusIcon />
              Tambah staff
            </Button>
          ) : undefined
        }
      />
      {cohort.staff.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={UserRoundCogIcon}
              title="Belum ada staff"
              description="Tambahkan organization member menggunakan email."
              action={
                canManage ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setOpen(true)}
                  >
                    Tambah staff
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cohort.staff.map((staff) => (
            <Card key={staff.id} className="rounded-lg">
              <CardContent className="flex items-center gap-3">
                <span className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-full font-semibold">
                  {staff.organizationMember.user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {staff.organizationMember.user.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {staff.organizationMember.user.email}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {canManage ? (
                    <Select
                      value={staff.role}
                      onValueChange={(value) => {
                        if (value) void changeRole(staff.id, value);
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Role ${staff.organizationMember.user.name}`}
                        className="h-8 text-xs"
                      >
                        <span className="flex flex-1 text-left">
                          {staff.role === "INSTRUCTOR"
                            ? "Instructor"
                            : "Assistant"}
                        </span>
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                        <SelectItem value="ASSISTANT">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">
                      {staff.role === "INSTRUCTOR" ? "Instructor" : "Assistant"}
                    </Badge>
                  )}
                </div>
                {canManage ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Hapus staff"
                    onClick={() => removeStaff(staff.id)}
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {canManage ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Tambah staff</DialogTitle>
                <DialogDescription>
                  Email harus merupakan member organization ini.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => {
                      if (value) setRole(value);
                    }}
                  >
                    <SelectTrigger id="staff-role" className="w-full">
                      <span className="flex flex-1 text-left">
                        {role === "INSTRUCTOR" ? "Instructor" : "Assistant"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="ASSISTANT">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Instructor dapat mengelola meeting, invite, dan review.
                    Assistant hanya mengelola siswa dan melihat jadwal.
                  </p>
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
                <Button type="submit" disabled={!email.trim() || add.isPending}>
                  {add.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <UserPlusIcon />
                  )}
                  Tambah staff
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

function Meetings({
  canManage,
  cohortId,
  data,
  error,
  organizationSlug,
  pending,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  canManage: boolean;
  cohortId: string;
  data?: RouterOutputs["cohort"]["listMeetings"]["items"];
  error: { message: string } | null;
  organizationSlug: string;
  pending: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const integration = api.cohort.getMeetingIntegrationStatus.useQuery(
    { cohortId },
    { enabled: canManage },
  );
  const remove = api.cohort.deleteMeeting.useMutation();
  const { prompt, dialogs } = useDialogs();

  function openMeetingForm() {
    setEditing(null);
    setOpen(true);
  }

  function renderMeetingAction(size: "default" | "sm" = "default") {
    if (!canManage) return null;
    if (integration.isPending) {
      return (
        <Button size={size} variant="outline" disabled>
          <LoaderCircleIcon className="animate-spin" />
          Memeriksa integrasi
        </Button>
      );
    }
    if (integration.error) {
      return (
        <Button
          size={size}
          variant="outline"
          onClick={() => integration.refetch()}
        >
          Coba cek integrasi lagi
        </Button>
      );
    }
    if (integration.data?.isConnected) {
      return (
        <Button size={size} onClick={openMeetingForm}>
          <PlusIcon />
          Jadwalkan meeting
        </Button>
      );
    }
    if (integration.data?.canConfigure) {
      return (
        <Link
          href={`/workspace/${organizationSlug}/settings/integrations`}
          className={buttonVariants({ size, variant: "outline" })}
        >
          <Settings2Icon />
          Buka pengaturan integrasi
        </Link>
      );
    }
    return (
      <Button size={size} variant="outline" disabled>
        {integration.data?.provider === "GOOGLE_MEET" ? "Google Meet" : "Zoom"}{" "}
        belum terhubung
      </Button>
    );
  }

  async function deleteMeeting(meeting: Meeting) {
    const values = await prompt({
      title: "Hapus meeting?",
      description: `"${meeting.title}" akan dihapus dari jadwal dan dari ${meeting.provider === "GOOGLE_MEET" ? "Google Meet" : "Zoom"}.`,
      confirmLabel: "Hapus meeting",
      destructive: true,
      fields: [
        {
          name: "notify",
          label: "Beri tahu peserta bahwa meeting dibatalkan",
          type: "checkbox",
        },
      ],
    });
    if (!values) return;
    try {
      await remove.mutateAsync({
        cohortId,
        meetingId: meeting.id,
        notify: values.notify === "true",
      });
      await utils.cohort.listMeetings.invalidate({ cohortId });
      toast.success("Meeting dihapus.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  return (
    <section className="space-y-5">
      <SectionHeading
        title="Meetings"
        description="Jadwal live session melalui Zoom atau Google Meet."
        action={renderMeetingAction()}
      />
      {pending || error ? <LoadingRows error={error} /> : null}
      {!pending && !error && data?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              size="sm"
              icon={VideoIcon}
              title="Belum ada meeting"
              description={
                !canManage
                  ? "Belum ada live session yang dijadwalkan untuk Group belajar ini."
                  : integration.data?.isConnected
                    ? "Jadwalkan live session pertama untuk Group belajar ini."
                    : integration.data?.canConfigure
                      ? `Hubungkan ${integration.data?.provider === "GOOGLE_MEET" ? "Google Meet" : "Zoom"} di pengaturan integrasi sebelum menjadwalkan live session.`
                      : "Layanan meeting pilihan organisasi belum terhubung. Hubungi owner atau admin organisasi."
              }
              action={renderMeetingAction("sm")}
            />
          </CardContent>
        </Card>
      ) : null}
      {!pending && !error && data && data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((meeting) => (
            <Card key={meeting.id} className="rounded-lg">
              <CardHeader>
                <div>
                  <Badge variant="outline">{meeting.status}</Badge>
                  <Badge variant="secondary" className="ml-2">
                    {meeting.provider === "GOOGLE_MEET"
                      ? "Google Meet"
                      : "Zoom"}
                  </Badge>
                  <CardTitle className="mt-3 text-base">
                    {meeting.title}
                  </CardTitle>
                  <CardDescription>
                    {formatMeetingDateTime(meeting.startsAt, meeting.timezone)}{" "}
                    · {meeting.durationMinutes} menit · {meeting.timezone}
                  </CardDescription>
                  {meeting.module ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Modul: {meeting.module.title}
                    </p>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2 min-h-8 text-xs">
                  {meeting.agenda ?? "Tidak ada agenda."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {meeting.joinUrl ? (
                    <a
                      href={meeting.joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ size: "sm" })}
                    >
                      Gabung{" "}
                      {meeting.provider === "GOOGLE_MEET"
                        ? "Google Meet"
                        : "Zoom"}
                      <ExternalLinkIcon />
                    </a>
                  ) : meeting.provider === "GOOGLE_MEET" ? (
                    <span className="text-muted-foreground text-xs">
                      Link Meet sedang dibuat. Muat ulang sebentar lagi.
                    </span>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(meeting);
                          setOpen(true);
                        }}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => deleteMeeting(meeting)}
                      >
                        <Trash2Icon />
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="md:col-span-2"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Muat meeting berikutnya
            </Button>
          ) : null}
        </div>
      ) : null}
      {canManage && open ? (
        <MeetingForm
          key={editing?.id ?? "new"}
          cohortId={cohortId}
          meeting={editing}
          organizationProvider={integration.data?.provider ?? "ZOOM"}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
      {dialogs}
    </section>
  );
}

function MeetingForm({
  cohortId,
  meeting,
  organizationProvider,
  open,
  onOpenChange,
}: {
  cohortId: string;
  meeting: Meeting | null;
  organizationProvider: "ZOOM" | "GOOGLE_MEET";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const initialTimezone =
    meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [startsAt, setStartsAt] = useState(
    meeting ? formatZonedDateTimeInput(meeting.startsAt, initialTimezone) : "",
  );
  const [duration, setDuration] = useState(
    String(meeting?.durationMinutes ?? 60),
  );
  const [timezone, setTimezone] = useState(initialTimezone);
  const [moduleId, setModuleId] = useState(meeting?.moduleId ?? "none");
  const [notifyLearners, setNotifyLearners] = useState(true);
  const modules = api.cohort.listMeetingModules.useQuery({ cohortId });
  const timezoneValid = isValidTimeZone(timezone);
  const create = api.cohort.createMeeting.useMutation();
  const update = api.cohort.updateMeeting.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const input = {
        cohortId,
        moduleId: moduleId === "none" ? null : moduleId,
        title: title.trim(),
        agenda: agenda.trim() || null,
        startsAt: parseZonedDateTimeInput(startsAt, timezone),
        durationMinutes: Number(duration),
        timezone,
        notify: notifyLearners,
      };
      if (meeting)
        await update.mutateAsync({ ...input, meetingId: meeting.id });
      else await create.mutateAsync(input);
      await utils.cohort.listMeetings.invalidate({ cohortId });
      onOpenChange(false);
      toast.success(meeting ? "Meeting diperbarui." : "Meeting dijadwalkan.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  const pending = create.isPending || update.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {meeting ? "Edit meeting" : "Jadwalkan meeting"}
            </DialogTitle>
            <DialogDescription>
              {meeting
                ? "Meeting ini tetap menggunakan"
                : "Meeting baru menggunakan"}{" "}
              {meeting?.provider === "GOOGLE_MEET" ||
              (!meeting && organizationProvider === "GOOGLE_MEET")
                ? "Google Meet"
                : "Zoom"}{" "}
              sesuai pengaturan organisasi saat dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-module">Modul cohort</Label>
              <Select
                value={moduleId}
                onValueChange={(value) => {
                  if (value) setModuleId(value);
                }}
              >
                <SelectTrigger id="meeting-module" className="w-full">
                  <span className="flex flex-1 truncate text-left">
                    {moduleId === "none"
                      ? "Tidak terkait modul"
                      : (modules.data?.find((module) => module.id === moduleId)
                          ?.title ?? "Memuat modul")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak terkait modul</SelectItem>
                  {modules.data?.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.position + 1}. {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Judul</Label>
              <Input
                id="meeting-title"
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-agenda">Agenda</Label>
              <Textarea
                id="meeting-agenda"
                value={agenda}
                onChange={(event) => setAgenda(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meeting-start">Mulai</Label>
                <DateTimePicker
                  id="meeting-start"
                  required
                  value={startsAt}
                  onChange={setStartsAt}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">Durasi (menit)</Label>
                <Input
                  id="meeting-duration"
                  type="number"
                  min={1}
                  max={1440}
                  required
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-timezone">Timezone</Label>
              <Input
                id="meeting-timezone"
                required
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                aria-invalid={!timezoneValid}
              />
              {!timezoneValid ? (
                <p className="text-destructive text-xs">
                  Timezone tidak valid. Contoh: Asia/Jakarta, Asia/Makassar,
                  Asia/Jayapura.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Contoh: Asia/Jakarta. Waktu akan disimpan sesuai timezone ini.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="meeting-notify"
                checked={notifyLearners}
                onCheckedChange={setNotifyLearners}
              />
              <Label htmlFor="meeting-notify">
                {meeting
                  ? "Beri tahu peserta jika jadwal berubah"
                  : "Beri tahu peserta lewat notifikasi"}
              </Label>
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={pending || !title.trim() || !startsAt || !timezoneValid}
            >
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CalendarDaysIcon />
              )}
              {meeting ? "Simpan" : "Jadwalkan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Settings({
  canDelete,
  cohort,
  courseRoot,
}: {
  canDelete: boolean;
  cohort: Cohort;
  courseRoot: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const loaded = cohortSettingsValues(cohort);
  const [name, setName] = useState(loaded.name);
  const [description, setDescription] = useState(loaded.description);
  const [status, setStatus] = useState(loaded.status);
  const [capacity, setCapacity] = useState(loaded.capacity);
  const [price, setPrice] = useState(loaded.price);
  const [startsAt, setStartsAt] = useState(loaded.startsAt);
  const [endsAt, setEndsAt] = useState(loaded.endsAt);
  const [whatsapp, setWhatsapp] = useState(loaded.whatsapp);
  const [enrollmentMode, setEnrollmentMode] = useState<string>(
    loaded.enrollmentMode,
  );
  // The values the form was loaded from. When the cohort changes underneath
  // (another tab, a refetch), re-sync only the fields that changed on the
  // server so unrelated unsaved edits are kept.
  const [source, setSource] = useState(loaded);
  if (
    (Object.keys(loaded) as (keyof typeof loaded)[]).some(
      (key) => loaded[key] !== source[key],
    )
  ) {
    setSource(loaded);
    if (loaded.name !== source.name) setName(loaded.name);
    if (loaded.description !== source.description) {
      setDescription(loaded.description);
    }
    if (loaded.status !== source.status) setStatus(loaded.status);
    if (loaded.capacity !== source.capacity) setCapacity(loaded.capacity);
    if (loaded.price !== source.price) setPrice(loaded.price);
    if (loaded.startsAt !== source.startsAt) setStartsAt(loaded.startsAt);
    if (loaded.endsAt !== source.endsAt) setEndsAt(loaded.endsAt);
    if (loaded.whatsapp !== source.whatsapp) setWhatsapp(loaded.whatsapp);
    if (loaded.enrollmentMode !== source.enrollmentMode) {
      setEnrollmentMode(loaded.enrollmentMode);
    }
  }
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = api.cohort.update.useMutation();
  const remove = api.cohort.delete.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Send only the fields changed in this form (compared with the values it
    // was loaded from), so saving never reverts changes made elsewhere.
    const changes = {
      ...(name.trim() !== source.name.trim() ? { name: name.trim() } : {}),
      ...(description.trim() !== source.description.trim()
        ? { description: description.trim() || null }
        : {}),
      ...(status !== source.status ? { status } : {}),
      ...(capacity !== source.capacity
        ? { capacity: capacity ? Number(capacity) : null }
        : {}),
      ...(price !== source.price
        ? { price: price ? Number(price) : null }
        : {}),
      ...(startsAt !== source.startsAt
        ? { startsAt: startsAt ? new Date(`${startsAt}T00:00:00`) : null }
        : {}),
      ...(endsAt !== source.endsAt
        ? { endsAt: endsAt ? new Date(`${endsAt}T23:59:59`) : null }
        : {}),
      ...(whatsapp.trim() !== source.whatsapp.trim()
        ? { whatsappGroupUrl: whatsapp.trim() || null }
        : {}),
      ...(enrollmentMode !== source.enrollmentMode
        ? {
            enrollmentMode:
              enrollmentMode === "INHERIT"
                ? null
                : (enrollmentMode as "OPEN" | "INVITE_ONLY"),
          }
        : {}),
    };
    if (Object.keys(changes).length === 0) {
      toast.info("Tidak ada perubahan untuk disimpan.");
      return;
    }
    try {
      await update.mutateAsync({ cohortId: cohort.id, ...changes });
      await utils.cohort.get.invalidate({ cohortId: cohort.id });
      toast.success("Group belajar diperbarui.");
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  async function deleteCohort() {
    try {
      await remove.mutateAsync({ cohortId: cohort.id });
      await utils.cohort.list.invalidate({ courseId: cohort.courseId });
      toast.success("Group belajar dihapus.");
      router.replace(`${courseRoot}?view=cohorts`);
      router.refresh();
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }
  return (
    <section className="space-y-5">
      <SectionHeading
        title="Pengaturan"
        description="Perbarui informasi, periode, dan aturan Group belajar."
      />
      <form onSubmit={submit} className="space-y-4">
        <Card className="gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-heading text-lg">
              Informasi umum
            </CardTitle>
            <CardDescription>
              Nama dan deskripsi yang dilihat siswa di workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="settings-cohort-name">Nama Group belajar</Label>
              <Input
                id="settings-cohort-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-cohort-description">Deskripsi</Label>
              <Textarea
                id="settings-cohort-description"
                placeholder="Jelaskan tujuan dan aktivitas Group belajar ini."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Kosongkan untuk menggunakan deskripsi default.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-heading text-lg">
              Status & akses
            </CardTitle>
            <CardDescription>
              Atur visibilitas, enrollment, kapasitas, dan harga cohort.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSelect
                id="settings-cohort-status"
                label="Status"
                value={status}
                onChange={(value) => setStatus(value as Cohort["status"])}
                options={Object.entries(statusLabels)}
              />
              <FieldSelect
                id="settings-cohort-enrollment"
                label="Tipe akses"
                value={enrollmentMode}
                onChange={setEnrollmentMode}
                options={[
                  ["INHERIT", "Ikuti course"],
                  ["OPEN", "Public course"],
                  ["INVITE_ONLY", "Private course"],
                ]}
              />
              <div className="space-y-2">
                <Label htmlFor="settings-cohort-capacity">Kapasitas</Label>
                <Input
                  id="settings-cohort-capacity"
                  type="number"
                  min={1}
                  placeholder="Tidak terbatas"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-cohort-price">Harga (IDR)</Label>
                <Input
                  id="settings-cohort-price"
                  type="number"
                  min={0}
                  placeholder={
                    cohort.course.price > 0
                      ? `Ikuti course (${formatRupiah(cohort.course.price)})`
                      : "Ikuti course (gratis)"
                  }
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Isi 0 untuk gratis. Group belajar berbayar diikuti lewat
                  checkout QRIS atau transfer bank, lalu diverifikasi di tab
                  Pembayaran.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="font-heading text-lg">
              Jadwal & tautan
            </CardTitle>
            <CardDescription>
              Periode Group belajar dan tautan komunitas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="settings-cohort-whatsapp">WhatsApp URL</Label>
              <Input
                id="settings-cohort-whatsapp"
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-cohort-start">Mulai</Label>
                <DatePicker
                  id="settings-cohort-start"
                  value={startsAt}
                  onChange={setStartsAt}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-cohort-end">Selesai</Label>
                <DatePicker
                  id="settings-cohort-end"
                  min={startsAt || undefined}
                  value={endsAt}
                  onChange={setEndsAt}
                />
              </div>
            </div>
          </CardContent>
          <div className="flex justify-end border-t px-4 py-3">
            <Button type="submit" disabled={!name.trim() || update.isPending}>
              {update.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
              Simpan pengaturan
            </Button>
          </div>
        </Card>
      </form>

      {canDelete ? (
        <Card className="border-destructive/20 gap-0 rounded-lg py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-destructive font-heading text-lg">
              Zona berbahaya
            </CardTitle>
            <CardDescription>
              Hapus Group belajar beserta siswa, staff, invite, dan meeting
              terkait. Tindakan ini permanen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Hapus {cohort.name} permanen</p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Hapus Group belajar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canDelete ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Trash2Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>Hapus {cohort.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Siswa, staff, invite, dan meeting terkait dapat ikut terhapus.
                Action ini permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={remove.isPending}
                onClick={deleteCohort}
              >
                Hapus permanen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </section>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-2xl font-medium tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <span className="flex flex-1 text-left">
            {options.find(([option]) => option === value)?.[1] ?? value}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map(([option, text]) => (
            <SelectItem key={option} value={option}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
/** Editable cohort settings as form values (strings for inputs). */
function cohortSettingsValues(cohort: Cohort) {
  return {
    name: cohort.name,
    description: cohort.description ?? "",
    status: cohort.status,
    capacity: cohort.capacity ? String(cohort.capacity) : "",
    price: cohort.price === null ? "" : String(cohort.price),
    startsAt: toDateInput(cohort.startsAt),
    endsAt: toDateInput(cohort.endsAt),
    whatsapp: cohort.whatsappGroupUrl ?? "",
    enrollmentMode: (cohort.enrollmentMode ?? "INHERIT") as string,
  };
}

function toDateInput(value: Date | null) {
  return value
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
    : "";
}
