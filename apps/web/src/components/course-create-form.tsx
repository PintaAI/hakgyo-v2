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
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 82);
  const suffix = Date.now().toString(36).slice(-6);
  return `${base || "course"}-${suffix}`;
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
  return "Course belum berhasil dibuat. Silakan coba lagi.";
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
  const utils = api.useUtils();
  const createCourse = api.course.create.useMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const coursesHref = `/workspace/${organizationSlug}/courses`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Masukkan nama course terlebih dahulu.");
      return;
    }

    setError(null);
    try {
      await createCourse.mutateAsync({
        organizationId,
        ownerMembershipId,
        title: cleanTitle,
        slug: slugify(cleanTitle),
        description: description.trim() || null,
      });
      await utils.course.list.invalidate({ organizationId });
      toast.success("Course berhasil dibuat.");
      router.replace(coursesHref);
      router.refresh();
    } catch (cause) {
      const message = getErrorMessage(cause);
      setError(message);
      toast.error("Course belum berhasil dibuat.");
    }
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
        Kembali ke courses
      </Link>

      <header className="max-w-2xl">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Course baru
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
          Apa yang ingin Anda ajarkan?
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Mulai dari nama dan gambaran singkat. Materi, peserta, serta jadwal
          dapat ditambahkan setelah course dibuat.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="bg-card ring-foreground/10 rounded-lg p-5 ring-1 sm:p-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="course-title">Nama course</Label>
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
                if (error) setError(null);
              }}
            />
            <p
              id="course-title-help"
              className="text-muted-foreground text-xs leading-relaxed"
            >
              Pilih nama yang langsung menjelaskan isi course.
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
              {createCourse.isPending ? "Membuat course..." : "Buat course"}
              {!createCourse.isPending ? (
                <ArrowRightIcon data-icon="inline-end" />
              ) : null}
            </Button>
          </div>
        </form>

        <aside className="bg-card ring-foreground/10 h-fit rounded-lg p-5 ring-1">
          <p className="font-[family-name:var(--font-hanken-grotesk)] font-medium">
            Setelah course dibuat
          </p>
          <ol className="text-muted-foreground mt-5 space-y-5 text-sm">
            {[
              "Susun modul dan materi",
              "Buat batch pembelajaran atau kelas",
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
              Course disimpan sebagai draf. Peserta belum dapat melihatnya
              sampai Anda menerbitkannya.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
