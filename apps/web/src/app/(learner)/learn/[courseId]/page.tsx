import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CircleIcon,
  ClipboardCheckIcon,
  LanguagesIcon,
  LockIcon,
  RouteIcon,
  SmartphoneIcon,
} from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { appHandoffPath } from "~/lib/mobile-app";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Course" };

const itemIcons = {
  MATERIAL: BookOpenIcon,
  ASSESSMENT: ClipboardCheckIcon,
  VOCABULARY_SET: LanguagesIcon,
};

export default async function LearningCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await api.learning.getCourseOutline({ courseId });
  const allItems = course.modules.flatMap((module) => module.items);
  const completed = allItems.filter((item) => item.isCompleted).length;
  const percent = allItems.length
    ? Math.round((completed / allItems.length) * 100)
    : 0;
  const nextModule = course.modules.find(
    (module) =>
      module.access !== "LOCKED" &&
      module.items.some((item) => !item.isCompleted),
  );
  const nextItem = nextModule?.items.find((item) => !item.isCompleted);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <Link
        href="/learn/courses"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon /> Dashboard
      </Link>

      <section className="bg-foreground text-background relative overflow-hidden rounded-lg px-5 py-6 sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute top-0 right-0 size-52 translate-x-16 -translate-y-20 rounded-full border border-current opacity-10" />
        <div className="pointer-events-none absolute top-0 right-0 size-36 translate-x-10 -translate-y-12 rounded-full border border-current opacity-10" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_15rem] md:items-end">
          <div>
            <span className="text-background/70 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <RouteIcon className="mr-1.5 inline size-3.5" />
              {course.progressionMode === "SEQUENTIAL"
                ? "Belajar berurutan"
                : "Akses terbuka"}
            </span>
            <h1 className="font-heading mt-4 max-w-3xl text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
              {course.title}
            </h1>
            <p className="text-background/70 mt-3 max-w-2xl text-sm leading-relaxed">
              {completed === allItems.length && allItems.length
                ? "Hebat, semua aktivitas di course ini sudah kamu selesaikan."
                : "Bangun pemahaman sedikit demi sedikit. Progress kamu tersimpan otomatis."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {nextItem ? (
                <Link
                  href={`/learn/${courseId}/items/${nextItem.id}`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-background text-foreground hover:bg-background",
                  )}
                >
                  Lanjut: {nextItem.title} <ArrowRightIcon />
                </Link>
              ) : null}
              <Link
                href={appHandoffPath(courseId)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-background/25 bg-background/5 text-background hover:bg-background/10 hover:text-background",
                )}
              >
                <SmartphoneIcon /> Buka di aplikasi
              </Link>
            </div>
          </div>
          <div className="border-background/15 border-l pl-5">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-semibold tabular-nums">
                  {percent}%
                </span>
                <p className="text-background/70 mt-1 text-xs">
                  Progress keseluruhan
                </p>
              </div>
              <span className="text-background/70 text-xs">
                {completed}/{allItems.length}
              </span>
            </div>
            <Progress
              value={percent}
              className="[&_[data-slot=progress-indicator]]:bg-background [&_[data-slot=progress-track]]:bg-background/20 mt-4 [&_[data-slot=progress-track]]:h-1.5"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-muted-foreground text-sm">Jalur belajar</p>
          <h2 className="font-heading mt-1 text-xl font-medium">Isi course</h2>
        </div>
        {course.modules.length ? (
          <div className="space-y-4">
            {course.modules.map((module, moduleIndex) => {
              const locked = module.access === "LOCKED";
              return (
                <article
                  key={module.id}
                  className={cn(
                    "bg-card ring-foreground/10 overflow-hidden rounded-lg ring-1",
                    locked && "bg-muted/30 opacity-75",
                  )}
                >
                  <div className="flex gap-4 border-b p-5 md:p-6">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl font-semibold",
                        module.isCompleted
                          ? "bg-foreground text-background"
                          : locked
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted text-foreground",
                      )}
                    >
                      {module.isCompleted ? (
                        <CheckIcon className="size-5" />
                      ) : locked ? (
                        <LockIcon className="size-4" />
                      ) : (
                        String(moduleIndex + 1).padStart(2, "0")
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{module.title}</h3>
                        {module.isCompleted ? (
                          <Badge variant="outline">Selesai</Badge>
                        ) : null}
                        {locked ? (
                          <Badge variant="secondary">Terkunci</Badge>
                        ) : null}
                      </div>
                      {module.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {module.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="divide-y">
                    {module.items.length ? (
                      module.items.map((item) => {
                        const Icon = itemIcons[item.type];
                        const content = (
                          <>
                            <span
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                item.isCompleted
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {item.title}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {item.type === "MATERIAL"
                                  ? "Materi"
                                  : item.type === "ASSESSMENT"
                                    ? "Tugas"
                                    : "Latihan kosakata"}
                              </span>
                            </span>
                            {item.isCompleted ? (
                              <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                                <CheckIcon className="size-3.5" /> Selesai
                              </span>
                            ) : locked ? (
                              <LockIcon className="text-muted-foreground size-4" />
                            ) : (
                              <ArrowRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1" />
                            )}
                          </>
                        );
                        return locked ? (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-5 py-4 md:px-6"
                          >
                            {content}
                          </div>
                        ) : (
                          <Link
                            key={item.id}
                            href={`/learn/${courseId}/items/${item.id}`}
                            className="group hover:bg-muted/50 flex items-center gap-3 px-5 py-4 transition-colors md:px-6"
                          >
                            {content}
                          </Link>
                        );
                      })
                    ) : (
                      <div className="text-muted-foreground flex items-center gap-2 px-6 py-4 text-sm">
                        <CircleIcon className="size-3" /> Belum ada aktivitas di
                        bab ini.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={RouteIcon}
            title="Belum ada bab"
            description="Course ini belum memiliki bab belajar."
          />
        )}
      </section>
    </div>
  );
}
