"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PencilLineIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CourseCover } from "~/components/course-cover";
import { CourseCoverEditor } from "~/components/course-cover-editor";
import { useCreateCourse } from "~/components/course-create-form";
import { FlowShell, surfaceCard } from "~/components/brand/flow-shell";
import { Headline, Kicker, leadText } from "~/components/brand/typography";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getErrorMessage } from "~/lib/error-message";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Start = "scratch" | "pdf" | "clone";
type ClonedCourse = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
};

const stickyBar =
  "max-sm:bg-background/95 max-sm:sticky max-sm:bottom-0 max-sm:-mx-5 max-sm:border-t max-sm:px-5 max-sm:py-3 max-sm:backdrop-blur max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]";

const flatSurface = cn(
  surfaceCard,
  "max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none",
);

/**
 * The optional second step of creating an organization: choose how to begin
 * the first kurikulum. Writing it from scratch and importing a PDF only need
 * a name; copying one of Hakgyo's kurikulum creates the copy first, then lets
 * the owner rename it and change its thumbnail before opening the editor.
 */
export function OrganizationFirstCourse({
  organizationId,
  organizationName,
  organizationSlug,
  ownerMembershipId,
}: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  ownerMembershipId: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [start, setStart] = useState<Start | null>(null);
  const [cloned, setCloned] = useState<ClonedCourse | null>(null);
  const dashboardHref = `/workspace/${organizationSlug}/dashboard`;
  const courseHref = (courseId: string) =>
    `/workspace/${organizationSlug}/courses/${courseId}/kurikulum`;

  function open(destination: string) {
    router.replace(destination);
    router.refresh();
  }

  async function customized(courseId: string) {
    await utils.course.list.invalidate({ organizationId });
    open(courseHref(courseId));
  }

  const leave = (
    <Link
      href={dashboardHref}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-muted-foreground",
      )}
    >
      {cloned ? "Ke dashboard" : "Lewati untuk sekarang"}
    </Link>
  );

  return (
    <FlowShell action={leave}>
      <section className="max-w-3xl pt-2 sm:pt-14">
        <Kicker>Langkah 2 dari 2 · Opsional</Kicker>
        <Headline
          as="h1"
          title={
            cloned
              ? "Sesuaikan kurikulum"
              : `Kurikulum pertama ${organizationName}`
          }
          muted={cloned ? "sebelum Anda mulai mengedit." : "mulai dari mana?"}
          className="mt-3 sm:mt-5"
        />
        <p className={cn(leadText, "mt-4 sm:mt-6")}>
          {cloned
            ? "Ganti nama dan thumbnail sekarang. Isi materi kurikulum bisa Anda ubah kapan saja di editor."
            : "Pilih cara termudah untuk memulai. Anda juga bisa melewati langkah ini dan membuat kurikulum nanti."}
        </p>
      </section>

      <div className="mt-6 sm:mt-12">
        {cloned ? (
          <CustomizeCloned course={cloned} onDone={customized} />
        ) : start === null ? (
          <StartOptions onChoose={setStart} />
        ) : start === "clone" ? (
          <ClonePicker
            organizationId={organizationId}
            onBack={() => setStart(null)}
            onCloned={async (course) => {
              await utils.course.list.invalidate({ organizationId });
              setCloned(course);
            }}
          />
        ) : (
          <NameForm
            kind={start}
            organizationId={organizationId}
            ownerMembershipId={ownerMembershipId}
            onBack={() => setStart(null)}
            onCreated={(courseId) =>
              open(
                start === "pdf"
                  ? `${courseHref(courseId)}/impor-pdf`
                  : courseHref(courseId),
              )
            }
          />
        )}
      </div>
    </FlowShell>
  );
}

const startOptions: {
  value: Start;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    value: "clone",
    icon: CopyIcon,
    title: "Salin dari Hakgyo",
    description:
      "Mulai dari kurikulum siap pakai milik Hakgyo. Anda hanya perlu mengganti nama dan thumbnail, sisanya bisa diubah di editor.",
  },
  {
    value: "pdf",
    icon: FileTextIcon,
    title: "Impor dari PDF",
    description:
      "Unggah buku atau modul PDF Anda, lalu pilih halaman yang dijadikan materi kurikulum.",
  },
  {
    value: "scratch",
    icon: PencilLineIcon,
    title: "Buat dari nol",
    description:
      "Mulai dengan kurikulum kosong dan susun bab serta materinya sendiri.",
  },
];

function StartOptions({ onChoose }: { onChoose: (start: Start) => void }) {
  return (
    <ul className="max-sm:divide-border grid gap-3 max-sm:-mx-5 max-sm:gap-0 max-sm:divide-y max-sm:border-y sm:grid-cols-3 sm:gap-4">
      {startOptions.map(({ value, icon: Icon, title, description }, index) => (
        <li key={value} className="flex">
          <button
            type="button"
            onClick={() => onChoose(value)}
            className={cn(
              surfaceCard,
              "hover:border-primary focus-visible:ring-ring flex w-full flex-col gap-3 p-5 text-left transition-colors outline-none focus-visible:ring-2 sm:p-6",
              "max-sm:flex-row max-sm:items-start max-sm:gap-4 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none",
            )}
          >
            <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl">
              <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg font-medium tracking-tight sm:text-xl">
                  {title}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  0{index + 1}
                </span>
              </span>
              <span className="text-muted-foreground mt-1.5 block text-sm leading-6">
                {description}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BackButton({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-muted-foreground mb-4 -ml-2",
      )}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Pilih cara lain
    </button>
  );
}

function NameForm({
  kind,
  organizationId,
  ownerMembershipId,
  onBack,
  onCreated,
}: {
  kind: "scratch" | "pdf";
  organizationId: string;
  ownerMembershipId: string;
  onBack: () => void;
  onCreated: (courseId: string) => void;
}) {
  const createCourse = useCreateCourse({ organizationId, ownerMembershipId });
  const { error } = createCourse;
  const [title, setTitle] = useState("");
  const [opening, setOpening] = useState(false);
  const pending = createCourse.isPending || opening;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const course = await createCourse.create({ title });
    if (!course) return;
    setOpening(true);
    onCreated(course.id);
  }

  return (
    <div className="max-w-xl">
      <BackButton disabled={pending} onClick={onBack} />
      <form onSubmit={submit} noValidate className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="first-course-title">Nama kurikulum</Label>
          <Input
            id="first-course-title"
            autoFocus
            autoComplete="off"
            maxLength={200}
            placeholder="Contoh: Bahasa Korea untuk Pemula"
            value={title}
            className="h-11 px-3 text-base md:text-base"
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) createCourse.clearError();
            }}
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {kind === "pdf"
              ? "Setelah ini Anda akan diarahkan untuk mengunggah PDF."
              : "Setelah ini Anda akan membuka editor materi kurikulum."}
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="text-destructive bg-destructive/10 rounded-md px-3 py-2.5 text-sm"
          >
            {error}
          </p>
        ) : null}
        <div className={stickyBar}>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full sm:w-auto"
            disabled={pending}
          >
            {pending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {pending
              ? "Membuat kurikulum..."
              : kind === "pdf"
                ? "Lanjut impor PDF"
                : "Buat kurikulum"}
            {!pending ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ClonePicker({
  organizationId,
  onBack,
  onCloned,
}: {
  organizationId: string;
  onBack: () => void;
  onCloned: (course: ClonedCourse) => Promise<void>;
}) {
  const courses = api.course.listStarterCourses.useQuery();
  const clone = api.course.cloneStarterCourse.useMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    courses.data?.find((course) => course.id === selectedId) ??
    courses.data?.[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const course = await clone.mutateAsync({
        organizationId,
        sourceCourseId: selected.id,
      });
      await onCloned(course);
    } catch (cause) {
      toast.error(
        getErrorMessage(
          cause,
          "Kurikulum belum berhasil disalin. Silakan coba lagi.",
        ),
      );
    }
  }

  let list: ReactNode;
  if (courses.isPending) {
    list = (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Memuat kurikulum Hakgyo
      </p>
    );
  } else if (courses.error || !courses.data.length) {
    list = (
      <p className="text-muted-foreground text-sm">
        {courses.error
          ? "Kurikulum Hakgyo belum dapat dimuat. Coba lagi atau pilih cara lain."
          : "Belum ada kurikulum Hakgyo yang bisa disalin. Pilih cara lain untuk memulai."}
      </p>
    );
  } else {
    list = (
      <ul
        role="radiogroup"
        aria-label="Kurikulum Hakgyo"
        className="max-sm:divide-border grid gap-3 max-sm:-mx-5 max-sm:gap-0 max-sm:divide-y max-sm:border-y sm:grid-cols-2 lg:grid-cols-3"
      >
        {courses.data.map((course) => {
          const active = selected?.id === course.id;
          return (
            <li key={course.id} className="flex">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                disabled={clone.isPending}
                onClick={() => setSelectedId(course.id)}
                className={cn(
                  "focus-visible:ring-ring flex w-full gap-4 p-5 text-left transition-colors outline-none focus-visible:ring-2 sm:flex-col sm:p-4",
                  "sm:rounded-2xl sm:border",
                  active
                    ? "max-sm:bg-primary/5 sm:border-primary sm:ring-primary sm:ring-1"
                    : "sm:hover:bg-muted/60",
                )}
              >
                <CourseCover
                  title={course.title}
                  thumbnailUrl={course.thumbnailUrl}
                  sizes="(min-width: 1024px) 320px, 160px"
                  className="aspect-video w-28 shrink-0 rounded-lg sm:w-full sm:rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium">{course.title}</span>
                    {active ? (
                      <CheckIcon className="text-primary size-4 shrink-0" />
                    ) : null}
                  </span>
                  <span className="text-muted-foreground mt-1 block font-mono text-xs">
                    {course.moduleCount} bab · {course.itemCount} item
                  </span>
                  {course.description ? (
                    <span className="text-muted-foreground mt-2 line-clamp-2 block text-sm leading-6">
                      {course.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <form onSubmit={submit}>
      {/* Leaving mid-copy would let the copy finish behind another choice. */}
      <BackButton disabled={clone.isPending} onClick={onBack} />
      {list}
      {selected ? (
        <div className={cn(stickyBar, "sm:mt-8")}>
          <p className="text-muted-foreground mb-2 hidden text-xs sm:block">
            Salinan menjadi draft di organization Anda. Berkas ikut disalin,
            jadi perubahan Anda tidak memengaruhi kurikulum Hakgyo.
          </p>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full sm:w-auto"
            disabled={clone.isPending}
          >
            {clone.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            {clone.isPending
              ? "Menyalin kurikulum..."
              : `Salin ${selected.title}`}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function CustomizeCloned({
  course,
  onDone,
}: {
  course: ClonedCourse;
  onDone: (courseId: string) => Promise<void>;
}) {
  const update = api.course.update.useMutation();
  const [title, setTitle] = useState(course.title);
  const [opening, setOpening] = useState(false);
  const pending = update.isPending || opening;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Masukkan nama kurikulum terlebih dahulu.");
      return;
    }
    try {
      if (cleanTitle !== course.title) {
        await update.mutateAsync({ courseId: course.id, title: cleanTitle });
      }
      setOpening(true);
      await onDone(course.id);
    } catch (cause) {
      setOpening(false);
      toast.error(
        getErrorMessage(cause, "Nama kurikulum belum berhasil disimpan."),
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        flatSurface,
        "grid max-w-3xl gap-6 sm:p-7 md:grid-cols-[18rem_minmax(0,1fr)]",
      )}
    >
      <div className="space-y-2">
        <Label>Thumbnail</Label>
        <CourseCoverEditor
          courseId={course.id}
          title={title.trim() || course.title}
          thumbnailUrl={course.thumbnailUrl}
          onChange={async () => undefined}
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Klik gambar untuk menggantinya atau buat dengan AI.
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="cloned-course-title">Nama kurikulum</Label>
          <Input
            id="cloned-course-title"
            autoComplete="off"
            maxLength={200}
            value={title}
            className="h-11 px-3 text-base md:text-base"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className={cn(stickyBar, "mt-auto sm:border-t sm:pt-5")}>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full sm:w-auto"
            disabled={pending}
          >
            {pending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {pending ? "Menyimpan..." : "Simpan & buka editor"}
            {!pending ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
        </div>
      </div>
    </form>
  );
}
