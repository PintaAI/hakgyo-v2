"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  analyzeTableOfContents,
  formatPdfPageRange,
  MAX_PDF_BLOCK_PAGES,
  MAX_PDF_TOC_EXTRACTION_PAGES,
  type TableOfContentsEntry,
} from "@hakgyo/shared";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClipboardPasteIcon,
  LoaderCircleIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { PdfBookLibrary } from "./pdf-book-library";
import { PdfBookUploader } from "./pdf-book-uploader";
import {
  isWaitingForEndPage,
  PdfPageGrid,
  pdfMarkColors,
  type PdfGridPage,
  type PdfPageMark,
  type PdfPageSelection,
} from "./pdf-page-grid";
import { usePdfBookUpload } from "./use-pdf-book-upload";

type Step = "book" | "pageOne" | "map" | "review";
type PlanModule = { key: string; moduleId?: string; title: string };
type PlanLesson = {
  key: string;
  moduleKey: string;
  title: string;
  startPage: number;
  endPage: number;
};

const NEW_MODULE = "__new__";
const steps: Array<{ id: Step; label: string }> = [
  { id: "book", label: "Pilih buku" },
  { id: "pageOne", label: "Halaman 1" },
  { id: "map", label: "Bagi ke bab" },
  { id: "review", label: "Tinjau & buat" },
];

/** Splits long ranges so every lesson stays within the per-block page limit. */
function splitRange(startPage: number, endPage: number) {
  const parts: Array<{ startPage: number; endPage: number }> = [];
  for (let start = startPage; start <= endPage; start += MAX_PDF_BLOCK_PAGES) {
    parts.push({
      startPage: start,
      endPage: Math.min(endPage, start + MAX_PDF_BLOCK_PAGES - 1),
    });
  }
  return parts;
}

function newKey() {
  return crypto.randomUUID();
}

type BookData = {
  id: string;
  title: string;
  pageCount: number;
  pageOffset: number;
  suggestedPageOffset: number | null;
  status: "PROCESSING" | "READY";
  pages: PdfGridPage[];
};

export function PdfImportFlow({
  organizationId,
  curriculumHref,
  courseId,
  existingModules,
}: {
  organizationId: string;
  curriculumHref: string;
  courseId: string;
  existingModules: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [step, setStep] = useState<Step>("book");
  const [bookId, setBookId] = useState<string | null>(null);
  const [modules, setModules] = useState<PlanModule[]>(() =>
    existingModules.map((module) => ({
      key: module.id,
      moduleId: module.id,
      title: module.title,
    })),
  );
  const [lessons, setLessons] = useState<PlanLesson[]>([]);
  const importToCourse = api.pdfBook.importToCourse.useMutation();
  // Owned here so rendering keeps going while the author maps pages.
  const upload = usePdfBookUpload(organizationId);

  const book = api.pdfBook.get.useQuery(
    { organizationId, bookId: bookId ?? "" },
    {
      enabled: Boolean(bookId),
      // Keep thumbnails flowing in while the upload is still running.
      refetchInterval: (query) =>
        query.state.data?.status === "PROCESSING" ? 4000 : false,
    },
  );

  const plannedModules = modules.filter((module) =>
    lessons.some((lesson) => lesson.moduleKey === module.key),
  );

  function addModule(title?: string) {
    const created = {
      key: newKey(),
      title: title ?? `Bab ${modules.length + 1}`,
    };
    setModules((current) => [...current, created]);
    return created.key;
  }

  function addLessons(
    moduleKey: string,
    title: string,
    startPage: number,
    endPage: number,
  ) {
    const parts = splitRange(startPage, endPage);
    setLessons((current) => [
      ...current,
      ...parts.map((part, index) => ({
        key: newKey(),
        moduleKey,
        title: parts.length > 1 ? `${title} · Bagian ${index + 1}` : title,
        ...part,
      })),
    ]);
  }

  async function create() {
    if (!bookId) return;
    try {
      const result = await importToCourse.mutateAsync({
        courseId,
        bookId,
        modules: plannedModules.map((module) => ({
          moduleId: module.moduleId,
          title: module.title,
          lessons: lessons
            .filter((lesson) => lesson.moduleKey === module.key)
            .sort((a, b) => a.startPage - b.startPage)
            .map(({ title, startPage, endPage }) => ({
              title,
              startPage,
              endPage,
            })),
        })),
      });
      await Promise.all([
        utils.course.get.invalidate({ courseId }),
        utils.content.listMaterials.invalidate({ organizationId }),
      ]);
      toast.success(
        `${result.lessonCount} materi PDF dibuat sebagai draf. Tambahkan kosakata atau kuis di setiap bab.`,
      );
      router.push(curriculumHref);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Materi gagal dibuat.",
      );
    }
  }

  const stepIndex = steps.findIndex(({ id }) => id === step);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={curriculumHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2",
          )}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Kembali ke kurikulum
        </Link>
      </div>
      <header className="space-y-4">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            Impor dari buku PDF
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight">
            Ubah buku Anda menjadi materi kurikulum
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Halaman buku ditampilkan apa adanya. Setelah itu, tambahkan kosakata
            dan kuis Hakgyo di setiap bab agar siswa bisa berlatih.
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {steps.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                  index < stepIndex &&
                    "bg-primary border-primary text-primary-foreground",
                  index === stepIndex && "border-primary text-primary",
                  index > stepIndex && "text-muted-foreground",
                )}
              >
                {index < stepIndex ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  index === stepIndex ? "font-medium" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
              {index < steps.length - 1 ? (
                <span className="bg-border mx-1 h-px w-6" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </header>

      {step === "book" ? (
        <section className="max-w-3xl">
          <PdfBookLibrary
            organizationId={organizationId}
            upload={upload}
            allowProcessing
            onPick={(id) => {
              setBookId(id);
              setLessons([]);
              setStep("pageOne");
            }}
          />
        </section>
      ) : null}

      {step !== "book" && !book.data ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" /> Memuat buku
        </div>
      ) : null}

      {step !== "book" &&
      book.data?.status === "PROCESSING" &&
      upload.state.phase !== "done" ? (
        <section className="max-w-3xl">
          <PdfBookUploader
            upload={upload}
            compact
            resume={
              upload.state.phase === "reading" ||
              upload.state.phase === "uploading"
                ? undefined
                : {
                    bookId: book.data.id,
                    pageCount: book.data.pageCount,
                    title: book.data.title,
                  }
            }
          />
        </section>
      ) : null}

      {step === "pageOne" && book.data ? (
        <PageOneStep
          key={book.data.id}
          organizationId={organizationId}
          book={book.data}
          onBack={() => setStep("book")}
          onDone={() => setStep("map")}
        />
      ) : null}

      {step === "map" && book.data ? (
        <MapStep
          organizationId={organizationId}
          book={book.data}
          modules={modules}
          lessons={lessons}
          onAddModule={addModule}
          onAddLessons={addLessons}
          onRenameModule={(key, title) => {
            const previous = modules.find(
              (module) => module.key === key,
            )?.title;
            setModules((current) =>
              current.map((module) =>
                module.key === key ? { ...module, title } : module,
              ),
            );
            // Lesson titles follow the chapter name until the author edits them.
            if (previous === undefined) return;
            setLessons((current) =>
              current.map((lesson) =>
                lesson.moduleKey === key &&
                (lesson.title === previous ||
                  lesson.title.startsWith(`${previous} · `))
                  ? {
                      ...lesson,
                      title: title + lesson.title.slice(previous.length),
                    }
                  : lesson,
              ),
            );
          }}
          onChangeLesson={(key, title) =>
            setLessons((current) =>
              current.map((lesson) =>
                lesson.key === key ? { ...lesson, title } : lesson,
              ),
            )
          }
          onRemoveLesson={(key) =>
            setLessons((current) =>
              current.filter((lesson) => lesson.key !== key),
            )
          }
          onFixPageOne={() => setStep("pageOne")}
          onBack={() => setStep("pageOne")}
          onNext={() => setStep("review")}
        />
      ) : null}

      {step === "review" && book.data ? (
        <section className="max-w-3xl space-y-5">
          <div className="bg-card divide-y rounded-xl border">
            {plannedModules.map((module) => {
              const moduleLessons = lessons
                .filter((lesson) => lesson.moduleKey === module.key)
                .sort((a, b) => a.startPage - b.startPage);
              return (
                <div key={module.key} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{module.title}</h2>
                    <Badge variant={module.moduleId ? "secondary" : "outline"}>
                      {module.moduleId ? "Bab yang sudah ada" : "Bab baru"}
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {moduleLessons.map((lesson) => (
                      <li
                        key={lesson.key}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate">{lesson.title}</span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatPdfPageRange(
                            lesson.startPage,
                            lesson.endPage,
                            book.data.pageOffset,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground text-sm">
            Semua materi dibuat sebagai <strong>draf</strong>, jadi belum
            terlihat oleh siswa. Anda bisa menambahkan kosakata, kuis, atau
            catatan di setiap materi sebelum mempublikasikannya.
          </p>
          {book.data.status !== "READY" ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Tunggu hingga semua halaman selesai diproses (
              {book.data.pages.length}/{book.data.pageCount}). Jangan tutup tab
              ini.
            </p>
          ) : null}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeftIcon data-icon="inline-start" />
              Kembali
            </Button>
            <Button
              disabled={
                importToCourse.isPending ||
                book.data.status !== "READY" ||
                lessons.length === 0
              }
              onClick={() => void create()}
            >
              {importToCourse.isPending ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : null}
              Buat {lessons.length} materi
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const PAGE_ONE_PREVIEW = 16;

/**
 * Asks a plain question instead of a "page offset": which page carries the
 * printed number 1? A guess from the page text is preselected.
 */
function PageOneStep({
  organizationId,
  book,
  onBack,
  onDone,
}: {
  organizationId: string;
  book: BookData;
  onBack: () => void;
  onDone: () => void;
}) {
  const utils = api.useUtils();
  const update = api.pdfBook.update.useMutation();
  const suggested =
    book.pageOffset === 0 && book.suggestedPageOffset !== null
      ? book.suggestedPageOffset
      : null;
  // The suggestion can arrive after upload finishes; it applies until the
  // author picks a page themselves.
  const [picked, setPageOne] = useState<number | null>(null);
  const pageOne = picked ?? (suggested ?? book.pageOffset) + 1;
  const [showAll, setShowAll] = useState(false);
  const byNumber = new Map(book.pages.map((page) => [page.pageNumber, page]));
  const visible = Math.min(
    book.pageCount,
    showAll ? book.pageCount : Math.max(PAGE_ONE_PREVIEW, pageOne + 4),
  );

  async function save(nextPageOne: number) {
    try {
      if (nextPageOne - 1 !== book.pageOffset) {
        await update.mutateAsync({
          organizationId,
          bookId: book.id,
          pageOffset: nextPageOne - 1,
        });
        await utils.pdfBook.get.invalidate({ organizationId, bookId: book.id });
      }
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Pengaturan gagal disimpan.",
      );
    }
  }

  return (
    <section className="max-w-4xl space-y-5">
      <div className="bg-card space-y-2 rounded-xl border p-5">
        <h2 className="font-[family-name:var(--font-hanken-grotesk)] text-xl font-medium">
          Di halaman mana nomor <span className="text-primary">1</span> buku
          Anda?
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Biasanya setelah sampul dan daftar isi. Klik halaman yang bernomor 1,
          supaya nomor halaman di Hakgyo sama persis dengan yang tercetak di
          buku.
        </p>
        {suggested !== null ? (
          <p className="bg-primary/5 text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <SparklesIcon className="size-4 shrink-0" />
            Kami menemukan nomor 1 di halaman ke-{suggested + 1} file. Sudah
            kami pilihkan — ganti jika kurang tepat.
          </p>
        ) : null}
      </div>

      <ol className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-4">
        {Array.from({ length: visible }, (_, index) => {
          const pageNumber = index + 1;
          const page = byNumber.get(pageNumber);
          const selected = pageNumber === pageOne;
          const beforeOne = pageNumber < pageOne;
          return (
            <li key={pageNumber}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`Halaman ke-${pageNumber} file`}
                onClick={() => setPageOne(pageNumber)}
                className="group focus-visible:ring-ring block w-full rounded-lg outline-none focus-visible:ring-2"
              >
                <span
                  className={cn(
                    "relative block overflow-hidden rounded-lg border bg-white transition",
                    selected
                      ? "border-primary ring-primary ring-4"
                      : "group-hover:border-foreground/40",
                    beforeOne && "opacity-50",
                  )}
                  style={{
                    aspectRatio: page
                      ? `${page.width} / ${page.height}`
                      : "0.707",
                  }}
                >
                  {page ? (
                    // Signed thumbnails expire, so they bypass next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="size-full object-contain"
                      src={page.thumbnailUrl}
                    />
                  ) : (
                    <span className="bg-muted text-muted-foreground absolute inset-0 flex animate-pulse items-center justify-center text-xs">
                      Memproses…
                    </span>
                  )}
                  {selected ? (
                    <span className="bg-primary text-primary-foreground absolute inset-x-0 bottom-0 py-1 text-center text-xs font-semibold">
                      Halaman 1
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground mt-1.5 block text-center text-xs">
                  {beforeOne ? "Pembuka" : `Hal. ${pageNumber - pageOne + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {visible < book.pageCount ? (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
          Tampilkan semua halaman
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Ganti buku
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={update.isPending}
            onClick={() => void save(1)}
          >
            Buku saya tidak memakai nomor halaman
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() => void save(pageOne)}
          >
            {update.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Lanjut
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function MapStep({
  organizationId,
  book,
  modules,
  lessons,
  onAddModule,
  onAddLessons,
  onRenameModule,
  onChangeLesson,
  onRemoveLesson,
  onFixPageOne,
  onBack,
  onNext,
}: {
  organizationId: string;
  book: BookData;
  modules: PlanModule[];
  lessons: PlanLesson[];
  onAddModule: (title?: string) => string;
  onAddLessons: (
    moduleKey: string,
    title: string,
    startPage: number,
    endPage: number,
  ) => void;
  onRenameModule: (key: string, title: string) => void;
  onChangeLesson: (key: string, title: string) => void;
  onRemoveLesson: (key: string) => void;
  onFixPageOne: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [selection, setSelection] = useState<PdfPageSelection | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [target, setTarget] = useState<string>(
    modules.at(-1)?.key ?? NEW_MODULE,
  );
  const [tocOpen, setTocOpen] = useState(false);

  const colorByModule = useMemo(
    () =>
      new Map(
        modules.map((module, index) => [
          module.key,
          pdfMarkColors[index % pdfMarkColors.length]!,
        ]),
      ),
    [modules],
  );
  const marks = useMemo(() => {
    const result = new Map<number, PdfPageMark>();
    for (const lesson of lessons) {
      const planModule = modules.find(({ key }) => key === lesson.moduleKey);
      if (!planModule) continue;
      for (let page = lesson.startPage; page <= lesson.endPage; page += 1) {
        result.set(page, {
          label: planModule.title,
          color: colorByModule.get(planModule.key) ?? pdfMarkColors[0],
        });
      }
    }
    return result;
  }, [colorByModule, lessons, modules]);

  const selectedCount = selection
    ? selection.endPage - selection.startPage + 1
    : 0;
  const parts = selection
    ? splitRange(selection.startPage, selection.endPage).length
    : 0;
  const overlaps =
    selection !== null &&
    Array.from(
      { length: selectedCount },
      (_, i) => selection.startPage + i,
    ).some((page) => marks.has(page));
  const targetValid =
    target === NEW_MODULE || modules.some(({ key }) => key === target);
  const waitingForEnd = isWaitingForEndPage(selection, anchor);

  function add() {
    if (!selection) return;
    const existing =
      targetValid && target !== NEW_MODULE
        ? modules.find(({ key }) => key === target)
        : undefined;
    const moduleTitle = existing?.title ?? `Bab ${modules.length + 1}`;
    const moduleKey = existing?.key ?? onAddModule(moduleTitle);
    const range = formatPdfPageRange(
      selection.startPage,
      selection.endPage,
      book.pageOffset,
    );
    onAddLessons(
      moduleKey,
      `${moduleTitle} · ${range}`,
      selection.startPage,
      selection.endPage,
    );
    setTarget(moduleKey);
    setSelection(null);
  }

  const hint = !selection
    ? "Klik halaman pertama sebuah bab."
    : waitingForEnd
      ? "Sekarang klik halaman terakhir bab ini. Jika babnya hanya 1 halaman, langsung klik Tambahkan."
      : "Pilih bab tujuan, lalu klik Tambahkan.";
  const hintStep = !selection ? 1 : waitingForEnd ? 2 : 3;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 space-y-4">
        <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{book.title}</p>
            <p className="text-muted-foreground text-xs">
              {book.status === "READY"
                ? `${book.pageCount} halaman · nomor halaman mengikuti buku`
                : `Memproses ${book.pages.length}/${book.pageCount} halaman — Anda sudah bisa mulai`}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onFixPageOne}>
            Nomor halaman tidak cocok?
          </Button>
        </div>

        <div
          className="bg-primary/5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          aria-live="polite"
        >
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {hintStep}
          </span>
          <span>{hint}</span>
        </div>

        <PdfPageGrid
          pageCount={book.pageCount}
          pages={book.pages}
          pageOffset={book.pageOffset}
          selection={selection}
          marks={marks}
          onSelect={setSelection}
          onAnchorChange={setAnchor}
        />
        {selection ? (
          <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-lg backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {formatPdfPageRange(
                  selection.startPage,
                  selection.endPage,
                  book.pageOffset,
                )}{" "}
                · {selectedCount} halaman
              </p>
              <p className="text-muted-foreground text-xs">
                {parts > 1
                  ? `Lebih dari ${MAX_PDF_BLOCK_PAGES} halaman, akan dibagi otomatis menjadi ${parts} materi.`
                  : overlaps
                    ? "Sebagian halaman sudah dipakai di materi lain."
                    : "Masukkan ke bab:"}
              </p>
            </div>
            <Select
              value={targetValid ? target : NEW_MODULE}
              onValueChange={(value) => value && setTarget(value)}
            >
              <SelectTrigger aria-label="Bab tujuan" className="w-48">
                <span className="flex-1 truncate text-left">
                  {targetValid && target !== NEW_MODULE
                    ? modules.find(({ key }) => key === target)?.title
                    : "Bab baru"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {modules.map((module) => (
                  <SelectItem key={module.key} value={module.key}>
                    {module.title}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_MODULE}>+ Bab baru</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={add}>
              <PlusIcon data-icon="inline-start" />
              {parts > 1 ? `Tambahkan (${parts} materi)` : "Tambahkan"}
            </Button>
            <Button
              aria-label="Batalkan pilihan"
              size="icon-sm"
              variant="ghost"
              onClick={() => setSelection(null)}
            >
              <XIcon />
            </Button>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:self-start lg:overflow-y-auto">
        {lessons.length === 0 ? (
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="hover:border-primary/60 hover:bg-primary/5 flex w-full items-start gap-3 rounded-xl border border-dashed p-4 text-left transition"
          >
            <ClipboardPasteIcon className="text-primary mt-0.5 size-5 shrink-0" />
            <span>
              <span className="block text-sm font-medium">
                Cara tercepat: pakai daftar isi buku
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                Pilih halaman daftar isi, lalu AI membaca judul bab dan nomor
                halamannya untuk Anda periksa.
              </span>
            </span>
          </button>
        ) : null}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="font-medium">Rencana kurikulum</h2>
            {lessons.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTocOpen(true)}
              >
                <ClipboardPasteIcon data-icon="inline-start" />
                Daftar isi
              </Button>
            ) : null}
          </div>
          {lessons.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm leading-relaxed">
              Belum ada materi. Bab yang Anda buat akan muncul di sini.
            </p>
          ) : null}
          <ol className="divide-y">
            {modules
              .filter((module) =>
                lessons.some((lesson) => lesson.moduleKey === module.key),
              )
              .map((module) => (
                <li key={module.key} className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorByModule.get(module.key) }}
                    />
                    {module.moduleId ? (
                      <span className="truncate text-sm font-medium">
                        {module.title}
                      </span>
                    ) : (
                      <Input
                        aria-label="Nama bab baru"
                        className="h-7 text-sm font-medium"
                        value={module.title}
                        onChange={(event) =>
                          onRenameModule(module.key, event.target.value)
                        }
                      />
                    )}
                  </div>
                  <ul className="space-y-1.5 pl-4">
                    {lessons
                      .filter((lesson) => lesson.moduleKey === module.key)
                      .sort((a, b) => a.startPage - b.startPage)
                      .map((lesson) => (
                        <li
                          key={lesson.key}
                          className="flex items-center gap-1.5"
                        >
                          <Input
                            aria-label="Judul materi"
                            className="h-7 flex-1 text-xs"
                            value={lesson.title}
                            onChange={(event) =>
                              onChangeLesson(lesson.key, event.target.value)
                            }
                          />
                          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                            {formatPdfPageRange(
                              lesson.startPage,
                              lesson.endPage,
                              book.pageOffset,
                            )}
                          </span>
                          <Button
                            aria-label={`Hapus ${lesson.title}`}
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => onRemoveLesson(lesson.key)}
                          >
                            <Trash2Icon />
                          </Button>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
          </ol>
        </div>
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            Kembali
          </Button>
          <Button
            disabled={
              lessons.length === 0 ||
              lessons.some((lesson) => !lesson.title.trim()) ||
              modules.some((module) => !module.title.trim())
            }
            onClick={onNext}
          >
            Tinjau
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </aside>

      <TableOfContentsDialog
        open={tocOpen}
        onOpenChange={setTocOpen}
        organizationId={organizationId}
        book={book}
        onFixPageOne={() => {
          setTocOpen(false);
          onFixPageOne();
        }}
        onApply={(entries) => {
          for (const entry of entries) {
            const moduleKey = onAddModule(entry.title);
            onAddLessons(
              moduleKey,
              entry.title,
              entry.startPage,
              entry.endPage,
            );
          }
        }}
      />
    </div>
  );
}

function TableOfContentsDialog({
  open,
  onOpenChange,
  organizationId,
  book,
  onFixPageOne,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  book: BookData;
  onFixPageOne: () => void;
  onApply: (entries: TableOfContentsEntry[]) => void;
}) {
  const [text, setText] = useState("");
  const [tocSelection, setTocSelection] = useState<PdfPageSelection | null>(
    null,
  );
  const extractionSession = useRef(0);
  const extractToc = api.pdfBook.extractTableOfContents.useMutation();
  const { entries, skipped } = useMemo(
    () =>
      analyzeTableOfContents(text, {
        pageCount: book.pageCount,
        pageOffset: book.pageOffset,
      }),
    [book.pageCount, book.pageOffset, text],
  );
  const usable = entries.filter((entry) => !entry.error);
  const missingPageCount = skipped.filter((line) =>
    line.text.endsWith("— ?"),
  ).length;
  const thumbnails = new Map(book.pages.map((page) => [page.pageNumber, page]));
  const selectedCount = tocSelection
    ? tocSelection.endPage - tocSelection.startPage + 1
    : 0;
  const selectedPagesReady =
    tocSelection !== null &&
    selectedCount <= MAX_PDF_TOC_EXTRACTION_PAGES &&
    Array.from(
      { length: selectedCount },
      (_, index) => tocSelection.startPage + index,
    ).every((pageNumber) => thumbnails.has(pageNumber));

  async function readSelectedPages() {
    if (!tocSelection || !selectedPagesReady) return;
    const session = ++extractionSession.current;
    try {
      const found = await extractToc.mutateAsync({
        organizationId,
        bookId: book.id,
        pageNumbers: Array.from(
          { length: selectedCount },
          (_, index) => tocSelection.startPage + index,
        ),
      });
      if (session !== extractionSession.current) return;
      if (found.entries.length) {
        const extractedText = found.entries
          .map((entry) =>
            entry.startPage === null
              ? `${entry.title} — ?`
              : `${entry.title} — ${entry.startPage}${entry.endPage === null ? "" : `-${entry.endPage}`}`,
          )
          .join("\n");
        setText((current) =>
          [current.trim(), extractedText].filter(Boolean).join("\n"),
        );
        toast.success("Daftar isi terbaca. Periksa judul dan halamannya.");
      } else {
        toast.info("AI tidak menemukan daftar isi di halaman pilihan.");
      }
    } catch (error) {
      if (session !== extractionSession.current) return;
      toast.error(
        error instanceof Error ? error.message : "Gagal membaca daftar isi.",
      );
    }
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) extractionSession.current += 1;
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buat bab dari daftar isi</DialogTitle>
          <DialogDescription>
            Pilih halaman daftar isi untuk dibaca AI, lalu periksa hasilnya.
            Anda juga bisa menulis atau menempel daftar isi sendiri.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
          <div className="space-y-2">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Pilih halaman daftar isi</p>
              <p className="text-muted-foreground text-xs">
                Klik halaman pertama lalu halaman terakhir. Maksimal{" "}
                {MAX_PDF_TOC_EXTRACTION_PAGES} halaman per bacaan. Hasil bacaan
                berikutnya ditambahkan di bawah.
              </p>
              <div className="max-h-48 overflow-y-auto p-1">
                <PdfPageGrid
                  pageCount={book.pageCount}
                  pages={book.pages}
                  pageOffset={book.pageOffset}
                  selection={tocSelection}
                  onSelect={setTocSelection}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs" aria-live="polite">
                  {tocSelection
                    ? `PDF ${tocSelection.startPage}${selectedCount > 1 ? `–${tocSelection.endPage}` : ""} · ${selectedCount} halaman`
                    : "Belum ada halaman dipilih"}
                  {selectedCount > MAX_PDF_TOC_EXTRACTION_PAGES
                    ? ` · Maksimal ${MAX_PDF_TOC_EXTRACTION_PAGES} halaman`
                    : tocSelection && !selectedPagesReady
                      ? " · Tunggu halaman selesai diproses"
                      : ""}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedPagesReady || extractToc.isPending}
                  onClick={() => void readSelectedPages()}
                >
                  {extractToc.isPending ? (
                    <LoaderCircleIcon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <SparklesIcon data-icon="inline-start" />
                  )}
                  Baca dengan AI
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="toc-text">Daftar isi</Label>
            </div>
            <Textarea
              id="toc-text"
              className="min-h-56 font-mono text-xs"
              placeholder={
                "Contoh:\nBab 1 Salam ......... 1\nBab 2 Keluarga ...... 13\nBab 3 Makanan — 21-30"
              }
              value={text}
              disabled={extractToc.isPending}
              onChange={(event) => setText(event.target.value)}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Cukup nomor halaman awal — bab berakhir tepat sebelum bab
              berikutnya. Sub-bab seperti 1.1 atau 1.2 otomatis digabung ke bab
              di atasnya.
            </p>
            {missingPageCount > 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {missingPageCount} bab belum punya nomor halaman. Ganti tanda ?
                dengan nomor cetak, atau hapus barisnya.
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">
              Hasil{entries.length ? ` · ${entries.length} bab` : ""}
            </p>
            {entries.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                Hasilnya muncul di sini saat Anda mengetik atau menempel.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {entries.map((entry) => {
                  const cover = thumbnails.get(entry.startPage);
                  return (
                    <li key={entry.line} className="flex gap-3 p-2.5">
                      <span className="bg-muted h-14 w-10 shrink-0 overflow-hidden rounded border bg-white">
                        {cover ? (
                          // Signed thumbnails expire, so they bypass next/image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={`Halaman awal ${entry.title}`}
                            className="size-full object-contain"
                            src={cover.thumbnailUrl}
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {entry.title}
                        </span>
                        <span
                          className={cn(
                            "block text-xs tabular-nums",
                            entry.error
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {entry.error ??
                            `${formatPdfPageRange(entry.startPage, entry.endPage, book.pageOffset)} · ${entry.endPage - entry.startPage + 1} halaman`}
                        </span>
                        {entry.warnings.map((warning) => (
                          <span
                            key={warning}
                            className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                          >
                            <AlertTriangleIcon className="size-3 shrink-0" />
                            {warning}
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {entries.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                Gambar kecil menunjukkan halaman awal tiap bab. Tidak sesuai?{" "}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={onFixPageOne}
                >
                  Atur ulang halaman 1
                </button>
              </p>
            ) : null}
            {skipped.length > 0 ? (
              <details className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                <summary className="cursor-pointer font-medium">
                  {skipped.length} baris tidak dipakai
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {skipped.map((line) => (
                    <li key={line.line}>
                      <span className="font-mono">{line.text}</span>
                      <span className="text-muted-foreground block">
                        {line.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)}>
            Batal
          </Button>
          <Button
            disabled={
              usable.length === 0 ||
              missingPageCount > 0 ||
              extractToc.isPending
            }
            onClick={() => {
              onApply(usable);
              setText("");
              changeOpen(false);
            }}
          >
            Buat {usable.length} bab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
