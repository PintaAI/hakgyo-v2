"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  ImageIcon,
  LanguagesIcon,
  LoaderCircleIcon,
  MessageSquareQuoteIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useAssetDownloadUrl } from "~/components/asset-download-url";
import {
  AiImportButton,
  firstImageFile,
  type PreparedImportImage,
} from "~/components/ai-image-import";
import {
  useVocabularyImageImport,
  type ExtractedVocabularyEntry,
  type ImportedVocabularyEntry,
} from "~/components/vocabulary-image-import";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  completeResourcePicker,
  resourcePickerQuery,
} from "~/lib/resource-picker-callback";

type VocabularySet = RouterOutputs["content"]["getVocabularySet"];
type VocabularyEntry = VocabularySet["entries"][number];

type EntryFields = {
  term: string;
  definition: string;
  examples: string[];
};

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

function examplesToText(examples: unknown) {
  if (
    Array.isArray(examples) &&
    examples.every((item) => typeof item === "string")
  ) {
    return examples.join("\n");
  }
  return typeof examples === "string" ? examples : "";
}

function parseExamples(value: string) {
  return value
    .split("\n")
    .map((example) => example.trim())
    .filter(Boolean);
}

function hasDraggedFiles(event: DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

/** Splits dropped or pasted files into the first image and first audio. */
function pickEntryAssets(files: FileList | null | undefined) {
  const list = Array.from(files ?? []);
  return {
    image: list.find((file) => file.type.startsWith("image/")),
    audio: list.find((file) => file.type.startsWith("audio/")),
  };
}

/**
 * Runs `onChange` only when `value` actually differs from the previously
 * seen value — never on mount. Unlike a "skip first run" boolean ref, this
 * is safe under StrictMode's double-invoked mount effects, where the first
 * (discarded) pass would otherwise flip the flag and make the second pass
 * look like a real change.
 */
function useOnDraftChange<T>(
  value: T,
  isEqual: (a: T, b: T) => boolean,
  onChange: (value: T) => void,
) {
  const previousRef = useRef<{ value: T } | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const previous = previousRef.current;
    if (!previous) {
      previousRef.current = { value };
      return;
    }
    if (isEqual(previous.value, value)) return;
    previousRef.current = { value };
    onChangeRef.current(value);
  });
}

function AudioPlayer({ assetId }: { assetId: string }) {
  const { url, failed } = useAssetDownloadUrl(assetId);

  if (failed) {
    return <p className="text-destructive text-xs">Audio gagal dimuat.</p>;
  }
  if (!url) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <LoaderCircleIcon className="size-3.5 animate-spin" /> Memuat audio
      </span>
    );
  }
  return <audio className="h-9 w-full" controls preload="none" src={url} />;
}

function AssetImage({ assetId, alt }: { assetId: string; alt: string }) {
  const { url, failed } = useAssetDownloadUrl(assetId);

  if (failed) {
    return (
      <span className="bg-muted text-destructive flex size-14 items-center justify-center rounded-md text-center text-[10px]">
        Gagal dimuat
      </span>
    );
  }
  if (!url) {
    return (
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-md">
        <LoaderCircleIcon className="size-4 animate-spin" />
      </span>
    );
  }
  return (
    <Image
      alt={alt}
      className="size-14 rounded-md object-cover"
      height={56}
      src={url}
      unoptimized
      width={56}
    />
  );
}

export function VocabularyEditor({
  organizationId,
  organizationSlug,
  vocabularySetId,
  pickerToken,
  returnTo,
  attachTo,
}: {
  organizationId: string;
  organizationSlug: string;
  vocabularySetId?: string;
  pickerToken?: string;
  returnTo?: string;
  attachTo?: {
    moduleId: string;
    moduleTitle: string;
    curriculumHref: string;
    editorBaseHref: string;
  };
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const vocabularySetQuery = api.content.getVocabularySet.useQuery(
    { organizationId, vocabularySetId: vocabularySetId ?? "" },
    { enabled: Boolean(vocabularySetId) },
  );
  const createSet = api.content.createVocabularySet.useMutation();
  const createSetItem = api.content.createVocabularySetItem.useMutation();
  const updateSet = api.content.updateVocabularySet.useMutation();
  const deleteSet = api.content.deleteVocabularySet.useMutation();
  const createEntry = api.content.createVocabularyEntry.useMutation();
  const updateEntry = api.content.updateVocabularyEntry.useMutation();
  const deleteEntry = api.content.deleteVocabularyEntry.useMutation();
  const extractEntries = api.content.extractVocabularyFromImage.useMutation();
  const createEntries = api.content.createVocabularyEntries.useMutation();
  const createUpload = api.storage.createUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmUpload.useMutation();
  const discardUpload = api.storage.deleteDocument.useMutation();
  const createdVocabularySetIdRef = useRef<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<{
    entryId: string;
    kind: "audio" | "image";
  } | null>(null);
  // The pages rendering this editor already require organization membership.
  const canDelete = !attachTo;
  const vocabularySet = vocabularySetId ? vocabularySetQuery.data : undefined;

  async function refreshVocabulary() {
    await Promise.all([
      utils.content.listVocabularySets.invalidate({ organizationId }),
      vocabularySetId
        ? utils.content.getVocabularySet.invalidate({
            organizationId,
            vocabularySetId,
          })
        : undefined,
    ]);
  }

  async function uploadEntryAsset(
    entryId: string,
    file: File,
    kind: "audio" | "image",
  ) {
    if (!file.type.startsWith(`${kind}/`)) {
      toast.error(
        kind === "audio"
          ? "Pilih file audio yang valid."
          : "Pilih file gambar yang valid.",
      );
      return;
    }
    const maximumSize = kind === "audio" ? 50 : 10;
    if (file.size > maximumSize * 1024 * 1024) {
      toast.error(
        `Ukuran ${kind === "audio" ? "audio" : "gambar"} maksimal ${maximumSize} MB.`,
      );
      return;
    }

    setUploadingAsset({ entryId, kind });
    let uploadedKey: string | null = null;
    let attached = false;
    try {
      const upload = await createUpload.mutateAsync({
        organizationId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      uploadedKey = upload.key;
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: file,
        headers: upload.headers,
      });
      if (!response.ok) {
        throw new Error(
          `Upload ${kind === "audio" ? "audio" : "gambar"} gagal (${response.status}).`,
        );
      }
      const asset = await confirmUpload.mutateAsync({ key: upload.key });
      await updateEntry.mutateAsync(
        kind === "audio"
          ? { organizationId, entryId, audioAssetId: asset.assetId }
          : { organizationId, entryId, imageAssetId: asset.assetId },
      );
      attached = true;
      await refreshVocabulary();
      toast.success(
        kind === "audio"
          ? "Audio pelafalan ditambahkan."
          : "Gambar ilustrasi ditambahkan.",
      );
    } catch (error) {
      if (uploadedKey && !attached) {
        await discardUpload
          .mutateAsync({ key: uploadedKey })
          .catch(() => undefined);
      }
      toast.error(errorMessage(error));
    } finally {
      setUploadingAsset(null);
    }
  }

  if (vocabularySetId && vocabularySetQuery.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Memuat set kosakata
      </div>
    );
  }

  if (vocabularySetId && (vocabularySetQuery.error || !vocabularySet)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {vocabularySetQuery.error?.message ?? "Set kosakata gagal dimuat."}
        </p>
        <Button variant="outline" onClick={() => vocabularySetQuery.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <VocabularySetForm
      key={vocabularySet?.id ?? "new-vocabulary-set"}
      initialDescription={vocabularySet?.description ?? ""}
      initialTitle={vocabularySet?.title ?? ""}
      contextLabel={
        attachTo ? `Set kosakata untuk ${attachTo.moduleTitle}` : undefined
      }
      canDelete={canDelete}
      isDeleting={deleteSet.isPending}
      isSaving={
        createSet.isPending || createSetItem.isPending || updateSet.isPending
      }
      onBack={() => {
        if (attachTo) {
          router.replace(attachTo.curriculumHref);
          return;
        }
        if (
          vocabularySet?.id &&
          completeResourcePicker({
            resourceId: vocabularySet.id,
            resourceType: "vocabulary",
            returnTo,
            token: pickerToken,
          })
        ) {
          return;
        }
        router.back();
      }}
      vocabularySet={vocabularySet}
      createBusy={createEntry.isPending}
      entryBusy={
        updateEntry.isPending ||
        deleteEntry.isPending ||
        createUpload.isPending ||
        confirmUpload.isPending
      }
      onCreateEntry={async (entry) => {
        if (!vocabularySetId) return null;
        try {
          const created = await createEntry.mutateAsync({
            organizationId,
            vocabularySetId,
            ...entry,
          });
          await refreshVocabulary();
          return created.id;
        } catch (error) {
          toast.error(errorMessage(error));
          return null;
        }
      }}
      onExtractImage={async (image) => {
        if (!vocabularySetId) return [];
        try {
          const { entries } = await extractEntries.mutateAsync({
            organizationId,
            vocabularySetId,
            ...image,
          });
          return entries;
        } catch (error) {
          throw new Error(errorMessage(error));
        }
      }}
      onSaveImportedEntries={async (entries) => {
        if (!vocabularySetId) return false;
        try {
          const { created } = await createEntries.mutateAsync({
            organizationId,
            vocabularySetId,
            entries,
          });
          await refreshVocabulary();
          toast.success(`${created} istilah ditambahkan.`);
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onDelete={async () => {
        if (!vocabularySetId) return;
        try {
          await deleteSet.mutateAsync({ organizationId, vocabularySetId });
          await refreshVocabulary();
          toast.success("Set kosakata dihapus.");
          router.replace(`/workspace/${organizationSlug}/library/vocabulary`);
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onDeleteEntry={async (entryId) => {
        try {
          await deleteEntry.mutateAsync({ organizationId, entryId });
          await refreshVocabulary();
          toast.success("Entri kosakata dihapus.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onRemoveAudio={async (entryId) => {
        try {
          await updateEntry.mutateAsync({
            organizationId,
            entryId,
            audioAssetId: null,
          });
          await refreshVocabulary();
          toast.success("Audio pelafalan dilepas.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onRemoveImage={async (entryId) => {
        try {
          await updateEntry.mutateAsync({
            organizationId,
            entryId,
            imageAssetId: null,
          });
          await refreshVocabulary();
          toast.success("Gambar ilustrasi dilepas.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onSave={async ({ title, description }) => {
        const targetVocabularySetId =
          vocabularySetId ?? createdVocabularySetIdRef.current;
        try {
          if (targetVocabularySetId) {
            await updateSet.mutateAsync({
              organizationId,
              vocabularySetId: targetVocabularySetId,
              title,
              description,
            });
            await refreshVocabulary();
            return;
          }

          const createdId = attachTo
            ? (
                await createSetItem.mutateAsync({
                  moduleId: attachTo.moduleId,
                  title,
                  description,
                })
              ).vocabularySet.id
            : (
                await createSet.mutateAsync({
                  organizationId,
                  title,
                  description,
                })
              ).id;
          createdVocabularySetIdRef.current = createdId;
          await refreshVocabulary();
          toast.success(
            attachTo
              ? `Set kosakata ditambahkan ke ${attachTo.moduleTitle}. Tambahkan istilah pertama Anda.`
              : "Set kosakata dibuat. Tambahkan istilah pertama Anda.",
          );
          router.replace(
            attachTo
              ? `${attachTo.editorBaseHref}/${createdId}`
              : `/workspace/${organizationSlug}/library/vocabulary/${createdId}${resourcePickerQuery(pickerToken, returnTo)}`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
      onUpdateEntry={async (entryId, entry) => {
        try {
          await updateEntry.mutateAsync({ organizationId, entryId, ...entry });
          await refreshVocabulary();
        } catch (error) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
      onUploadAudio={(entryId, file) =>
        uploadEntryAsset(entryId, file, "audio")
      }
      onUploadImage={(entryId, file) =>
        uploadEntryAsset(entryId, file, "image")
      }
      uploadingAsset={uploadingAsset}
    />
  );
}

function VocabularySetForm({
  canDelete,
  contextLabel,
  initialDescription,
  initialTitle,
  isDeleting,
  isSaving,
  onBack,
  vocabularySet,
  createBusy,
  entryBusy,
  onCreateEntry,
  onDelete,
  onDeleteEntry,
  onExtractImage,
  onSaveImportedEntries,
  onRemoveAudio,
  onRemoveImage,
  onSave,
  onUpdateEntry,
  onUploadAudio,
  onUploadImage,
  uploadingAsset,
}: {
  canDelete: boolean;
  contextLabel?: string;
  initialDescription: string;
  initialTitle: string;
  isDeleting: boolean;
  isSaving: boolean;
  onBack: () => void;
  vocabularySet?: VocabularySet;
  createBusy: boolean;
  entryBusy: boolean;
  onCreateEntry: (entry: EntryFields) => Promise<string | null>;
  onDelete: () => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onExtractImage: (
    image: PreparedImportImage,
  ) => Promise<ExtractedVocabularyEntry[]>;
  onSaveImportedEntries: (
    entries: ImportedVocabularyEntry[],
  ) => Promise<boolean>;
  onRemoveAudio: (entryId: string) => Promise<void>;
  onRemoveImage: (entryId: string) => Promise<void>;
  onSave: (value: {
    title: string;
    description: string | null;
  }) => Promise<void>;
  onUpdateEntry: (entryId: string, entry: EntryFields) => Promise<void>;
  onUploadAudio: (entryId: string, file: File) => Promise<void>;
  onUploadImage: (entryId: string, file: File) => Promise<void>;
  uploadingAsset: {
    entryId: string;
    kind: "audio" | "image";
  } | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [search, setSearch] = useState("");
  const [expandedEntryIds, setExpandedEntryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Keeps collapsing rows' forms mounted until their close animation
  // finishes, then drops them. Driven from the toggle handlers (not an
  // effect) so it never trips set-state-in-effect.
  const [closingEntryIds, setClosingEntryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // The entry quick-add opened for the author; closed again when the next
  // one is added so rapid entry doesn't leave a trail of open rows.
  const autoOpenedEntryIdRef = useRef<string | null>(null);

  // Set when Shift+Enter adds an entry, so its examples field takes focus.
  const [focusExamplesEntryId, setFocusExamplesEntryId] = useState<
    string | null
  >(null);

  function expandEntries(entryIds: string[]) {
    setClosingEntryIds((current) => {
      const next = new Set(current);
      for (const entryId of entryIds) next.delete(entryId);
      return next;
    });
    setExpandedEntryIds((current) => new Set([...current, ...entryIds]));
  }

  function collapseEntries(entryIds: string[]) {
    if (!entryIds.length) return;
    setExpandedEntryIds((current) => {
      const next = new Set(current);
      for (const entryId of entryIds) next.delete(entryId);
      return next;
    });
    setClosingEntryIds((current) => new Set([...current, ...entryIds]));
    setTimeout(() => {
      setClosingEntryIds((current) => {
        const next = new Set(current);
        for (const entryId of entryIds) next.delete(entryId);
        return next;
      });
    }, 300);
  }

  function toggleEntry(entryId: string) {
    setFocusExamplesEntryId(null);
    autoOpenedEntryIdRef.current = null;
    if (expandedEntryIds.has(entryId)) {
      collapseEntries([entryId]);
    } else {
      expandEntries([entryId]);
    }
  }

  function openNewEntry(entryId: string, focusExamples: boolean) {
    const previous = autoOpenedEntryIdRef.current;
    if (previous && previous !== entryId) collapseEntries([previous]);
    autoOpenedEntryIdRef.current = entryId;
    expandEntries([entryId]);
    setFocusExamplesEntryId(focusExamples ? entryId : null);
  }
  const [lastAddedEntryId, setLastAddedEntryId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const entries = useMemo(() => vocabularySet?.entries ?? [], [vocabularySet]);
  const sortedEntries = useMemo(() => [...entries].reverse(), [entries]);
  const visibleEntries = useMemo(
    () =>
      deferredSearch
        ? sortedEntries.filter((entry) =>
            `${entry.term} ${entry.definition} ${examplesToText(entry.examples)}`
              .toLocaleLowerCase()
              .includes(deferredSearch),
          )
        : sortedEntries,
    [deferredSearch, sortedEntries],
  );
  const imageImport = useVocabularyImageImport({
    onExtract: onExtractImage,
    onSave: async (imported) => {
      const saved = await onSaveImportedEntries(imported);
      if (saved) setSearch("");
      return saved;
    },
  });
  const allVisibleExpanded =
    visibleEntries.length > 0 &&
    visibleEntries.every((entry) => expandedEntryIds.has(entry.id));
  const audioCount = useMemo(
    () => entries.filter((entry) => entry.audioAssetId).length,
    [entries],
  );
  const {
    flush: flushDetailsSave,
    schedule: scheduleDetailsSave,
    status: detailsStatus,
  } = useDebouncedAutosave<{ title: string; description: string }>(
    async (draft) => {
      const normalizedTitle = draft.title.trim();
      if (!normalizedTitle) return;
      await onSave({
        title: normalizedTitle,
        description: draft.description.trim() || null,
      });
    },
  );
  useOnDraftChange(
    { description, title },
    (a, b) => a.title === b.title && a.description === b.description,
    (draft) => scheduleDetailsSave(draft),
  );

  useEffect(() => {
    if (!lastAddedEntryId) return;
    const timeout = setTimeout(() => setLastAddedEntryId(null), 1600);
    return () => clearTimeout(timeout);
  }, [lastAddedEntryId]);

  // While a row is expanding/collapsing, rows glide under a stationary
  // cursor and would each briefly match :hover. Freeze the hover-revealed
  // row actions for the duration of the animation so they can't flash.
  const [hoverActionsFrozen, setHoverActionsFrozen] = useState(false);
  const hoverFreezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skipInitialHoverFreeze = useRef(true);

  useEffect(() => {
    if (skipInitialHoverFreeze.current) {
      skipInitialHoverFreeze.current = false;
      return;
    }
    setHoverActionsFrozen(true);
    if (hoverFreezeTimeoutRef.current !== null) {
      clearTimeout(hoverFreezeTimeoutRef.current);
    }
    hoverFreezeTimeoutRef.current = setTimeout(() => {
      setHoverActionsFrozen(false);
      hoverFreezeTimeoutRef.current = null;
    }, 350);
    return () => {
      if (hoverFreezeTimeoutRef.current !== null) {
        clearTimeout(hoverFreezeTimeoutRef.current);
        hoverFreezeTimeoutRef.current = null;
      }
    };
  }, [expandedEntryIds]);

  const detailsSaving =
    isSaving || detailsStatus === "pending" || detailsStatus === "saving";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            aria-label="Kembali"
            variant="outline"
            size="icon"
            onClick={() => {
              void flushDetailsSave()
                .then(onBack)
                .catch(() => undefined);
            }}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <LanguagesIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {contextLabel ??
                  (vocabularySet ? "Set kosakata" : "Set kosakata baru")}
              </span>
            </p>
            <p
              className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs"
              role="status"
            >
              {!title.trim() ? (
                <>
                  <CircleAlertIcon className="text-destructive size-3.5" />
                  Judul wajib diisi
                </>
              ) : detailsSaving ? (
                <>
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                  Menyimpan…
                </>
              ) : detailsStatus === "error" ? (
                <>
                  <CircleAlertIcon className="text-destructive size-3.5" />
                  Gagal menyimpan
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-3.5" />
                  Tersimpan otomatis
                </>
              )}
            </p>
          </div>
        </div>
        {vocabularySet && canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  aria-label="Hapus set kosakata"
                  variant="destructive"
                  size="icon"
                />
              }
            >
              <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus set kosakata ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini permanen. Semua entri, penempatan di course,
                  progres siswa, aktivitas XP, dan kaitan prasyarat materi akan
                  ikut dihapus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={onDelete}
                  variant="destructive"
                >
                  {isDeleting && <LoaderCircleIcon className="animate-spin" />}
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </header>

      <div className="grid gap-1">
        <input
          aria-label="Judul set kosakata"
          autoFocus={!vocabularySet}
          className="font-heading placeholder:text-muted-foreground/40 hover:bg-muted/40 focus-visible:bg-muted/40 -mx-2 w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight transition-colors outline-none"
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Set kosakata tanpa judul"
          value={title}
        />
        <textarea
          aria-label="Deskripsi set kosakata"
          className="text-muted-foreground placeholder:text-muted-foreground/40 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:text-foreground -mx-2 field-sizing-content max-h-48 w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm transition-colors outline-none"
          maxLength={10000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tambahkan deskripsi singkat (opsional)…"
          rows={1}
          value={description}
        />
      </div>

      {vocabularySet ? (
        <>
          <section className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 -mx-1 grid gap-2 px-1 pt-1 pb-3 backdrop-blur">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Cari istilah dalam set"
                className="pl-8"
                disabled={!entries.length}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari istilah, definisi, atau contoh…"
                value={search}
              />
            </div>
            <QuickAddForm
              autoFocus={entries.length === 0}
              busy={createBusy}
              importBusy={imageImport.busy}
              onCreate={onCreateEntry}
              onCreated={(entryId, focusExamples) => {
                setSearch("");
                setLastAddedEntryId(entryId);
                openNewEntry(entryId, focusExamples);
              }}
              onImportImage={imageImport.start}
            />
          </section>
          {imageImport.dialog}

          <div className="text-muted-foreground -mt-4 flex items-center justify-between gap-2 text-xs">
            <p role="status">
              {deferredSearch
                ? `${visibleEntries.length} dari ${entries.length}`
                : entries.length}{" "}
              istilah · {audioCount} audio
            </p>
            {visibleEntries.length ? (
              <Button
                onClick={() => {
                  setFocusExamplesEntryId(null);
                  autoOpenedEntryIdRef.current = null;
                  const visibleIds = visibleEntries.map((entry) => entry.id);
                  if (allVisibleExpanded) {
                    collapseEntries(visibleIds);
                  } else {
                    expandEntries(visibleIds);
                  }
                }}
                size="xs"
                type="button"
                variant="ghost"
              >
                {allVisibleExpanded ? (
                  <ChevronsDownUpIcon data-icon="inline-start" />
                ) : (
                  <ChevronsUpDownIcon data-icon="inline-start" />
                )}
                {allVisibleExpanded ? "Tutup semua" : "Buka semua"}
              </Button>
            ) : null}
          </div>

          {visibleEntries.length ? (
            <div className="grid items-start gap-2 lg:grid-cols-2">
              {[
                visibleEntries.slice(0, Math.ceil(visibleEntries.length / 2)),
                visibleEntries.slice(Math.ceil(visibleEntries.length / 2)),
              ].map((columnEntries, columnIndex) => (
                <ol className="grid items-start gap-2" key={columnIndex}>
                  {columnEntries.map((entry) => (
                    <li key={entry.id}>
                      <EntryRow
                        busy={entryBusy}
                        canDelete={canDelete}
                        entry={entry}
                        expanded={expandedEntryIds.has(entry.id)}
                        focusExamples={focusExamplesEntryId === entry.id}
                        highlighted={lastAddedEntryId === entry.id}
                        hoverActionsFrozen={hoverActionsFrozen}
                        renderForm={
                          expandedEntryIds.has(entry.id) ||
                          closingEntryIds.has(entry.id)
                        }
                        onDelete={() => onDeleteEntry(entry.id)}
                        onRemoveAudio={() => onRemoveAudio(entry.id)}
                        onRemoveImage={() => onRemoveImage(entry.id)}
                        onToggle={() => toggleEntry(entry.id)}
                        onUpdate={(value) => onUpdateEntry(entry.id, value)}
                        onUploadAudio={(file) => onUploadAudio(entry.id, file)}
                        onUploadImage={(file) => onUploadImage(entry.id, file)}
                        uploadingAudio={
                          uploadingAsset?.entryId === entry.id &&
                          uploadingAsset.kind === "audio"
                        }
                        uploadingImage={
                          uploadingAsset?.entryId === entry.id &&
                          uploadingAsset.kind === "image"
                        }
                      />
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          ) : deferredSearch ? (
            <div className="bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                Tidak ada istilah yang cocok dengan “{search.trim()}”.
              </p>
              <Button
                className="mt-3"
                onClick={() => setSearch("")}
                size="sm"
                type="button"
                variant="outline"
              >
                Hapus pencarian
              </Button>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-xl border border-dashed px-6 py-12 text-center">
              <LanguagesIcon className="text-muted-foreground/60 mx-auto mb-3 size-7" />
              <p className="text-sm font-medium">Belum ada istilah</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Ketik istilah dan definisi di formulir atas, lalu tekan Enter,
                atau tempel gambar daftar kosakata agar AI mengisinya.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center">
          <LanguagesIcon className="text-muted-foreground/60 mx-auto mb-3 size-7" />
          <p className="text-sm font-medium">Mulai dengan judul</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Isi judul di atas — set dibuat otomatis, lalu Anda bisa langsung
            menambahkan istilah.
          </p>
        </div>
      )}
    </div>
  );
}

function QuickAddForm({
  autoFocus,
  busy,
  importBusy,
  onCreate,
  onCreated,
  onImportImage,
}: {
  autoFocus: boolean;
  busy: boolean;
  importBusy: boolean;
  onCreate: (entry: EntryFields) => Promise<string | null>;
  onCreated: (entryId: string, focusExamples: boolean) => void;
  onImportImage: (file: File) => void;
}) {
  const termInputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const canSubmit = Boolean(term.trim() && definition.trim());

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    // Shift+Enter adds the entry and jumps into its examples field.
    if (
      event.key !== "Enter" ||
      !event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    void submitEntry(true);
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const file = firstImageFile(event.clipboardData.files);
    if (!file) return;
    event.preventDefault();
    if (!importBusy) onImportImage(file);
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    setDragActive(false);
    const file = firstImageFile(event.dataTransfer.files);
    if (file && !importBusy) onImportImage(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitEntry(false);
  }

  async function submitEntry(focusExamples: boolean) {
    if (!canSubmit) return;
    const draft = {
      term: term.trim(),
      definition: definition.trim(),
      examples: [] as string[],
    };
    // Clear immediately so rapid-fire entry never clobbers the next pair
    // the user is already typing while the previous save is in flight.
    setTerm("");
    setDefinition("");
    termInputRef.current?.focus();
    const createdId = await onCreate(draft);
    if (createdId) onCreated(createdId, focusExamples);
  }

  return (
    <form
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg transition-shadow",
        dragActive && "ring-primary/60 ring-2 ring-offset-2",
      )}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false);
        }
      }}
      onDragOver={(event) => {
        if (!hasDraggedFiles(event)) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onSubmit={handleSubmit}
    >
      <Input
        aria-label="Istilah baru"
        autoFocus={autoFocus}
        className="bg-card h-9"
        maxLength={500}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Istilah baru (mis. 안녕하세요)"
        ref={termInputRef}
        value={term}
      />
      <Input
        aria-label="Definisi istilah baru"
        className="bg-card h-9"
        maxLength={5000}
        onChange={(event) => setDefinition(event.target.value)}
        placeholder="Definisi — Enter menambah, Shift+Enter + contoh"
        title="Enter: tambah istilah. Shift+Enter: tambah lalu isi contoh."
        value={definition}
      />
      <Button aria-label="Tambah entri" disabled={!canSubmit} type="submit">
        {busy ? (
          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
        ) : (
          <PlusIcon data-icon="inline-start" />
        )}
        <span className="hidden sm:inline">Tambah</span>
      </Button>
      <AiImportButton
        busy={importBusy}
        onSelect={onImportImage}
        title="Impor kosakata dengan AI"
      />
    </form>
  );
}

function EntryRow({
  busy,
  canDelete,
  entry,
  expanded,
  focusExamples,
  highlighted,
  hoverActionsFrozen,
  renderForm,
  onDelete,
  onRemoveAudio,
  onRemoveImage,
  onToggle,
  onUpdate,
  onUploadAudio,
  onUploadImage,
  uploadingAudio,
  uploadingImage,
}: {
  busy: boolean;
  canDelete: boolean;
  entry: VocabularyEntry;
  expanded: boolean;
  focusExamples: boolean;
  highlighted: boolean;
  hoverActionsFrozen: boolean;
  renderForm: boolean;
  onDelete: () => Promise<void>;
  onRemoveAudio: () => Promise<void>;
  onRemoveImage: () => Promise<void>;
  onToggle: () => void;
  onUpdate: (entry: EntryFields) => Promise<void>;
  onUploadAudio: (file: File) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  uploadingAudio: boolean;
  uploadingImage: boolean;
}) {
  const hasExamples = examplesToText(entry.examples).trim().length > 0;
  const [dragActive, setDragActive] = useState(false);

  // Dropping onto any row — collapsed or open — attaches the first image
  // and first audio file without opening the file picker.
  async function handleDrop(event: DragEvent<HTMLElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    setDragActive(false);
    if (busy || uploadingAudio || uploadingImage) return;
    const { image, audio } = pickEntryAssets(event.dataTransfer.files);
    if (!image && !audio) {
      toast.error("Seret file gambar atau audio.");
      return;
    }
    if (image) await onUploadImage(image);
    if (audio) await onUploadAudio(audio);
  }

  return (
    <article
      className={cn(
        "group bg-card scroll-mt-32 rounded-xl border transition-[background-color,border-color,box-shadow] duration-300",
        expanded ? "border-primary/40 shadow-sm" : "hover:border-foreground/20",
        highlighted && "border-primary/50 bg-primary/[0.06]",
        dragActive && "border-primary ring-primary/30 ring-3",
      )}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false);
        }
      }}
      onDragOver={(event) => {
        if (!hasDraggedFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragActive(true);
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      <div className="flex items-center gap-1 pr-1.5">
        <button
          aria-expanded={expanded}
          className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-2.5 rounded-l-xl px-3 py-2.5 text-left outline-none focus-visible:ring-3"
          onClick={onToggle}
          type="button"
        >
          <ChevronDownIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{entry.term}</span>
            <span className="text-muted-foreground"> · {entry.definition}</span>
          </span>
          <span className="text-muted-foreground/70 flex shrink-0 items-center gap-1.5">
            {entry.audioAssetId ? (
              <Volume2Icon aria-label="Ada audio" className="size-3.5" />
            ) : null}
            {entry.imageAssetId ? (
              <ImageIcon aria-label="Ada ilustrasi" className="size-3.5" />
            ) : null}
            {hasExamples ? (
              <MessageSquareQuoteIcon
                aria-label="Ada contoh"
                className="size-3.5"
              />
            ) : null}
          </span>
        </button>
        {canDelete ? (
          <DeleteEntryAlert
            onDelete={onDelete}
            term={entry.term}
            trigger={
              <Button
                aria-label={`Hapus ${entry.term}`}
                className={cn(
                  "shrink-0 transition-opacity duration-200 sm:opacity-0 sm:focus-visible:opacity-100",
                  !hoverActionsFrozen &&
                    "sm:group-hover:opacity-100 sm:group-hover:delay-200",
                )}
                disabled={busy}
                size="icon-xs"
                type="button"
                variant="ghost"
              />
            }
          />
        ) : null}
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          {renderForm ? (
            <EntryForm
              busy={busy}
              canDelete={canDelete}
              entry={entry}
              focusExamples={focusExamples}
              onDelete={onDelete}
              onRemoveAudio={onRemoveAudio}
              onRemoveImage={onRemoveImage}
              onUpdate={onUpdate}
              onUploadAudio={onUploadAudio}
              onUploadImage={onUploadImage}
              uploadingAudio={uploadingAudio}
              uploadingImage={uploadingImage}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EntryForm({
  busy,
  canDelete,
  entry,
  focusExamples,
  onDelete,
  onRemoveAudio,
  onRemoveImage,
  onUpdate,
  onUploadAudio,
  onUploadImage,
  uploadingAudio,
  uploadingImage,
}: {
  busy: boolean;
  canDelete: boolean;
  entry: VocabularyEntry;
  focusExamples: boolean;
  onDelete: () => Promise<void>;
  onRemoveAudio: () => Promise<void>;
  onRemoveImage: () => Promise<void>;
  onUpdate: (entry: EntryFields) => Promise<void>;
  onUploadAudio: (file: File) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  uploadingAudio: boolean;
  uploadingImage: boolean;
}) {
  const [term, setTerm] = useState(entry.term);
  const [definition, setDefinition] = useState(entry.definition);
  const [examples, setExamples] = useState(examplesToText(entry.examples));
  const invalid = !term.trim() || !definition.trim();
  const {
    cancel: cancelEntrySave,
    schedule: scheduleEntrySave,
    status: saveStatus,
  } = useDebouncedAutosave<EntryFields>(async (draft) => {
    if (!draft.term.trim() || !draft.definition.trim()) return;
    await onUpdate(draft);
  });
  useOnDraftChange(
    {
      term: term.trim(),
      definition: definition.trim(),
      examples: parseExamples(examples),
    },
    (a, b) =>
      a.term === b.term &&
      a.definition === b.definition &&
      a.examples.join("\n") === b.examples.join("\n"),
    (draft) => scheduleEntrySave(draft),
  );

  // Pasting an image or audio file anywhere in the open entry attaches it;
  // plain-text pastes fall through to the focused field.
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const { image, audio } = pickEntryAssets(event.clipboardData.files);
    if (!image && !audio) return;
    event.preventDefault();
    if (busy || uploadingAudio || uploadingImage) return;
    void (async () => {
      if (image) await onUploadImage(image);
      if (audio) await onUploadAudio(audio);
    })();
  }

  return (
    <div className="grid gap-4 border-t p-3 sm:p-4" onPaste={handlePaste}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label
            className="text-muted-foreground text-[11px] tracking-wide uppercase"
            htmlFor={`term-${entry.id}`}
          >
            Istilah
          </Label>
          <Input
            className="font-heading h-9 font-semibold"
            id={`term-${entry.id}`}
            maxLength={500}
            onChange={(event) => setTerm(event.target.value)}
            value={term}
          />
        </div>
        <div className="grid gap-1.5">
          <Label
            className="text-muted-foreground text-[11px] tracking-wide uppercase"
            htmlFor={`definition-${entry.id}`}
          >
            Definisi
          </Label>
          <Input
            className="h-9"
            id={`definition-${entry.id}`}
            maxLength={5000}
            onChange={(event) => setDefinition(event.target.value)}
            value={definition}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label
          className="text-muted-foreground text-[11px] tracking-wide uppercase"
          htmlFor={`examples-${entry.id}`}
        >
          Contoh pemakaian
        </Label>
        <Textarea
          autoFocus={focusExamples}
          className="min-h-9 resize-y"
          id={`examples-${entry.id}`}
          onChange={(event) => setExamples(event.target.value)}
          placeholder="Satu contoh per baris"
          rows={1}
          value={examples}
        />
      </div>

      <div className="grid gap-3">
        <ImageAttachment
          busy={busy}
          entry={entry}
          onRemove={onRemoveImage}
          onUpload={onUploadImage}
          uploading={uploadingImage}
        />
        <AudioAttachment
          busy={busy}
          entry={entry}
          onRemove={onRemoveAudio}
          onUpload={onUploadAudio}
          uploading={uploadingAudio}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs" role="status">
          {invalid ? (
            <>
              <CircleAlertIcon className="text-destructive size-3.5" />
              <span className="text-destructive">
                Istilah dan definisi wajib diisi
              </span>
            </>
          ) : saveStatus === "pending" || saveStatus === "saving" ? (
            <>
              <LoaderCircleIcon className="text-muted-foreground size-3.5 animate-spin" />
              <span className="text-muted-foreground">Menyimpan…</span>
            </>
          ) : saveStatus === "error" ? (
            <>
              <CircleAlertIcon className="text-destructive size-3.5" />
              <span className="text-destructive">Gagal menyimpan</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <CheckCircle2Icon className="text-muted-foreground size-3.5" />
              <span className="text-muted-foreground">Tersimpan</span>
            </>
          ) : (
            <>
              <CheckCircle2Icon className="text-muted-foreground size-3.5" />
              <span className="text-muted-foreground">Belum ada perubahan</span>
            </>
          )}
        </p>
        {canDelete ? (
          <DeleteEntryAlert
            onDelete={async () => {
              cancelEntrySave();
              await onDelete();
            }}
            term={entry.term}
            trigger={
              <Button
                disabled={busy}
                size="sm"
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              />
            }
          >
            <Trash2Icon data-icon="inline-start" />
            Hapus entri
          </DeleteEntryAlert>
        ) : null}
      </div>
    </div>
  );
}

function DeleteEntryAlert({
  children,
  onDelete,
  term,
  trigger,
}: {
  children?: ReactNode;
  onDelete: () => Promise<void>;
  term: string;
  trigger: ReactElement;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger}>
        {children ?? <Trash2Icon />}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus &ldquo;{term}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Entri kosakata ini akan dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} variant="destructive">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ImageAttachment({
  busy,
  entry,
  onRemove,
  onUpload,
  uploading,
}: {
  busy: boolean;
  entry: VocabularyEntry;
  onRemove: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onUpload(file);
  }

  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
        Ilustrasi
      </Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-2.5">
        <input
          accept="image/*"
          className="hidden"
          onChange={selectImage}
          ref={inputRef}
          type="file"
        />
        {entry.imageAssetId ? (
          <AssetImage assetId={entry.imageAssetId} alt={entry.term} />
        ) : (
          <span className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-md">
            <ImageIcon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {entry.imageAsset?.fileName ?? "Belum ada gambar"}
          </p>
          <p className="text-muted-foreground text-[11px]">
            PNG atau JPG, maks 10 MB · seret atau tempel ke sini
          </p>
        </div>
        <Button
          disabled={busy || uploading}
          onClick={() => inputRef.current?.click()}
          size="xs"
          type="button"
          variant="outline"
        >
          {uploading ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <UploadIcon />
          )}
          {entry.imageAssetId ? "Ganti" : "Unggah"}
        </Button>
        {entry.imageAssetId ? (
          <Button
            aria-label="Lepas ilustrasi"
            disabled={busy}
            onClick={() => void onRemove()}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AudioAttachment({
  busy,
  entry,
  onRemove,
  onUpload,
  uploading,
}: {
  busy: boolean;
  entry: VocabularyEntry;
  onRemove: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function selectAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onUpload(file);
  }

  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
        Pelafalan
      </Label>
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-2.5">
        <input
          accept="audio/*"
          className="hidden"
          onChange={selectAudio}
          ref={inputRef}
          type="file"
        />
        <span className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-md">
          <Volume2Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          {entry.audioAssetId ? (
            <AudioPlayer assetId={entry.audioAssetId} />
          ) : (
            <>
              <p className="text-xs font-medium">Belum ada audio</p>
              <p className="text-muted-foreground text-[11px]">
                MP3 atau WAV, maks 50 MB · seret ke sini
              </p>
            </>
          )}
        </div>
        <Button
          disabled={busy || uploading}
          onClick={() => inputRef.current?.click()}
          size="xs"
          type="button"
          variant="outline"
        >
          {uploading ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <UploadIcon />
          )}
          {entry.audioAssetId ? "Ganti" : "Unggah"}
        </Button>
        {entry.audioAssetId ? (
          <Button
            aria-label="Lepas audio"
            disabled={busy}
            onClick={() => void onRemove()}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
