"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createReactBlockSpec } from "@blocknote/react";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  Volume2Icon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  assessmentReferenceBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";
import { cn } from "~/lib/utils";

import { useResourceReferences } from "../resource-reference-context";
import { AssetUrl } from "./asset-media-block";
import { CustomBlockToolbar } from "./custom-block-toolbar";

const callbackMessageType = "hakgyo:resource-created";
const searchableEntryThreshold = 8;

type ResourceType = "assessment" | "vocabulary";

function firstExample(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const example = value.find((item) => typeof item === "string");
    return typeof example === "string" ? example : null;
  }
  if (value && typeof value === "object" && "example" in value) {
    const example = (value as { example?: unknown }).example;
    return typeof example === "string" ? example : null;
  }
  return null;
}

function ResourcePicker({
  resourceType,
  onSelect,
}: {
  resourceType: ResourceType;
  onSelect: (id: string) => void;
}) {
  const references = useResourceReferences();
  const callbackTokenRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const resources =
    resourceType === "vocabulary"
      ? (references?.vocabularySets ?? [])
      : (references?.assessments ?? []);
  const filtered = resources.filter((resource) =>
    `${resource.title} ${resource.description ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const receiveCreatedResource = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (
        data.type !== callbackMessageType ||
        data.token !== callbackTokenRef.current ||
        data.resourceType !== resourceType ||
        typeof data.resourceId !== "string"
      ) {
        return;
      }
      callbackTokenRef.current = null;
      void references
        ?.refresh()
        .finally(() => onSelect(data.resourceId as string));
    };
    window.addEventListener("message", receiveCreatedResource);
    return () => window.removeEventListener("message", receiveCreatedResource);
  }, [onSelect, references, resourceType]);

  const createResource = () => {
    if (!references?.organizationSlug) return;
    const token = crypto.randomUUID();
    callbackTokenRef.current = token;
    const segment =
      resourceType === "vocabulary" ? "vocabulary" : "assessments";
    const url = new URL(
      `/workspace/${encodeURIComponent(references.organizationSlug)}/library/${segment}/new`,
      window.location.origin,
    );
    url.searchParams.set("pickerToken", token);
    url.searchParams.set(
      "returnTo",
      `${window.location.pathname}${window.location.search}`,
    );
    window.open(url, "_blank");
  };

  if (!references?.editable) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
        Resource ini tidak tersedia.
      </p>
    );
  }

  return (
    <div className="bg-muted/20 space-y-3 rounded-xl border p-4">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label={`Cari ${resourceType === "vocabulary" ? "set kosakata" : "assessment"}`}
          className="pl-9"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            resourceType === "vocabulary"
              ? "Cari set kosakata..."
              : "Cari assessment..."
          }
          value={query}
        />
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {references.isLoading ? (
          <p className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin" /> Memuat library
          </p>
        ) : filtered.length ? (
          filtered.map((resource) => (
            <button
              className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left transition bg-background"
              key={resource.id}
              onClick={() => onSelect(resource.id)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {resource.title}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {resource.description ?? "Tanpa deskripsi"}
                </span>
              </span>
              {"status" in resource ? (
                <Badge variant="outline">{resource.status}</Badge>
              ) : null}
            </button>
          ))
        ) : (
          <p className="text-muted-foreground p-3 text-center text-sm">
            Tidak ada resource yang cocok.
          </p>
        )}
      </div>
      <button
        className="text-primary inline-flex items-center gap-2 text-sm font-semibold hover:underline"
        onClick={createResource}
        type="button"
      >
        <PlusIcon className="size-4" />
        {resourceType === "vocabulary"
          ? "Tambah vocabulary set"
          : "Tambah assessment"}
        <ExternalLinkIcon className="size-3.5" />
      </button>
    </div>
  );
}

export const vocabularyReferenceBlock = createReactBlockSpec(
  {
    type: vocabularyReferenceBlockType,
    propSchema: { vocabularySetId: { default: "" } },
    content: "none",
  },
  {
    render: function VocabularyReferenceRender({ block, editor }) {
      const references = useResourceReferences();
      const [changing, setChanging] = useState(false);
      const [query, setQuery] = useState("");
      const resource = references?.vocabularySets.find(
        (set) => set.id === block.props.vocabularySetId,
      );
      const entries = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return resource?.entries ?? [];
        return (resource?.entries ?? []).filter((entry) =>
          `${entry.term} ${entry.definition}`
            .toLowerCase()
            .includes(normalizedQuery),
        );
      }, [query, resource]);
      const practiceHref = references?.learner
        ? `/learn/vocabulary/${encodeURIComponent(block.props.vocabularySetId)}?source=${encodeURIComponent(references.learner.sourceCourseItemId)}`
        : undefined;

      return (
        <div className="my-3 w-full" contentEditable={false} data-custom-block>
          {editor.isEditable ? (
            <div className="mb-2 flex items-center justify-end gap-2">
              {resource ? (
                <button
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold"
                  onClick={() => setChanging((value) => !value)}
                  type="button"
                >
                  {changing ? "Batal" : "Ganti resource"}
                </button>
              ) : null}
              <CustomBlockToolbar
                block={block}
                editable
                onClear={() =>
                  editor.updateBlock(block, { props: { vocabularySetId: "" } })
                }
              />
            </div>
          ) : null}

          {!block.props.vocabularySetId || changing ? (
            <ResourcePicker
              resourceType="vocabulary"
              onSelect={(vocabularySetId) => {
                editor.updateBlock(block, { props: { vocabularySetId } });
                setChanging(false);
              }}
            />
          ) : resource ? (
            <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
              <header className="bg-primary/5 flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-primary flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                    <BookOpenCheckIcon className="size-4" /> Vocabulary
                  </p>
                  <h3 className="font-heading mt-2 text-2xl font-semibold">
                    {resource.title}
                  </h3>
                  {resource.description ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {resource.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant="secondary">
                  {resource.entries.length} kata
                </Badge>
              </header>
              <div className="space-y-4 p-5">
                {resource.entries.length > searchableEntryThreshold ? (
                  <div className="relative max-w-sm">
                    <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      aria-label="Cari kosakata dalam block"
                      className="pl-9"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari istilah atau arti..."
                      value={query}
                    />
                  </div>
                ) : null}
                {entries.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {entries.map((entry) => {
                      const example = firstExample(entry.examples);
                      return (
                        <article
                          className="grid min-w-0 gap-3 rounded-xl border p-4"
                          key={entry.id}
                        >
                          {entry.imageAsset ? (
                            <AssetUrl assetId={entry.imageAsset.id}>
                              {(url, loading) =>
                                loading ? (
                                  <div className="bg-muted h-32 animate-pulse rounded-lg" />
                                ) : url ? (
                                  <Image
                                    alt={entry.term}
                                    className="h-32 w-full rounded-lg object-cover"
                                    height={128}
                                    src={url}
                                    unoptimized
                                    width={320}
                                  />
                                ) : null
                              }
                            </AssetUrl>
                          ) : null}
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-lg font-bold">
                                {entry.term}
                              </h4>
                              {entry.audioAsset ? (
                                <AssetUrl assetId={entry.audioAsset.id}>
                                  {(url) =>
                                    url ? (
                                      <audio
                                        src={url}
                                        preload="none"
                                        controls
                                        className="h-8 max-w-36"
                                      />
                                    ) : (
                                      <Volume2Icon className="text-muted-foreground size-4" />
                                    )
                                  }
                                </AssetUrl>
                              ) : null}
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {entry.definition}
                            </p>
                            {example ? (
                              <p className="mt-2 text-sm italic">“{example}”</p>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                    {resource.entries.length
                      ? "Tidak ada kosakata yang cocok."
                      : "Set ini belum memiliki kosakata."}
                  </p>
                )}
                {practiceHref ? (
                  <a
                    className={cn(buttonVariants(), "w-full sm:w-auto")}
                    href={practiceHref}
                  >
                    Hafalkan kosakata <ArrowRightIcon />
                  </a>
                ) : null}
              </div>
            </section>
          ) : references?.isLoading ? (
            <p className="text-muted-foreground flex items-center gap-2 rounded-xl border p-5 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" /> Memuat
              vocabulary set
            </p>
          ) : (
            <p className="text-destructive rounded-xl border border-dashed p-5 text-sm">
              Vocabulary set tidak tersedia. Simpan materi untuk membersihkan
              block ini.
            </p>
          )}
        </div>
      );
    },
  },
)();

export const assessmentReferenceBlock = createReactBlockSpec(
  {
    type: assessmentReferenceBlockType,
    propSchema: { assessmentId: { default: "" } },
    content: "none",
  },
  {
    render: function AssessmentReferenceRender({ block, editor }) {
      const references = useResourceReferences();
      const [changing, setChanging] = useState(false);
      const resource = references?.assessments.find(
        (assessment) => assessment.id === block.props.assessmentId,
      );
      const assessmentHref =
        references?.learner && resource?.courseItemId
          ? `/learn/${encodeURIComponent(references.learner.courseId)}/items/${encodeURIComponent(resource.courseItemId)}`
          : undefined;

      return (
        <div className="my-3 w-full" contentEditable={false} data-custom-block>
          {editor.isEditable ? (
            <div className="mb-2 flex items-center justify-end gap-2">
              {resource ? (
                <button
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold"
                  onClick={() => setChanging((value) => !value)}
                  type="button"
                >
                  {changing ? "Batal" : "Ganti resource"}
                </button>
              ) : null}
              <CustomBlockToolbar
                block={block}
                editable
                onClear={() =>
                  editor.updateBlock(block, { props: { assessmentId: "" } })
                }
              />
            </div>
          ) : null}

          {!block.props.assessmentId || changing ? (
            <ResourcePicker
              resourceType="assessment"
              onSelect={(assessmentId) => {
                editor.updateBlock(block, { props: { assessmentId } });
                setChanging(false);
              }}
            />
          ) : resource ? (
            <section className="bg-card flex flex-col gap-5 rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center">
              <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
                <ClipboardCheckIcon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Assessment · {resource.questionCount} soal
                </p>
                <h3 className="font-heading mt-1 text-xl font-semibold">
                  {resource.title}
                </h3>
                {resource.description ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {resource.description}
                  </p>
                ) : null}
              </div>
              {assessmentHref ? (
                <a
                  className={cn(buttonVariants(), "shrink-0")}
                  href={assessmentHref}
                >
                  Mulai assessment <ArrowRightIcon />
                </a>
              ) : editor.isEditable ? (
                <Badge variant="outline">{resource.status ?? "Draft"}</Badge>
              ) : (
                <Badge variant="outline">Belum tersedia</Badge>
              )}
            </section>
          ) : references?.isLoading ? (
            <p className="text-muted-foreground flex items-center gap-2 rounded-xl border p-5 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" /> Memuat
              assessment
            </p>
          ) : (
            <p className="text-destructive rounded-xl border border-dashed p-5 text-sm">
              Assessment tidak tersedia. Simpan materi untuk membersihkan block
              ini.
            </p>
          )}
        </div>
      );
    },
  },
)();
