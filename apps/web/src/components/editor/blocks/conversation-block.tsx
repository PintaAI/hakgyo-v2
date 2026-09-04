"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import {
  HeadphonesIcon,
  ImageIcon,
  LightbulbIcon,
  LoaderCircleIcon,
  MessageCircleMoreIcon,
  MessageSquareTextIcon,
  PaletteIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  conversationBlockDefaults,
  conversationBlockLines,
  conversationBlockQuestions,
  conversationBlockSectionVariants,
  conversationBlockThemes,
  conversationBlockType,
  pronunciationBlockExamples,
  speakingPracticeDialogue,
  speakingPracticeExpressions,
} from "~/lib/blocknote/block-catalog";

import { useEditorAssetUpload } from "../asset-upload-context";
import { AssetUrl } from "./asset-media-block";
import { CustomBlockToolbar } from "./custom-block-toolbar";
import { EditableBlockText } from "./editable-block-text";

type ConversationLine = {
  speaker: string;
  korean: string;
  translation: string;
};

type ConversationQuestion = {
  korean: string;
  translation: string;
};

type PracticeExpression = {
  korean: string;
  translation: string;
};

type PracticeDialogueLine = {
  speaker: string;
  korean: string;
};

type PronunciationExample = {
  korean: string;
  pronunciation: string;
};

const themeStyles = {
  violet: { label: "Violet", accent: "var(--chart-3)" },
  blue: { label: "Blue", accent: "var(--chart-1)" },
  green: { label: "Green", accent: "var(--chart-2)" },
  rose: { label: "Rose", accent: "var(--chart-4)" },
} as const;

const conversationProps = {
  theme: { default: "violet", values: [...conversationBlockThemes] },
  sectionVariant: {
    default: conversationBlockDefaults.sectionVariant,
    values: [...conversationBlockSectionVariants],
  },
  showTip: { default: true },
  assetId: { default: conversationBlockDefaults.assetId },
  fileName: { default: conversationBlockDefaults.fileName },
  contentType: { default: conversationBlockDefaults.contentType },
  eyebrow: { default: conversationBlockDefaults.eyebrow },
  number: { default: conversationBlockDefaults.number },
  audioTrack: { default: conversationBlockDefaults.audioTrack },
  lines: { default: conversationBlockDefaults.lines },
  questionsLabel: { default: conversationBlockDefaults.questionsLabel },
  questions: { default: conversationBlockDefaults.questions },
  tipTitle: { default: conversationBlockDefaults.tipTitle },
  tipBody: { default: conversationBlockDefaults.tipBody },
  tipTranslation: { default: conversationBlockDefaults.tipTranslation },
  practiceAssetId: { default: conversationBlockDefaults.practiceAssetId },
  practiceFileName: { default: conversationBlockDefaults.practiceFileName },
  practiceContentType: {
    default: conversationBlockDefaults.practiceContentType,
  },
  practicePromptKo: { default: conversationBlockDefaults.practicePromptKo },
  practicePromptTranslation: {
    default: conversationBlockDefaults.practicePromptTranslation,
  },
  practiceExpressions: {
    default: conversationBlockDefaults.practiceExpressions,
  },
  practiceDialogue: { default: conversationBlockDefaults.practiceDialogue },
  pronunciationEyebrow: {
    default: conversationBlockDefaults.pronunciationEyebrow,
  },
  pronunciationAudioTrack: {
    default: conversationBlockDefaults.pronunciationAudioTrack,
  },
  pronunciationSymbol: {
    default: conversationBlockDefaults.pronunciationSymbol,
  },
  pronunciationDescriptionKo: {
    default: conversationBlockDefaults.pronunciationDescriptionKo,
  },
  pronunciationDescriptionTranslation: {
    default: conversationBlockDefaults.pronunciationDescriptionTranslation,
  },
  pronunciationExamples: {
    default: conversationBlockDefaults.pronunciationExamples,
  },
};

const emptyConversationProps = {
  theme: conversationBlockDefaults.theme,
  sectionVariant: conversationBlockDefaults.sectionVariant,
  showTip: false,
  assetId: "",
  fileName: "",
  contentType: "",
  eyebrow: "",
  number: "",
  audioTrack: "",
  lines: "[]",
  questionsLabel: "",
  questions: "[]",
  tipTitle: "",
  tipBody: "",
  tipTranslation: "",
  practiceAssetId: "",
  practiceFileName: "",
  practiceContentType: "",
  practicePromptKo: "",
  practicePromptTranslation: "",
  practiceExpressions: "[]",
  practiceDialogue: "[]",
  pronunciationEyebrow: "",
  pronunciationAudioTrack: "",
  pronunciationSymbol: "",
  pronunciationDescriptionKo: "",
  pronunciationDescriptionTranslation: "",
  pronunciationExamples: "[]",
} as const;

function defaultLines(): ConversationLine[] {
  return conversationBlockLines.map((line) => ({ ...line }));
}

function defaultQuestions(): ConversationQuestion[] {
  return conversationBlockQuestions.map((question) => ({ ...question }));
}

function parseLines(value: string): ConversationLine[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultLines();
    return parsed
      .filter(
        (line): line is Record<string, unknown> =>
          typeof line === "object" && line !== null,
      )
      .map((line) => ({
        speaker: typeof line.speaker === "string" ? line.speaker : "",
        korean: typeof line.korean === "string" ? line.korean : "",
        translation:
          typeof line.translation === "string" ? line.translation : "",
      }))
      .slice(0, 16);
  } catch {
    return defaultLines();
  }
}

function parseQuestions(value: string): ConversationQuestion[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultQuestions();
    return parsed
      .filter(
        (question): question is Record<string, unknown> =>
          typeof question === "object" && question !== null,
      )
      .map((question) => ({
        korean: typeof question.korean === "string" ? question.korean : "",
        translation:
          typeof question.translation === "string" ? question.translation : "",
      }))
      .slice(0, 8);
  } catch {
    return defaultQuestions();
  }
}

function parsePracticeExpressions(value: string): PracticeExpression[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return speakingPracticeExpressions.map((item) => ({ ...item }));
    }
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        korean: typeof item.korean === "string" ? item.korean : "",
        translation:
          typeof item.translation === "string" ? item.translation : "",
      }))
      .slice(0, 12);
  } catch {
    return speakingPracticeExpressions.map((item) => ({ ...item }));
  }
}

function parsePracticeDialogue(value: string): PracticeDialogueLine[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return speakingPracticeDialogue.map((item) => ({ ...item }));
    }
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        speaker: typeof item.speaker === "string" ? item.speaker : "",
        korean: typeof item.korean === "string" ? item.korean : "",
      }))
      .slice(0, 12);
  } catch {
    return speakingPracticeDialogue.map((item) => ({ ...item }));
  }
}

function parsePronunciationExamples(value: string): PronunciationExample[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return pronunciationBlockExamples.map((item) => ({ ...item }));
    }
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        korean: typeof item.korean === "string" ? item.korean : "",
        pronunciation:
          typeof item.pronunciation === "string" ? item.pronunciation : "",
      }))
      .slice(0, 12);
  } catch {
    return pronunciationBlockExamples.map((item) => ({ ...item }));
  }
}

function ConversationImage({
  assetId,
  contextLabel = "Conversation context",
  editable,
  emptyText = "Tambahkan gambar yang memberi konteks percakapan.",
  fileName,
  onUploaded,
  successMessage = "Gambar percakapan diperbarui.",
}: {
  assetId: string;
  contextLabel?: string;
  editable: boolean;
  emptyText?: string;
  fileName: string;
  onUploaded: (asset: {
    assetId: string;
    fileName: string;
    contentType: string;
  }) => void;
  successMessage?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const storage = useEditorAssetUpload();
  const [uploading, setUploading] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !storage) return;
    setUploading(true);
    try {
      onUploaded(await storage.upload(file, "image"));
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload gambar gagal.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="group bg-muted ring-foreground/10 relative aspect-[4/3] min-h-40 overflow-hidden rounded-xl ring-1">
      <input
        ref={inputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) => void selectFile(event)}
        type="file"
      />
      {assetId ? (
        <AssetUrl assetId={assetId}>
          {(url, loading) =>
            loading ? (
              <div className="text-muted-foreground flex size-full items-center justify-center gap-2 text-sm">
                <LoaderCircleIcon className="size-4 animate-spin" /> Memuat
              </div>
            ) : url ? (
              // Asset URLs come from the authenticated storage API.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={fileName || contextLabel}
                className="size-full object-cover"
                src={url}
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
                Gambar tidak tersedia.
              </div>
            )
          }
        </AssetUrl>
      ) : (
        <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 p-5 text-center">
          <ImageIcon className="size-7" />
          <span className="text-xs leading-relaxed">{emptyText}</span>
        </div>
      )}
      {editable && storage ? (
        <button
          aria-label={assetId ? "Ganti gambar" : "Unggah gambar"}
          className="bg-foreground text-background absolute right-2 bottom-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium shadow-sm transition hover:opacity-90 disabled:opacity-60"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <UploadIcon className="size-3.5" />
          )}
          {assetId ? "Ganti" : "Unggah"}
        </button>
      ) : null}
    </div>
  );
}

export const conversationBlock = createReactBlockSpec(
  {
    type: conversationBlockType,
    propSchema: conversationProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const scheme = themeStyles[block.props.theme];
      const sectionVariant = block.props.sectionVariant ?? "both";
      const showUsefulExpression =
        sectionVariant === "useful-expression" || sectionVariant === "both";
      const showPronunciation =
        sectionVariant === "pronunciation" || sectionVariant === "both";
      const lines = parseLines(block.props.lines);
      const questions = parseQuestions(block.props.questions);
      const practiceExpressions = parsePracticeExpressions(
        block.props.practiceExpressions,
      );
      const practiceDialogue = parsePracticeDialogue(
        block.props.practiceDialogue,
      );
      const pronunciationExamples = parsePronunciationExamples(
        block.props.pronunciationExamples,
      );
      const updateLines = (next: ConversationLine[]) =>
        editor.updateBlock(block, {
          props: { lines: JSON.stringify(next) },
        });
      const updateQuestions = (next: ConversationQuestion[]) =>
        editor.updateBlock(block, {
          props: { questions: JSON.stringify(next) },
        });
      const updatePracticeExpressions = (next: PracticeExpression[]) =>
        editor.updateBlock(block, {
          props: { practiceExpressions: JSON.stringify(next) },
        });
      const updatePracticeDialogue = (next: PracticeDialogueLine[]) =>
        editor.updateBlock(block, {
          props: { practiceDialogue: JSON.stringify(next) },
        });
      const updatePronunciationExamples = (next: PronunciationExample[]) =>
        editor.updateBlock(block, {
          props: { pronunciationExamples: JSON.stringify(next) },
        });

      return (
        <article
          className="text-foreground isolate my-4 w-full min-w-0 bg-transparent opacity-100"
          contentEditable={false}
          data-custom-block
        >
          {editable ? (
            <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <PaletteIcon className="size-3.5" /> Conversation block
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {conversationBlockThemes.map((theme) => {
                    const option = themeStyles[theme];
                    const selected = block.props.theme === theme;
                    return (
                      <button
                        aria-label={`Gunakan palet ${option.label}`}
                        aria-pressed={selected}
                        className={`ring-foreground/10 focus-visible:ring-ring grid size-7 place-items-center rounded-md ring-1 transition focus-visible:ring-2 focus-visible:outline-none ${selected ? "bg-background shadow-xs" : "hover:bg-background/70"}`}
                        key={theme}
                        onClick={() =>
                          editor.updateBlock(block, { props: { theme } })
                        }
                        title={option.label}
                        type="button"
                      >
                        <span
                          className="size-3.5 rounded-full"
                          style={{ backgroundColor: option.accent }}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="border-border flex items-center gap-1 rounded-md border p-0.5">
                  {conversationBlockSectionVariants.map((variant) => {
                    const label =
                      variant === "useful-expression"
                        ? "Useful expression"
                        : variant === "pronunciation"
                          ? "Pronunciation"
                          : "Both";
                    const selected = sectionVariant === variant;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`rounded px-2 py-1 text-[0.65rem] font-medium transition ${selected ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                        key={variant}
                        onClick={() =>
                          editor.updateBlock(block, {
                            props: { sectionVariant: variant },
                          })
                        }
                        title={`Tampilkan ${label}`}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  aria-pressed={block.props.showTip}
                  className="border-border hover:bg-background text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition"
                  onClick={() =>
                    editor.updateBlock(block, {
                      props: { showTip: !block.props.showTip },
                    })
                  }
                  type="button"
                >
                  <LightbulbIcon className="size-3.5" /> Tip
                </button>
                <CustomBlockToolbar
                  block={block}
                  editable={editable}
                  onClear={() =>
                    editor.updateBlock(block, {
                      props: emptyConversationProps,
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          <header className="border-border relative flex min-w-0 items-stretch border-b">
            <span
              className="grid w-14 shrink-0 place-items-center text-white sm:w-16"
              style={{ backgroundColor: scheme.accent }}
            >
              <MessageSquareTextIcon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 sm:px-5">
              <EditableBlockText
                ariaLabel="Label percakapan"
                className="min-w-0 flex-1 text-sm font-bold tracking-[0.08em] uppercase"
                editable={editable}
                onChange={(eyebrow) =>
                  editor.updateBlock(block, { props: { eyebrow } })
                }
                value={block.props.eyebrow}
              />
              <EditableBlockText
                ariaLabel="Nomor percakapan"
                className="w-14 shrink-0 text-right text-2xl leading-none font-semibold [overflow-wrap:normal] whitespace-nowrap tabular-nums"
                editable={editable}
                onChange={(number) =>
                  editor.updateBlock(block, { props: { number } })
                }
                value={block.props.number}
              />
              <div className="text-muted-foreground border-border flex shrink-0 items-center gap-1 border-l pl-3 text-xs">
                <HeadphonesIcon className="size-4" />
                <EditableBlockText
                  ariaLabel="Nomor audio"
                  className="w-10 shrink-0 text-xs [overflow-wrap:normal] whitespace-nowrap tabular-nums"
                  editable={editable}
                  onChange={(audioTrack) =>
                    editor.updateBlock(block, { props: { audioTrack } })
                  }
                  value={block.props.audioTrack}
                />
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <section className="divide-border min-w-0 divide-y">
              {lines.map((line, index) => (
                <div
                  className={`grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[5rem_minmax(0,1fr)_auto] ${editable ? "" : "sm:grid-cols-[5rem_minmax(0,1fr)]"}`}
                  key={index}
                >
                  <EditableBlockText
                    ariaLabel={`Pembicara ${index + 1}`}
                    className="text-foreground w-full text-sm font-semibold underline decoration-1 underline-offset-4"
                    editable={editable}
                    onChange={(speaker) => {
                      const next = [...lines];
                      next[index] = { ...line, speaker };
                      updateLines(next);
                    }}
                    value={line.speaker}
                  />
                  <div className="min-w-0 space-y-1">
                    <EditableBlockText
                      ariaLabel={`Dialog Korea ${index + 1}`}
                      className="text-foreground w-full text-sm leading-relaxed font-medium"
                      editable={editable}
                      onChange={(korean) => {
                        const next = [...lines];
                        next[index] = { ...line, korean };
                        updateLines(next);
                      }}
                      value={line.korean}
                    />
                    <EditableBlockText
                      ariaLabel={`Terjemahan dialog ${index + 1}`}
                      className="text-muted-foreground w-full text-xs leading-relaxed"
                      editable={editable}
                      onChange={(translation) => {
                        const next = [...lines];
                        next[index] = { ...line, translation };
                        updateLines(next);
                      }}
                      value={line.translation}
                    />
                  </div>
                  {editable ? (
                    <button
                      aria-label={`Hapus dialog ${index + 1}`}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition disabled:opacity-30"
                      disabled={lines.length === 1}
                      onClick={() =>
                        updateLines(lines.filter((_, item) => item !== index))
                      }
                      type="button"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
              {editable ? (
                <button
                  className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 pt-3 text-xs font-medium transition disabled:opacity-40"
                  disabled={lines.length >= 16}
                  onClick={() =>
                    updateLines([
                      ...lines,
                      { speaker: "", korean: "", translation: "" },
                    ])
                  }
                  type="button"
                >
                  <PlusIcon className="size-3.5" /> Tambah dialog
                </button>
              ) : null}
            </section>

            <ConversationImage
              assetId={block.props.assetId}
              editable={editable}
              fileName={block.props.fileName}
              onUploaded={(asset) =>
                editor.updateBlock(block, { props: asset })
              }
            />
          </div>

          <div className="grid min-w-0 gap-4 px-4 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <section
              className="min-w-0 rounded-xl border p-4 sm:p-5"
              style={{ borderColor: scheme.accent }}
            >
              <EditableBlockText
                ariaLabel="Label pertanyaan"
                className="mb-3 w-full text-xs font-bold tracking-[0.08em] uppercase"
                editable={editable}
                onChange={(questionsLabel) =>
                  editor.updateBlock(block, { props: { questionsLabel } })
                }
                value={block.props.questionsLabel}
              />
              <div className="divide-border divide-y">
                {questions.map((question, index) => (
                  <div
                    className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-2 py-2.5 first:pt-0 last:pb-0"
                    key={index}
                  >
                    <span
                      className="grid size-5 place-items-center rounded text-[0.65rem] font-bold text-white"
                      style={{ backgroundColor: scheme.accent }}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <EditableBlockText
                        ariaLabel={`Pertanyaan Korea ${index + 1}`}
                        className="text-foreground w-full text-sm leading-relaxed font-medium"
                        editable={editable}
                        onChange={(korean) => {
                          const next = [...questions];
                          next[index] = { ...question, korean };
                          updateQuestions(next);
                        }}
                        value={question.korean}
                      />
                      <EditableBlockText
                        ariaLabel={`Terjemahan pertanyaan ${index + 1}`}
                        className="text-muted-foreground w-full text-xs leading-relaxed"
                        editable={editable}
                        onChange={(translation) => {
                          const next = [...questions];
                          next[index] = { ...question, translation };
                          updateQuestions(next);
                        }}
                        value={question.translation}
                      />
                    </div>
                    {editable ? (
                      <button
                        aria-label={`Hapus pertanyaan ${index + 1}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition disabled:opacity-30"
                        disabled={questions.length === 1}
                        onClick={() =>
                          updateQuestions(
                            questions.filter((_, item) => item !== index),
                          )
                        }
                        type="button"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {editable ? (
                <button
                  className="text-muted-foreground hover:text-foreground mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium transition disabled:opacity-40"
                  disabled={questions.length >= 8}
                  onClick={() =>
                    updateQuestions([
                      ...questions,
                      { korean: "", translation: "" },
                    ])
                  }
                  type="button"
                >
                  <PlusIcon className="size-3.5" /> Tambah pertanyaan
                </button>
              ) : null}
            </section>

            {block.props.showTip ? (
              <aside
                className="bg-muted/65 text-foreground ring-foreground/15 dark:bg-muted/80 h-fit min-w-0 rounded-xl border-l-2 p-4 ring-1"
                style={{ borderLeftColor: scheme.accent }}
              >
                <div className="mb-3 flex items-start gap-2.5">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ backgroundColor: scheme.accent }}
                  >
                    <LightbulbIcon className="size-4" />
                  </span>
                  <EditableBlockText
                    ariaLabel="Judul tip"
                    className="text-foreground w-full text-sm font-semibold"
                    editable={editable}
                    onChange={(tipTitle) =>
                      editor.updateBlock(block, { props: { tipTitle } })
                    }
                    value={block.props.tipTitle}
                  />
                </div>
                <EditableBlockText
                  ariaLabel="Isi tip"
                  className="text-foreground w-full text-xs leading-relaxed"
                  editable={editable}
                  onChange={(tipBody) =>
                    editor.updateBlock(block, { props: { tipBody } })
                  }
                  value={block.props.tipBody}
                />
                <EditableBlockText
                  ariaLabel="Terjemahan tip"
                  className="text-muted-foreground mt-2 w-full text-xs leading-relaxed"
                  editable={editable}
                  onChange={(tipTranslation) =>
                    editor.updateBlock(block, { props: { tipTranslation } })
                  }
                  value={block.props.tipTranslation}
                />
              </aside>
            ) : null}
          </div>

          {showUsefulExpression ? (
            <section className="border-border min-w-0 border-t px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex min-w-0 items-start gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: scheme.accent }}
                >
                  <MessageCircleMoreIcon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <EditableBlockText
                    ariaLabel="Instruksi latihan berbicara"
                    className="text-foreground w-full text-sm font-semibold"
                    editable={editable}
                    onChange={(practicePromptKo) =>
                      editor.updateBlock(block, { props: { practicePromptKo } })
                    }
                    value={block.props.practicePromptKo}
                  />
                  <EditableBlockText
                    ariaLabel="Terjemahan instruksi latihan berbicara"
                    className="text-muted-foreground mt-1 w-full text-xs"
                    editable={editable}
                    onChange={(practicePromptTranslation) =>
                      editor.updateBlock(block, {
                        props: { practicePromptTranslation },
                      })
                    }
                    value={block.props.practicePromptTranslation}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:items-start">
                <ConversationImage
                  assetId={block.props.practiceAssetId}
                  contextLabel="Speaking practice context"
                  editable={editable}
                  emptyText="Tambahkan gambar untuk latihan berbicara."
                  fileName={block.props.practiceFileName}
                  onUploaded={(asset) =>
                    editor.updateBlock(block, {
                      props: {
                        practiceAssetId: asset.assetId,
                        practiceFileName: asset.fileName,
                        practiceContentType: asset.contentType,
                      },
                    })
                  }
                  successMessage="Gambar latihan diperbarui."
                />

                <div className="bg-muted/55 ring-foreground/10 h-full min-w-0 rounded-xl p-3 ring-1">
                  <p className="text-muted-foreground mb-2 text-[0.65rem] font-semibold tracking-wide uppercase">
                    Useful expression
                  </p>
                  <div className="divide-border divide-y">
                    {practiceExpressions.map((expression, index) => (
                      <div
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 py-2"
                        key={index}
                      >
                        <div className="min-w-0">
                          <EditableBlockText
                            ariaLabel={`Ekspresi latihan ${index + 1}`}
                            className="text-foreground w-full text-sm font-medium"
                            editable={editable}
                            onChange={(korean) => {
                              const next = [...practiceExpressions];
                              next[index] = { ...expression, korean };
                              updatePracticeExpressions(next);
                            }}
                            value={expression.korean}
                          />
                          <EditableBlockText
                            ariaLabel={`Terjemahan ekspresi ${index + 1}`}
                            className="text-muted-foreground mt-0.5 w-full text-xs"
                            editable={editable}
                            onChange={(translation) => {
                              const next = [...practiceExpressions];
                              next[index] = { ...expression, translation };
                              updatePracticeExpressions(next);
                            }}
                            value={expression.translation}
                          />
                        </div>
                        {editable ? (
                          <button
                            aria-label={`Hapus ekspresi ${index + 1}`}
                            className="text-muted-foreground hover:text-destructive grid size-7 place-items-center disabled:opacity-30"
                            disabled={practiceExpressions.length === 1}
                            onClick={() =>
                              updatePracticeExpressions(
                                practiceExpressions.filter(
                                  (_, item) => item !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {editable ? (
                    <button
                      className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-center gap-1 text-xs"
                      disabled={practiceExpressions.length >= 12}
                      onClick={() =>
                        updatePracticeExpressions([
                          ...practiceExpressions,
                          { korean: "", translation: "" },
                        ])
                      }
                      type="button"
                    >
                      <PlusIcon className="size-3.5" /> Tambah ekspresi
                    </button>
                  ) : null}
                </div>

                <div className="bg-background/80 ring-foreground/10 min-w-0 space-y-2 rounded-xl p-4 ring-1 sm:col-span-2">
                  {practiceDialogue.map((line, index) => (
                    <div
                      className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] gap-2"
                      key={index}
                    >
                      <EditableBlockText
                        ariaLabel={`Pembicara latihan ${index + 1}`}
                        className="text-foreground w-full text-sm font-semibold"
                        editable={editable}
                        onChange={(speaker) => {
                          const next = [...practiceDialogue];
                          next[index] = { ...line, speaker };
                          updatePracticeDialogue(next);
                        }}
                        value={line.speaker}
                      />
                      <EditableBlockText
                        ariaLabel={`Dialog latihan ${index + 1}`}
                        className="text-foreground w-full text-sm leading-relaxed"
                        editable={editable}
                        onChange={(korean) => {
                          const next = [...practiceDialogue];
                          next[index] = { ...line, korean };
                          updatePracticeDialogue(next);
                        }}
                        value={line.korean}
                      />
                      {editable ? (
                        <button
                          aria-label={`Hapus dialog latihan ${index + 1}`}
                          className="text-muted-foreground hover:text-destructive grid size-7 place-items-center disabled:opacity-30"
                          disabled={practiceDialogue.length === 1}
                          onClick={() =>
                            updatePracticeDialogue(
                              practiceDialogue.filter(
                                (_, item) => item !== index,
                              ),
                            )
                          }
                          type="button"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {editable ? (
                    <button
                      className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 text-xs"
                      disabled={practiceDialogue.length >= 12}
                      onClick={() =>
                        updatePracticeDialogue([
                          ...practiceDialogue,
                          { speaker: "", korean: "" },
                        ])
                      }
                      type="button"
                    >
                      <PlusIcon className="size-3.5" /> Tambah dialog
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {showPronunciation ? (
            <section className="bg-muted/45 border-border min-w-0 border-t">
              <header
                className="flex min-w-0 items-center gap-3 px-4 py-3 text-white sm:px-5"
                style={{ backgroundColor: scheme.accent }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/15">
                  <Volume2Icon className="size-4" />
                </span>
                <EditableBlockText
                  ariaLabel="Label pelafalan"
                  className="min-w-0 flex-1 text-sm font-bold tracking-[0.08em] text-white uppercase"
                  editable={editable}
                  onChange={(pronunciationEyebrow) =>
                    editor.updateBlock(block, {
                      props: { pronunciationEyebrow },
                    })
                  }
                  value={block.props.pronunciationEyebrow}
                />
                <div className="flex shrink-0 items-center gap-1 border-l border-white/30 pl-3 text-xs text-white">
                  <HeadphonesIcon className="size-4" />
                  <EditableBlockText
                    ariaLabel="Nomor audio pelafalan"
                    className="w-8 text-xs text-white"
                    editable={editable}
                    onChange={(pronunciationAudioTrack) =>
                      editor.updateBlock(block, {
                        props: { pronunciationAudioTrack },
                      })
                    }
                    value={block.props.pronunciationAudioTrack}
                  />
                </div>
              </header>

              <div className="grid min-w-0 gap-5 p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:p-6">
                <div className="bg-background ring-foreground/10 grid aspect-square place-items-center rounded-full ring-1">
                  <EditableBlockText
                    ariaLabel="Karakter pelafalan"
                    className="text-foreground w-full text-center text-5xl font-medium"
                    editable={editable}
                    onChange={(pronunciationSymbol) =>
                      editor.updateBlock(block, {
                        props: { pronunciationSymbol },
                      })
                    }
                    value={block.props.pronunciationSymbol}
                  />
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="space-y-2">
                    <EditableBlockText
                      ariaLabel="Penjelasan pelafalan"
                      className="text-foreground w-full text-sm leading-relaxed"
                      editable={editable}
                      onChange={(pronunciationDescriptionKo) =>
                        editor.updateBlock(block, {
                          props: { pronunciationDescriptionKo },
                        })
                      }
                      value={block.props.pronunciationDescriptionKo}
                    />
                    <EditableBlockText
                      ariaLabel="Terjemahan penjelasan pelafalan"
                      className="text-muted-foreground w-full text-xs leading-relaxed"
                      editable={editable}
                      onChange={(pronunciationDescriptionTranslation) =>
                        editor.updateBlock(block, {
                          props: { pronunciationDescriptionTranslation },
                        })
                      }
                      value={block.props.pronunciationDescriptionTranslation}
                    />
                  </div>

                  <div className="bg-card ring-foreground/10 divide-border min-w-0 divide-y rounded-lg px-3 ring-1">
                    {pronunciationExamples.map((example, index) => (
                      <div
                        className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 py-2.5"
                        key={index}
                      >
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {index + 1}
                        </span>
                        <EditableBlockText
                          ariaLabel={`Kata pelafalan ${index + 1}`}
                          className="text-foreground w-full text-sm"
                          editable={editable}
                          onChange={(korean) => {
                            const next = [...pronunciationExamples];
                            next[index] = { ...example, korean };
                            updatePronunciationExamples(next);
                          }}
                          value={example.korean}
                        />
                        <EditableBlockText
                          ariaLabel={`Bunyi pelafalan ${index + 1}`}
                          className="text-foreground w-full text-sm font-medium"
                          editable={editable}
                          onChange={(pronunciation) => {
                            const next = [...pronunciationExamples];
                            next[index] = { ...example, pronunciation };
                            updatePronunciationExamples(next);
                          }}
                          value={example.pronunciation}
                        />
                        {editable ? (
                          <button
                            aria-label={`Hapus contoh pelafalan ${index + 1}`}
                            className="text-muted-foreground hover:text-destructive grid size-7 place-items-center disabled:opacity-30"
                            disabled={pronunciationExamples.length === 1}
                            onClick={() =>
                              updatePronunciationExamples(
                                pronunciationExamples.filter(
                                  (_, item) => item !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {editable ? (
                      <button
                        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 py-2 text-xs"
                        disabled={pronunciationExamples.length >= 12}
                        onClick={() =>
                          updatePronunciationExamples([
                            ...pronunciationExamples,
                            { korean: "", pronunciation: "" },
                          ])
                        }
                        type="button"
                      >
                        <PlusIcon className="size-3.5" /> Tambah contoh
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </article>
      );
    },
  },
)();
