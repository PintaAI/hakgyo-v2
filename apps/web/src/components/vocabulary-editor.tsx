"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  HeadphonesIcon,
  LanguagesIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
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
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterOutputs } from "~/trpc/react";

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

export function VocabularyEditor({
  organizationId,
  organizationSlug,
  vocabularySetId,
}: {
  organizationId: string;
  organizationSlug: string;
  vocabularySetId?: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const vocabularySets = api.content.listVocabularySets.useQuery(
    { organizationId },
    { enabled: Boolean(vocabularySetId) },
  );
  const organization = api.organization.get.useQuery({ organizationId });
  const createSet = api.content.createVocabularySet.useMutation();
  const updateSet = api.content.updateVocabularySet.useMutation();
  const deleteSet = api.content.deleteVocabularySet.useMutation();
  const createEntry = api.content.createVocabularyEntry.useMutation();
  const updateEntry = api.content.updateVocabularyEntry.useMutation();
  const deleteEntry = api.content.deleteVocabularyEntry.useMutation();
  const createUpload = api.storage.createUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmUpload.useMutation();
  const discardUpload = api.storage.deleteDocument.useMutation();
  const [uploadingEntryId, setUploadingEntryId] = useState<string | null>(null);
  const canDelete = Boolean(organization.data);
  const vocabularySet = vocabularySets.data?.find(
    (set) => set.id === vocabularySetId,
  );

  async function refreshVocabulary() {
    await utils.content.listVocabularySets.invalidate({ organizationId });
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
      canDelete={canDelete}
      isDeleting={deleteSet.isPending}
      isSaving={createSet.isPending || updateSet.isPending}
      onBack={() => router.back()}
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
      onSave={async ({ title, description }) => {
        try {
          if (vocabularySetId) {
            await updateSet.mutateAsync({
              organizationId,
              vocabularySetId,
              title,
              description,
            });
            await refreshVocabulary();
            toast.success("Set kosakata disimpan.");
            return;
          }

          const created = await createSet.mutateAsync({
            organizationId,
            title,
            description,
          });
          await refreshVocabulary();
          toast.success("Set kosakata dibuat. Tambahkan istilah pertama Anda.");
          router.replace(
            `/workspace/${organizationSlug}/library/vocabulary/${created.id}`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onUpdateEntry={async (entryId, entry) => {
        try {
          await updateEntry.mutateAsync({ organizationId, entryId, ...entry });
          await refreshVocabulary();
          toast.success("Entri kosakata disimpan.");
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onUploadAudio={async (entryId, file) => {
        if (!file.type.startsWith("audio/")) {
          toast.error("Pilih file audio yang valid.");
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error("Ukuran audio maksimal 50 MB.");
          return;
        }

        setUploadingEntryId(entryId);
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
            throw new Error(`Upload audio gagal (${response.status}).`);
          }
          const asset = await confirmUpload.mutateAsync({ key: upload.key });
          await updateEntry.mutateAsync({
            organizationId,
            entryId,
            audioAssetId: asset.assetId,
          });
          attached = true;
          await refreshVocabulary();
          toast.success("Audio pelafalan ditambahkan.");
        } catch (error) {
          if (uploadedKey && !attached) {
            await discardUpload
              .mutateAsync({ key: uploadedKey })
              .catch(() => undefined);
          }
          toast.error(errorMessage(error));
        } finally {
          setUploadingEntryId(null);
        }
      }}
      uploadingEntryId={uploadingEntryId}
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
  onSave,
  onUpdateEntry,
  onUploadAudio,
  uploadingEntryId,
}: {
  canDelete: boolean;
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
  onSave: (value: {
    title: string;
    description: string | null;
  }) => Promise<void>;
  onUpdateEntry: (entryId: string, entry: EntryFields) => Promise<boolean>;
  onUploadAudio: (entryId: string, file: File) => Promise<void>;
  uploadingEntryId: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Judul set kosakata wajib diisi.");
      return;
    }
    await onSave({
      title: normalizedTitle,
      description: description.trim() || null,
    });
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
            onClick={onBack}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <LanguagesIcon className="size-3.5" />
              {vocabularySet ? "Edit set kosakata" : "Set kosakata baru"}
            </div>
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
              {title.trim() || "Set kosakata tanpa judul"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
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
                    Ini menghapus semua entri dan tidak dapat dibatalkan.
                    Penghapusan dapat gagal selama set dipakai oleh course atau
                    materi.
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
          <Button
            disabled={isSaving || isDeleting}
            form="vocabulary-details-form"
            type="submit"
          >
            {isSaving ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            {vocabularySet ? "Simpan perubahan" : "Buat set"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <section className="grid min-w-0 gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Daftar kosakata
              </h2>
              <p className="text-muted-foreground text-sm">
                Susun istilah, arti, contoh, dan audio pelafalan.
              </p>
            </div>
            <Badge variant="secondary">
              {vocabularySet?.entries.length ?? 0} entri
            </Badge>
          </div>

          {vocabularySet ? (
            <>
              <NewEntryForm busy={entryBusy} onCreate={onCreateEntry} />
              {vocabularySet.entries.length ? (
                <div className="grid gap-3">
                  {vocabularySet.entries.map((entry, index) => (
                    <VocabularyEntryCard
                      busy={entryBusy}
                      canDelete={canDelete}
                      entry={entry}
                      index={index}
                      key={entry.id}
                      onDelete={() => onDeleteEntry(entry.id)}
                      onRemoveAudio={() => onRemoveAudio(entry.id)}
                      onUpdate={(value) => onUpdateEntry(entry.id, value)}
                      onUploadAudio={(file) => onUploadAudio(entry.id, file)}
                      uploading={uploadingEntryId === entry.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center text-sm">
                  <LanguagesIcon className="mx-auto mb-3 size-7 opacity-50" />
                  Tambahkan istilah pertama untuk mulai membangun set ini.
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center text-sm">
              <LanguagesIcon className="mx-auto mb-3 size-7 opacity-50" />
              Simpan detail set sebelum menambahkan kosakata.
            </div>
          )}
        </section>

        <form
          className="bg-card grid gap-5 rounded-xl border p-5 shadow-xs lg:sticky lg:top-6"
          id="vocabulary-details-form"
          onSubmit={handleSubmit}
        >
          <div>
            <p className="font-heading font-semibold">Detail set</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Informasi ini ditampilkan saat set dipilih untuk course.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vocabulary-title">Judul</Label>
            <Input
              autoFocus={!vocabularySet}
              id="vocabulary-title"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Mis. Perjalanan penting"
              value={title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vocabulary-description">Deskripsi</Label>
            <Textarea
              id="vocabulary-description"
              maxLength={10000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kapan siswa akan memakai kata-kata ini?"
              rows={7}
              value={description}
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
                    vocabularySet.entries.filter((entry) => entry.audioAssetId)
                      .length
                  }
                </p>
                <p className="text-muted-foreground text-xs">Dengan audio</p>
              </div>
            </div>
          ) : null}
        </form>
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
    }
  }

  return (
    <Card className="bg-muted/10 border-dashed">
      <CardHeader className="border-b border-dashed">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
            <PlusIcon className="size-4" />
          </span>
          Tambah entri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="new-vocabulary-term">Istilah</Label>
            <Input
              id="new-vocabulary-term"
              maxLength={500}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Istilah atau frasa"
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
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="new-vocabulary-examples">Contoh</Label>
            <Textarea
              id="new-vocabulary-examples"
              onChange={(event) => setExamples(event.target.value)}
              placeholder="Satu contoh pemakaian per baris"
              rows={2}
              value={examples}
            />
          </div>
          <div className="flex justify-end lg:col-span-2">
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
      </CardContent>
    </Card>
  );
}

function VocabularyEntryCard({
  busy,
  canDelete,
  entry,
  index,
  onDelete,
  onRemoveAudio,
  onUpdate,
  onUploadAudio,
  uploading,
}: {
  busy: boolean;
  canDelete: boolean;
  entry: VocabularyEntry;
  index: number;
  onDelete: () => Promise<void>;
  onRemoveAudio: () => Promise<void>;
  onUpdate: (entry: EntryFields) => Promise<boolean>;
  onUploadAudio: (file: File) => Promise<void>;
  uploading: boolean;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(entry.term);
  const [definition, setDefinition] = useState(entry.definition);
  const [examples, setExamples] = useState(examplesToText(entry.examples));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term.trim() || !definition.trim()) {
      toast.error("Istilah dan definisi wajib diisi.");
      return;
    }
    const saved = await onUpdate({
      term: term.trim(),
      definition: definition.trim(),
      examples: parseExamples(examples),
    });
    if (saved) setEditing(false);
  }

  function cancelEditing() {
    setTerm(entry.term);
    setDefinition(entry.definition);
    setExamples(examplesToText(entry.examples));
    setEditing(false);
  }

  function selectAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void onUploadAudio(file);
  }

  if (editing) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/25 flex-row items-center justify-between border-b py-3">
          <CardTitle className="text-sm">Edit entri {index + 1}</CardTitle>
          <Button
            aria-label="Batalkan edit"
            onClick={cancelEditing}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor={`term-${entry.id}`}>Istilah</Label>
              <Input
                id={`term-${entry.id}`}
                maxLength={500}
                onChange={(event) => setTerm(event.target.value)}
                value={term}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`definition-${entry.id}`}>Definisi</Label>
              <Input
                id={`definition-${entry.id}`}
                maxLength={5000}
                onChange={(event) => setDefinition(event.target.value)}
                value={definition}
              />
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor={`examples-${entry.id}`}>Contoh</Label>
              <Textarea
                id={`examples-${entry.id}`}
                onChange={(event) => setExamples(event.target.value)}
                rows={2}
                value={examples}
              />
            </div>
            <div className="flex justify-end gap-2 lg:col-span-2">
              <Button type="button" variant="outline" onClick={cancelEditing}>
                <XIcon data-icon="inline-start" />
                Batal
              </Button>
              <Button disabled={busy} type="submit">
                {busy && <LoaderCircleIcon className="animate-spin" />}
                Simpan entri
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const exampleList = parseExamples(examplesToText(entry.examples));

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-sm">
      <CardContent className="flex gap-4 p-5">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-semibold tracking-tight">
            {entry.term}
          </h3>
          <p className="mt-1 text-sm leading-relaxed">{entry.definition}</p>
          {exampleList.length > 0 && (
            <ul className="text-muted-foreground mt-3 grid gap-1 border-l-2 pl-3 text-sm italic">
              {exampleList.map((example, exampleIndex) => (
                <li key={`${entry.id}-${exampleIndex}`}>
                  &ldquo;{example}&rdquo;
                </li>
              ))}
            </ul>
          )}
          {entry.audioAssetId ? (
            <div className="bg-muted/35 mt-4 grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="mb-2 flex items-center gap-2 truncate text-xs font-medium">
                  <Volume2Icon className="size-3.5 shrink-0" />
                  {entry.audioAsset?.fileName ?? "Audio pelafalan"}
                </p>
                <AudioPlayer assetId={entry.audioAssetId} />
              </div>
              <Button
                disabled={busy}
                onClick={() => void onRemoveAudio()}
                size="sm"
                type="button"
                variant="ghost"
              >
                <XIcon /> Lepas
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <input
            accept="audio/*"
            className="hidden"
            onChange={selectAudio}
            ref={audioInputRef}
            type="file"
          />
          <Button
            aria-label={entry.audioAssetId ? "Ganti audio" : "Tambah audio"}
            disabled={busy}
            onClick={() => audioInputRef.current?.click()}
            size="icon-sm"
            title={entry.audioAssetId ? "Ganti audio" : "Tambah audio"}
            type="button"
            variant="ghost"
          >
            {uploading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : entry.audioAssetId ? (
              <HeadphonesIcon />
            ) : (
              <UploadIcon />
            )}
          </Button>
          <Button
            aria-label="Edit entri"
            disabled={busy}
            onClick={() => setEditing(true)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <PencilIcon />
          </Button>
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
                    Hapus &ldquo;{entry.term}&rdquo;?
                  </AlertDialogTitle>
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
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
