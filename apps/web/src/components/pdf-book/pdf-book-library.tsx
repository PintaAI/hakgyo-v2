"use client";

import { useState } from "react";
import {
  BookOpenIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api, type RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";

import { PdfBookUploader } from "./pdf-book-uploader";
import { usePdfBookUpload } from "./use-pdf-book-upload";

export type PdfBookSummary = RouterOutputs["pdfBook"]["list"][number];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

/** Organization book shelf with upload and resume. Picking a book continues the flow. */
export function PdfBookLibrary({
  organizationId,
  onPick,
  allowProcessing = false,
  upload: sharedUpload,
}: {
  organizationId: string;
  onPick: (bookId: string) => void;
  /** Pass an upload owned by a parent so it survives this list unmounting. */
  upload?: ReturnType<typeof usePdfBookUpload>;
  /** Let the caller continue with a book that is still uploading. */
  allowProcessing?: boolean;
}) {
  const books = api.pdfBook.list.useQuery({ organizationId });
  const ownUpload = usePdfBookUpload(organizationId);
  const upload = sharedUpload ?? ownUpload;
  const [resume, setResume] = useState<PdfBookSummary | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const utils = api.useUtils();
  const deleteBook = api.pdfBook.delete.useMutation();

  const list = books.data ?? [];
  const uploading =
    upload.state.phase === "reading" || upload.state.phase === "uploading";
  const doneBookId = upload.state.phase === "done" ? upload.state.bookId : "";

  async function remove(book: PdfBookSummary) {
    if (
      !window.confirm(
        `Hapus buku “${book.title}”? Semua gambar halamannya ikut terhapus.`,
      )
    ) {
      return;
    }
    try {
      await deleteBook.mutateAsync({ organizationId, bookId: book.id });
      await utils.pdfBook.list.invalidate({ organizationId });
      toast.success("Buku dihapus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (books.isPending) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" /> Memuat buku
      </div>
    );
  }

  const uploader = (
    <PdfBookUploader
      upload={upload}
      resume={
        resume
          ? {
              bookId: resume.id,
              pageCount: resume.pageCount,
              title: resume.title,
            }
          : undefined
      }
      onBookReady={(bookId) => {
        if (allowProcessing) onPick(bookId);
      }}
    />
  );

  if (
    list.length === 0 ||
    showUpload ||
    resume ||
    upload.state.phase !== "idle"
  ) {
    return (
      <div className="space-y-3">
        {uploader}
        {list.length > 0 && !uploading ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowUpload(false);
              setResume(null);
              upload.reset();
            }}
          >
            Kembali ke daftar buku
          </Button>
        ) : null}
        {upload.state.phase === "done" ? (
          <Button onClick={() => onPick(doneBookId)}>
            Lanjut pilih halaman
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((book) => {
          const ready = book.status === "READY";
          const selectable = ready || allowProcessing;
          return (
            <li
              key={book.id}
              className="bg-card flex items-center gap-3 rounded-lg border p-2.5"
            >
              <button
                type="button"
                disabled={!selectable}
                onClick={() => onPick(book.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-md text-left",
                  selectable && "hover:bg-muted/60 -m-1 p-1",
                )}
              >
                <span className="bg-muted flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded border">
                  {book.coverUrl ? (
                    // Signed cover URLs expire, so they bypass next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="size-full object-cover"
                      src={book.coverUrl}
                    />
                  ) : (
                    <BookOpenIcon className="text-muted-foreground size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {book.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {book.pageCount} halaman
                  </span>
                  {!ready ? (
                    <Badge variant="outline" className="mt-1">
                      Diunggah {book.uploadedPages}/{book.pageCount}
                    </Badge>
                  ) : null}
                </span>
              </button>
              {!ready && book.isOwnUpload ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResume(book)}
                >
                  Lanjutkan
                </Button>
              ) : null}
              <Button
                aria-label={`Hapus ${book.title}`}
                size="icon-sm"
                variant="ghost"
                disabled={deleteBook.isPending}
                onClick={() => void remove(book)}
              >
                <Trash2Icon />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" onClick={() => setShowUpload(true)}>
        <PlusIcon data-icon="inline-start" />
        Unggah buku PDF baru
      </Button>
    </div>
  );
}
