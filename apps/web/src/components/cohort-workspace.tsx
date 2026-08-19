"use client";

import {
  useDeferredValue,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  UserPlusIcon,
  UserRoundCogIcon,
  UsersIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CohortInvites } from "~/components/cohort-invites";
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

type Cohort = RouterOutputs["cohort"]["get"];
type CohortEnrollment =
  RouterOutputs["enrollment"]["listCohortEnrollments"][number];
type Meeting = RouterOutputs["cohort"]["listMeetings"][number];
type CohortView =
  "overview" | "learners" | "staff" | "meetings" | "reviews" | "invites";

const views = [
  { value: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { value: "learners", label: "Siswa", icon: UsersIcon },
  { value: "staff", label: "Staff", icon: UserRoundCogIcon },
  { value: "meetings", label: "Meetings", icon: VideoIcon },
  { value: "reviews", label: "Review tugas", icon: ClipboardCheckIcon },
  { value: "invites", label: "Invite", icon: MailPlusIcon },
] satisfies Array<{ value: CohortView; label: string; icon: LucideIcon }>;

const validViews = new Set<CohortView>(views.map(({ value }) => value));
const statusLabels = {
  DRAFT: "Draf",
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
      <span className="mt-1 font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">
        {value}
      </span>
    </div>
  );
}

export function CohortWorkspace({
  initialCohort,
  organizationSlug,
}: {
  initialCohort: Cohort;
  organizationSlug: string;
}) {
  const searchParams = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const cohortQuery = api.cohort.get.useQuery(
    { cohortId: initialCohort.id },
    { initialData: initialCohort },
  );
  const cohort = cohortQuery.data;
  const availableViews = views.filter(({ value }) => {
    if (value === "learners") return cohort.access.manageLearners;
    if (value === "reviews") return cohort.access.reviewAssessments;
    if (value === "invites") return cohort.access.manageInvites;
    return true;
  });
  const requestedView = searchParams.get("view") as CohortView | null;
  const view =
    requestedView &&
    validViews.has(requestedView) &&
    availableViews.some(({ value }) => value === requestedView)
      ? requestedView
      : "overview";
  const root = `/workspace/${organizationSlug}/courses/${cohort.courseId}/cohorts/${cohort.id}`;
  const courseRoot = `/workspace/${organizationSlug}/courses/${cohort.courseId}`;
  const learners = api.enrollment.listCohortEnrollments.useQuery(
    { cohortId: cohort.id },
    {
      enabled:
        cohort.access.manageLearners &&
        (view === "overview" || view === "learners"),
    },
  );
  const meetings = api.cohort.listMeetings.useQuery(
    { cohortId: cohort.id },
    { enabled: view === "overview" || view === "meetings" },
  );

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

      <header className="relative overflow-hidden rounded-lg bg-[#171915] px-5 py-6 text-[#f5f3e9] sm:px-7 sm:py-8">
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
        <div className="pointer-events-none absolute inset-0 bg-black/70" />
        <div className="pointer-events-none absolute top-0 right-0 size-48 translate-x-14 -translate-y-16 rounded-full border border-white/20" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                {cohort.course.title} · Group belajar
              </span>
              <Badge className="border-white/30 bg-white/10 text-white">
                {statusLabels[cohort.status]}
              </Badge>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
              {cohort.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              {cohort.description ??
                "Kelola peserta didik, pengajar, dan jadwal Group belajar dari workspace ini."}
            </p>
          </div>
          {cohort.access.update ? (
            <Button
              className="bg-[#f5f3e9] text-[#171915] hover:bg-white"
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit Group belajar
            </Button>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Pengelolaan Group belajar"
        className="max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max items-center gap-1">
          {availableViews.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-current={view === value ? "page" : undefined}
              onClick={() => navigate(value)}
              className={cn(
                "after:bg-foreground focus-visible:bg-muted relative flex h-11 items-center gap-2 px-3 text-sm font-medium outline-none after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:opacity-0",
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
        <Overview
          cohort={cohort}
          learners={learners.data}
          learnersPending={learners.isPending}
          meetings={meetings.data}
          meetingsPending={meetings.isPending}
          onNavigate={navigate}
        />
      ) : null}
      {view === "learners" ? (
        <Learners
          cohortId={cohort.id}
          data={learners.data}
          error={learners.error}
          pending={learners.isPending}
        />
      ) : null}
      {view === "staff" ? (
        <Staff canManage={cohort.access.manageStaff} cohort={cohort} />
      ) : null}
      {view === "meetings" ? (
        <Meetings
          cohortId={cohort.id}
          data={meetings.data}
          error={meetings.error}
          organizationSlug={organizationSlug}
          canManage={cohort.access.manageMeetings}
          pending={meetings.isPending}
        />
      ) : null}
      {view === "reviews" ? (
        <ReviewQueue
          organizationId={cohort.organizationId}
          cohortId={cohort.id}
          cohortName={cohort.name}
        />
      ) : null}
      {view === "invites" ? (
        <CohortInvites
          courseId={cohort.courseId}
          cohortId={cohort.id}
          cohortName={cohort.name}
        />
      ) : null}

      {cohort.access.update ? (
        <EditCohort
          canDelete={cohort.access.delete}
          cohort={cohort}
          courseRoot={courseRoot}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  );
}

function Overview({
  cohort,
  learners,
  learnersPending,
  meetings,
  meetingsPending,
  onNavigate,
}: {
  cohort: Cohort;
  learners?: RouterOutputs["enrollment"]["listCohortEnrollments"];
  learnersPending: boolean;
  meetings?: RouterOutputs["cohort"]["listMeetings"];
  meetingsPending: boolean;
  onNavigate: (view: CohortView) => void;
}) {
  const active =
    learners?.filter(({ status }) => status === "ACTIVE").length ?? 0;
  const upcoming =
    meetings?.filter(({ startsAt }) => startsAt > new Date()).length ?? 0;
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
            <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg">
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
                cohort.price === null
                  ? "Ikuti course"
                  : `IDR ${cohort.price.toLocaleString("id-ID")}`,
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
            <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg">
              Operasi
            </CardTitle>
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
              {
                target: "staff" as const,
                icon: UserRoundCogIcon,
                label: "Atur pengajar dan moderator",
              },
              {
                target: "meetings" as const,
                icon: VideoIcon,
                label: "Jadwalkan meeting Zoom",
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
    </div>
  );
}

function Learners({
  cohortId,
  data,
  error,
  pending,
}: {
  cohortId: string;
  data?: RouterOutputs["enrollment"]["listCohortEnrollments"];
  error: { message: string } | null;
  pending: boolean;
}) {
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<CohortEnrollment["status"]>("ACTIVE");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const mutation = api.enrollment.setCohortEnrollment.useMutation();
  const visible = data?.filter(({ user }) =>
    `${user.name} ${user.email}`.toLowerCase().includes(deferredSearch),
  );

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
                onChange={(event) => setSearch(event.target.value)}
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
                  <TableHead className="pr-4 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="pl-4">
                      <span className="block font-medium">
                        {enrollment.user.name}
                      </span>
                      <span className="text-muted-foreground block text-xs">
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
                        className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                        value={enrollment.status}
                        disabled={mutation.isPending}
                        onChange={(event) =>
                          save(
                            enrollment.user.email,
                            event.target.value as CohortEnrollment["status"],
                          )
                        }
                      >
                        {Object.entries(enrollmentLabels).map(
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
              <EmptyState
                icon={SearchIcon}
                title="Siswa tidak ditemukan"
                description="Coba nama atau email yang berbeda."
              />
            </CardContent>
          )}
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
                <select
                  id="cohort-learner-status"
                  className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as CohortEnrollment["status"])
                  }
                >
                  {Object.entries(enrollmentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
                    <select
                      className="border-input bg-background h-8 rounded-lg border px-2 text-xs"
                      value={staff.role}
                      onChange={(event) =>
                        changeRole(
                          staff.id,
                          event.target.value as "INSTRUCTOR" | "ASSISTANT",
                        )
                      }
                    >
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="ASSISTANT">Assistant</option>
                    </select>
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
                  <select
                    id="staff-role"
                    className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as "INSTRUCTOR" | "ASSISTANT")
                    }
                  >
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="ASSISTANT">Assistant</option>
                  </select>
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
}: {
  canManage: boolean;
  cohortId: string;
  data?: RouterOutputs["cohort"]["listMeetings"];
  error: { message: string } | null;
  organizationSlug: string;
  pending: boolean;
}) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const integration = api.cohort.getMeetingIntegrationStatus.useQuery(
    { cohortId },
    { enabled: canManage },
  );
  const remove = api.cohort.deleteMeeting.useMutation();

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
          Memeriksa Zoom
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
          Coba cek Zoom lagi
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
        Zoom belum terhubung
      </Button>
    );
  }

  async function deleteMeeting(meetingId: string) {
    try {
      await remove.mutateAsync({ cohortId, meetingId });
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
        description="Jadwal live session yang terhubung ke Zoom."
        action={renderMeetingAction()}
      />
      {pending || error ? <LoadingRows error={error} /> : null}
      {!pending && !error && data?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={VideoIcon}
              title="Belum ada meeting"
              description={
                !canManage
                  ? "Belum ada live session yang dijadwalkan untuk Group belajar ini."
                  : integration.data?.isConnected
                    ? "Jadwalkan live session pertama untuk Group belajar ini."
                    : integration.data?.canConfigure
                      ? "Hubungkan Zoom organization sebelum menjadwalkan live session."
                      : "Zoom organization belum terhubung. Hubungi owner atau admin organisasi."
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
                  <CardTitle className="mt-3 text-base">
                    {meeting.title}
                  </CardTitle>
                  <CardDescription>
                    {dateTimeFormatter.format(meeting.startsAt)} ·{" "}
                    {meeting.durationMinutes} menit
                  </CardDescription>
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
                      Join Zoom
                      <ExternalLinkIcon />
                    </a>
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
                        onClick={() => deleteMeeting(meeting.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      {canManage && open ? (
        <MeetingForm
          key={editing?.id ?? "new"}
          cohortId={cohortId}
          meeting={editing}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </section>
  );
}

function MeetingForm({
  cohortId,
  meeting,
  open,
  onOpenChange,
}: {
  cohortId: string;
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [startsAt, setStartsAt] = useState(
    meeting ? toLocalInput(meeting.startsAt) : "",
  );
  const [duration, setDuration] = useState(
    String(meeting?.durationMinutes ?? 60),
  );
  const [timezone, setTimezone] = useState(
    meeting?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const create = api.cohort.createMeeting.useMutation();
  const update = api.cohort.updateMeeting.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const input = {
        cohortId,
        title: title.trim(),
        agenda: agenda.trim() || null,
        startsAt: new Date(startsAt),
        durationMinutes: Number(duration),
        timezone,
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
              Meeting dibuat dan disinkronkan dengan Zoom organization.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
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
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
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
              />
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
              disabled={pending || !title.trim() || !startsAt}
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

function EditCohort({
  canDelete,
  cohort,
  courseRoot,
  open,
  onOpenChange,
}: {
  canDelete: boolean;
  cohort: Cohort;
  courseRoot: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [name, setName] = useState(cohort.name);
  const [description, setDescription] = useState(cohort.description ?? "");
  const [status, setStatus] = useState(cohort.status);
  const [capacity, setCapacity] = useState(
    cohort.capacity ? String(cohort.capacity) : "",
  );
  const [price, setPrice] = useState(
    cohort.price === null ? "" : String(cohort.price),
  );
  const [startsAt, setStartsAt] = useState(toDateInput(cohort.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInput(cohort.endsAt));
  const [whatsapp, setWhatsapp] = useState(cohort.whatsappGroupUrl ?? "");
  const [enrollmentMode, setEnrollmentMode] = useState(
    cohort.enrollmentMode ?? "INHERIT",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = api.cohort.update.useMutation();
  const remove = api.cohort.delete.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await update.mutateAsync({
        cohortId: cohort.id,
        name: name.trim(),
        description: description.trim() || null,
        status,
        capacity: capacity ? Number(capacity) : null,
        price: price ? Number(price) : null,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`) : null,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`) : null,
        whatsappGroupUrl: whatsapp.trim() || null,
        enrollmentMode:
          enrollmentMode === "INHERIT"
            ? null
            : (enrollmentMode as "OPEN" | "INVITE_ONLY"),
      });
      await utils.cohort.get.invalidate({ cohortId: cohort.id });
      onOpenChange(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Edit Group belajar</DialogTitle>
              <DialogDescription>
                Perbarui informasi, periode, dan aturan enrollment.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cohort-name">Nama</Label>
                <Input
                  id="edit-cohort-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cohort-description">Deskripsi</Label>
                <Textarea
                  id="edit-cohort-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect
                  id="edit-cohort-status"
                  label="Status"
                  value={status}
                  onChange={(value) => setStatus(value as Cohort["status"])}
                  options={Object.entries(statusLabels)}
                />
                <FieldSelect
                  id="edit-cohort-enrollment"
                  label="Enrollment"
                  value={enrollmentMode}
                  onChange={setEnrollmentMode}
                  options={[
                    ["INHERIT", "Ikuti course"],
                    ["OPEN", "Open"],
                    ["INVITE_ONLY", "Invite only"],
                  ]}
                />
                <div className="space-y-2">
                  <Label htmlFor="edit-cohort-capacity">Kapasitas</Label>
                  <Input
                    id="edit-cohort-capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cohort-price">Harga (IDR)</Label>
                  <Input
                    id="edit-cohort-price"
                    type="number"
                    min={0}
                    placeholder="Ikuti course"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-cohort-whatsapp">WhatsApp URL</Label>
                  <Input
                    id="edit-cohort-whatsapp"
                    type="url"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cohort-start">Mulai</Label>
                  <Input
                    id="edit-cohort-start"
                    type="date"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cohort-end">Selesai</Label>
                  <Input
                    id="edit-cohort-end"
                    type="date"
                    min={startsAt || undefined}
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-5 justify-between sm:justify-between">
              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon />
                  Hapus
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={!name.trim() || update.isPending}
                >
                  {update.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <CheckIcon />
                  )}
                  Simpan
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
    </>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
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
      <select
        id={id}
        className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
function toDateInput(value: Date | null) {
  return value
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
    : "";
}
function toLocalInput(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
