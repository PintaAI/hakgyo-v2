"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import {
  LanguagesIcon,
  LibraryIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export function VocabularyLibrary({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const vocabularySets = api.content.listVocabularySets.useQuery({
    organizationId,
  });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const visibleSets =
    vocabularySets.data?.filter((set) =>
      `${set.title} ${set.description ?? ""} ${set.entries
        .map((entry) => `${entry.term} ${entry.definition}`)
        .join(" ")}`
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
            Vocabulary
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Create reusable word sets with definitions and examples for lessons
            and course requirements.
          </p>
        </div>
        <Link
          href={`/workspace/${organizationSlug}/library/vocabulary/new`}
          className={buttonVariants()}
        >
          <PlusIcon data-icon="inline-start" />
          New vocabulary set
        </Link>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          aria-label="Search vocabulary sets"
          className="pl-8"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search sets, terms, or definitions"
          value={search}
        />
      </div>

      {vocabularySets.isPending ? (
        <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Loading vocabulary
        </div>
      ) : vocabularySets.error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-destructive text-sm">
            {vocabularySets.error.message}
          </p>
          <Button variant="outline" onClick={() => vocabularySets.refetch()}>
            Try again
          </Button>
        </div>
      ) : visibleSets.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSets.map((set) => (
            <Link
              href={`/workspace/${organizationSlug}/library/vocabulary/${set.id}`}
              key={set.id}
              className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/20 group-hover:bg-muted/20 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      <LanguagesIcon className="size-5" />
                    </div>
                    <Badge variant="outline">
                      {set.entries.length}{" "}
                      {set.entries.length === 1 ? "term" : "terms"}
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-heading truncate font-semibold">
                      {set.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
                      {set.description ?? "No description yet."}
                    </p>
                  </div>
                  <div className="mt-auto flex min-h-7 flex-wrap gap-1.5 border-t pt-4">
                    {set.entries.slice(0, 3).map((entry) => (
                      <Badge key={entry.id} variant="secondary">
                        {entry.term}
                      </Badge>
                    ))}
                    {set.entries.length > 3 && (
                      <span className="text-muted-foreground self-center text-xs">
                        +{set.entries.length - 3} more
                      </span>
                    )}
                    {!set.entries.length && (
                      <span className="text-muted-foreground text-xs">
                        No terms added yet
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="bg-background mb-4 flex size-12 items-center justify-center rounded-xl border shadow-sm">
            <LanguagesIcon className="size-5" />
          </div>
          <h2 className="font-heading font-semibold">
            {deferredSearch
              ? "No matching vocabulary"
              : "Create your first vocabulary set"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {deferredSearch
              ? "Try a different set title, term, or definition."
              : "Group related terms into a set you can reuse across courses."}
          </p>
          {!deferredSearch && (
            <Link
              href={`/workspace/${organizationSlug}/library/vocabulary/new`}
              className={buttonVariants({ className: "mt-4" })}
            >
              <PlusIcon data-icon="inline-start" />
              New vocabulary set
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
