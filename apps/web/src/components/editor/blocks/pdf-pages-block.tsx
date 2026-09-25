"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import {
  formatPdfPageLabel,
  formatPdfPageRange,
  type PdfBookPageResource,
  type PdfPageRange,
} from "@hakgyo/shared";
import {
  BookOpenIcon,
  EyeIcon,
  FileStackIcon,
  LoaderCircleIcon,
  PencilIcon,
} from "lucide-react";

import { PdfPagePickerDialog } from "~/components/pdf-book/pdf-page-picker-dialog";
import { PdfPageViewer } from "~/components/pdf-book/pdf-page-viewer";
import {
  useNearViewport,
  usePageImageUrl,
} from "~/components/pdf-book/use-page-image-url";
import { Button } from "~/components/ui/button";
import { pdfPagesBlockType } from "~/lib/blocknote/block-catalog";
import { api } from "~/trpc/react";

import { usePdfBookContext } from "../pdf-book-context";

const pdfPagesProps = {
  bookId: { default: "" },
  startPage: { default: 1 },
  endPage: { default: 1 },
};

const FILMSTRIP_LIMIT = 8;

type BlockProps = { bookId: string; startPage: number; endPage: number };

function inRange(pages: PdfBookPageResource[], range: PdfPageRange) {
  return pages.filter(
    (page) =>
      page.pageNumber >= range.startPage && page.pageNumber <= range.endPage,
  );
}

function PdfPagesBlockView({
  props,
  editable,
  onChange,
}: {
  props: BlockProps;
  editable: boolean;
  onChange: (range: PdfPageRange) => void;
}) {
  const context = usePdfBookContext();
  const range: PdfPageRange | null = props.bookId
    ? {
        bookId: props.bookId,
        startPage: props.startPage,
        endPage: props.endPage,
      }
    : null;

  if (context?.mode === "learner") {
    const book = range
      ? context.books.find((candidate) => candidate.id === range.bookId)
      : undefined;
    const pages = book && range ? inRange(book.pages, range) : [];
    if (!book || !range || pages.length === 0) return <Unavailable />;
    return (
      <PdfPageReader
        title={book.title}
        pageOffset={book.pageOffset}
        range={range}
        pages={pages}
      />
    );
  }

  if (context?.mode === "editor") {
    return (
      <EditorPdfPages
        organizationId={context.organizationId}
        range={range}
        editable={editable}
        onChange={onChange}
      />
    );
  }

  return <Unavailable />;
}

function Unavailable() {
  return (
    <p className="text-muted-foreground my-2 w-full rounded-xl border border-dashed p-5 text-sm">
      Halaman PDF tidak tersedia.
    </p>
  );
}

function EditorPdfPages({
  organizationId,
  range,
  editable,
  onChange,
}: {
  organizationId: string;
  range: PdfPageRange | null;
  editable: boolean;
  onChange: (range: PdfPageRange) => void;
}) {
  // Freshly inserted blocks open the picker right away.
  const [pickerOpen, setPickerOpen] = useState(editable && !range);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const book = api.pdfBook.get.useQuery(
    { organizationId, bookId: range?.bookId ?? "" },
    { enabled: Boolean(range), staleTime: 30 * 60 * 1000 },
  );

  const picker = editable ? (
    <PdfPagePickerDialog
      organizationId={organizationId}
      open={pickerOpen}
      initial={range}
      onOpenChange={setPickerOpen}
      onConfirm={onChange}
    />
  ) : null;

  if (!range) {
    if (!editable) return <Unavailable />;
    return (
      <div className="my-2 w-full">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="hover:border-primary/60 hover:bg-muted/40 flex w-full items-center gap-4 rounded-xl border border-dashed p-5 text-left transition"
        >
          <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg">
            <FileStackIcon className="text-muted-foreground size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium">
              Pilih halaman dari buku PDF
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              Tampilkan halaman buku Anda apa adanya, lalu lanjutkan dengan blok
              lain seperti kosakata atau kuis.
            </span>
          </span>
        </button>
        {picker}
      </div>
    );
  }

  if (book.isPending) {
    return (
      <div className="text-muted-foreground my-2 flex w-full items-center gap-2 rounded-xl border p-5 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" /> Memuat halaman PDF
      </div>
    );
  }
  if (!book.data) return <Unavailable />;

  const data = book.data;
  const pages = data.pages.filter(
    (page) =>
      page.pageNumber >= range.startPage && page.pageNumber <= range.endPage,
  );

  if (!editable) {
    return (
      <PdfPageReader
        title={data.title}
        pageOffset={data.pageOffset}
        range={range}
        pages={pages}
      />
    );
  }

  const hidden = pages.length - FILMSTRIP_LIMIT;
  return (
    <div className="bg-card my-2 w-full overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
          <BookOpenIcon className="text-muted-foreground size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{data.title}</p>
          <p className="text-muted-foreground text-xs">
            {formatPdfPageRange(
              range.startPage,
              range.endPage,
              data.pageOffset,
            )}{" "}
            · {pages.length} halaman
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
          >
            <PencilIcon data-icon="inline-start" />
            Ubah halaman
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setViewerIndex(0)}>
            <EyeIcon data-icon="inline-start" />
            Pratinjau
          </Button>
        </div>
      </div>
      <ol className="flex gap-2 overflow-x-auto p-3">
        {pages.slice(0, FILMSTRIP_LIMIT).map((page, index) => (
          <li key={page.pageNumber} className="shrink-0">
            <button
              type="button"
              onClick={() => setViewerIndex(index)}
              className="block w-20 text-center"
              aria-label={`Lihat halaman ${formatPdfPageLabel(page.pageNumber, data.pageOffset)}`}
            >
              <span
                className="block overflow-hidden rounded border bg-white"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              >
                {/* Signed thumbnails expire, so they bypass next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="size-full object-contain"
                  loading="lazy"
                  src={page.thumbnailUrl}
                />
              </span>
              <span className="text-muted-foreground mt-1 block text-[10px] tabular-nums">
                {formatPdfPageLabel(page.pageNumber, data.pageOffset)}
              </span>
            </button>
          </li>
        ))}
        {hidden > 0 ? (
          <li className="text-muted-foreground flex w-20 shrink-0 items-center justify-center rounded border border-dashed text-xs">
            +{hidden} halaman
          </li>
        ) : null}
      </ol>
      {picker}
      <PdfPageViewer
        bookTitle={data.title}
        pageOffset={data.pageOffset}
        pages={pages}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </div>
  );
}

export function PdfPageReader({
  title,
  pageOffset,
  range,
  pages,
}: {
  title: string;
  pageOffset: number;
  range: PdfPageRange;
  pages: PdfBookPageResource[];
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  return (
    <section
      className="my-3 w-full"
      aria-label={`${title}, ${formatPdfPageRange(range.startPage, range.endPage, pageOffset)}`}
    >
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
        <BookOpenIcon className="size-3.5" />
        <span className="truncate font-medium">{title}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">
          {formatPdfPageRange(range.startPage, range.endPage, pageOffset)}
        </span>
      </div>
      <ol className="mx-auto max-w-3xl space-y-4">
        {pages.map((page, index) => (
          <LazyPdfPage
            key={page.pageNumber}
            page={page}
            label={formatPdfPageLabel(page.pageNumber, pageOffset)}
            title={title}
            onOpen={() => setViewerIndex(index)}
          />
        ))}
      </ol>
      <PdfPageViewer
        bookTitle={title}
        pageOffset={pageOffset}
        pages={pages}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </section>
  );
}

function LazyPdfPage({
  page,
  label,
  title,
  onOpen,
}: {
  page: PdfBookPageResource;
  label: string;
  title: string;
  onOpen: () => void;
}) {
  const { ref, visible } = useNearViewport<HTMLLIElement>();
  const image = usePageImageUrl(page.assetId, visible);
  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={onOpen}
        className="focus-visible:ring-ring block w-full cursor-zoom-in rounded-lg outline-none focus-visible:ring-2"
        aria-label={`Buka halaman ${label} layar penuh`}
      >
        <span
          className="relative block w-full overflow-hidden rounded-lg border bg-white shadow-xs"
          style={{ aspectRatio: `${page.width} / ${page.height}` }}
        >
          {image.url ? (
            // Signed storage URLs change per request, so next/image caching doesn't apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Halaman ${label} dari ${title}`}
              className="size-full object-contain"
              src={image.url}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
              {image.failed ? (
                "Halaman gagal dimuat."
              ) : (
                <LoaderCircleIcon className="size-5 animate-spin" />
              )}
            </span>
          )}
        </span>
      </button>
      <p className="text-muted-foreground mt-1.5 text-center text-xs tabular-nums">
        Hal. {label}
      </p>
    </li>
  );
}

export const pdfPagesBlock = createReactBlockSpec(
  {
    type: pdfPagesBlockType,
    propSchema: pdfPagesProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <div className="w-full" contentEditable={false} data-custom-block>
        <PdfPagesBlockView
          props={block.props}
          editable={editor.isEditable}
          onChange={(range) =>
            editor.updateBlock(block, {
              props: {
                bookId: range.bookId,
                startPage: range.startPage,
                endPage: range.endPage,
              },
            })
          }
        />
      </div>
    ),
  },
)();
