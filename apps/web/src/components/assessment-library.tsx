"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  LibraryIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["list"][number];
type Status = Assessment["status"] | "ALL";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const statusLabels: Record<Status, string> = {
  ALL: "Semua status",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

function statusVariant(status: Assessment["status"]) {
  if (status === "PUBLISHED") return "default" as const;
  if (status === "ARCHIVED") return "outline" as const;
  return "secondary" as const;
}

export function AssessmentLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const assessments = api.assessment.list.useQuery({ organizationId });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const allAssessments = assessments.data ?? [];
  const visibleAssessments = allAssessments.filter((assessment) => {
    const matchesSearch = `${assessment.title} ${assessment.description ?? ""}`
      .toLocaleLowerCase()
      .includes(deferredSearch);
    return matchesSearch && (status === "ALL" || assessment.status === status);
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <LibraryIcon className="size-4" />
            Perpustakaan tugas
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Assessment
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Susun soal pilihan ganda dan jawaban tertulis yang dapat dipakai di
            course mana pun di workspace ini.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationSlug}/library/assessments/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          Assessment baru
        </Link>
      </div>

      {assessments.isPending ? (
        <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Memuat assessment
        </div>
      ) : assessments.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-destructive text-sm">
            {assessments.error.message}
          </p>
          <Button variant="outline" onClick={() => assessments.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Cari assessment"
                className="pl-8"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul atau deskripsi"
                value={search}
              />
            </div>
            <select
              aria-label="Filter status assessment"
              className="border-input bg-background focus-visible:ring-ring h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-2"
              onChange={(event) => setStatus(event.target.value as Status)}
              value={status}
            >
              {Object.keys(statusLabels).map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value as Status]}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {visibleAssessments.length} dari {allAssessments.length}{" "}
              assessment
            </p>
            {status !== "ALL" || deferredSearch ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatus("ALL");
                }}
              >
                Hapus filter
              </Button>
            ) : null}
          </div>

          {visibleAssessments.length ? (
            <div className="grid gap-3">
              {visibleAssessments.map((assessment) => (
                <AssessmentRow
                  key={assessment.id}
                  assessment={assessment}
                  organizationSlug={organizationSlug}
                />
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
                <ClipboardCheckIcon className="size-5" />
              </div>
              <h2 className="font-heading font-semibold">
                {deferredSearch || status !== "ALL"
                  ? "Assessment tidak ditemukan"
                  : "Belum ada assessment"}
              </h2>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Buat assessment pertama untuk menambahkan evaluasi ke course.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function AssessmentRow({
  assessment,
  organizationSlug,
}: {
  assessment: Assessment;
  organizationSlug: string;
}) {
  return (
    <Link
      href={`/workspace/${organizationSlug}/library/assessments/${assessment.id}`}
      className="bg-card ring-foreground/10 hover:bg-muted/30 group grid gap-4 rounded-xl p-4 ring-1 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FileQuestionIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-heading truncate font-semibold">
              {assessment.title}
            </h2>
            <Badge variant={statusVariant(assessment.status)}>
              {statusLabels[assessment.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {assessment.description ?? "Belum ada deskripsi."}
          </p>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>{assessment._count.questions} soal</span>
            <span>
              {assessment._count.courseItems
                ? `Dipakai di ${assessment._count.courseItems} item course`
                : "Belum dipakai di course"}
            </span>
            <span>Diperbarui {dateFormatter.format(assessment.updatedAt)}</span>
          </div>
        </div>
      </div>
      <span className="text-muted-foreground flex items-center justify-end gap-1 text-sm sm:justify-start">
        Buka
        <ArrowUpRightIcon
          className={cn(
            "size-4 transition-transform",
            "group-hover:translate-x-0.5",
          )}
        />
      </span>
    </Link>
  );
}
