"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LanguagesIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SparklesIcon,
  Volume2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DynamicLearnerBlockNoteDocument } from "~/components/editor/dynamic-learner-block-note-document";
import type { HakgyoPartialBlock } from "~/components/editor/block-note-schema";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type CourseItem = NonNullable<RouterOutputs["learning"]["getCourseItem"]>;

function getExampleText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string");
    return typeof first === "string" ? first : null;
  }
  if (value && typeof value === "object") {
    const example = (value as Record<string, unknown>).example;
    return typeof example === "string" ? example : null;
  }
  return null;
}

export function LearnerCourseItem({
  courseId,
  courseItemId,
  item,
}: {
  courseId: string;
  courseItemId: string;
  item: CourseItem;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const markProgress = api.learning.markContentProgress.useMutation();
  const { resolvedTheme } = useTheme();
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const completed = item.progress[0]?.status === "COMPLETED";

  useEffect(() => {
    if (!item.progress.length) {
      markProgress.mutate(
        { courseItemId, status: "IN_PROGRESS" },
        {
          onError: (error) => {
            // Silently ignore idempotent / already-completed errors;
            // real PRECONDITION_FAILED / FORBIDDEN on IN_PROGRESS should not happen
            // but log for debugging without spamming console.error
            if (
              error instanceof Error &&
              error.message.includes("PRECONDITION_FAILED")
            ) {
              return;
            }
          },
        },
      );
    }
    // Progress creation is an idempotent one-time action for this item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseItemId, item.progress.length]);

  const completeItem = async () => {
    try {
      await markProgress.mutateAsync({ courseItemId, status: "COMPLETED" });
      await Promise.all([
        utils.learning.getCourseItem.invalidate({ courseItemId }),
        utils.learning.getCourseOutline.invalidate({ courseId }),
        utils.learning.listMyCourses.invalidate(),
      ]);
      toast.success("Aktivitas selesai. Progress kamu sudah disimpan.");
      router.push(`/learn/${courseId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Aktivitas belum dapat diselesaikan.",
      );
    }
  };

  const material = item.material;
  const vocabulary = item.vocabularySet;
  const entries = vocabulary?.entries ?? [];
  const currentEntry = entries[cardIndex];
  const reviewPercent = entries.length
    ? Math.round((reviewed.size / entries.length) * 100)
    : 0;

  const nextCard = () => {
    if (!currentEntry) return;
    setReviewed((current) => new Set(current).add(currentEntry.id));
    setRevealed(false);
    setCardIndex((current) => (current + 1) % entries.length);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/learn/${courseId}`}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-muted-foreground -ml-2",
          )}
        >
          <ArrowLeftIcon /> Kembali ke course
        </Link>
        {material && !completed ? (
          <Button
            onClick={completeItem}
            disabled={markProgress.isPending}
            size="sm"
          >
            {markProgress.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <CheckCircle2Icon />
            )}
            Tandai selesai
          </Button>
        ) : completed ? (
          <Badge variant="outline">
            <CheckCircle2Icon /> Selesai
          </Badge>
        ) : null}
      </div>

      {material ? (
        <DynamicLearnerBlockNoteDocument
          content={material.content as HakgyoPartialBlock[]}
          resources={item.embeddedResources}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        />
      ) : vocabulary ? (
        <div className="space-y-6">
          <header className="relative overflow-hidden rounded-lg bg-foreground px-5 py-6 text-background sm:px-7 sm:py-8">
            <div className="pointer-events-none absolute top-0 right-0 size-52 translate-x-16 -translate-y-20 rounded-full border border-current opacity-10" />
            <div className="pointer-events-none absolute top-0 right-0 size-36 translate-x-10 -translate-y-12 rounded-full border border-current opacity-10" />
            <div className="relative">
              <Badge className="border-white/15 bg-background/10 text-white">
                <LanguagesIcon /> Studio kosakata
              </Badge>
              <h1 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-5xl">
                {vocabulary.title}
              </h1>
              {vocabulary.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {vocabulary.description}
                </p>
              ) : null}
              <div className="mt-6 max-w-md">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>{reviewed.size} kata dipelajari</span>
                  <span>{reviewPercent}%</span>
                </div>
                <Progress
                  value={reviewPercent}
                  className="[&_[data-slot=progress-indicator]]:bg-background [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-background/20"
                />
              </div>
            </div>
          </header>

          {currentEntry ? (
            <section className="grid gap-5 lg:grid-cols-[1fr_17rem]">
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="bg-card ring-foreground/10 group hover:bg-muted/20 relative min-h-96 overflow-hidden rounded-lg p-8 text-left ring-1 transition-colors md:p-12"
              >
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                      Kartu {cardIndex + 1} dari {entries.length}
                    </span>
                    {currentEntry.audioAsset ? (
                      <span className="bg-muted flex size-9 items-center justify-center rounded-full">
                        <Volume2Icon className="size-4" />
                      </span>
                    ) : null}
                  </div>
                  <div className="my-auto py-12 text-center">
                    <p className="text-4xl font-semibold tracking-tight md:text-6xl">
                      {currentEntry.term}
                    </p>
                    <div
                      className={cn(
                        "mx-auto mt-8 max-w-xl transition-all duration-300",
                        revealed
                          ? "translate-y-0 opacity-100"
                          : "translate-y-3 opacity-0",
                      )}
                    >
                      <div className="bg-foreground/20 mx-auto mb-7 h-px w-16" />
                      <p className="text-lg leading-relaxed md:text-xl">
                        {currentEntry.definition}
                      </p>
                      {getExampleText(currentEntry.examples) ? (
                        <p className="text-muted-foreground mt-4 text-sm italic">
                          “{getExampleText(currentEntry.examples)}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-muted-foreground text-center text-sm transition-opacity",
                      revealed && "opacity-0",
                    )}
                  >
                    <SparklesIcon className="mr-1 inline size-4" /> Ketuk kartu
                    untuk melihat arti
                  </p>
                </div>
              </button>
              <aside className="bg-card ring-foreground/10 flex flex-col rounded-lg p-5 ring-1">
                <p className="text-sm font-semibold">Sesi belajar</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Baca istilah, tebak artinya, lalu balik kartu.
                </p>
                <div className="mt-6 space-y-2">
                  {entries.map((entry, index) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => {
                        setCardIndex(index);
                        setRevealed(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        index === cardIndex
                          ? "bg-foreground text-background font-medium"
                          : "hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          reviewed.has(entry.id)
                            ? "bg-foreground"
                            : "bg-border",
                        )}
                      />
                      <span className="truncate">{entry.term}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-auto space-y-2 pt-6">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setRevealed((value) => !value)}
                  >
                    <RotateCcwIcon />{" "}
                    {revealed ? "Sembunyikan arti" : "Balik kartu"}
                  </Button>
                  <Button className="w-full" onClick={nextCard}>
                    Saya sudah ingat <ArrowRightIcon />
                  </Button>
                </div>
              </aside>
            </section>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-12 text-center">
              Set ini belum memiliki kosakata.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={completeItem}
              disabled={completed || markProgress.isPending || !entries.length}
              size="lg"
            >
              {markProgress.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CheckCircle2Icon />
              )}
              {completed ? "Latihan selesai" : "Selesaikan latihan"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
