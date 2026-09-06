"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ImageIcon,
  LanguagesIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ImageUpload } from "~/components/ui/image-upload";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  completeResourcePicker,
  resourcePickerQuery,
} from "~/lib/resource-picker-callback";

type VocabularySet = RouterOutputs["content"]["listVocabularySets"][number];
type VocabularyEntry = VocabularySet["entries"][number];

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

function AudioPlayer({ assetId }: { assetId: string }) {
  const utils = api.useUtils();
  const [result, setResult] = useState<{
    assetId: string;
    url: string | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void utils.client.storage.createDownloadUrl
      .mutate({ assetId, disposition: "inline" })
      .then(({ downloadUrl }) => {
        if (active) setResult({ assetId, url: downloadUrl, failed: false });
      })
      .catch(() => {
        if (active) setResult({ assetId, url: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [assetId, utils.client]);

  if (result?.assetId === assetId && result.failed) {
    return <p className="text-destructive text-xs">Audio gagal dimuat.</p>;
  }
  if (result?.assetId !== assetId || !result.url) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
        <LoaderCircleIcon className="size-3.5 animate-spin" /> Memuat audio
      </span>
    );
  }
  return (
    <audio className="h-9 w-full" controls preload="none" src={result.url} />
  );
}

function AssetImage({ assetId, alt }: { assetId: string; alt: string }) {
  const utils = api.useUtils();
  const [result, setResult] = useState<{
    assetId: string;
    url: string | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void utils.client.storage.createDownloadUrl
      .mutate({ assetId, disposition: "inline" })
      .then(({ downloadUrl }) => {
        if (active) setResult({ assetId, url: downloadUrl, failed: false });
      })
      .catch(() => {
        if (active) setResult({ assetId, url: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [assetId, utils.client]);

  if (result?.assetId === assetId && result.failed) {
    return (
      <div className="text-destructive flex h-20 items-center justify-center text-xs">
        Gambar gagal dimuat.
      </div>
    );
  }
  if (result?.assetId !== assetId || !result.url) {
    return (
      <div className="text-muted-foreground flex h-20 items-center justify-center">
        <LoaderCircleIcon className="size-4 animate-spin" />
      </div>
    );
  }
  return (
    <Image
      alt={alt}
      className="h-20 w-full object-cover"
      height={160}
      src={result.url}
      unoptimized
      width={320}
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
  const vocabularySets = api.content.listVocabularySets.useQuery(
    { organizationId },
    { enabled: Boolean(vocabularySetId) },
  );
  const organization = api.organization.get.useQuery({ organizationId });
  const createSet = api.content.createVocabularySet.useMutation();
  const createSetItem = api.content.createVocabularySetItem.useMutation();
  const updateSet = api.content.updateVocabularySet.useMutation();
  const deleteSet = api.content.deleteVocabularySet.useMutation();
  const createEntry = api.content.createVocabularyEntry.useMutation();
  const updateEntry = api.content.updateVocabularyEntry.useMutation();
  const deleteEntry = api.content.deleteVocabularyEntry.useMutation();
  const createUpload = api.storage.createUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmUpload.useMutation();
  const discardUpload = api.storage.deleteDocument.useMutation();
  const createdVocabularySetIdRef = useRef<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<{
    entryId: string;
    kind: "audio" | "image";
  } | null>(null);
  const canDelete = Boolean(organization.data) && !attachTo;
  const vocabularySet = vocabularySets.data?.find(
    (set) => set.id === vocabularySetId,
  );

  async function refreshVocabulary() {
    await utils.content.listVocabularySets.invalidate({ organizationId });
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

  if (vocabularySetId && vocabularySets.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Memuat set kosakata
      </div>
    );
  }

  if (vocabularySetId && (vocabularySets.error || !vocabularySet)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {vocabularySets.error?.message ?? "Set kosakata gagal dimuat."}
        </p>
        <Button variant="outline" onClick={() => vocabularySets.refetch()}>
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
      entryBusy={
        createEntry.isPending ||
        updateEntry.isPending ||
        deleteEntry.isPending ||
        createUpload.isPending ||
        confirmUpload.isPending
      }
      onCreateEntry={async (entry) => {
        if (!vocabularySetId) return false;
        try {
          await createEntry.mutateAsync({
            organizationId,
            vocabularySetId,
            ...entry,
          });
          await refreshVocabulary();
          toast.success("Entri kosakata ditambahkan.");
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
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
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

type EntryFields = {
  term: string;
  definition: string;
  examples: string[];
};

function VocabularySetForm({
  canDelete,
  contextLabel,
  initialDescription,
  initialTitle,
  isDeleting,
  isSaving,
  onBack,
  vocabularySet,
  entryBusy,
  onCreateEntry,
  onDelete,
  onDeleteEntry,
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
  entryBusy: boolean;
  onCreateEntry: (entry: EntryFields) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onRemoveAudio: (entryId: string) => Promise<void>;
  onRemoveImage: (entryId: string) => Promise<void>;
  onSave: (value: {
    title: string;
    description: string | null;
  }) => Promise<void>;
  onUpdateEntry: (entryId: string, entry: EntryFields) => Promise<boolean>;
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
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(
    null,
  );
  const mapNavRef = useRef<HTMLElement>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const entryMapItems = useMemo(
    () =>
      vocabularySet?.entries.map((entry, index) => ({
        id: entry.id,
        index,
        term: entry.term,
      })) ?? [],
    [vocabularySet?.entries],
  );
  const visibleEntries = useMemo(
    () =>
      vocabularySet?.entries.filter((entry) =>
        `${entry.term} ${entry.definition} ${examplesToText(entry.examples)}`
          .toLocaleLowerCase()
          .includes(deferredSearch),
      ) ?? [],
    [deferredSearch, vocabularySet?.entries],
  );
  const entryIdKey = useMemo(
    () => visibleEntries.map((entry) => entry.id).join("\u0000"),
    [visibleEntries],
  );
  const { flush: flushDetailsSave, schedule: scheduleDetailsSave } =
    useDebouncedAutosave<{ title: string; description: string }>(
      async (draft) => {
        const normalizedTitle = draft.title.trim();
        if (!normalizedTitle) return;
        await onSave({
          title: normalizedTitle,
          description: draft.description.trim() || null,
        });
      },
    );
  const skipInitialDetailsSave = useRef(true);

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (skipInitialDetailsSave.current) {
      skipInitialDetailsSave.current = false;
      return;
    }
    scheduleDetailsSave({ description, title });
  }, [description, scheduleDetailsSave, title]);

  useEffect(() => {
    if (!entryIdKey) return;

    const visibleHeights = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const item of entries) {
          const entryId = (item.target as HTMLElement).dataset.entryId;
          if (!entryId) continue;
          visibleHeights.set(
            entryId,
            item.isIntersecting ? item.intersectionRect.height : 0,
          );
        }
        let nextId: string | null = null;
        let largestHeight = 0;
        for (const [entryId, height] of visibleHeights) {
          if (height > largestHeight) {
            nextId = entryId;
            largestHeight = height;
          }
        }
        setActiveEntryId(nextId);
      },
      {
        rootMargin: "-80px 0px -20% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const entryId of entryIdKey.split("\u0000")) {
      const element = document.getElementById(`vocabulary-entry-${entryId}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [entryIdKey]);

  useEffect(() => {
    if (!activeEntryId || !mapNavRef.current) return;
    const map = mapNavRef.current;
    const activeItem = document.getElementById(
      `vocabulary-map-entry-${activeEntryId}`,
    );
    if (!activeItem) return;

    const mapRect = map.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const topOverflow = itemRect.top - mapRect.top;
    const bottomOverflow = itemRect.bottom - mapRect.bottom;
    if (topOverflow < 0) {
      map.scrollTo({
        behavior: "smooth",
        top: map.scrollTop + topOverflow - 4,
      });
    } else if (bottomOverflow > 0) {
      map.scrollTo({
        behavior: "smooth",
        top: map.scrollTop + bottomOverflow + 4,
      });
    }
  }, [activeEntryId]);

  function navigateToEntry(entryId: string) {
    const entryElement = document.getElementById(`vocabulary-entry-${entryId}`);
    if (!entryElement) return;

    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
    }
    const startY = window.scrollY;
    const entryRect = entryElement.getBoundingClientRect();
    const targetY = Math.max(
      0,
      startY +
        entryRect.top -
        Math.max(24, (window.innerHeight - entryRect.height) / 2),
    );
    const distance = targetY - startY;
    let startedAt: number | null = null;

    const animateScroll = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / 500, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, startY + distance * easedProgress);
      if (progress < 1) {
        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        scrollAnimationFrameRef.current = null;
      }
    };
    scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
    setActiveEntryId(entryId);
    setHighlightedEntryId(entryId);
    if (highlightTimeoutRef.current !== null) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedEntryId(null);
      highlightTimeoutRef.current = null;
    }, 2000);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            aria-label="Kembali ke kosakata"
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
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <LanguagesIcon className="size-3.5" />
              {contextLabel ??
                (vocabularySet ? "Edit set kosakata" : "Set kosakata baru")}
            </div>
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
              {title.trim() || "Set kosakata tanpa judul"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
            {isSaving ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : !title.trim() ? (
              <LanguagesIcon className="size-3.5" />
            ) : (
              <CheckCircle2Icon className="size-3.5" />
            )}
            {isSaving
              ? "Menyimpan..."
              : title.trim()
                ? "Disimpan otomatis"
                : "Judul wajib diisi"}
          </span>
          {vocabularySet && canDelete && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="destructive" size="icon" />
                }
              >
                <Trash2Icon />
                <span className="sr-only">Hapus set kosakata</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus set kosakata ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini permanen. Semua entri, penempatan di course,
                    progres siswa, aktivitas XP, dan kaitan prasyarat materi
                    akan ikut dihapus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={onDelete}
                    variant="destructive"
                  >
                    {isDeleting && (
                      <LoaderCircleIcon className="animate-spin" />
                    )}
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <section className="grid min-w-0 gap-6">
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <CardHeader className="relative overflow-hidden rounded-none bg-foreground px-5 py-6 text-background sm:px-6">
              <div className="pointer-events-none absolute top-0 right-0 size-44 translate-x-14 -translate-y-20 rounded-full border border-current opacity-10" />
              <div className="pointer-events-none absolute top-0 right-0 size-28 translate-x-8 -translate-y-12 rounded-full border border-current opacity-10" />
              <div className="relative flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/10">
                  <Settings2Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Setup kosakata
                  </p>
                    <CardTitle className="mt-1 text-xl font-semibold text-background">
                    Identitas set
                  </CardTitle>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Beri konteks singkat agar set mudah ditemukan dan digunakan
                    kembali.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 sm:p-6">
              <div className="grid gap-2">
                <Label htmlFor="vocabulary-title">Judul</Label>
                <Input
                  autoFocus={!vocabularySet}
                  id="vocabulary-title"
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Mis. Bahasa Korea untuk perjalanan"
                  value={title}
                />
                {!title.trim() ? (
                  <p className="text-destructive text-xs">
                    Isi judul untuk membuat dan menyimpan set ini.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vocabulary-description">Deskripsi</Label>
                <Textarea
                  id="vocabulary-description"
                  maxLength={10000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Jelaskan topik atau kapan siswa akan memakai istilah ini."
                  rows={3}
                  value={description}
                />
                <p className="text-muted-foreground text-xs">
                  Perubahan disimpan otomatis setelah Anda berhenti mengetik.
                </p>
              </div>
            </CardContent>
          </Card>

          {vocabularySet ? (
            <section className="grid gap-4 border-t pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-semibold">
                    Istilah
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Tambahkan definisi, contoh pemakaian, dan audio pelafalan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {vocabularySet.entries.length} istilah
                  </Badge>
                  <NewEntryForm busy={entryBusy} onCreate={onCreateEntry} />
                </div>
              </div>
              {visibleEntries.length ? (
                <div className="grid gap-3">
                  {visibleEntries.map((entry) => (
                    <VocabularyEntryCard
                      busy={entryBusy}
                      canDelete={canDelete}
                      entry={entry}
                      highlighted={highlightedEntryId === entry.id}
                      index={vocabularySet.entries.findIndex(
                        (item) => item.id === entry.id,
                      )}
                      key={entry.id}
                      onDelete={() => onDeleteEntry(entry.id)}
                      onRemoveAudio={() => onRemoveAudio(entry.id)}
                      onRemoveImage={() => onRemoveImage(entry.id)}
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
                  ))}
                </div>
              ) : deferredSearch ? (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                  Tidak ada istilah yang cocok dengan “{search.trim()}”.
                  <Button
                    className="mx-auto mt-3"
                    onClick={() => setSearch("")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Hapus pencarian
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center text-sm">
                  <LanguagesIcon className="mx-auto mb-3 size-7 opacity-50" />
                  Tambahkan istilah pertama untuk mulai membangun set ini.
                </div>
              )}
            </section>
          ) : (
            <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center text-sm">
              <LanguagesIcon className="mx-auto mb-3 size-7 opacity-50" />
              Simpan detail set sebelum menambahkan kosakata.
            </div>
          )}
        </section>

        <aside className="grid min-w-0 gap-4 lg:sticky lg:top-6 lg:h-[calc(100svh-12rem)] lg:max-h-[calc(100svh-12rem)] lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden">
          <div className="bg-card grid gap-4 rounded-xl border p-4 shadow-xs">
            <div className="grid gap-1">
              <h2 className="font-heading text-sm font-semibold">
                Cari istilah
              </h2>
              <p className="text-muted-foreground text-xs">
                Temukan istilah, definisi, atau contoh dengan cepat.
              </p>
            </div>
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Cari istilah dalam set"
                className="pl-8"
                disabled={!vocabularySet?.entries.length}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari dalam set"
                value={search}
              />
            </div>
            {vocabularySet ? (
              <div className="bg-muted/40 grid grid-cols-2 gap-3 rounded-lg border p-3 text-center">
                <div>
                  <p className="font-heading text-lg font-semibold">
                    {vocabularySet.entries.length}
                  </p>
                  <p className="text-muted-foreground text-xs">Entri</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-semibold">
                    {
                      vocabularySet.entries.filter(
                        (entry) => entry.audioAssetId,
                      ).length
                    }
                  </p>
                  <p className="text-muted-foreground text-xs">Dengan audio</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-card grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border p-4 shadow-xs">
            <div>
              <h2 className="font-heading text-sm font-semibold">
                Peta istilah
              </h2>
              <p className="text-muted-foreground text-xs">
                Lompat langsung ke istilah yang ingin diedit.
              </p>
            </div>
            {entryMapItems.length ? (
              <nav
                aria-label="Navigasi istilah"
                className="grid min-h-0 min-w-0 gap-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
                ref={mapNavRef}
              >
                {entryMapItems.map((item) => {
                  const hidden = !visibleEntries.some(
                    (entry) => entry.id === item.id,
                  );
                  return (
                    <Button
                      aria-current={
                        activeEntryId === item.id ? "location" : undefined
                      }
                      className="h-auto w-full min-w-0 justify-start gap-2 px-2 py-2"
                      disabled={hidden}
                      id={`vocabulary-map-entry-${item.id}`}
                      key={item.id}
                      onClick={() => navigateToEntry(item.id)}
                      type="button"
                      variant={
                        activeEntryId === item.id ? "secondary" : "ghost"
                      }
                    >
                      <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs font-medium">
                        {item.index + 1}
                      </span>
                      <span className="min-w-0 truncate">{item.term}</span>
                    </Button>
                  );
                })}
              </nav>
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
                Belum ada istilah.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NewEntryForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (entry: EntryFields) => Promise<boolean>;
}) {
  const termInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [examples, setExamples] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term.trim() || !definition.trim()) {
      toast.error("Istilah dan definisi wajib diisi.");
      return;
    }
    const created = await onCreate({
      term: term.trim(),
      definition: definition.trim(),
      examples: parseExamples(examples),
    });
    if (created) {
      setTerm("");
      setDefinition("");
      setExamples("");
      setOpen(false);
      requestAnimationFrame(() => termInputRef.current?.focus());
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button size="sm" type="button">
            <PlusIcon data-icon="inline-start" />
            Tambah entri
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah entri kosakata</DialogTitle>
          <DialogDescription>
            Tambahkan istilah, definisi, contoh pemakaian, dan audio nanti dari
            kartu istilah.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="new-vocabulary-term">Istilah</Label>
            <Input
              id="new-vocabulary-term"
              maxLength={500}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Istilah atau frasa"
              ref={termInputRef}
              value={term}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-vocabulary-definition">Definisi</Label>
            <Input
              id="new-vocabulary-definition"
              maxLength={5000}
              onChange={(event) => setDefinition(event.target.value)}
              placeholder="Definisi yang mudah dipahami siswa"
              value={definition}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-vocabulary-examples">Contoh</Label>
            <Textarea
              id="new-vocabulary-examples"
              onChange={(event) => setExamples(event.target.value)}
              placeholder="Satu contoh pemakaian per baris"
              rows={2}
              value={examples}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button disabled={busy} type="submit">
              {busy ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Tambah entri
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VocabularyEntryCard({
  busy,
  canDelete,
  entry,
  highlighted,
  index,
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
  highlighted: boolean;
  index: number;
  onDelete: () => Promise<void>;
  onRemoveAudio: () => Promise<void>;
  onRemoveImage: () => Promise<void>;
  onUpdate: (entry: EntryFields) => Promise<boolean>;
  onUploadAudio: (file: File) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  uploadingAudio: boolean;
  uploadingImage: boolean;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(entry.term);
  const [definition, setDefinition] = useState(entry.definition);
  const [examples, setExamples] = useState(examplesToText(entry.examples));
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const { cancel: cancelEntrySave, schedule: scheduleEntrySave } =
    useDebouncedAutosave<EntryFields>(async (draft) => {
      if (!draft.term.trim() || !draft.definition.trim()) {
        setSaveState("error");
        return;
      }
      setSaveState("saving");
      const saved = await onUpdate({
        term: draft.term.trim(),
        definition: draft.definition.trim(),
        examples: draft.examples,
      });
      setSaveState(saved ? "saved" : "error");
    });
  const skipInitialEntrySave = useRef(true);

  useEffect(() => {
    if (skipInitialEntrySave.current) {
      skipInitialEntrySave.current = false;
      return;
    }
    scheduleEntrySave({
      term,
      definition,
      examples: parseExamples(examples),
    });
  }, [definition, examples, scheduleEntrySave, term]);

  function selectAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onUploadAudio(file);
  }

  return (
    <Card
      className={
        highlighted
          ? "border-primary/40 bg-primary/5 ring-primary/20 group scroll-mt-24 gap-0 overflow-hidden py-0 shadow-sm ring-2 transition-[background-color,border-color,box-shadow] duration-500"
          : "group focus-within:border-foreground/20 scroll-mt-24 gap-0 overflow-hidden py-0 transition-[background-color,border-color,box-shadow] duration-500 focus-within:shadow-sm"
      }
      data-entry-id={entry.id}
      id={`vocabulary-entry-${entry.id}`}
    >
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
              {index + 1}
            </span>
            <p className="text-muted-foreground text-xs font-medium">
              Entri {index + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                saveState === "error"
                  ? "text-destructive flex items-center gap-1.5 text-xs"
                  : "text-muted-foreground flex items-center gap-1.5 text-xs"
              }
            >
              {saveState === "saving" ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : saveState === "saved" ? (
                <CheckCircle2Icon className="size-3.5" />
              ) : null}
              {saveState === "saving"
                ? "Menyimpan"
                : saveState === "saved"
                  ? "Tersimpan"
                  : saveState === "error"
                    ? "Istilah dan definisi wajib diisi"
                    : "Simpan otomatis"}
            </span>
            {canDelete ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      aria-label="Hapus entri"
                      disabled={busy}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  <Trash2Icon />
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Hapus &ldquo;{term}&rdquo;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Entri kosakata ini akan dihapus permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        cancelEntrySave();
                        void onDelete();
                      }}
                      variant="destructive"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label
              className="text-muted-foreground text-[11px] tracking-wide uppercase"
              htmlFor={`term-${entry.id}`}
            >
              Istilah
            </Label>
            <Input
              className="font-heading h-10 text-base font-semibold"
              id={`term-${entry.id}`}
              maxLength={500}
              onChange={(event) => {
                setTerm(event.target.value);
                setSaveState("idle");
              }}
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
              className="h-10"
              id={`definition-${entry.id}`}
              maxLength={5000}
              onChange={(event) => {
                setDefinition(event.target.value);
                setSaveState("idle");
              }}
              value={definition}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label
              className="text-muted-foreground text-[11px] tracking-wide uppercase"
              htmlFor={`examples-${entry.id}`}
            >
              Contoh pemakaian
            </Label>
            <Textarea
              className="min-h-16 resize-y"
              id={`examples-${entry.id}`}
              onChange={(event) => {
                setExamples(event.target.value);
                setSaveState("idle");
              }}
              placeholder="Satu contoh per baris"
              rows={1}
              value={examples}
            />
          </div>
        </div>

        <div className="bg-muted/25 -mx-4 -mb-4 grid gap-3 border-t p-4 sm:-mx-5 sm:-mb-5 sm:px-5 lg:grid-cols-2">
          <input
            accept="audio/*"
            className="hidden"
            onChange={selectAudio}
            ref={audioInputRef}
            type="file"
          />
          <ImageUpload
            id={`vocabulary-image-${entry.id}`}
            value={entry.imageAssetId ? "asset" : null}
            alt={term}
            accept="image/*"
            helpText={
              <>
                <span className="font-medium">Ilustrasi</span>
                <span className="text-muted-foreground ml-1 truncate">
                  {entry.imageAsset?.fileName ?? "Gambar pendukung istilah"}
                </span>
              </>
            }
            isPending={busy || uploadingImage}
            onUpload={onUploadImage}
            onRemove={onRemoveImage}
            uploadLabel="Tambah"
            replaceLabel="Ganti"
            removeLabel="Lepas gambar"
            className="bg-background min-w-0 rounded-lg"
            previewClassName="h-20 w-32"
            placeholder={
              <div className="flex flex-col items-center gap-1.5 text-xs">
                <ImageIcon className="size-5" />
                Belum ada ilustrasi
              </div>
            }
            renderPreview={(previewUrl) =>
              previewUrl ? (
                <Image
                  alt={term}
                  className="h-20 w-32 rounded-md object-cover"
                  height={80}
                  src={previewUrl}
                  unoptimized
                  width={128}
                />
              ) : entry.imageAssetId ? (
                <AssetImage assetId={entry.imageAssetId} alt={term} />
              ) : (
                <div className="bg-muted text-muted-foreground flex h-20 w-32 items-center justify-center rounded-md">
                  <ImageIcon className="size-5" />
                </div>
              )
            }
          />

          <div className="bg-background grid min-w-0 grid-rows-[1fr_auto] overflow-hidden rounded-lg border">
            <div className="flex min-h-20 items-center p-3">
              {entry.audioAssetId ? (
                <div className="w-full min-w-0">
                  <p className="mb-1.5 flex items-center gap-2 truncate text-xs font-medium">
                    <Volume2Icon className="size-3.5 shrink-0" />
                    {entry.audioAsset?.fileName ?? "Audio pelafalan"}
                  </p>
                  <AudioPlayer assetId={entry.audioAssetId} />
                </div>
              ) : (
                <div className="text-muted-foreground flex w-full flex-col items-center justify-center gap-1.5 text-xs">
                  <Volume2Icon className="size-5" />
                  Belum ada audio pelafalan
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium">Pelafalan</p>
                <p className="text-muted-foreground truncate text-[11px]">
                  Audio untuk membantu pengucapan
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  disabled={busy}
                  onClick={() => audioInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {uploadingAudio ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <UploadIcon />
                  )}
                  {entry.audioAssetId ? "Ganti" : "Tambah"}
                </Button>
                {entry.audioAssetId ? (
                  <Button
                    aria-label="Lepas audio"
                    disabled={busy}
                    onClick={() => void onRemoveAudio()}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
