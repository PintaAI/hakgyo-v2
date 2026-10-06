"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { getErrorMessage } from "~/lib/error-message";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const createErrorMessage =
  "Kurikulum belum berhasil dibuat. Silakan coba lagi.";

/**
 * Creates a kurikulum owned by `ownerMembershipId`, keeping the validation
 * and error message in one place for every form that creates one.
 * `create` resolves to the new course, or null with `error` set.
 */
export function useCreateCourse({
  organizationId,
  ownerMembershipId,
}: {
  organizationId: string;
  ownerMembershipId: string;
}) {
  const utils = api.useUtils();
  const createCourse = api.course.create.useMutation();
  const [error, setError] = useState<string | null>(null);

  async function create(input: { title: string; description?: string }) {
    const title = input.title.trim();
    if (!title) {
      setError("Masukkan nama kurikulum terlebih dahulu.");
      return null;
    }
    const description = input.description?.trim() ?? "";
    setError(null);
    try {
      const course = await createCourse.mutateAsync({
        organizationId,
        ownerMembershipId,
        title,
        description: description.length > 0 ? description : null,
      });
      await utils.course.list.invalidate({ organizationId });
      toast.success("Kurikulum berhasil dibuat.");
      return course;
    } catch (cause) {
      setError(getErrorMessage(cause, createErrorMessage));
      toast.error("Kurikulum belum berhasil dibuat.");
      return null;
    }
  }

  return {
    create,
    error,
    clearError: () => setError(null),
    isPending: createCourse.isPending,
  };
}

export function CourseCreateForm({
  organizationId,
  organizationSlug,
  ownerMembershipId,
}: {
  organizationId: string;
  organizationSlug: string;
  ownerMembershipId: string;
}) {
  const router = useRouter();
  const createCourse = useCreateCourse({ organizationId, ownerMembershipId });
  const { error } = createCourse;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const coursesHref = `/workspace/${organizationSlug}/courses`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const course = await createCourse.create({ title, description });
    if (!course) return;
    router.replace(coursesHref);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Link
        href={coursesHref}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Kembali ke kurikulum
      </Link>

      <header className="max-w-2xl">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Kurikulum baru
        </p>
        <h1 className="font-heading mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
          Apa yang ingin Anda ajarkan?
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Mulai dari nama dan gambaran singkat. Materi, peserta, serta jadwal
          dapat ditambahkan setelah kurikulum dibuat.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="bg-card ring-foreground/10 rounded-lg p-5 ring-1 sm:p-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="course-title">Nama kurikulum</Label>
            <Input
              id="course-title"
              autoFocus
              autoComplete="off"
              className="h-11 px-3 text-base md:text-base"
              maxLength={200}
              placeholder="Contoh: Bahasa Korea untuk Pemula"
              value={title}
              aria-invalid={Boolean(error && !title.trim())}
              aria-describedby="course-title-help"
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) createCourse.clearError();
              }}
            />
            <p
              id="course-title-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              Pilih nama yang langsung menjelaskan isi kurikulum.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="course-description">Gambaran singkat</Label>
              <span className="text-muted-foreground text-xs">Opsional</span>
            </div>
            <Textarea
              id="course-description"
              className="min-h-28 resize-y px-3 py-3 text-base md:text-base"
              maxLength={10000}
              placeholder="Apa yang akan dipelajari peserta?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="text-destructive bg-destructive/10 mt-5 rounded-md px-3 py-2.5 text-sm"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href={coursesHref}
              className={buttonVariants({ variant: "ghost" })}
            >
              Batal
            </Link>
            <Button type="submit" disabled={createCourse.isPending}>
              {createCourse.isPending ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <BookOpenIcon data-icon="inline-start" />
              )}
              {createCourse.isPending
                ? "Membuat kurikulum..."
                : "Buat kurikulum"}
              {!createCourse.isPending ? (
                <ArrowRightIcon data-icon="inline-end" />
              ) : null}
            </Button>
          </div>
        </form>

        <aside className="bg-card ring-foreground/10 h-fit rounded-lg p-5 ring-1">
          <p className="font-heading font-medium">Setelah kurikulum dibuat</p>
          <ol className="text-muted-foreground mt-5 space-y-5 text-sm">
            {[
              "Susun bab dan materi",
              "Buat Group belajar atau kelas",
              "Undang peserta untuk belajar",
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-2.5 border-t pt-5 text-xs leading-relaxed">
            <CheckIcon className="text-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground">
              Kurikulum dibuat dalam keadaan belum dipublikasikan. Peserta belum
              dapat melihatnya sampai Anda mempublikasikannya.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
