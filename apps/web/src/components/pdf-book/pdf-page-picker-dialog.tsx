"use client";

import { useState } from "react";
import {
  bookPageToPdfPage,
  formatPdfPageRange,
  pdfPageRangeError,
  pdfPageToBookPage,
  type PdfPageRange,
} from "@hakgyo/shared";
import { ArrowLeftIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

import { PdfBookLibrary } from "./pdf-book-library";
import {
  isWaitingForEndPage,
  PdfPageGrid,
  type PdfPageSelection,
} from "./pdf-page-grid";

export function PdfPagePickerDialog({
  organizationId,
  open,
  initial,
  onOpenChange,
  onConfirm,
}: {
  organizationId: string;
  open: boolean;
  initial: PdfPageRange | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (range: PdfPageRange) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(52rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {open ? (
          <PickerBody
            organizationId={organizationId}
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onConfirm={(range) => {
              onConfirm(range);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  organizationId,
  initial,
  onCancel,
  onConfirm,
}: {
  organizationId: string;
  initial: PdfPageRange | null;
  onCancel: () => void;
  onConfirm: (range: PdfPageRange) => void;
}) {
  const [bookId, setBookId] = useState<string | null>(initial?.bookId ?? null);
  const [selection, setSelection] = useState<PdfPageSelection | null>(
    initial ? { startPage: initial.startPage, endPage: initial.endPage } : null,
  );
  const [anchor, setAnchor] = useState<number | null>(null);
  const utils = api.useUtils();
  const book = api.pdfBook.get.useQuery(
    { organizationId, bookId: bookId ?? "" },
    { enabled: Boolean(bookId), staleTime: 30 * 60 * 1000 },
  );
  const updateBook = api.pdfBook.update.useMutation({
    onSuccess: () =>
      utils.pdfBook.get.invalidate({ organizationId, bookId: bookId ?? "" }),
    onError: (error) => toast.error(error.message),
  });

  if (!bookId) {
    return (
      <>
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Pilih buku PDF</DialogTitle>
          <DialogDescription>
            Pilih buku yang sudah diunggah atau unggah PDF baru. Buku bisa
            dipakai ulang di semua course organisasi.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <PdfBookLibrary
            organizationId={organizationId}
            onPick={(id) => {
              setBookId(id);
              setSelection(null);
            }}
          />
        </div>
      </>
    );
  }

  const data = book.data;
  const offset = data?.pageOffset ?? 0;
  const error =
    data && selection
      ? pdfPageRangeError(
          selection.startPage,
          selection.endPage,
          data.pageCount,
        )
      : null;

  function setBookRange(field: "startPage" | "endPage", raw: string) {
    if (!data) return;
    const value = bookPageToPdfPage(Number(raw), offset);
    if (!Number.isInteger(value)) return;
    const current = selection ?? { startPage: value, endPage: value };
    const next = { ...current, [field]: value };
    if (field === "startPage" && next.endPage < value) next.endPage = value;
    setSelection(next);
  }

  return (
    <>
      <DialogHeader className="border-b px-5 py-4 pr-12">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Ganti buku"
            size="icon-sm"
            variant="ghost"
            onClick={() => setBookId(null)}
          >
            <ArrowLeftIcon />
          </Button>
          <DialogTitle className="truncate">
            {data?.title ?? "Memuat buku…"}
          </DialogTitle>
        </div>
        <DialogDescription>
          Klik halaman pertama, lalu klik halaman terakhir. Atau ketik nomor
          halaman sesuai yang tercetak di buku.
        </DialogDescription>
      </DialogHeader>

      {data ? (
        <div className="bg-muted/30 flex flex-wrap items-end gap-x-6 gap-y-3 border-b px-5 py-3">
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="pdf-range-start" className="text-xs">
                Dari halaman
              </Label>
              <Input
                id="pdf-range-start"
                className="h-8 w-24"
                type="number"
                value={
                  selection
                    ? pdfPageToBookPage(selection.startPage, offset)
                    : ""
                }
                onChange={(event) =>
                  setBookRange("startPage", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pdf-range-end" className="text-xs">
                Sampai halaman
              </Label>
              <Input
                id="pdf-range-end"
                className="h-8 w-24"
                type="number"
                value={
                  selection ? pdfPageToBookPage(selection.endPage, offset) : ""
                }
                onChange={(event) =>
                  setBookRange("endPage", event.target.value)
                }
              />
            </div>
          </div>
          {selection && selection.startPage === selection.endPage ? (
            <Button
              size="sm"
              variant="ghost"
              title="Nomor halaman tidak cocok dengan buku? Tandai halaman ini sebagai halaman 1."
              disabled={updateBook.isPending}
              onClick={() =>
                updateBook.mutate({
                  organizationId,
                  bookId: data.id,
                  pageOffset: selection.startPage - 1,
                })
              }
            >
              Ini halaman 1 buku
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {data ? (
          <PdfPageGrid
            pageCount={data.pageCount}
            pages={data.pages}
            pageOffset={offset}
            selection={selection}
            onSelect={setSelection}
            onAnchorChange={setAnchor}
          />
        ) : (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin" /> Memuat halaman
          </div>
        )}
      </div>

      <DialogFooter className="m-0 items-center gap-3 border-t px-5 py-3 sm:justify-between">
        <p
          className={
            error ? "text-destructive text-sm" : "text-muted-foreground text-sm"
          }
          aria-live="polite"
        >
          {error ??
            (!selection
              ? "Klik halaman pertama yang ingin ditampilkan."
              : isWaitingForEndPage(selection, anchor)
                ? "Sekarang klik halaman terakhir (atau pakai 1 halaman ini saja)."
                : `${formatPdfPageRange(selection.startPage, selection.endPage, offset)} · ${selection.endPage - selection.startPage + 1} halaman dipilih`)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button
            disabled={!data || !selection || Boolean(error)}
            onClick={() =>
              data && selection && onConfirm({ bookId: data.id, ...selection })
            }
          >
            Gunakan halaman ini
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
