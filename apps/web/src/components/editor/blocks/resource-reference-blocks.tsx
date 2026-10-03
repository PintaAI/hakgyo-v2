"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createReactBlockSpec } from "@blocknote/react";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  Volume2Icon,
} from "lucide-react";

import {
  ResourcePicker,
  type ResourcePickerOption,
} from "~/components/resource-picker";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  assessmentReferenceBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";
import { cn } from "~/lib/utils";

import {
  useResourceReferences,
  useVocabularyReference,
} from "../resource-reference-context";
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

/**
 * Authoring hint under an embedded resource: a lesson can only go live when
 * every embedded vocabulary set / assessment is also a visible item in the
 * lesson's module (and an embedded assessment is complete). The material
 * editor is not tied to one module, so this states the rule instead of
 * checking a specific placement; the curriculum editor shows the exact status.
 */
function EmbedReadinessHint({
  resourceType,
  questionCount,
}: {
  resourceType: ResourceType;
  questionCount?: number;
}) {
  const message =
    resourceType === "assessment" && questionCount === 0
      ? "Tugas ini belum memiliki soal. Pelajaran yang menyisipkannya belum bisa tayang sampai soalnya lengkap."
      : resourceType === "assessment"
        ? "Agar pelajaran ini bisa tayang, tugas ini juga harus ditambahkan dan ditampilkan sebagai item di bab yang sama."
        : "Agar pelajaran ini bisa tayang, set kosakata ini juga harus ditambahkan dan ditampilkan sebagai item di bab yang sama.";
  return (
    <p
      className={cn(
        "mt-2 flex items-start gap-1.5 text-xs leading-relaxed",
        resourceType === "assessment" && questionCount === 0
          ? "text-amber-700 dark:text-amber-400"
          : "text-muted-foreground",
      )}
    >
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function ResourceReferencePicker({
  resourceType,
  onSelect,
}: {
  resourceType: ResourceType;
  onSelect: (id: string) => void;
}) {
  const references = useResourceReferences();
  const callbackTokenRef = useRef<string | null>(null);
  const options = useMemo<ResourcePickerOption[]>(
    () =>
      resourceType === "vocabulary"
        ? (references?.vocabularySets ?? []).map((set) => ({
            id: set.id,
            title: set.title,
            description: set.description,
            count: set.entryCount,
            updatedAt: set.updatedAt,
          }))
        : (references?.assessments ?? []).map((assessment) => ({
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
            count: assessment.questionCount,
            updatedAt: assessment.updatedAt,
          })),
    [references?.assessments, references?.vocabularySets, resourceType],
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
      <ResourcePicker
        kind={resourceType === "vocabulary" ? "VOCABULARY_SET" : "ASSESSMENT"}
        options={options}
        value={null}
        onValueChange={onSelect}
        loading={references.isLoading}
        defaultSortLabel="Urutan library"
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        Pelajaran hanya bisa tayang jika{" "}
        {resourceType === "vocabulary" ? "set kosakata" : "tugas"} yang
        disisipkan juga ditampilkan sebagai item di bab yang sama.
      </p>
      <button
        className="text-primary inline-flex items-center gap-2 text-sm font-semibold hover:underline"
        onClick={createResource}
        type="button"
      >
        <PlusIcon className="size-4" />
        {resourceType === "vocabulary" ? "Tambah set kosakata" : "Tambah tugas"}
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
      const { resource, isLoading: isResourceLoading } = useVocabularyReference(
        block.props.vocabularySetId,
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
            <ResourceReferencePicker
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
                    <BookOpenCheckIcon className="size-4" /> Kosakata
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
                {editor.isEditable && references?.editable ? (
                  <EmbedReadinessHint resourceType="vocabulary" />
                ) : null}
              </div>
            </section>
          ) : isResourceLoading ? (
            <p className="text-muted-foreground flex items-center gap-2 rounded-xl border p-5 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" /> Memuat set
              kosakata
            </p>
          ) : (
            <p className="text-destructive rounded-xl border border-dashed p-5 text-sm">
              Set kosakata tidak tersedia. Simpan materi untuk membersihkan
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
            <ResourceReferencePicker
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
                  Mulai tugas <ArrowRightIcon />
                </a>
              ) : editor.isEditable ? (
                resource.questionCount === 0 ? (
                  <Badge variant="destructive">Belum ada soal</Badge>
                ) : (
                  <Badge variant="outline">{resource.questionCount} soal</Badge>
                )
              ) : (
                <Badge variant="outline">Belum tersedia</Badge>
              )}
            </section>
          ) : references?.isLoading ? (
            <p className="text-muted-foreground flex items-center gap-2 rounded-xl border p-5 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" /> Memuat tugas
            </p>
          ) : (
            <p className="text-destructive rounded-xl border border-dashed p-5 text-sm">
              Tugas tidak tersedia. Simpan materi untuk membersihkan block ini.
            </p>
          )}
          {resource &&
          !changing &&
          editor.isEditable &&
          references?.editable ? (
            <EmbedReadinessHint
              resourceType="assessment"
              questionCount={resource.questionCount}
            />
          ) : null}
        </div>
      );
    },
  },
)();
