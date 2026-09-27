"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  WrenchIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge, badgeVariants } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

export type CourseReadiness =
  RouterOutputs["content"]["getCurriculumReadiness"];
export type ItemReadiness = CourseReadiness["items"][number];
export type ItemReadinessState = ItemReadiness["state"];
export type ReadinessReason = ItemReadiness["reasons"][number];

/** Where an item row lives, e.g. `#course-item-<id>` inside the curriculum editor. */
export type CourseItemHref = (courseItemId: string) => string;

export const courseItemAnchorId = (courseItemId: string) =>
  `course-item-${courseItemId}`;

/** "Dipublikasikan" / "Belum dipublikasikan" — the only two course states. */
export const coursePublicationLabels = {
  PUBLISHED: "Dipublikasikan",
  DRAFT: "Belum dipublikasikan",
} as const;

// Status colours follow the emerald/amber conventions already used for
// status chips elsewhere in the app; "Belum siap" uses the destructive token.
const stateMeta: Record<
  ItemReadinessState,
  { label: string; className: string; dotClassName: string }
> = {
  LIVE: {
    label: "Tayang",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  HIDDEN: {
    label: "Disembunyikan",
    className: "border-border text-muted-foreground",
    dotClassName: "bg-muted-foreground/50",
  },
  HIDDEN_COURSE_UNPUBLISHED: {
    label: "Tersembunyi · course belum dipublikasikan",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClassName: "bg-amber-500",
  },
  NOT_READY: {
    label: "Belum siap",
    className:
      "bg-destructive/10 text-destructive dark:bg-destructive/20 border-transparent",
    dotClassName: "bg-destructive",
  },
};

export function readinessStateLabel(state: ItemReadinessState) {
  return stateMeta[state].label;
}

function StateDot({ state }: { state: ItemReadinessState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        stateMeta[state].dotClassName,
      )}
    />
  );
}

/**
 * One badge per item. NOT_READY opens a popover listing the reasons with
 * "Perbaiki" links; the other states are plain badges.
 */
export function ReadinessBadge({
  readiness,
  itemHref,
  className,
}: {
  readiness: Pick<ItemReadiness, "state" | "reasons">;
  itemHref?: CourseItemHref;
  className?: string;
}) {
  const meta = stateMeta[readiness.state];
  if (readiness.state !== "NOT_READY") {
    return (
      <Badge
        variant="outline"
        className={cn("max-w-full", meta.className, className)}
      >
        <StateDot state={readiness.state} />
        <span className="truncate">{meta.label}</span>
      </Badge>
    );
  }
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          badgeVariants({ variant: "outline" }),
          meta.className,
          "cursor-pointer hover:opacity-90",
          className,
        )}
        aria-label={`Belum siap: ${readiness.reasons.length} masalah. Lihat detail.`}
      >
        <StateDot state="NOT_READY" />
        {meta.label}
        {readiness.reasons.length > 1 ? ` (${readiness.reasons.length})` : ""}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Belum siap ditampilkan</PopoverTitle>
          <PopoverDescription className="text-xs">
            Item ini belum bisa tampil untuk siswa sampai masalah berikut
            diperbaiki.
          </PopoverDescription>
        </PopoverHeader>
        <ReadinessReasonList reasons={readiness.reasons} itemHref={itemHref} />
      </PopoverContent>
    </Popover>
  );
}

export function ReadinessReasonList({
  reasons,
  itemHref,
  className,
}: {
  reasons: ReadinessReason[];
  itemHref?: CourseItemHref;
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-2", className)}>
      {reasons.map((reason, index) => {
        const blockingItemId = reason.blockingCourseItemIds?.[0];
        return (
          <li
            key={`${reason.code}:${reason.resourceId ?? index}`}
            className="flex items-start gap-2 text-xs leading-relaxed"
          >
            <AlertTriangleIcon className="text-destructive mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{reason.message}</span>
            {reason.fixHref ? (
              <Link
                href={reason.fixHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "xs" }),
                  "shrink-0",
                )}
              >
                <WrenchIcon data-icon="inline-start" />
                Perbaiki
              </Link>
            ) : blockingItemId && itemHref ? (
              <a
                href={itemHref(blockingItemId)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "xs" }),
                  "shrink-0",
                )}
              >
                Lihat item
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ReadinessSummaryChip({
  summary,
  className,
}: {
  summary: CourseReadiness["summary"];
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-muted-foreground font-normal tabular-nums",
        className,
      )}
    >
      <span>{summary.live} tayang</span>
      <span aria-hidden="true">·</span>
      <span>{summary.hidden} disembunyikan</span>
      <span aria-hidden="true">·</span>
      <span
        className={cn(summary.notReady > 0 && "text-destructive font-medium")}
      >
        {summary.notReady} belum siap
      </span>
    </Badge>
  );
}

/** Counts for a subset of items (e.g. one module), matching the course summary. */
export function summarizeReadiness(
  items: readonly Pick<ItemReadiness, "state">[],
): CourseReadiness["summary"] {
  return {
    live: items.filter((item) => item.state === "LIVE").length,
    hidden: items.filter(
      (item) =>
        item.state === "HIDDEN" || item.state === "HIDDEN_COURSE_UNPUBLISHED",
    ).length,
    notReady: items.filter((item) => item.state === "NOT_READY").length,
  };
}

/** What publishing the course would do with the current curriculum. */
export function publishPreview(readiness: CourseReadiness) {
  const live = readiness.items.filter((item) => item.isPublished && item.ready);
  const hidden = readiness.items.filter(
    (item) => !item.isPublished && item.ready,
  );
  const notReady = readiness.items.filter((item) => !item.ready);
  // Visible items that are not ready block publishing; hidden ones stay hidden.
  const blocking = notReady.filter((item) => item.isPublished);
  return { live, hidden, notReady, blocking };
}

function itemLabel(item: ItemReadiness) {
  const title = item.title ?? "Resource tidak tersedia";
  return item.moduleTitle ? `${item.moduleTitle} › ${title}` : title;
}

/**
 * Publish / unpublish control for a course. Publishing first shows what will
 * go live and blocks while a visible item is not ready; unpublishing asks for
 * a simple confirmation.
 */
export function CoursePublicationControl({
  courseId,
  status,
  curriculumHref,
  pending,
  onChangeStatus,
}: {
  courseId: string;
  status: "DRAFT" | "PUBLISHED";
  curriculumHref: string;
  pending: boolean;
  onChangeStatus: (status: "DRAFT" | "PUBLISHED") => Promise<boolean>;
}) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const readiness = api.content.getCurriculumReadiness.useQuery(
    { courseId },
    { enabled: publishOpen },
  );
  const preview = readiness.data ? publishPreview(readiness.data) : null;
  const itemHref: CourseItemHref = (courseItemId) =>
    `${curriculumHref}#${courseItemAnchorId(courseItemId)}`;

  if (status === "PUBLISHED") {
    return (
      <>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setUnpublishOpen(true)}
        >
          <EyeOffIcon data-icon="inline-start" />
          Batalkan publikasi
        </Button>
        <AlertDialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan publikasi course?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua item akan disembunyikan dari learner sampai course
                dipublikasikan lagi. Pengaturan tampil tiap item tetap
                tersimpan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={async () => {
                  if (await onChangeStatus("DRAFT")) setUnpublishOpen(false);
                }}
              >
                {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Batalkan publikasi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button disabled={pending} onClick={() => setPublishOpen(true)}>
        <CheckIcon data-icon="inline-start" />
        Publikasikan
      </Button>
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publikasikan course?</DialogTitle>
            <DialogDescription>
              Item yang ditampilkan di kurikulum akan langsung terlihat oleh
              learner.
            </DialogDescription>
          </DialogHeader>
          {readiness.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Memeriksa kesiapan kurikulum…
            </p>
          ) : readiness.error || !preview ? (
            <p className="text-destructive py-2 text-sm">
              {readiness.error?.message ?? "Kesiapan kurikulum gagal dimuat."}
            </p>
          ) : (
            <div className="grid gap-4">
              <dl className="grid grid-cols-3 divide-x rounded-lg border py-3 text-center">
                <PreviewStat label="Akan tayang" value={preview.live.length} />
                <PreviewStat
                  label="Disembunyikan"
                  value={preview.hidden.length}
                />
                <PreviewStat
                  label="Belum siap"
                  value={preview.notReady.length}
                  destructive={preview.notReady.length > 0}
                />
              </dl>
              {preview.live.length === 0 && preview.blocking.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Belum ada item yang ditampilkan. Course tetap bisa
                  dipublikasikan, tetapi learner belum akan melihat materi.
                </p>
              ) : null}
              {preview.blocking.length ? (
                <div className="grid gap-2">
                  <p className="text-destructive text-sm font-medium">
                    {preview.blocking.length} item yang ditampilkan belum siap.
                    Lengkapi atau sembunyikan item berikut sebelum
                    mempublikasikan.
                  </p>
                  <NotReadyList items={preview.blocking} itemHref={itemHref} />
                </div>
              ) : null}
              {preview.notReady.length > preview.blocking.length ? (
                <div className="grid gap-2">
                  <p className="text-muted-foreground text-xs">
                    Item berikut belum siap dan akan tetap disembunyikan:
                  </p>
                  <NotReadyList
                    items={preview.notReady.filter((item) => !item.isPublished)}
                    itemHref={itemHref}
                  />
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Link
              href={curriculumHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Buka kurikulum
            </Link>
            <Button
              disabled={pending || !preview || preview.blocking.length > 0}
              onClick={async () => {
                if (await onChangeStatus("PUBLISHED")) setPublishOpen(false);
              }}
            >
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
              Publikasikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewStat({
  label,
  value,
  destructive = false,
}: {
  label: string;
  value: number;
  destructive?: boolean;
}) {
  return (
    <div className="px-2">
      <dt className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-xl font-medium tabular-nums",
          destructive && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function NotReadyList({
  items,
  itemHref,
}: {
  items: ItemReadiness[];
  itemHref: CourseItemHref;
}) {
  return (
    <ul className="grid max-h-64 gap-2 overflow-y-auto">
      {items.map((item) => (
        <li key={item.courseItemId} className="rounded-lg border p-3">
          <a
            href={itemHref(item.courseItemId)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {itemLabel(item)}
          </a>
          <ReadinessReasonList
            className="mt-2"
            reasons={item.reasons}
            itemHref={itemHref}
          />
        </li>
      ))}
    </ul>
  );
}
