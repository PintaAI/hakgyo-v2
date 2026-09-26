"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { LoaderCircleIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

export type PreparedImportImage = {
  imageBase64: string;
  mediaType: "image/jpeg";
};

type ImportState<Row> =
  | { status: "idle" }
  | { status: "scanning"; file: File; previewUrl: string }
  | { status: "error"; file: File; previewUrl: string; message: string }
  | { status: "review"; file: File; previewUrl: string; rows: Row[] };

// OpenAI's high-detail vision input is downscaled to fit 2048px anyway, so
// larger uploads only cost bandwidth.
const maxImageSide = 2048;

async function prepareImportImage(file: File): Promise<PreparedImportImage> {
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
 * written until the author confirms; the review UI is supplied per feature.
 */
export function useAiImageImport<Row>({
  emptyMessage,
  extract,
}: {
  emptyMessage: string;
  extract: (image: PreparedImportImage) => Promise<Row[]>;
}) {
  const [state, setState] = useState<ImportState<Row>>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  // Closing the dialog mid-scan bumps the session so the abandoned
  // request's late result is ignored.
  const sessionRef = useRef(0);

  async function scan(file: File, previewUrl: string) {
    const session = ++sessionRef.current;
    setState({ status: "scanning", file, previewUrl });
    try {
      const rows = await extract(await prepareImportImage(file));
      if (session !== sessionRef.current) return;
      setState(
        rows.length
          ? { status: "review", file, previewUrl, rows }
          : { status: "error", file, previewUrl, message: emptyMessage },
      );
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

  function rescan() {
    if (state.status === "idle") return;
    void scan(state.file, state.previewUrl);
  }

  function close() {
    if (saving) return;
    sessionRef.current += 1;
    if (state.status !== "idle") URL.revokeObjectURL(state.previewUrl);
    setState({ status: "idle" });
  }

  function updateRows(update: (rows: Row[]) => Row[]) {
    setState((current) =>
      current.status === "review"
        ? { ...current, rows: update(current.rows) }
        : current,
    );
  }

  /** Runs the feature's save; closes the dialog when it reports success. */
  async function save(persist: () => Promise<boolean>) {
    setSaving(true);
    const saved = await persist().catch(() => false);
    setSaving(false);
    if (!saved) return;
    sessionRef.current += 1;
    if (state.status !== "idle") URL.revokeObjectURL(state.previewUrl);
    setState({ status: "idle" });
  }

  return {
    busy: state.status !== "idle",
    close,
    rescan,
    rows: state.status === "review" ? state.rows : [],
    save,
    saving,
    start,
    state,
    updateRows,
  };
}

export type AiImageImport<Row> = ReturnType<typeof useAiImageImport<Row>>;

export function AiImageImportDialog<Row>({
  children,
  importer,
  onSave,
  reviewDescription,
  saveDisabled,
  saveLabel,
  scanningDescription,
  scanningLabel,
  skeleton,
  title,
}: {
  /** Review UI, rendered once rows are extracted. */
  children: ReactNode;
  importer: AiImageImport<Row>;
  onSave: () => void;
  reviewDescription: string;
  saveDisabled: boolean;
  saveLabel: string;
  scanningDescription: string;
  scanningLabel: string;
  skeleton: ReactNode;
  title: string;
}) {
  const { state, saving } = importer;

  return (
    <Dialog
      open={state.status !== "idle"}
      onOpenChange={(open) => {
        if (!open) importer.close();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {state.status === "review"
              ? reviewDescription
              : state.status === "error"
                ? "AI belum berhasil membaca gambar ini."
                : scanningDescription}
          </DialogDescription>
        </DialogHeader>

        {state.status !== "idle" ? (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="bg-muted/40 relative flex max-h-56 items-center justify-center overflow-hidden rounded-lg border md:max-h-none">
              <Image
                alt="Gambar yang diimpor"
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
                    {scanningLabel}
                  </p>
                  {skeleton}
                </div>
              ) : state.status === "error" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-destructive text-sm">{state.message}</p>
                  <Button
                    onClick={importer.rescan}
                    type="button"
                    variant="outline"
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Pindai ulang
                  </Button>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            disabled={saving}
            onClick={importer.close}
            type="button"
            variant="outline"
          >
            Batal
          </Button>
          <Button
            disabled={state.status !== "review" || saving || saveDisabled}
            onClick={onSave}
            type="button"
          >
            {saving || state.status === "scanning" ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {state.status === "review" ? saveLabel : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AiImportButton({
  busy,
  label = "Impor AI",
  onSelect,
  title,
}: {
  busy: boolean;
  label?: string;
  onSelect: (file: File) => void;
  title: string;
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
        aria-label={title}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={title}
        type="button"
        variant="outline"
      >
        <SparklesIcon data-icon="inline-start" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </>
  );
}
