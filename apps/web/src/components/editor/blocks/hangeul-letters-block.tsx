"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  CaseSensitiveIcon,
  LanguagesIcon,
  PlusIcon,
  Volume2Icon,
} from "lucide-react";
import {
  MAX_HANGEUL_LETTER_CARDS,
  parseHangeulLetterCards,
  type HangeulExampleWord,
  type HangeulLetterCard,
} from "@hakgyo/shared/hangeul";

import {
  hangeulLettersBlockDefaults,
  hangeulLettersBlockType,
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

/**
 * Cards as authors edit them: unlike `parseHangeulLetterCards`, cards and
 * examples that are still empty are kept so they can be filled in.
 */
function parseEditableCards(value: string): HangeulLetterCard[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isRecord)
    .map((card, index) => ({
      id: text(card.id) || `letter-${index}`,
      character: text(card.character),
      name: text(card.name),
      cue: text(card.cue),
      romanization: text(card.romanization),
      note: text(card.note),
      assetId: text(card.assetId),
      example: isRecord(card.example)
        ? {
            word: text(card.example.word),
            meaning: text(card.example.meaning),
            romanization: text(card.example.romanization),
            assetId: text(card.example.assetId),
          }
        : null,
    }))
    .slice(0, MAX_HANGEUL_LETTER_CARDS);
}

function newCardId() {
  return `letter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function GlyphTile({
  card,
  clip,
  editable,
  onCharacterChange,
}: {
  card: HangeulLetterCard;
  clip: string;
  editable: boolean;
  onCharacterChange: (character: string) => void;
}) {
  const audio = useHangeulClip(card.assetId, clip);
  const tile =
    "bg-muted text-foreground relative grid size-20 shrink-0 place-items-center rounded-2xl sm:size-24";

  if (editable) {
    return (
      <div className={tile} lang="ko">
        <HangeulText
          ariaLabel="Huruf"
          className="w-16 text-center text-5xl leading-none font-semibold sm:w-20"
          editable
          korean
          onChange={onCharacterChange}
          placeholder="ㄱ"
          value={card.character}
        />
      </div>
    );
  }

  const glyph = (
    <span className="text-5xl leading-none font-semibold sm:text-6xl" lang="ko">
      {card.character}
    </span>
  );
  if (!audio.available) return <div className={tile}>{glyph}</div>;
  return (
    <button
      aria-label={`Putar bunyi ${card.character}`}
      aria-pressed={audio.playing}
      className={cn(
        tile,
        "hover:bg-muted/70 transition",
        audio.playing && "ring-primary/40 ring-4",
      )}
      disabled={audio.loading}
      onClick={audio.play}
      type="button"
    >
      {glyph}
      <span className="bg-primary text-primary-foreground absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-full">
        <Volume2Icon className="size-3" />
      </span>
    </button>
  );
}

function ExampleWord({
  clip,
  editable,
  example,
  onChange,
  onRemove,
  showRomanization,
}: {
  clip: string;
  editable: boolean;
  example: HangeulExampleWord;
  /** Receives an updater so a late change (an upload) applies to fresh props. */
  onChange: (
    update: (example: HangeulExampleWord) => HangeulExampleWord,
  ) => void;
  onRemove: () => void;
  showRomanization: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 mt-2 flex min-w-0 gap-x-3 gap-y-1 rounded-lg px-3 py-2",
        editable ? "flex-wrap items-start" : "items-center",
      )}
    >
      <div className={cn("min-w-0 flex-1", editable && "basis-full")}>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <HangeulText
            ariaLabel="Contoh kata"
            className="text-foreground text-lg leading-snug font-semibold"
            editable={editable}
            korean
            onChange={(word) => onChange((current) => ({ ...current, word }))}
            placeholder="아이"
            value={example.word}
          />
          {showRomanization || editable ? (
            <HangeulText
              ariaLabel="Romanisasi contoh kata"
              className="text-muted-foreground text-xs"
              editable={editable}
              onChange={(romanization) =>
                onChange((current) => ({ ...current, romanization }))
              }
              placeholder="romanisasi"
              value={example.romanization}
            />
          ) : null}
        </div>
        <HangeulText
          ariaLabel="Arti contoh kata"
          className="text-muted-foreground text-sm leading-snug"
          editable={editable}
          onChange={(meaning) =>
            onChange((current) => ({ ...current, meaning }))
          }
          placeholder="Arti"
          value={example.meaning}
        />
      </div>
      <HangeulPlayButton
        assetId={example.assetId}
        clip={`${clip}:example`}
        label={example.word}
        size="sm"
      />
      {editable ? (
        <div className="flex flex-1 items-center justify-end gap-1">
          <HangeulClipUpload
            assetId={example.assetId}
            label={example.word || "contoh"}
            onChange={(assetId) =>
              onChange((current) => ({ ...current, assetId }))
            }
          />
          <HangeulRemoveButton label="Hapus contoh kata" onClick={onRemove} />
        </div>
      ) : null}
    </div>
  );
}

function LetterCard({
  card,
  clip,
  editable,
  onChange,
  onRemove,
  showRomanization,
}: {
  card: HangeulLetterCard;
  clip: string;
  editable: boolean;
  /** Receives an updater so a late change (an upload) applies to fresh props. */
  onChange: (update: (card: HangeulLetterCard) => HangeulLetterCard) => void;
  onRemove: () => void;
  showRomanization: boolean;
}) {
  return (
    <div className="sm:bg-card sm:ring-foreground/10 flex min-w-0 gap-4 py-4 first:pt-0 sm:rounded-xl sm:p-4 sm:ring-1 sm:first:pt-4">
      <GlyphTile
        card={card}
        clip={clip}
        editable={editable}
        onCharacterChange={(character) =>
          onChange((current) => ({ ...current, character }))
        }
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <HangeulText
            ariaLabel="Nama huruf"
            className="text-foreground text-sm font-semibold"
            editable={editable}
            korean
            onChange={(name) => onChange((current) => ({ ...current, name }))}
            placeholder="Nama huruf (opsional)"
            value={card.name}
          />
          {editable ? (
            <HangeulText
              ariaLabel="Romanisasi"
              className="text-primary text-xs font-semibold"
              editable
              onChange={(romanization) =>
                onChange((current) => ({ ...current, romanization }))
              }
              placeholder="romanisasi"
              value={card.romanization}
            />
          ) : showRomanization && card.romanization.trim() ? (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
              {card.romanization}
            </span>
          ) : null}
        </div>
        <HangeulText
          ariaLabel="Petunjuk bunyi"
          className="text-foreground w-full text-sm leading-relaxed"
          editable={editable}
          onChange={(cue) => onChange((current) => ({ ...current, cue }))}
          placeholder="Seperti 'a' di 'apa'"
          value={card.cue}
        />
        <HangeulText
          ariaLabel="Catatan"
          className="text-muted-foreground w-full text-xs leading-relaxed"
          editable={editable}
          onChange={(note) => onChange((current) => ({ ...current, note }))}
          placeholder="Catatan (opsional)"
          value={card.note}
        />
        {card.example && (editable || card.example.word.trim()) ? (
          <ExampleWord
            clip={clip}
            editable={editable}
            example={card.example}
            onChange={(update) =>
              onChange((current) =>
                current.example
                  ? { ...current, example: update(current.example) }
                  : current,
              )
            }
            onRemove={() =>
              onChange((current) => ({ ...current, example: null }))
            }
            showRomanization={showRomanization}
          />
        ) : null}
        {editable ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <HangeulPlayButton
              assetId={card.assetId}
              clip={clip}
              label={card.character}
              size="sm"
            />
            <HangeulClipUpload
              assetId={card.assetId}
              label={card.character || "huruf"}
              onChange={(assetId) =>
                onChange((current) => ({ ...current, assetId }))
              }
            />
            {!card.example ? (
              <button
                className="border-border text-muted-foreground hover:bg-background hover:text-foreground inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[0.7rem] font-medium transition"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    example: {
                      word: "",
                      meaning: "",
                      romanization: "",
                      assetId: "",
                    },
                  }))
                }
                type="button"
              >
                <PlusIcon className="size-3" /> Contoh kata
              </button>
            ) : null}
            <span className="flex-1" />
            <HangeulRemoveButton
              label={`Hapus kartu ${card.character}`}
              onClick={onRemove}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const hangeulLettersBlock = createReactBlockSpec(
  {
    type: hangeulLettersBlockType,
    propSchema: {
      title: { default: hangeulLettersBlockDefaults.title },
      showRomanization: {
        default: hangeulLettersBlockDefaults.showRomanization,
      },
      letters: { default: hangeulLettersBlockDefaults.letters },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const cards = editable
        ? parseEditableCards(block.props.letters)
        : parseHangeulLetterCards(block.props.letters);
      // Changes apply to the block as it is now, not as it was rendered: an
      // upload finishes after other edits (or other uploads) have landed.
      const updateCards = (
        update: (current: HangeulLetterCard[]) => HangeulLetterCard[],
      ) => {
        const current = editor.getBlock(block) ?? block;
        editor.updateBlock(block, {
          props: {
            letters: JSON.stringify(
              update(parseEditableCards(current.props.letters)),
            ),
          },
        });
      };

      if (!editable && !cards.length && !block.props.title) return null;

      return (
        <article
          className="text-foreground my-4 w-full min-w-0 bg-transparent"
          contentEditable={false}
          data-custom-block
        >
          {editable ? (
            <HangeulEditorBar
              block={block}
              icon={CaseSensitiveIcon}
              label="Kartu huruf Hangeul"
              onClear={() =>
                editor.updateBlock(block, {
                  props: hangeulLettersBlockDefaults,
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
            eyebrow="한글 · Huruf"
            icon={CaseSensitiveIcon}
            onTitleChange={(title) =>
              editor.updateBlock(block, { props: { title } })
            }
            title={block.props.title}
            titlePlaceholder="Judul, misalnya Vokal dasar"
          />

          <div className={cn("min-w-0 space-y-3", hangeulSectionPadding)}>
            {cards.length ? (
              <div className="divide-border grid min-w-0 divide-y sm:grid-cols-2 sm:gap-3 sm:divide-y-0">
                {cards.map((card) => (
                  <LetterCard
                    card={card}
                    clip={`${block.id}:${card.id}`}
                    editable={editable}
                    key={card.id}
                    onChange={(update) =>
                      updateCards((current) =>
                        current.map((entry) =>
                          entry.id === card.id ? update(entry) : entry,
                        ),
                      )
                    }
                    onRemove={() =>
                      updateCards((current) =>
                        current.filter((entry) => entry.id !== card.id),
                      )
                    }
                    showRomanization={block.props.showRomanization}
                  />
                ))}
              </div>
            ) : editable ? (
              <div className="text-muted-foreground text-sm">
                Tambahkan kartu untuk setiap huruf yang diajarkan.
              </div>
            ) : null}
            {editable ? (
              <HangeulAddButton
                disabled={cards.length >= MAX_HANGEUL_LETTER_CARDS}
                onClick={() =>
                  updateCards((current) => [
                    ...current,
                    {
                      id: newCardId(),
                      character: "",
                      name: "",
                      cue: "",
                      romanization: "",
                      note: "",
                      assetId: "",
                      example: null,
                    },
                  ])
                }
              >
                <PlusIcon className="size-3.5" /> Tambah kartu huruf
              </HangeulAddButton>
            ) : null}
          </div>
        </article>
      );
    },
  },
)();
