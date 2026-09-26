"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LoaderCircleIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export type PreparedVocabularyImage = {
  imageBase64: string;
  mediaType: "image/jpeg";
};

export type ExtractedVocabularyEntry = {
  term: string;
  romanization: string;
  definition: string;
  examples: string[];
  duplicate: boolean;
};

export type ImportedVocabularyEntry = Omit<
  ExtractedVocabularyEntry,
  "duplicate"
>;

type ReviewRow = {
  key: number;
  term: string;
  romanization: string;
  definition: string;
  examples: string;
  selected: boolean;
  duplicate: boolean;
};

type ImportState =
  | { status: "idle" }
  | { status: "scanning"; file: File; previewUrl: string }
  | { status: "error"; file: File; previewUrl: string; message: string }
  | { status: "review"; file: File; previewUrl: string; rows: ReviewRow[] };

// OpenAI's high-detail vision input is downscaled to fit 2048px anyway, so
// larger uploads only cost bandwidth.
const maxImageSide = 2048;

async function prepareVocabularyImage(
  file: File,
): Promise<PreparedVocabularyImage> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Format gambar ${file.name} tidak didukung.`);
  });
  const scale = Math.min(
    1,
    maxImageSide / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat memproses gambar.");
  // JPEG has no alpha; paint white so transparent screenshots stay legible.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Browser tidak dapat memproses gambar.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gambar gagal dibaca."));
    reader.readAsDataURL(blob);
  });
  return {
    imageBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    mediaType: "image/jpeg",
  };
}

export function firstImageFile(files: FileList | null | undefined) {
  return Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
}

/**
 * Image → AI scan → author adjusts the extracted rows → save. Nothing is
 * written to the set until the author confirms.
 */
export function useVocabularyImageImport({
  onExtract,
  onSave,
}: {
  onExtract: (
    image: PreparedVocabularyImage,
  ) => Promise<ExtractedVocabularyEntry[]>;
  onSave: (entries: ImportedVocabularyEntry[]) => Promise<boolean>;
}) {
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  // Closing the dialog mid-scan bumps the session so the abandoned
  // request's late result is ignored.
  const sessionRef = useRef(0);

  async function scan(file: File, previewUrl: string) {
    const session = ++sessionRef.current;
    setState({ status: "scanning", file, previewUrl });
    try {
      const entries = await onExtract(await prepareVocabularyImage(file));
      if (session !== sessionRef.current) return;
      if (!entries.length) {
        setState({
          status: "error",
          file,
          previewUrl,
          message: "Tidak ada daftar kosakata yang terbaca dari gambar ini.",
        });
        return;
      }
      setState({
        status: "review",
        file,
        previewUrl,
        rows: entries.map((entry, key) => ({
          key,
          term: entry.term,
          romanization: entry.romanization,
          definition: entry.definition,
          examples: entry.examples.join("\n"),
          selected: !entry.duplicate,
          duplicate: entry.duplicate,
        })),
      });
    } catch (error) {
      if (session !== sessionRef.current) return;
      setState({
        status: "error",
        file,
        previewUrl,
        message:
          error instanceof Error ? error.message : "Gambar gagal diproses.",
      });
    }
  }

  function start(file: File) {
    if (state.status !== "idle") return;
    void scan(file, URL.createObjectURL(file));
  }

  function reset() {
    sessionRef.current += 1;
    if (state.status !== "idle") URL.revokeObjectURL(state.previewUrl);
    setState({ status: "idle" });
  }

  function updateRows(update: (row: ReviewRow) => ReviewRow) {
    setState((current) =>
      current.status === "review"
        ? { ...current, rows: current.rows.map(update) }
        : current,
    );
  }

  function updateRow(key: number, patch: Partial<ReviewRow>) {
    updateRows((row) => (row.key === key ? { ...row, ...patch } : row));
  }

  const rows = state.status === "review" ? state.rows : [];
  const selectedRows = rows.filter((row) => row.selected);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const invalidSelected = selectedRows.some(
    (row) => !row.term.trim() || !row.definition.trim(),
  );

  async function save() {
    if (!selectedRows.length || invalidSelected) return;
    setSaving(true);
    const saved = await onSave(
      selectedRows.map((row) => ({
        term: row.term.trim(),
        romanization: row.romanization.trim(),
        definition: row.definition.trim(),
        examples: row.examples
          .split("\n")
          .map((example) => example.trim())
          .filter(Boolean),
      })),
    ).catch(() => false);
    setSaving(false);
    if (saved) reset();
  }

  const dialog = (
    <Dialog
      open={state.status !== "idle"}
      onOpenChange={(open) => {
        if (!open && !saving) reset();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-4" />
            Impor kosakata dengan AI
          </DialogTitle>
          <DialogDescription>
            {state.status === "review"
              ? "Periksa dan sesuaikan hasil bacaan AI, lalu simpan ke set."
              : state.status === "error"
                ? "AI belum berhasil membaca gambar ini."
                : "AI sedang memindai gambar dan menyusun daftar kosakata."}
          </DialogDescription>
        </DialogHeader>

        {state.status !== "idle" ? (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="bg-muted/40 relative flex max-h-56 items-center justify-center overflow-hidden rounded-lg border md:max-h-none">
              <Image
                alt="Gambar daftar kosakata"
                className={cn(
                  "h-full max-h-56 w-full object-contain transition-[filter] duration-500 md:max-h-[65vh]",
                  state.status === "scanning" && "saturate-50",
                )}
                height={800}
                src={state.previewUrl}
                unoptimized
                width={800}
              />
              {state.status === "scanning" ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                >
                  <div className="bg-primary/5 absolute inset-0" />
                  <div className="animate-scan-line from-primary/0 to-primary/25 border-primary shadow-primary/60 absolute inset-x-0 h-20 -translate-y-full border-b-2 bg-gradient-to-b shadow-[0_6px_16px_-4px]" />
                  <Badge className="absolute top-2 left-2 gap-1 shadow-sm">
                    <SparklesIcon className="size-3 animate-pulse" />
                    Memindai…
                  </Badge>
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-col gap-2">
              {state.status === "scanning" ? (
                <div aria-busy className="grid gap-2">
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                    Membaca istilah, romanisasi, dan definisi…
                  </p>
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      className="grid grid-cols-[1rem_1fr_1fr_1.3fr] gap-2 rounded-lg border p-2"
                      key={index}
                    >
                      <Skeleton className="mt-2.5 size-4" />
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                    </div>
                  ))}
                </div>
              ) : state.status === "error" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-destructive text-sm">{state.message}</p>
                  <Button
                    onClick={() => void scan(state.file, state.previewUrl)}
                    type="button"
                    variant="outline"
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Pindai ulang
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-2 font-medium">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && selectedRows.length > 0}
                        onCheckedChange={(checked) =>
                          updateRows((row) => ({ ...row, selected: checked }))
                        }
                      />
                      {rows.length} istilah terbaca
                    </label>
                    <span className="text-muted-foreground">
                      Definisi dalam Bahasa Indonesia
                    </span>
                  </div>
                  <ol className="-mr-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2">
                    {rows.map((row) => (
                      <li
                        className={cn(
                          "grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-2 rounded-lg border p-2 transition-opacity",
                          !row.selected && "opacity-55",
                        )}
                        key={row.key}
                      >
                        <Checkbox
                          aria-label={`Simpan ${row.term}`}
                          checked={row.selected}
                          className="mt-2.5"
                          onCheckedChange={(checked) =>
                            updateRow(row.key, { selected: checked })
                          }
                        />
                        <Input
                          aria-invalid={row.selected && !row.term.trim()}
                          aria-label="Istilah"
                          className="font-heading h-9 font-semibold"
                          maxLength={500}
                          onChange={(event) =>
                            updateRow(row.key, { term: event.target.value })
                          }
                          value={row.term}
                        />
                        <Input
                          aria-label="Romanisasi"
                          className="h-9 italic"
                          maxLength={500}
                          onChange={(event) =>
                            updateRow(row.key, {
                              romanization: event.target.value,
                            })
                          }
                          placeholder="Romanisasi"
                          value={row.romanization}
                        />
                        <Input
                          aria-invalid={row.selected && !row.definition.trim()}
                          aria-label="Definisi"
                          className="h-9"
                          maxLength={5000}
                          onChange={(event) =>
                            updateRow(row.key, {
                              definition: event.target.value,
                            })
                          }
                          value={row.definition}
                        />
                        <div className="col-span-3 col-start-2 flex items-start gap-2">
                          {row.duplicate ? (
                            <Badge className="mt-1.5" variant="outline">
                              Sudah ada
                            </Badge>
                          ) : null}
                          <Textarea
                            aria-label="Contoh pemakaian"
                            className="min-h-8 flex-1 resize-none py-1.5 text-xs"
                            onChange={(event) =>
                              updateRow(row.key, {
                                examples: event.target.value,
                              })
                            }
                            placeholder="Contoh pemakaian (opsional, satu per baris)"
                            rows={1}
                            value={row.examples}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            disabled={saving}
            onClick={reset}
            type="button"
            variant="outline"
          >
            Batal
          </Button>
          <Button
            disabled={
              state.status !== "review" ||
              saving ||
              !selectedRows.length ||
              invalidSelected
            }
            onClick={() => void save()}
            type="button"
          >
            {saving || state.status === "scanning" ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {state.status === "review"
              ? `Simpan ${selectedRows.length} istilah`
              : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { busy: state.status !== "idle", dialog, start };
}

export function ImageImportButton({
  busy,
  onSelect,
}: {
  busy: boolean;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = firstImageFile(event.target.files);
          event.target.value = "";
          if (file) onSelect(file);
        }}
        ref={inputRef}
        type="file"
      />
      <Button
        aria-label="Impor kosakata dengan AI"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title="Impor daftar kosakata dari gambar dengan AI"
        type="button"
        variant="outline"
      >
        <SparklesIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Impor AI</span>
      </Button>
    </>
  );
}
