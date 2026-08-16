"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheckIcon,
  LibraryIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  WorkflowIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function AssessmentLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const assessments = api.assessment.list.useQuery({ organizationId });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const visibleAssessments =
    assessments.data?.filter((assessment) =>
      `${assessment.title} ${assessment.description ?? ""}`
        .toLocaleLowerCase()
        .includes(deferredSearch),
    ) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <LibraryIcon className="size-4" />
            Content library
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Assessments
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Build reusable quizzes and tests, then add them to any course in
            this workspace.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationSlug}/library/assessments/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          New assessment
        </Link>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Search assessments"
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search assessments"
          value={search}
        />
      </div>

      {assessments.isPending ? (
        <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Loading assessments
        </div>
      ) : assessments.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-destructive text-sm">
            {assessments.error.message}
          </p>
          <Button variant="outline" onClick={() => assessments.refetch()}>
            Try again
          </Button>
        </div>
      ) : visibleAssessments.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleAssessments.map((assessment) => (
            <Link
              href={`/workspace/${organizationSlug}/library/assessments/${assessment.id}`}
              key={assessment.id}
              className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/20 group-hover:bg-muted/20 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      <ClipboardCheckIcon className="size-5" />
                    </div>
                    <Badge variant="outline">
                      {STATUS_LABEL[assessment.status] ?? assessment.status}
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-heading truncate font-semibold">
                      {assessment.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                      {assessment.description ?? "No description yet."}
                    </p>
                  </div>
                  <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <ListChecksIcon className="size-3.5" />
                      {assessment._count.questions} questions
                    </span>
                    <span className="flex items-center gap-1.5">
                      <WorkflowIcon className="size-3.5" />
                      {assessment._count.courseItems} course items
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
            <ClipboardCheckIcon className="size-5" />
          </div>
          <h2 className="font-heading font-semibold">
            {deferredSearch
              ? "No matching assessments"
              : "Create your first assessment"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {deferredSearch
              ? "Try a different title or description."
              : "Write a reusable quiz or test with graded questions."}
          </p>
          {!deferredSearch && (
            <Link
              href={`/workspace/${organizationSlug}/library/assessments/new`}
              className={buttonVariants({ className: "mt-4" })}
            >
              <PlusIcon data-icon="inline-start" />
              New assessment
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
