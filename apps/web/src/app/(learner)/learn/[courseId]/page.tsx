import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { CourseOutlineList } from "~/components/learner/learn/course-outline-list";
import { buttonVariants } from "~/components/ui/button";
import { getCourseResumeItem } from "~/lib/learner/course-learning-path";
import { learningItemHref } from "~/lib/learner/hrefs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Kursus" };

export default async function LearningCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await api.learning.getCourseOutline({ courseId });
  const allItems = course.modules.flatMap((module) => module.items);
  const completedCount = allItems.filter((item) => item.isCompleted).length;
  const progress = allItems.length
    ? Math.round((completedCount / allItems.length) * 100)
    : 0;
  const resumeItem = getCourseResumeItem(course);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link
        href="/learn/courses"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "text-muted-foreground -mb-4 -ml-2 self-start",
        )}
      >
        <ArrowLeftIcon /> Belajar
      </Link>

      <header className="bg-muted relative overflow-hidden rounded-[20px]">
        <CourseCover
          title={course.title}
          thumbnailUrl={course.thumbnailUrl}
          sizes="(min-width: 768px) 768px, 100vw"
          className="absolute inset-0 blur-[5px]"
        />
        <span className="bg-background/70 absolute inset-0" />
        <div className="relative flex flex-col gap-2 px-5 pt-8 pb-7 sm:px-8">
          <p className="text-muted-foreground text-center text-xs font-semibold tracking-[1.5px] uppercase">
            {course.organization.name}
          </p>
          <h1 className="text-3xl leading-9 font-black tracking-tight">
            {course.title}
          </h1>
          {course.description ? (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-5">
              {course.description}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
            {completedCount} dari {allItems.length} selesai
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Progres kursus"
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
      </header>

      {resumeItem ? (
        <Link
          href={learningItemHref(
            courseId,
            resumeItem.id,
            resumeItem.type === "ASSESSMENT" ? resumeItem.attempt : undefined,
          )}
          className="border-primary/30 bg-primary/10 hover:bg-primary/15 flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-primary text-[10px] font-bold tracking-[1.5px] uppercase">
              {completedCount ? "Lanjutkan belajar" : "Mulai belajar"}
            </span>
            <span className="truncate text-base font-black">
              {resumeItem.title}
            </span>
          </span>
          <ArrowRightIcon className="text-primary size-5 shrink-0" />
        </Link>
      ) : allItems.length > 0 && completedCount === allItems.length ? (
        <div className="border-primary/30 bg-primary/10 flex flex-col gap-2 rounded-2xl border p-5">
          <p className="text-xl font-black">🏆 Kursus selesai!</p>
          <p className="text-muted-foreground text-sm leading-6">
            Kamu berhasil! Semua aktivitas sudah selesai — buka lagi materi di
            bawah kapan pun kamu ingin mengulang.
          </p>
        </div>
      ) : null}

      <CourseOutlineList
        courseId={courseId}
        modules={course.modules}
        showActiveState={false}
      />
    </div>
  );
}
