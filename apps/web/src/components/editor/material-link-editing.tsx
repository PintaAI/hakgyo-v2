"use client";

import {
  createContext,
  useContext,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isTableCellSelection } from "@blocknote/core";
import {
  DeleteLinkButton,
  LinkToolbar,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
  type LinkToolbarProps,
} from "@blocknote/react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChevronRightIcon,
  FileTextIcon,
  HashIcon,
  SearchIcon,
} from "lucide-react";

import {
  formatMaterialLinkHref,
  listMaterialHeadings,
  parseMaterialLinkHref,
  type MaterialLinkTarget,
} from "@hakgyo/shared/material-links";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { api } from "~/trpc/react";

import type { HakgyoBlockNoteEditor } from "./block-note-schema";

/** Where a material link goes in the document: the selected text, or a caret to insert at. */
export type MaterialLinkRequest = {
  from: number;
  to: number;
  /** The current link target when the selection is already a material link. */
  current: MaterialLinkTarget | null;
};

type MaterialLinkEditing = {
  organizationId: string;
  openPicker: (request: MaterialLinkRequest) => void;
};

const MaterialLinkEditingContext = createContext<MaterialLinkEditing | null>(
  null,
);

export const MaterialLinkEditingProvider = MaterialLinkEditingContext.Provider;

/** The caret or selection of the editor, as a request to link it. */
export function currentMaterialLinkRequest(
  editor: HakgyoBlockNoteEditor,
): MaterialLinkRequest {
  const { from, to } = editor.prosemirrorState.selection;
  return {
    from,
    to,
    current: parseMaterialLinkHref(editor.getSelectedLinkUrl()),
  };
}

/**
 * Links `request` to a material. An empty selection inserts `text` (the
 * section or material title) as the link text.
 */
export function applyMaterialLink(
  editor: HakgyoBlockNoteEditor,
  request: MaterialLinkRequest,
  target: MaterialLinkTarget,
  text: string,
) {
  editor.transact((tr) => {
    const linkType = editor.pmSchema.marks.link!;
    const mark = linkType.create({ href: formatMaterialLinkHref(target) });
    if (request.from === request.to) {
      tr.insertText(text, request.from).addMark(
        request.from,
        request.from + text.length,
        mark,
      );
    } else {
      tr.removeMark(request.from, request.to, linkType).addMark(
        request.from,
        request.to,
        mark,
      );
    }
  });
  editor.focus();
}

/** Formatting toolbar button that opens the material picker for the selection. */
export function MaterialLinkToolbarButton() {
  const editing = useContext(MaterialLinkEditingContext);
  const editor = useBlockNoteEditor() as unknown as HakgyoBlockNoteEditor;
  const Components = useComponentsContext()!;
  const canLink = useEditorState({
    editor,
    selector: ({ editor }) => {
      const selection = editor.prosemirrorState.selection;
      return (
        editor.isEditable &&
        !selection.empty &&
        !isTableCellSelection(selection) &&
        (editor.getSelection()?.blocks ?? []).some(
          (block) => block.content !== undefined,
        )
      );
    },
  });
  if (!editing || !canLink) return null;

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Tautkan materi"
      mainTooltip="Tautkan materi"
      icon={<BookOpenIcon className="size-4" />}
      onClick={() => editing.openPicker(currentMaterialLinkRequest(editor))}
    />
  );
}

function MaterialLinkLabel({ target }: { target: MaterialLinkTarget }) {
  const editing = useContext(MaterialLinkEditingContext);
  const organizationId = editing?.organizationId ?? "";
  const materials = api.content.listMaterials.useQuery(
    { organizationId },
    { enabled: Boolean(organizationId) },
  );
  const material = api.content.getMaterial.useQuery(
    { organizationId, materialId: target.materialId },
    { enabled: Boolean(organizationId && target.anchor), retry: false },
  );
  const title =
    materials.data?.find((candidate) => candidate.id === target.materialId)
      ?.title ?? "Materi";
  const section = target.anchor
    ? listMaterialHeadings(material.data?.content).find(
        (heading) => heading.id === target.anchor,
      )?.text
    : null;
  return (
    <span className="flex max-w-64 min-w-0 items-center gap-1.5 px-1 text-sm">
      <BookOpenIcon className="text-primary size-4 shrink-0" />
      <span className="truncate">
        {title}
        {section ? (
          <span className="text-muted-foreground"> › {section}</span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * Link toolbar that names the linked material instead of showing the raw
 * `hakgyo-material:` href, and replaces "open" with changing the target.
 * Web links keep BlockNote's default toolbar.
 */
export function HakgyoLinkToolbar(props: LinkToolbarProps) {
  const editing = useContext(MaterialLinkEditingContext);
  const Components = useComponentsContext()!;
  const target = parseMaterialLinkHref(props.url);
  if (!target) return <LinkToolbar {...props} />;

  return (
    <LinkToolbar {...props}>
      <MaterialLinkLabel target={target} />
      {editing ? (
        <Components.LinkToolbar.Button
          className="bn-button"
          label="Ubah tautan materi"
          mainTooltip="Ubah tautan materi"
          icon={<FileTextIcon className="size-4" />}
          onClick={() => {
            props.setToolbarOpen?.(false);
            editing.openPicker({
              from: props.range.from,
              to: props.range.to,
              current: target,
            });
          }}
        />
      ) : null}
      <DeleteLinkButton
        range={props.range}
        setToolbarOpen={props.setToolbarOpen}
      />
    </LinkToolbar>
  );
}

const collator = new Intl.Collator("id-ID", {
  sensitivity: "base",
  numeric: true,
});

/**
 * Sheet for picking the material (and optionally the section) a link points
 * to: a searchable list of the organization's materials, then the target's
 * headings. Bottom sheet on phones.
 */
export function MaterialLinkPicker({
  organizationId,
  request,
  onOpenChange,
  onPick,
}: {
  organizationId: string;
  request: MaterialLinkRequest | null;
  onOpenChange: (open: boolean) => void;
  onPick: (target: MaterialLinkTarget, title: string) => void;
}) {
  const isMobile = useIsMobile();
  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="gap-0 data-[side=bottom]:max-h-[85dvh] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        {/* Mounted per opening so search and the chosen step reset. */}
        {request ? (
          <MaterialLinkPickerPanel
            organizationId={organizationId}
            initial={request.current}
            onPick={onPick}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MaterialLinkPickerPanel({
  organizationId,
  initial,
  onPick,
}: {
  organizationId: string;
  initial: MaterialLinkTarget | null;
  onPick: (target: MaterialLinkTarget, title: string) => void;
}) {
  const [materialId, setMaterialId] = useState(initial?.materialId ?? null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const materials = api.content.listMaterials.useQuery({ organizationId });
  const visible = useMemo(
    () =>
      (materials.data ?? [])
        .filter(
          (material) =>
            !deferredSearch ||
            [material.title, material.description]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase()
              .includes(deferredSearch),
        )
        .sort((a, b) => collator.compare(a.title, b.title)),
    [deferredSearch, materials.data],
  );
  const selected = materials.data?.find(
    (material) => material.id === materialId,
  );

  if (materialId) {
    return (
      <MaterialSectionStep
        organizationId={organizationId}
        materialId={materialId}
        title={selected?.title ?? "Materi"}
        currentAnchor={
          initial?.materialId === materialId ? initial.anchor : null
        }
        onBack={() => setMaterialId(null)}
        onPick={onPick}
      />
    );
  }

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle>Tautkan materi</SheetTitle>
        <SheetDescription>
          Pilih materi yang ingin dibuka murid saat mengetuk teks ini.
        </SheetDescription>
      </SheetHeader>
      <div className="border-b p-4">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Cari materi"
            className="h-9 pl-8"
            placeholder="Cari judul atau deskripsi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div
        role="listbox"
        aria-label="Materi"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {materials.isPending ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Memuat materi…
          </p>
        ) : visible.length ? (
          visible.map((material) => (
            <PickerRow
              key={material.id}
              icon={<FileTextIcon className="size-4" />}
              title={material.title}
              description={material.description}
              selected={material.id === initial?.materialId}
              onClick={() => setMaterialId(material.id)}
              trailing={
                <ChevronRightIcon className="text-muted-foreground size-4" />
              }
            />
          ))
        ) : (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            {materials.data?.length
              ? "Tidak ada materi yang cocok."
              : "Belum ada materi di library."}
          </p>
        )}
      </div>
    </>
  );
}

function MaterialSectionStep({
  organizationId,
  materialId,
  title,
  currentAnchor,
  onBack,
  onPick,
}: {
  organizationId: string;
  materialId: string;
  title: string;
  currentAnchor: string | null;
  onBack: () => void;
  onPick: (target: MaterialLinkTarget, title: string) => void;
}) {
  const material = api.content.getMaterial.useQuery(
    { organizationId, materialId },
    { retry: false },
  );
  const headings = useMemo(
    () => listMaterialHeadings(material.data?.content),
    [material.data?.content],
  );
  const minimumLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 self-start"
          onClick={onBack}
        >
          <ArrowLeftIcon /> Semua materi
        </Button>
        <SheetTitle className="truncate">{title}</SheetTitle>
        <SheetDescription>
          Tautkan ke seluruh materi, atau ke satu bagian agar murid langsung
          melihat bagian itu.
        </SheetDescription>
      </SheetHeader>
      <div
        role="listbox"
        aria-label="Bagian materi"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        <PickerRow
          icon={<BookOpenIcon className="size-4" />}
          title="Seluruh materi"
          description="Buka materi dari awal."
          selected={currentAnchor === null}
          onClick={() => onPick({ materialId, anchor: null }, title)}
        />
        {material.isPending ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Memuat bagian materi…
          </p>
        ) : material.isError ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Bagian materi ini tidak bisa dimuat. Anda tetap bisa menautkan
            seluruh materi.
          </p>
        ) : headings.length ? (
          <>
            <p className="text-muted-foreground px-2 pt-4 pb-1 text-xs font-medium">
              Bagian (judul di materi)
            </p>
            {headings.map((heading) => (
              <PickerRow
                key={heading.id}
                icon={<HashIcon className="size-4" />}
                title={heading.text}
                indent={heading.level - minimumLevel}
                selected={currentAnchor === heading.id}
                onClick={() =>
                  onPick({ materialId, anchor: heading.id }, heading.text)
                }
              />
            ))}
          </>
        ) : (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            Materi ini belum punya judul bagian.
          </p>
        )}
      </div>
    </>
  );
}

function PickerRow({
  icon,
  title,
  description,
  selected,
  indent = 0,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description?: string | null;
  selected?: boolean;
  indent?: number;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={Boolean(selected)}
      onClick={onClick}
      style={{ paddingLeft: `${0.5 + indent * 1}rem` }}
      className="hover:bg-muted focus-visible:ring-ring/50 aria-selected:bg-primary/5 flex w-full items-start gap-3 rounded-lg py-2.5 pr-2 text-left outline-none focus-visible:ring-3"
    >
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        {description ? (
          <span className="text-muted-foreground line-clamp-2 text-xs">
            {description}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="mt-0.5 shrink-0">{trailing}</span> : null}
    </button>
  );
}
