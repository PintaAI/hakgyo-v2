"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Grid3x3Icon, LanguagesIcon } from "lucide-react";
import {
  composeHangeulSyllable,
  HANGEUL_FINALS,
  MAX_HANGEUL_GRID_AXIS,
  parseHangeulSyllableAudio,
  parseJamoList,
  romanizeHangeulSyllable,
} from "@hakgyo/shared/hangeul";

import {
  hangeulSyllableGridBlockDefaults,
  hangeulSyllableGridBlockType,
} from "~/lib/blocknote/block-catalog";
import { cn } from "~/lib/utils";

import {
  HangeulBlockHeader,
  HangeulClipUpload,
  HangeulEditorBar,
  hangeulSectionPadding,
  HangeulToggleButton,
  useHangeulClip,
} from "./hangeul-block-parts";

/** Every jamo typed into the field, with or without separators. */
function jamoFromInput(value: string) {
  return Array.from(value)
    .filter((character) => character.trim() && character !== ",")
    .slice(0, MAX_HANGEUL_GRID_AXIS);
}

function JamoListField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (jamo: string[]) => void;
  placeholder: string;
  value: string[];
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    onChange(jamoFromInput(draft));
    setDraft(null);
  };
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <input
        className="border-input bg-background focus:border-ring focus:ring-ring/30 h-9 min-w-0 rounded-md border px-2.5 text-base outline-none focus:ring-2"
        lang="ko"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        value={draft ?? value.join(" ")}
      />
    </label>
  );
}

function SyllableCell({
  assetId,
  clip,
  showRomanization,
  syllable,
}: {
  assetId: string;
  clip: string;
  showRomanization: boolean;
  syllable: string | null;
}) {
  const audio = useHangeulClip(assetId, clip);
  const content = syllable ? (
    <>
      <span
        className="text-xl leading-none font-semibold sm:text-2xl"
        lang="ko"
      >
        {syllable}
      </span>
      {showRomanization ? (
        <span className="text-muted-foreground text-[0.65rem] leading-none">
          {romanizeHangeulSyllable(syllable)}
        </span>
      ) : null}
    </>
  ) : (
    <span aria-label="Tidak ada" className="text-muted-foreground">
      –
    </span>
  );
  const cell =
    "flex h-full min-h-12 w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5";

  if (!syllable || !audio.available) {
    return <div className={cell}>{content}</div>;
  }
  return (
    <button
      aria-label={`Putar ${syllable}`}
      aria-pressed={audio.playing}
      className={cn(
        cell,
        "text-primary hover:bg-primary/10 transition",
        audio.playing && "bg-primary/15 ring-primary/40 ring-2",
      )}
      disabled={audio.loading}
      onClick={audio.play}
      type="button"
    >
      {content}
    </button>
  );
}

// ProseMirror styles every table in the editor (fixed layout at 100% width,
// cells at `position: relative`, top-aligned) without a cascade layer, so they
// beat Tailwind utilities; inline styles keep the grid scrollable and its
// first column sticky.
const tableStyle = {
  tableLayout: "auto",
  width: "max-content",
  minWidth: "100%",
  overflow: "visible",
} as const;
const cellStyle = { minWidth: "3.5rem", verticalAlign: "middle" } as const;
const stickyCellStyle = {
  position: "sticky",
  left: 0,
  verticalAlign: "middle",
} as const;

export const hangeulSyllableGridBlock = createReactBlockSpec(
  {
    type: hangeulSyllableGridBlockType,
    propSchema: {
      title: { default: hangeulSyllableGridBlockDefaults.title },
      consonants: { default: hangeulSyllableGridBlockDefaults.consonants },
      vowels: { default: hangeulSyllableGridBlockDefaults.vowels },
      final: { default: hangeulSyllableGridBlockDefaults.final },
      showRomanization: {
        default: hangeulSyllableGridBlockDefaults.showRomanization,
      },
      audio: { default: hangeulSyllableGridBlockDefaults.audio },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const consonants = parseJamoList(block.props.consonants);
      const vowels = parseJamoList(block.props.vowels);
      const audio = parseHangeulSyllableAudio(block.props.audio);
      const final = block.props.final.trim();
      const rows = consonants.map((consonant) => ({
        consonant,
        syllables: vowels.map((vowel) =>
          composeHangeulSyllable(consonant, vowel, final),
        ),
      }));
      const syllables = [
        ...new Set(
          rows.flatMap((row) =>
            row.syllables.filter((syllable): syllable is string =>
              Boolean(syllable),
            ),
          ),
        ),
      ];
      // Reads the block as it is now, not as it was rendered: an upload
      // finishes after other edits (or other uploads) have landed.
      const setAudio = (syllable: string, assetId: string) => {
        const current = editor.getBlock(block) ?? block;
        const next = parseHangeulSyllableAudio(current.props.audio);
        if (assetId) next.set(syllable, assetId);
        else next.delete(syllable);
        editor.updateBlock(block, {
          props: {
            audio: JSON.stringify(
              [...next].map(([key, value]) => ({
                syllable: key,
                assetId: value,
              })),
            ),
          },
        });
      };
      const unusedAudio = [...audio.keys()].filter(
        (syllable) => !syllables.includes(syllable),
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
              icon={Grid3x3Icon}
              label="Tabel suku kata"
              onClear={() =>
                editor.updateBlock(block, {
                  props: hangeulSyllableGridBlockDefaults,
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
            eyebrow="음절표 · Suku kata"
            icon={Grid3x3Icon}
            onTitleChange={(title) =>
              editor.updateBlock(block, { props: { title } })
            }
            title={block.props.title}
            titlePlaceholder="Judul, misalnya Konsonan + vokal"
          />

          <div className={cn("min-w-0 space-y-4", hangeulSectionPadding)}>
            {editable ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
                <JamoListField
                  label="Konsonan (baris)"
                  onChange={(jamo) =>
                    editor.updateBlock(block, {
                      props: { consonants: JSON.stringify(jamo) },
                    })
                  }
                  placeholder="ㄱ ㄴ ㄷ"
                  value={consonants}
                />
                <JamoListField
                  label="Vokal (kolom)"
                  onChange={(jamo) =>
                    editor.updateBlock(block, {
                      props: { vowels: JSON.stringify(jamo) },
                    })
                  }
                  placeholder="ㅏ ㅓ ㅗ"
                  value={vowels}
                />
                <label className="grid min-w-0 gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    Batchim
                  </span>
                  <select
                    className="border-input bg-background focus:border-ring focus:ring-ring/30 h-9 min-w-0 rounded-md border px-2 text-sm outline-none focus:ring-2"
                    onChange={(event) =>
                      editor.updateBlock(block, {
                        props: { final: event.target.value },
                      })
                    }
                    value={final}
                  >
                    {HANGEUL_FINALS.map((jamo) => (
                      <option key={jamo || "none"} value={jamo}>
                        {jamo || "Tanpa batchim"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {rows.length && vowels.length ? (
              // w-0 + min-w-full: the table scrolls here instead of
              // widening the block and the page on narrow screens.
              <div className="ring-foreground/10 bg-card w-0 min-w-full overflow-x-auto rounded-xl ring-1">
                <table
                  className="border-separate border-spacing-0 text-center"
                  style={tableStyle}
                >
                  <thead>
                    <tr>
                      <th
                        className="bg-muted border-border z-10 w-12 min-w-12 border-r border-b px-2 py-2"
                        style={stickyCellStyle}
                        scope="col"
                      >
                        <span className="sr-only">Konsonan</span>
                      </th>
                      {vowels.map((vowel, index) => (
                        <th
                          className="bg-muted border-border text-foreground border-b px-1 py-2 text-lg font-semibold"
                          style={cellStyle}
                          key={`${vowel}-${index}`}
                          lang="ko"
                          scope="col"
                        >
                          {vowel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`${row.consonant}-${rowIndex}`}>
                        <th
                          className={cn(
                            "bg-muted border-border text-foreground z-10 border-r px-2 text-lg font-semibold",
                            rowIndex < rows.length - 1 && "border-b",
                          )}
                          lang="ko"
                          scope="row"
                          style={stickyCellStyle}
                        >
                          {row.consonant}
                        </th>
                        {row.syllables.map((syllable, index) => (
                          <td
                            style={cellStyle}
                            className={cn(
                              "border-border p-0.5",
                              rowIndex < rows.length - 1 && "border-b",
                            )}
                            key={index}
                          >
                            <SyllableCell
                              assetId={
                                syllable ? (audio.get(syllable) ?? "") : ""
                              }
                              clip={`${block.id}:${syllable ?? index}`}
                              showRomanization={block.props.showRomanization}
                              syllable={syllable}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : editable ? (
              <div className="text-muted-foreground text-sm">
                Isi konsonan dan vokal untuk membuat tabel. Pakai ㅇ untuk baris
                vokal saja.
              </div>
            ) : null}

            {!editable && audio.size ? (
              <div className="text-muted-foreground text-xs">
                Ketuk suku kata berwarna untuk mendengar bunyinya.
              </div>
            ) : null}

            {editable && syllables.length ? (
              <details className="border-border rounded-lg border">
                <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-xs font-medium">
                  Audio suku kata ·{" "}
                  {syllables.filter((syllable) => audio.has(syllable)).length}/
                  {syllables.length}
                </summary>
                <div className="divide-border grid divide-y border-t sm:grid-cols-2 sm:divide-y-0">
                  {syllables.map((syllable) => (
                    <div
                      className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5"
                      key={syllable}
                    >
                      <span className="text-lg font-semibold" lang="ko">
                        {syllable}
                      </span>
                      <HangeulClipUpload
                        assetId={audio.get(syllable) ?? ""}
                        label={syllable}
                        onChange={(assetId) => setAudio(syllable, assetId)}
                      />
                    </div>
                  ))}
                </div>
                {unusedAudio.length ? (
                  <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                    <span className="text-muted-foreground">
                      Audio tanpa sel: {unusedAudio.join(", ")}
                    </span>
                    <button
                      className="text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 font-medium transition"
                      onClick={() =>
                        editor.updateBlock(block, {
                          props: {
                            audio: JSON.stringify(
                              [...audio]
                                .filter(([syllable]) =>
                                  syllables.includes(syllable),
                                )
                                .map(([syllable, assetId]) => ({
                                  syllable,
                                  assetId,
                                })),
                            ),
                          },
                        })
                      }
                      type="button"
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </details>
            ) : null}
          </div>
        </article>
      );
    },
  },
)();
