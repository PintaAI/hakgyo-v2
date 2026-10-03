"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  FilterIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "~/components/ui/skeleton";
import { isStaleClosedOnDemandAssessment } from "~/lib/learner/assessment-state";
import { assessmentEventHref, learningItemHref } from "~/lib/learner/hrefs";
import { canOpenModule } from "~/lib/learner/study";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { closesLabel } from "../learn/cohort-card";
import { LearningItemRow } from "../learn/learning-item-row";

type Resource = "VOCABULARY_SET" | "ASSESSMENT";
type OutlineModules = RouterOutputs["learning"]["getCourseOutline"]["modules"];

type Tool = {
  key: "cards" | "assessment";
  title: string;
  subtitle: string;
  sourceLabel: string;
  icon: LucideIcon;
  resource: Resource;
};

const tools: Tool[] = [
  {
    key: "cards",
    title: "Kartu",
    subtitle: "Balik & ingat",
    sourceLabel: "Kosakata",
    icon: LayersIcon,
    resource: "VOCABULARY_SET",
  },
  {
    key: "assessment",
    title: "Quiz",
    subtitle: "Uji dirimu",
    sourceLabel: "Tugas",
    icon: CheckCircle2Icon,
    resource: "ASSESSMENT",
  },
];

export type PreselectedVocabularySource = {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId?: string;
  title?: string;
};

function GameIcon({
  tool,
  selected,
  size = 44,
}: {
  tool: Tool;
  selected?: boolean;
  size?: number;
}) {
  const Icon = tool.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-primary/10 text-primary",
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.42, height: size * 0.42 }} />
    </span>
  );
}

type StatusFilter = "all" | "todo" | "done";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "todo", label: "Belum dilatih" },
  { key: "done", label: "Sudah dilatih" },
];

type LibraryItem = {
  key: string;
  courseId: string;
  courseTitle: string;
  id: string;
  title: string;
  moduleTitle: string;
  isCompleted: boolean;
  attempt: { id: string; status: string } | null;
};

function ResourceLibrary({
  courses,
  filter,
  sourceLabel,
  outlines,
}: {
  courses: { id: string; title: string }[];
  filter: Resource;
  sourceLabel: string;
  outlines: Map<string, OutlineModules>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string | null>(null);

  const allItems: LibraryItem[] = courses.flatMap((course) =>
    (outlines.get(course.id) ?? []).flatMap((module) =>
      canOpenModule(module.access)
        ? module.items
            .filter((item) => item.type === filter)
            .map((item) => ({
              key: `${course.id}:${item.id}`,
              courseId: course.id,
              courseTitle: course.title,
              id: item.id,
              title: item.title,
              moduleTitle: module.title,
              isCompleted: item.isCompleted,
              attempt:
                item.type === "ASSESSMENT" && item.attempt
                  ? { id: item.attempt.id, status: item.attempt.status }
                  : null,
            }))
        : [],
    ),
  );
  const missingOutlineCount = courses.filter(
    (course) => !outlines.has(course.id),
  ).length;

  const normalized = query.trim().toLowerCase();
  const visible = allItems.filter((item) => {
    if (courseFilter && item.courseId !== courseFilter) return false;
    if (status === "todo" && item.isCompleted) return false;
    if (status === "done" && !item.isCompleted) return false;
    if (!normalized) return true;
    return `${item.title} ${item.moduleTitle} ${item.courseTitle}`
      .toLowerCase()
      .includes(normalized);
  });
  const upNext =
    !normalized && status === "all"
      ? visible.find((item) => !item.isCompleted)
      : undefined;
  const ordered = upNext
    ? [upNext, ...visible.filter((item) => item.key !== upNext.key)]
    : visible;
  const activeFilter = statusFilters.find((option) => option.key === status)!;

  if (courses.length === 0) {
    return (
      <p className="text-muted-foreground bg-muted/50 rounded-xl p-4 text-sm">
        Ikuti kursus untuk membuka latihan.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-primary pt-1 text-[11px] font-bold tracking-[1.5px] uppercase">
        {sourceLabel}
      </p>
      <div className="flex items-center gap-2">
        <label className="bg-primary/10 relative flex h-12 min-w-0 flex-1 items-center rounded-full">
          <SearchIcon className="text-primary pointer-events-none absolute left-4 size-5" />
          <input
            type="search"
            aria-label="Cari latihan"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              filter === "ASSESSMENT" ? "Cari quiz…" : "Cari set kosakata…"
            }
            autoComplete="off"
            className="placeholder:text-muted-foreground h-full w-full rounded-full bg-transparent px-12 text-center text-base outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setQuery("")}
              className="text-primary absolute right-2 flex size-8 items-center justify-center rounded-full"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </label>
        <button
          type="button"
          aria-label={`Filter: ${activeFilter.label}. Klik untuk mengubah.`}
          onClick={() => {
            const index = statusFilters.findIndex(
              (option) => option.key === status,
            );
            setStatus(statusFilters[(index + 1) % statusFilters.length]!.key);
          }}
          className="bg-muted flex min-h-12 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold"
        >
          <FilterIcon className="size-4" />
          {activeFilter.label}
        </button>
      </div>

      {courses.length > 1 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ id: null, title: "Semua kursus" }, ...courses].map((course) => {
            const selected = courseFilter === course.id;
            return (
              <button
                key={course.id ?? "all"}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setCourseFilter(
                    course.id === null || selected ? null : course.id,
                  )
                }
                className={cn(
                  "min-h-9 max-w-52 shrink-0 truncate rounded-full px-3.5 text-xs font-bold",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {course.title}
              </button>
            );
          })}
        </div>
      ) : null}

      {missingOutlineCount === courses.length ? (
        <p role="alert" className="text-destructive text-sm">
          Bahan latihan kamu tidak dapat dimuat.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground bg-muted/50 rounded-xl p-4 text-sm">
          {normalized
            ? "Tidak ada latihan yang cocok dengan pencarian."
            : status === "done"
              ? "Belum ada yang dilatih."
              : "Tidak ada lagi yang perlu dilatih."}
        </p>
      ) : (
        <ol>
          {ordered.map((item, index) => (
            <LearningItemRow
              key={item.key}
              title={item.title}
              type={filter}
              statusText={`${item.courseTitle} · ${item.moduleTitle}`}
              completed={item.isCompleted}
              isLast={index === ordered.length - 1}
              href={
                filter === "VOCABULARY_SET"
                  ? `/learn/practice/cards/${item.id}`
                  : learningItemHref(item.courseId, item.id, item.attempt)
              }
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function AssessmentQueue({
  events,
  now,
}: {
  events: ReturnType<typeof useActionableEvents>["events"];
  now: number;
}) {
  if (events.length === 0) return null;
  return (
    <ul className="bg-primary/10 rounded-[20px] px-4">
      {events.map((event, index) => (
        <li
          key={event.id}
          className={cn(
            index !== events.length - 1 && "border-primary/20 border-b",
          )}
        >
          <Link
            href={assessmentEventHref(event)}
            className="flex items-center gap-3 py-3.5"
          >
            <GameIcon tool={tools[1]!} size={36} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">
                {event.title}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {event.course.title}
                {event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}
              </span>
            </span>
            <span className="text-muted-foreground text-lg">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function useActionableEvents(now: number) {
  const query = api.assessmentEvent.listForLearner.useQuery();
  const events = useMemo(
    () =>
      (query.data ?? [])
        .filter((event) => !isStaleClosedOnDemandAssessment(event, now))
        .filter((event) => {
          const attempt = event.attempts[0];
          return !attempt || attempt.status === "IN_PROGRESS";
        }),
    [query.data, now],
  );
  return { events, isPending: query.isPending, isError: query.isError };
}

export function PracticeHub({
  preselectedSource,
}: {
  preselectedSource?: PreselectedVocabularySource;
}) {
  const router = useRouter();
  const [now] = useState(Date.now);
  const [toolKey, setToolKey] = useState<Tool["key"] | null>(null);
  const [sourceDismissed, setSourceDismissed] = useState(false);
  const activeSource = sourceDismissed ? undefined : preselectedSource;
  const coursesQuery = api.learning.listMyCourses.useQuery();
  const courses = coursesQuery.data;
  const outlineQueries = api.useQueries((t) =>
    (courses ?? []).map((course) =>
      t.learning.getCourseOutline({ courseId: course.id }),
    ),
  );
  // Rebuilt per render: the number of outline queries follows the courses.
  const outlines = new Map<string, OutlineModules>();
  (courses ?? []).forEach((course, index) => {
    const data = outlineQueries[index]?.data;
    if (data) outlines.set(course.id, data.modules);
  });
  const actionable = useActionableEvents(now);
  const tool = tools.find((candidate) => candidate.key === toolKey);

  function select(candidate: Tool) {
    // Deep link: a vocabulary set arrived with context, so choosing Kartu
    // launches it directly instead of asking for a source again.
    if (activeSource && candidate.key === "cards") {
      router.push(`/learn/practice/cards/${activeSource.sourceCourseItemId}`);
      return;
    }
    setToolKey(candidate.key);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-[26px] leading-8 font-black tracking-tight">
        Latihan
      </h1>

      {coursesQuery.isPending ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-28 rounded-[20px]" />
        </div>
      ) : coursesQuery.isError ? (
        <p role="alert" className="text-destructive text-sm">
          Latihan belum bisa dimuat.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void coursesQuery.refetch()}
          >
            Coba lagi
          </button>
        </p>
      ) : (
        <>
          {activeSource ? (
            <div className="bg-primary/10 flex items-center gap-2 rounded-[20px] p-4">
              <Link
                href={`/learn/${activeSource.courseId}/items/${activeSource.sourceCourseItemId}`}
                className="flex min-w-0 flex-1 flex-col gap-0.5"
              >
                <span className="text-primary text-[11px] font-bold tracking-[1.5px] uppercase">
                  Sedang dilatih
                </span>
                <span className="truncate text-[15px] font-bold">
                  {activeSource.title ?? "Set kosakata terpilih"}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  Klik untuk melihat set · Pilih game untuk mulai
                </span>
              </Link>
              <button
                type="button"
                aria-label="Hapus pilihan set kosakata"
                onClick={() => setSourceDismissed(true)}
                className="text-muted-foreground flex size-8 items-center justify-center rounded-full"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ) : null}

          <section className="flex flex-col gap-3 pt-1">
            <h2 className="text-muted-foreground text-xs font-bold tracking-[1.2px] uppercase">
              Pilih game
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((candidate) => {
                const disabled =
                  Boolean(activeSource) && candidate.resource === "ASSESSMENT";
                const selected = toolKey === candidate.key;
                return (
                  <button
                    key={candidate.key}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    title={
                      disabled
                        ? "Quiz membutuhkan tugas kelas dan tidak bisa memakai set ini"
                        : undefined
                    }
                    onClick={() => select(candidate)}
                    className={cn(
                      "flex min-h-28 flex-col justify-between gap-3 rounded-[20px] p-4 text-left transition-colors disabled:opacity-60",
                      selected
                        ? "bg-primary/15"
                        : "bg-card ring-foreground/10 enabled:hover:bg-muted/50 ring-1",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <GameIcon tool={candidate} selected={selected} />
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[9px] font-black tracking-[1px] uppercase",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {candidate.sourceLabel}
                      </span>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold">
                        {candidate.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {candidate.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {activeSource ? (
              <p className="text-muted-foreground text-xs leading-4">
                Quiz memakai tugas kelas, bukan set kosakata. Klik × di atas
                untuk melihat semua set dan quiz.
              </p>
            ) : null}
          </section>

          {tool && courses ? (
            <section className="flex flex-col gap-3">
              {tool.resource === "ASSESSMENT" ? (
                <>
                  {actionable.isPending ? (
                    <Skeleton className="h-20 w-full rounded-[20px]" />
                  ) : actionable.isError ? (
                    <p role="alert" className="text-destructive text-sm">
                      Event belum bisa dimuat.
                    </p>
                  ) : (
                    <AssessmentQueue events={actionable.events} now={now} />
                  )}
                  <Link
                    href="/learn/assessments/events"
                    className="text-muted-foreground hover:text-foreground self-start text-sm underline underline-offset-4"
                  >
                    Semua event & hasil
                  </Link>
                </>
              ) : null}
              <ResourceLibrary
                courses={courses}
                filter={tool.resource}
                sourceLabel={tool.sourceLabel}
                outlines={outlines}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
