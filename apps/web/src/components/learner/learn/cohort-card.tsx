"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  ChevronRightIcon,
  FileTextIcon,
  InboxIcon,
  MessageCircleIcon,
  BookOpenIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { Skeleton } from "~/components/ui/skeleton";
import {
  assessmentAttemptPresentation,
  isStaleClosedOnDemandAssessment,
} from "~/lib/learner/assessment-state";
import { assessmentEventHref, learningItemHref } from "~/lib/learner/hrefs";
import {
  canOpenModule,
  dateLabel,
  dayLabel,
  meetingState,
  safeExternalUrl,
  timeLabel,
} from "~/lib/learner/study";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { SegmentedControl } from "../segmented-control";
import { OutlineSkeleton } from "../skeletons";
import { CourseOutlineList } from "./course-outline-list";
import {
  CohortMilestoneTimeline,
  type CohortMilestone,
} from "./milestone-timeline";

export type LearnCohort = RouterOutputs["learning"]["listMyCohorts"][number];
export type CohortEvent =
  RouterOutputs["assessmentEvent"]["listForLearner"][number];
export type CohortOutline = RouterOutputs["learning"]["getCourseOutline"];
export type CohortMilestoneGroup = {
  milestones: CohortMilestone[];
};

type Meeting = LearnCohort["meetings"][number];

/** An internal route or a validated external link. */
type Target = { href: string; external?: boolean };

type CohortHero = {
  kind: "class" | "assessment" | "learning" | "caught-up";
  eyebrow: string;
  live?: boolean;
  title: string;
  meta: string;
  pill?: string;
  target?: Target;
};

type PlateRow = {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  target?: Target;
  badge?: string;
};

export function assessmentSourceBadge(event: { type: string }) {
  return event.type === "TRYOUT" ? "Tryout" : "Latihan";
}

export function closesLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return `ditutup ${dateLabel(closesAt)}`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `ditutup dalam ${Math.max(hours, 1)} jam`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ditutup dalam ${days} hari`;
  return `ditutup ${dateLabel(closesAt)}`;
}

function dueLabel(closesAt: Date, now: number) {
  const diff = closesAt.getTime() - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `Tenggat ${Math.max(hours, 1)} jam lagi`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Tenggat ${days} hari lagi`;
  return `Tenggat ${dayLabel(closesAt)}`;
}

function meetingTarget(meeting: Meeting, courseId: string): Target {
  const kind = meeting.provider === "GOOGLE_MEET" ? "googleMeet" : "zoom";
  const url = meeting.joinUrl ? safeExternalUrl(meeting.joinUrl, kind) : null;
  return url
    ? { href: url, external: true }
    : { href: `/learn/${encodeURIComponent(courseId)}` };
}

function eventTarget(event: CohortEvent): Target {
  return { href: assessmentEventHref(event) };
}

function TargetLink({
  target,
  className,
  children,
}: {
  target: Target;
  className?: string;
  children: ReactNode;
}) {
  return target.external ? (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  ) : (
    <Link href={target.href} className={className}>
      {children}
    </Link>
  );
}

function HeroBlock({ hero }: { hero: CohortHero }) {
  const compact = hero.kind === "assessment";
  const content = (
    <div
      className={cn(
        "bg-primary/10 flex items-center gap-3 rounded-[20px] px-4 sm:px-5",
        compact ? "py-3 sm:py-4" : "py-3.5 sm:py-5",
        hero.target && "hover:bg-primary/15 transition-colors",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5">
          {hero.live ? (
            <span className="bg-destructive size-2 rounded-full" />
          ) : null}
          <span
            className={cn(
              "text-[11px] font-bold tracking-[1.5px] uppercase",
              hero.live ? "text-destructive" : "text-primary",
            )}
          >
            {hero.eyebrow}
          </span>
        </span>
        <span
          className={cn(
            "leading-7 font-black",
            compact ? "text-base leading-6 sm:text-lg" : "text-lg sm:text-xl",
          )}
        >
          {hero.title}
        </span>
        <span className="text-muted-foreground text-xs font-semibold">
          {hero.meta}
        </span>
      </div>
      {hero.pill && hero.target ? (
        <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-4 py-2 text-sm font-bold">
          {hero.pill}
        </span>
      ) : null}
    </div>
  );
  return hero.target ? (
    <TargetLink target={hero.target}>{content}</TargetLink>
  ) : (
    content
  );
}

function PlateRowView({ row, isLast }: { row: PlateRow; isLast: boolean }) {
  const Icon = row.icon;
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        !isLast && "border-border/60 border-b",
        row.target && "hover:bg-muted/40 transition-colors",
      )}
    >
      <span className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{row.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {row.detail}
        </span>
      </div>
      {row.badge ? (
        <span className="bg-muted flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold">
          {row.badge}
        </span>
      ) : row.target ? (
        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
      ) : null}
    </div>
  );
  return row.target ? (
    <TargetLink target={row.target}>{content}</TargetLink>
  ) : (
    content
  );
}

export function CohortCard({
  cohort,
  events,
  eventsPending,
  eventsError,
  now,
  milestoneGroup,
  outline,
}: {
  cohort: LearnCohort;
  events: CohortEvent[];
  eventsPending: boolean;
  eventsError?: boolean;
  now: number;
  milestoneGroup?: CohortMilestoneGroup;
  outline?: CohortOutline;
}) {
  const [segment, setSegment] = useState<"outline" | "done">("outline");
  const courseId = cohort.course.id;
  const upcoming = cohort.meetings
    .filter((meeting) => meetingState(meeting, now) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const next = upcoming[0];
  const nextState = next
    ? (meetingState(next, now) as "live" | "joining" | "upcoming")
    : null;
  // Scheduled events that have not opened yet only show their opening time.
  const upcomingEvent = events
    .filter(
      (event) =>
        event.status === "SCHEDULED" &&
        !event.entry.canStart &&
        event.opensAt !== null,
    )
    .sort(
      (a, b) => (a.opensAt?.getTime() ?? 0) - (b.opensAt?.getTime() ?? 0),
    )[0];
  const visibleEvents = events.filter(
    (event) =>
      !isStaleClosedOnDemandAssessment(event, now) &&
      !(event.status === "SCHEDULED" && !event.entry.canStart),
  );
  const open = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  const total = visibleEvents.length;
  const featured = open[0] ?? visibleEvents[0];
  const remaining = featured ? total - 1 : 0;
  const featuredAttempt = featured?.attempts[0];
  const featuredActionable =
    !!featured &&
    (!featuredAttempt || featuredAttempt.status === "IN_PROGRESS");
  const featuredUrgent =
    !!featured?.closesAt &&
    featured.closesAt.getTime() - now < 48 * 3_600_000 &&
    featuredActionable;

  const outlineItems = outline?.modules.flatMap((module) => module.items) ?? [];
  const completedCount = outlineItems.filter((item) => item.isCompleted).length;
  const progress = outlineItems.length
    ? Math.round((completedCount / outlineItems.length) * 100)
    : null;
  const nextOutlineItem = outline?.modules
    .flatMap((module) =>
      module.items.map((item) => ({
        ...item,
        available: canOpenModule(module.access),
        moduleTitle: module.title,
      })),
    )
    .find((item) => item.available && !item.isCompleted);
  const nextTypeLabel = !nextOutlineItem
    ? null
    : nextOutlineItem.type === "VOCABULARY_SET"
      ? "Kosakata"
      : nextOutlineItem.type === "ASSESSMENT"
        ? "Tugas"
        : "Materi";
  const nextItemTarget: Target | undefined = nextOutlineItem
    ? {
        href: learningItemHref(
          courseId,
          nextOutlineItem.id,
          nextOutlineItem.type === "ASSESSMENT"
            ? nextOutlineItem.attempt
            : undefined,
        ),
      }
    : undefined;

  // The card answers "what should I do now?" with one hero, chosen by
  // urgency: a live or starting class beats an expiring assessment, which
  // beats the next lesson. Everything else becomes a quiet row.
  let hero: CohortHero | null = null;
  if (next && nextState && nextState !== "upcoming") {
    const endsAt = new Date(
      next.startsAt.getTime() + next.durationMinutes * 60_000,
    );
    const where = next.module ? ` · ${next.module.title}` : "";
    hero = {
      kind: "class",
      eyebrow: nextState === "live" ? "Sedang live" : "Segera dimulai",
      live: nextState === "live",
      title: next.title,
      meta:
        nextState === "live"
          ? `Berakhir ${timeLabel(endsAt)} · ${next.durationMinutes} menit${where}`
          : `Mulai ${timeLabel(next.startsAt)} · ${next.durationMinutes} menit${where}`,
      pill: next.joinUrl ? "Gabung" : "Detail",
      target: meetingTarget(next, courseId),
    };
  } else if (featured && featuredActionable && featuredUrgent) {
    hero = {
      kind: "assessment",
      eyebrow:
        (featured.closesAt ? dueLabel(featured.closesAt, now) : null) ??
        assessmentSourceBadge(featured),
      title: featured.title,
      meta: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}`,
      pill: featuredAttempt ? "Lanjutkan" : "Mulai",
      target: eventTarget(featured),
    };
  } else if (nextOutlineItem && nextTypeLabel && nextItemTarget) {
    hero = {
      kind: "learning",
      eyebrow: completedCount > 0 ? "Lanjutkan belajar" : "Mulai belajar",
      title: nextOutlineItem.title,
      meta: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      pill: completedCount > 0 ? "Lanjutkan" : "Mulai",
      target: nextItemTarget,
    };
  } else if (
    !featuredActionable &&
    !eventsPending &&
    !eventsError &&
    outline &&
    !nextOutlineItem
  ) {
    hero = {
      kind: "caught-up",
      eyebrow: "Semua beres",
      title: "Tidak ada tenggat saat ini",
      meta: "Kelas dan aktivitas baru akan muncul di sini",
    };
  }

  const plateRows: PlateRow[] = [];
  if (next && nextState === "upcoming") {
    plateRows.push({
      key: "next-class",
      icon: next.provider === "ZOOM" ? VideoIcon : CalendarIcon,
      title: next.title,
      detail: next.joinUrl
        ? `${dateLabel(next.startsAt)} · ${next.durationMinutes} menit${next.module ? ` · ${next.module.title}` : ""} · Klik untuk bergabung`
        : `${dateLabel(next.startsAt)} · ${next.durationMinutes} menit · Lihat detail`,
      target: meetingTarget(next, courseId),
      badge: next.joinUrl && next.provider === "ZOOM" ? "Zoom ↗" : undefined,
    });
  }
  if (featured && hero?.kind !== "assessment") {
    plateRows.push({
      key: "featured-assessment",
      icon: FileTextIcon,
      title: featured.title,
      detail: `${assessmentSourceBadge(featured)} · ${assessmentAttemptPresentation(featuredAttempt).detail}${featured.closesAt ? ` · ${closesLabel(featured.closesAt, now)}` : ""}`,
      target: eventTarget(featured),
    });
  }
  if (upcomingEvent?.opensAt) {
    plateRows.push({
      key: "upcoming-assessment",
      icon: CalendarIcon,
      title: upcomingEvent.title,
      detail: `${assessmentSourceBadge(upcomingEvent)} · dibuka ${dateLabel(upcomingEvent.opensAt)}`,
      target: eventTarget(upcomingEvent),
    });
  }
  if (nextOutlineItem && nextTypeLabel && hero?.kind !== "learning") {
    plateRows.push({
      key: "next-lesson",
      icon: BookOpenIcon,
      title: nextOutlineItem.title,
      detail: `${nextTypeLabel} · ${nextOutlineItem.moduleTitle}`,
      target: nextItemTarget,
    });
  }
  if (remaining > 0) {
    plateRows.push({
      key: "more-assessments",
      icon: InboxIcon,
      title: `${remaining} lagi di Latihan`,
      detail: `${open.length} terbuka secara keseluruhan`,
      target: { href: "/learn/assessments" },
    });
  }

  return (
    // Phones drop the frame so the content gets the full width; the header
    // keeps its own rounded block.
    <article className="sm:bg-card sm:ring-foreground/10 sm:overflow-hidden sm:rounded-[20px] sm:ring-1">
      <header className="bg-muted relative flex flex-wrap items-end gap-3 overflow-hidden rounded-2xl p-4 pt-5 sm:rounded-none sm:p-6 sm:pt-12">
        <CourseCover
          title={cohort.course.title}
          thumbnailUrl={cohort.course.thumbnailUrl}
          sizes="(min-width: 768px) 768px, 100vw"
          className="absolute inset-0 blur-[3px]"
        />
        <span className="bg-background/70 absolute inset-0" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground flex-1 truncate text-xs font-semibold tracking-[1px] uppercase">
              {cohort.course.title}
            </p>
            {progress !== null ? (
              <p className="text-muted-foreground text-xs font-semibold tabular-nums">
                {completedCount}/{outlineItems.length}
              </p>
            ) : null}
          </div>
          <h2 className="text-xl leading-7 font-black tracking-tight sm:text-2xl">
            {cohort.name}
          </h2>
          {cohort.staff.length > 0 ? (
            <p className="text-muted-foreground text-xs font-semibold">
              Mentored by{" "}
              {cohort.staff
                .map((member) => member.organizationMember.user.name)
                .join(", ")}
            </p>
          ) : null}
        </div>
        {cohort.whatsappGroupUrl &&
        safeExternalUrl(cohort.whatsappGroupUrl, "whatsapp") ? (
          <a
            href={safeExternalUrl(cohort.whatsappGroupUrl, "whatsapp")!}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary/10 hover:bg-primary/20 relative flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors"
          >
            <MessageCircleIcon className="size-3.5" />
            Grup
          </a>
        ) : null}
        {progress !== null ? (
          <div
            role="progressbar"
            aria-label="Progres kurikulum"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="bg-muted absolute right-0 bottom-0 left-0 h-1"
          >
            <div
              className="bg-primary h-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 pt-4 sm:p-6">
        {hero ? <HeroBlock hero={hero} /> : null}

        {eventsPending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : null}
        {eventsError ? (
          <p role="alert" className="text-destructive text-sm">
            Aktivitas belum bisa dimuat.
          </p>
        ) : null}

        {plateRows.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-[1.2px] uppercase">
              Perlu dikerjakan
            </h3>
            <div>
              {plateRows.map((row, index) => (
                <PlateRowView
                  key={row.key}
                  row={row}
                  isLast={index === plateRows.length - 1}
                />
              ))}
            </div>
          </section>
        ) : null}

        {outline || milestoneGroup ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-muted-foreground text-xs font-bold tracking-[1.2px] uppercase">
              Materi kurikulum
            </h3>
            <SegmentedControl
              label="Tampilan materi kurikulum"
              className="w-full"
              value={segment}
              onChange={setSegment}
              options={[
                { value: "outline", label: "Bab" },
                { value: "done", label: "Selesai" },
              ]}
            />
            {segment === "outline" ? (
              outline ? (
                <CourseOutlineList
                  courseId={courseId}
                  modules={outline.modules}
                  showActiveState={false}
                  showHeader={false}
                />
              ) : (
                <OutlineSkeleton modules={1} />
              )
            ) : milestoneGroup && milestoneGroup.milestones.length > 0 ? (
              <CohortMilestoneTimeline
                courseId={courseId}
                milestones={milestoneGroup.milestones}
              />
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Belum ada aktivitas yang selesai.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </article>
  );
}
