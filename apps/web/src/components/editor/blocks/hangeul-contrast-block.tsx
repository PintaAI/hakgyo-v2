"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  AudioLinesIcon,
  LanguagesIcon,
  PlusIcon,
  Volume2Icon,
} from "lucide-react";
import {
  MAX_HANGEUL_CONTRAST_ITEMS,
  MAX_HANGEUL_CONTRAST_ROWS,
  parseHangeulContrastRows,
  type HangeulContrastItem,
  type HangeulContrastRow,
} from "@hakgyo/shared/hangeul";

import {
  hangeulContrastBlockDefaults,
  hangeulContrastBlockType,
} from "~/lib/blocknote/block-catalog";
import { cn } from "~/lib/utils";

import {
  HangeulAddButton,
  HangeulBlockHeader,
  HangeulClipUpload,
  HangeulEditorBar,
  HangeulPlayButton,
  HangeulRemoveButton,
  hangeulSectionPadding,
  HangeulText,
  HangeulToggleButton,
  useHangeulClip,
} from "./hangeul-block-parts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

const emptyItem = (): HangeulContrastItem => ({
  text: "",
  romanization: "",
  meaning: "",
  assetId: "",
});

/**
 * Rows as authors edit them: unlike `parseHangeulContrastRows`, empty items
 * and rows with fewer than two items are kept so they can be filled in.
 */
function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseEditableRows(value: string): HangeulContrastRow[] {
  return jsonArray(value)
    .filter(isRecord)
    .map((row, index) => ({
      id: text(row.id) || `row-${index}`,
      note: text(row.note),
      items: jsonArray(row.items)
        .filter(isRecord)
        .map((item) => ({
          text: text(item.text),
          romanization: text(item.romanization),
          meaning: text(item.meaning),
          assetId: text(item.assetId),
        }))
        .slice(0, MAX_HANGEUL_CONTRAST_ITEMS),
    }))
    .slice(0, MAX_HANGEUL_CONTRAST_ROWS);
}

function newRowId() {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function ContrastItem({
  clip,
  item,
  showRomanization,
}: {
  clip: string;
  item: HangeulContrastItem;
  showRomanization: boolean;
}) {
  const audio = useHangeulClip(item.assetId, clip);
  const body = (
    <>
      <span
        className="text-foreground text-2xl leading-tight font-semibold [overflow-wrap:anywhere] sm:text-3xl"
        lang="ko"
      >
        {item.text}
      </span>
      {showRomanization && item.romanization ? (
        <span className="text-primary text-xs font-semibold">
          {item.romanization}
        </span>
      ) : null}
      {item.meaning ? (
        <span className="text-muted-foreground text-xs leading-snug">
          {item.meaning}
        </span>
      ) : null}
    </>
  );
  const tile =
    "bg-muted relative flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center";

  if (!audio.available) return <div className={tile}>{body}</div>;
  return (
    <button
      aria-label={`Putar ${item.text}`}
      aria-pressed={audio.playing}
      className={cn(
        tile,
        "hover:bg-muted/70 pb-9 transition",
        audio.playing && "ring-primary/40 ring-4",
      )}
      disabled={audio.loading}
      onClick={audio.play}
      type="button"
    >
      {body}
      <span className="bg-primary text-primary-foreground absolute bottom-2 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full">
        <Volume2Icon className="size-3" />
      </span>
    </button>
  );
}

function EditableContrastItem({
  clip,
  item,
  onChange,
  onRemove,
  removable,
}: {
  clip: string;
  item: HangeulContrastItem;
  /** Receives an updater so a late change (an upload) applies to fresh props. */
  onChange: (
    update: (item: HangeulContrastItem) => HangeulContrastItem,
  ) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="bg-muted flex min-w-0 flex-col gap-1 rounded-xl p-2 text-center">
      <HangeulText
        ariaLabel="Kata atau suku kata"
        className="text-foreground w-full text-center text-2xl leading-tight font-semibold"
        editable
        korean
        onChange={(value) =>
          onChange((current) => ({ ...current, text: value }))
        }
        placeholder="사다"
        value={item.text}
      />
      <HangeulText
        ariaLabel="Romanisasi"
        className="text-primary w-full text-center text-xs font-semibold"
        editable
        onChange={(romanization) =>
          onChange((current) => ({ ...current, romanization }))
        }
        placeholder="romanisasi"
        value={item.romanization}
      />
      <HangeulText
        ariaLabel="Arti"
        className="text-muted-foreground w-full text-center text-xs"
        editable
        onChange={(meaning) => onChange((current) => ({ ...current, meaning }))}
        placeholder="Arti (opsional)"
        value={item.meaning}
      />
      <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
        <HangeulPlayButton
          assetId={item.assetId}
          clip={clip}
          label={item.text}
          size="sm"
        />
        <HangeulClipUpload
          assetId={item.assetId}
          label={item.text || "kata"}
          onChange={(assetId) =>
            onChange((current) => ({ ...current, assetId }))
          }
        />
        <HangeulRemoveButton
          disabled={!removable}
          label={`Hapus ${item.text || "kata"}`}
          onClick={onRemove}
        />
      </div>
    </div>
  );
}

export const hangeulContrastBlock = createReactBlockSpec(
  {
    type: hangeulContrastBlockType,
    propSchema: {
      title: { default: hangeulContrastBlockDefaults.title },
      instructions: { default: hangeulContrastBlockDefaults.instructions },
      showRomanization: {
        default: hangeulContrastBlockDefaults.showRomanization,
      },
      rows: { default: hangeulContrastBlockDefaults.rows },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const rows = editable
        ? parseEditableRows(block.props.rows)
        : parseHangeulContrastRows(block.props.rows);
      // Changes apply to the block as it is now, not as it was rendered: an
      // upload finishes after other edits (or other uploads) have landed.
      const updateRows = (
        update: (current: HangeulContrastRow[]) => HangeulContrastRow[],
      ) => {
        const current = editor.getBlock(block) ?? block;
        editor.updateBlock(block, {
          props: {
            rows: JSON.stringify(update(parseEditableRows(current.props.rows))),
          },
        });
      };
      const updateRow = (
        rowId: string,
        update: (row: HangeulContrastRow) => HangeulContrastRow,
      ) =>
        updateRows((current) =>
          current.map((row) => (row.id === rowId ? update(row) : row)),
        );

      if (!editable && !rows.length && !block.props.title) return null;

      return (
        <article
          className="text-foreground my-4 w-full min-w-0 bg-transparent"
          contentEditable={false}
          data-custom-block
        >
          {editable ? (
            <HangeulEditorBar
              block={block}
              icon={AudioLinesIcon}
              label="Pasangan bunyi"
              onClear={() =>
                editor.updateBlock(block, {
                  props: hangeulContrastBlockDefaults,
                })
              }
            >
              <HangeulToggleButton
                icon={LanguagesIcon}
                onClick={() =>
                  editor.updateBlock(block, {
                    props: {
                      showRomanization: !block.props.showRomanization,
                    },
                  })
                }
                pressed={block.props.showRomanization}
              >
                {block.props.showRomanization
                  ? "Sembunyikan romanisasi"
                  : "Tampilkan romanisasi"}
              </HangeulToggleButton>
            </HangeulEditorBar>
          ) : null}

          <HangeulBlockHeader
            editable={editable}
            eyebrow="발음 · Pasangan bunyi"
            icon={AudioLinesIcon}
            onTitleChange={(title) =>
              editor.updateBlock(block, { props: { title } })
            }
            title={block.props.title}
            titlePlaceholder="Judul, misalnya Biasa atau tegang?"
          >
            <HangeulText
              ariaLabel="Petunjuk"
              className="text-muted-foreground w-full text-sm leading-relaxed"
              editable={editable}
              onChange={(instructions) =>
                editor.updateBlock(block, { props: { instructions } })
              }
              placeholder="Petunjuk, misalnya Dengarkan lalu ucapkan bergantian."
              value={block.props.instructions}
            />
          </HangeulBlockHeader>

          <div className={cn("min-w-0 space-y-3", hangeulSectionPadding)}>
            <div className="divide-border min-w-0 divide-y">
              {rows.map((row, rowIndex) => (
                <div
                  className="min-w-0 space-y-2 py-4 first:pt-0 last:pb-0"
                  key={row.id}
                >
                  <div
                    className={cn(
                      "grid min-w-0 gap-2",
                      row.items.length >= 3 ? "grid-cols-3" : "grid-cols-2",
                    )}
                  >
                    {row.items.map((item, itemIndex) =>
                      editable ? (
                        <EditableContrastItem
                          clip={`${block.id}:${row.id}:${itemIndex}`}
                          item={item}
                          key={itemIndex}
                          onChange={(update) =>
                            updateRow(row.id, (current) => ({
                              ...current,
                              items: current.items.map((entry, i) =>
                                i === itemIndex ? update(entry) : entry,
                              ),
                            }))
                          }
                          onRemove={() =>
                            updateRow(row.id, (current) => ({
                              ...current,
                              items: current.items.filter(
                                (_, i) => i !== itemIndex,
                              ),
                            }))
                          }
                          removable={row.items.length > 2}
                        />
                      ) : (
                        <ContrastItem
                          clip={`${block.id}:${row.id}:${itemIndex}`}
                          item={item}
                          key={itemIndex}
                          showRomanization={block.props.showRomanization}
                        />
                      ),
                    )}
                  </div>
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <HangeulText
                        ariaLabel="Catatan baris"
                        className="text-muted-foreground w-full text-sm leading-relaxed"
                        editable={editable}
                        onChange={(note) =>
                          updateRow(row.id, (current) => ({ ...current, note }))
                        }
                        placeholder="Catatan (opsional)"
                        value={row.note}
                      />
                    </div>
                    {editable ? (
                      <>
                        <button
                          className="border-border text-muted-foreground hover:bg-background hover:text-foreground inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[0.7rem] font-medium transition disabled:opacity-40"
                          disabled={
                            row.items.length >= MAX_HANGEUL_CONTRAST_ITEMS
                          }
                          onClick={() =>
                            updateRow(row.id, (current) => ({
                              ...current,
                              items: [...current.items, emptyItem()].slice(
                                0,
                                MAX_HANGEUL_CONTRAST_ITEMS,
                              ),
                            }))
                          }
                          type="button"
                        >
                          <PlusIcon className="size-3" /> Kata
                        </button>
                        <HangeulRemoveButton
                          label={`Hapus baris ${rowIndex + 1}`}
                          onClick={() =>
                            updateRows((current) =>
                              current.filter((entry) => entry.id !== row.id),
                            )
                          }
                        />
                      </>
                    ) : null}
                  </div>
                  {editable &&
                  row.items.filter((item) => item.text.trim()).length < 2 ? (
                    <div className="text-destructive text-xs">
                      Isi minimal dua kata agar baris ini tampil untuk murid.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {editable ? (
              <HangeulAddButton
                disabled={rows.length >= MAX_HANGEUL_CONTRAST_ROWS}
                onClick={() =>
                  updateRows((current) => [
                    ...current,
                    {
                      id: newRowId(),
                      note: "",
                      items: [emptyItem(), emptyItem()],
                    },
                  ])
                }
              >
                <PlusIcon className="size-3.5" /> Tambah pasangan
              </HangeulAddButton>
            ) : null}
          </div>
        </article>
      );
    },
  },
)();
