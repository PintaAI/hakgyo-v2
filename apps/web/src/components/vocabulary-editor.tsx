"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  LanguagesIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
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
import { Button, buttonVariants } from "~/components/ui/button";
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
  const reorderEntries = api.content.reorderVocabularyEntries.useMutation();
  const canDelete = Boolean(
    organization.data &&
    (organization.data.currentRole !== "TEACHER" ||
      organization.data.teacherCanDeleteContent),
  );
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
          {vocabularySets.error?.message ??
            "Set kosakata gagal dimuat."}
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
      organizationSlug={organizationSlug}
      vocabularySet={vocabularySet}
      entryBusy={
        createEntry.isPending ||
        updateEntry.isPending ||
        deleteEntry.isPending ||
        reorderEntries.isPending
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
      onMoveEntry={async (entryId, direction) => {
        if (!vocabularySet) return;
        const index = vocabularySet.entries.findIndex(
          (entry) => entry.id === entryId,
        );
        const nextIndex = index + direction;
        if (
          index < 0 ||
          nextIndex < 0 ||
          nextIndex >= vocabularySet.entries.length
        ) {
          return;
        }
        const entryIds = vocabularySet.entries.map((entry) => entry.id);
        [entryIds[index], entryIds[nextIndex]] = [
          entryIds[nextIndex]!,
          entryIds[index]!,
        ];
        try {
          await reorderEntries.mutateAsync({
            organizationId,
            vocabularySetId: vocabularySet.id,
            entryIds,
          });
          await refreshVocabulary();
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
  organizationSlug,
  vocabularySet,
  entryBusy,
  onCreateEntry,
  onDelete,
  onDeleteEntry,
  onMoveEntry,
  onSave,
  onUpdateEntry,
}: {
  canDelete: boolean;
  initialDescription: string;
  initialTitle: string;
  isDeleting: boolean;
  isSaving: boolean;
  organizationSlug: string;
  vocabularySet?: VocabularySet;
  entryBusy: boolean;
  onCreateEntry: (entry: EntryFields) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onMoveEntry: (entryId: string, direction: -1 | 1) => Promise<void>;
  onSave: (value: {
    title: string;
    description: string | null;
  }) => Promise<void>;
  onUpdateEntry: (entryId: string, entry: EntryFields) => Promise<boolean>;
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label="Kembali ke kosakata"
              href={`/workspace/${organizationSlug}/library/vocabulary`}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ArrowLeftIcon />
            </Link>
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
                    <AlertDialogTitle>
                      Hapus set kosakata ini?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Ini menghapus semua entri dan tidak dapat dibatalkan.
                      Penghapusan dapat gagal selama set dipakai oleh course
                      atau materi.
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
            <Button disabled={isSaving || isDeleting} type="submit">
              {isSaving ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {vocabularySet ? "Simpan detail" : "Buat set"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-5 md:grid-cols-2">
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
                placeholder="Di mana dan bagaimana learner akan memakai kata-kata ini?"
                rows={3}
                value={description}
              />
            </div>
          </CardContent>
        </Card>
      </form>

      {vocabularySet ? (
        <section className="grid gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Entri</h2>
              <p className="text-muted-foreground text-sm">
                Istilah ditampilkan kepada learner dalam urutan ini.
              </p>
            </div>
            <Badge variant="secondary">
              {vocabularySet.entries.length} entri
            </Badge>
          </div>

          <NewEntryForm busy={entryBusy} onCreate={onCreateEntry} />

          {vocabularySet.entries.length ? (
            <div className="grid gap-3">
              {vocabularySet.entries.map((entry, index) => (
                <VocabularyEntryCard
                  busy={entryBusy}
                  canDelete={canDelete}
                  canMoveDown={index < vocabularySet.entries.length - 1}
                  canMoveUp={index > 0}
                  entry={entry}
                  index={index}
                  key={entry.id}
                  onDelete={() => onDeleteEntry(entry.id)}
                  onMoveDown={() => onMoveEntry(entry.id, 1)}
                  onMoveUp={() => onMoveEntry(entry.id, -1)}
                  onUpdate={(value) => onUpdateEntry(entry.id, value)}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-12 text-center text-sm">
              Tambahkan istilah pertama untuk mulai membangun set ini.
            </div>
          )}
        </section>
      ) : (
        <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          Buat set kosakata terlebih dahulu sebelum menambahkan entri.
        </div>
      )}
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
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusIcon className="size-4" />
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
              placeholder="Definisi yang mudah dipahami learner"
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
  canMoveDown,
  canMoveUp,
  entry,
  index,
  onDelete,
  onMoveDown,
  onMoveUp,
  onUpdate,
}: {
  busy: boolean;
  canDelete: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  entry: VocabularyEntry;
  index: number;
  onDelete: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onUpdate: (entry: EntryFields) => Promise<boolean>;
}) {
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

  if (editing) {
    return (
      <Card>
        <CardContent>
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
    <Card>
      <CardContent className="flex gap-4">
        <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            <h3 className="font-heading font-semibold">{entry.term}</h3>
            <p className="text-sm">{entry.definition}</p>
          </div>
          {exampleList.length > 0 && (
            <ul className="text-muted-foreground mt-3 grid gap-1 border-t pt-3 text-sm">
              {exampleList.map((example, exampleIndex) => (
                <li key={`${entry.id}-${exampleIndex}`}>
                  &ldquo;{example}&rdquo;
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button
            aria-label="Pindahkan entri ke atas"
            disabled={busy || !canMoveUp}
            onClick={onMoveUp}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            aria-label="Pindahkan entri ke bawah"
            disabled={busy || !canMoveDown}
            onClick={onMoveDown}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowDownIcon />
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
