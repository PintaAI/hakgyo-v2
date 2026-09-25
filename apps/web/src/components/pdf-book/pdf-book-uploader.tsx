"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { MAX_PDF_BOOK_PAGES } from "@hakgyo/shared";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  FileUpIcon,
  LoaderCircleIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

import type { usePdfBookUpload } from "./use-pdf-book-upload";

type Upload = ReturnType<typeof usePdfBookUpload>;

export function PdfBookUploader({
  upload,
  resume,
  onBookReady,
  compact = false,
}: {
  upload: Upload;
  resume?: { bookId: string; pageCount: number; title: string };
  onBookReady?: (bookId: string) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { state } = upload;
  const busy = state.phase === "reading" || state.phase === "uploading";

  // Rendering happens in this tab; warn before closing mid-upload.
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function begin(file: File | undefined) {
    if (!file || busy) return;
    void upload.start(file, {
      title: resume?.title ?? file.name.replace(/\.pdf$/i, ""),
      resume: resume
        ? { bookId: resume.bookId, pageCount: resume.pageCount }
        : undefined,
      onBookReady,
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    begin(event.dataTransfer.files[0]);
  }

  if (state.phase === "reading" || state.phase === "uploading") {
    const percent =
      state.phase === "uploading"
        ? Math.round((state.uploadedPages / state.pageCount) * 100)
        : 0;
    return (
      <div
        className="bg-card space-y-3 rounded-xl border p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <LoaderCircleIcon className="text-primary size-5 shrink-0 animate-spin" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{state.fileName}</p>
            <p className="text-muted-foreground text-xs">
              {state.phase === "reading"
                ? "Membaca PDF…"
                : `Memproses halaman ${state.uploadedPages} dari ${state.pageCount}`}
            </p>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {percent}%
          </span>
        </div>
        <Progress value={percent} />
        <p className="text-muted-foreground text-xs">
          Biarkan tab ini tetap terbuka. Jika terputus, pilih file yang sama
          untuk melanjutkan.
        </p>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="bg-card flex items-center gap-3 rounded-xl border p-5">
        <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{state.fileName}</p>
          <p className="text-muted-foreground text-xs">
            {state.pageCount} halaman siap dipakai.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "hover:border-primary/60 hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center transition",
          compact ? "px-4 py-6" : "px-6 py-12",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <span className="bg-muted flex size-11 items-center justify-center rounded-full">
          <FileUpIcon className="text-muted-foreground size-5" />
        </span>
        <span>
          <span className="block text-sm font-medium">
            {resume
              ? `Pilih lagi file “${resume.title}” untuk melanjutkan`
              : "Tarik PDF ke sini atau klik untuk memilih"}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            PDF, maksimal 100 MB · {MAX_PDF_BOOK_PAGES} halaman
          </span>
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => {
            begin(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {state.phase === "error" ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p>{state.message}</p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              Pilih file lagi
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
