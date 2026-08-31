"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  Building2Icon,
  ClipboardCheckIcon,
  ImageIcon,
  LoaderCircleIcon,
  PaletteIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import {
  cultureBlockDefaults,
  cultureBlockThemes,
  cultureBlockType,
  cultureChecklistItems,
} from "~/lib/blocknote/block-catalog";

import { useEditorAssetUpload } from "../asset-upload-context";
import { AssetUrl } from "./asset-media-block";
import { CustomBlockToolbar } from "./custom-block-toolbar";
import { EditableBlockText } from "./editable-block-text";

type ChecklistItem = {
  ko: string;
  en: string;
};

const cultureThemeStyles = {
  teal: { label: "Teal", accent: "#14b8a6" },
  rose: { label: "Rose", accent: "#d14b70" },
  ocean: { label: "Ocean", accent: "#3182a8" },
  amber: { label: "Amber", accent: "#d97706" },
} as const;

const cultureBlockProps = {
  theme: { default: "teal", values: [...cultureBlockThemes] },
  eyebrow: { default: cultureBlockDefaults.eyebrow },
  titleKo: { default: cultureBlockDefaults.titleKo },
  titleEn: { default: cultureBlockDefaults.titleEn },
  bodyKo1: { default: cultureBlockDefaults.bodyKo1 },
  bodyEn1: { default: cultureBlockDefaults.bodyEn1 },
  assetId: { default: "" },
  fileName: { default: "" },
  contentType: { default: "" },
  secondAssetId: { default: "" },
  secondFileName: { default: "" },
  secondContentType: { default: "" },
  bodyKo2: { default: cultureBlockDefaults.bodyKo2 },
  bodyEn2: { default: cultureBlockDefaults.bodyEn2 },
  checklistTitleKo: { default: cultureBlockDefaults.checklistTitleKo },
  checklistTitleEn: { default: cultureBlockDefaults.checklistTitleEn },
  checklistItems: { default: cultureBlockDefaults.checklistItems },
};

const emptyCultureProps = {
  theme: "teal",
  eyebrow: "",
  titleKo: "",
  titleEn: "",
  bodyKo1: "",
  bodyEn1: "",
  assetId: "",
  fileName: "",
  contentType: "",
  secondAssetId: "",
  secondFileName: "",
  secondContentType: "",
  bodyKo2: "",
  bodyEn2: "",
  checklistTitleKo: "",
  checklistTitleEn: "",
  checklistItems: "[]",
} as const;

function defaultChecklist(): ChecklistItem[] {
  return cultureChecklistItems.map((item: ChecklistItem) => ({ ...item }));
}

function parseChecklist(value: string): ChecklistItem[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultChecklist();
    return parsed
      .filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null,
      )
      .map((row) => ({
        ko: typeof row.ko === "string" ? row.ko : "",
        en: typeof row.en === "string" ? row.en : "",
      }))
      .slice(0, 8);
  } catch {
    return defaultChecklist();
  }
}

function CultureImage({
  assetId,
  editable,
  fileName,
  onUploaded,
}: {
  assetId: string;
  editable: boolean;
  fileName: string;
  onUploaded: (asset: {
    assetId: string;
    fileName: string;
    contentType: string;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useEditorAssetUpload();
  const [uploading, setUploading] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !upload) return;
    setUploading(true);
    try {
      onUploaded(await upload.upload(file, "image"));
      toast.success("Gambar budaya diperbarui.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload gambar gagal.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="group bg-muted ring-foreground/10 relative aspect-[4/3] overflow-hidden rounded-xl ring-1">
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
                <LoaderCircleIcon className="size-5 animate-spin" /> Memuat
                gambar
              </div>
            ) : url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={fileName || "Culture image"}
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
        <div className="text-muted-foreground bg-muted/50 flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="bg-background ring-foreground/10 rounded-lg p-3 ring-1">
            <ImageIcon className="size-6" />
          </div>
          <p className="max-w-[14rem] text-xs leading-relaxed">
            Tambahkan foto budaya.
          </p>
        </div>
      )}

      {editable ? (
        upload ? (
          <button
            className="bg-foreground text-background absolute right-2 bottom-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-sm transition hover:opacity-90 disabled:opacity-60"
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
        ) : (
          <div className="bg-background/90 text-muted-foreground ring-foreground/10 absolute right-2 bottom-2 rounded-md px-2 py-1 text-[0.65rem] font-medium ring-1 backdrop-blur">
            Upload tidak tersedia
          </div>
        )
      ) : null}
    </div>
  );
}

export const cultureBlock = createReactBlockSpec(
  {
    type: cultureBlockType,
    propSchema: cultureBlockProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const scheme =
        cultureThemeStyles[block.props.theme] ?? cultureThemeStyles.teal;
      const checklist = parseChecklist(block.props.checklistItems);

      const updateChecklist = (items: ChecklistItem[]) =>
        editor.updateBlock(block, {
          props: { checklistItems: JSON.stringify(items) },
        });

      return (
        <article
          className="text-foreground isolate my-4 w-full min-w-0 bg-transparent"
          contentEditable={false}
          data-custom-block
        >
          {editable ? (
            <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <PaletteIcon className="size-3.5" /> Culture block
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {cultureBlockThemes.map((theme) => {
                    const option = cultureThemeStyles[theme];
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
                <CustomBlockToolbar
                  block={block}
                  editable={editable}
                  onClear={() =>
                    editor.updateBlock(block, { props: emptyCultureProps })
                  }
                />
              </div>
            </div>
          ) : null}

          <header className="border-border relative min-w-0 border-b p-4 sm:p-6">
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 left-0 h-1"
              style={{ backgroundColor: scheme.accent }}
            />
            <div className="flex min-w-0 items-start gap-4">
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: scheme.accent }}
              >
                <Building2Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <EditableBlockText
                  ariaLabel="Label budaya"
                  className="text-muted-foreground w-full text-xs font-semibold tracking-[0.14em] uppercase"
                  editable={editable}
                  onChange={(eyebrow) =>
                    editor.updateBlock(block, { props: { eyebrow } })
                  }
                  value={block.props.eyebrow}
                />
                <EditableBlockText
                  ariaLabel="Judul budaya Korea"
                  className="text-foreground mt-2 w-full text-2xl leading-tight font-medium tracking-tight sm:text-3xl"
                  editable={editable}
                  onChange={(titleKo) =>
                    editor.updateBlock(block, { props: { titleKo } })
                  }
                  value={block.props.titleKo}
                />
                <EditableBlockText
                  ariaLabel="Judul budaya Inggris"
                  className="mt-1 w-full text-sm font-medium"
                  editable={editable}
                  onChange={(titleEn) =>
                    editor.updateBlock(block, { props: { titleEn } })
                  }
                  value={block.props.titleEn}
                />
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-6 p-4 sm:p-6">
            <section className="min-w-0 space-y-2">
              <EditableBlockText
                ariaLabel="Paragraf Korea pertama"
                className="text-foreground w-full text-sm leading-relaxed"
                editable={editable}
                onChange={(bodyKo1) =>
                  editor.updateBlock(block, { props: { bodyKo1 } })
                }
                value={block.props.bodyKo1}
              />
              <EditableBlockText
                ariaLabel="Paragraf Inggris pertama"
                className="text-muted-foreground w-full text-sm leading-relaxed"
                editable={editable}
                onChange={(bodyEn1) =>
                  editor.updateBlock(block, { props: { bodyEn1 } })
                }
                value={block.props.bodyEn1}
              />
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <CultureImage
                assetId={block.props.assetId}
                editable={editable}
                fileName={block.props.fileName}
                onUploaded={(asset) =>
                  editor.updateBlock(block, {
                    props: {
                      assetId: asset.assetId,
                      fileName: asset.fileName,
                      contentType: asset.contentType,
                    },
                  })
                }
              />
              <CultureImage
                assetId={block.props.secondAssetId}
                editable={editable}
                fileName={block.props.secondFileName}
                onUploaded={(asset) =>
                  editor.updateBlock(block, {
                    props: {
                      secondAssetId: asset.assetId,
                      secondFileName: asset.fileName,
                      secondContentType: asset.contentType,
                    },
                  })
                }
              />
            </div>

            <section className="min-w-0 space-y-2">
              <EditableBlockText
                ariaLabel="Paragraf Korea kedua"
                className="text-foreground w-full text-sm leading-relaxed"
                editable={editable}
                onChange={(bodyKo2) =>
                  editor.updateBlock(block, { props: { bodyKo2 } })
                }
                value={block.props.bodyKo2}
              />
              <EditableBlockText
                ariaLabel="Paragraf Inggris kedua"
                className="text-muted-foreground w-full text-sm leading-relaxed"
                editable={editable}
                onChange={(bodyEn2) =>
                  editor.updateBlock(block, { props: { bodyEn2 } })
                }
                value={block.props.bodyEn2}
              />
            </section>
          </div>

          <section className="border-border min-w-0 border-t px-4 py-5 sm:px-6">
            <div className="mb-4 flex min-w-0 items-start gap-3">
              <span
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: scheme.accent }}
              >
                <ClipboardCheckIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <EditableBlockText
                    ariaLabel="Judul checklist Korea"
                    className="text-foreground w-auto text-sm font-semibold tracking-wide"
                    editable={editable}
                    onChange={(checklistTitleKo) =>
                      editor.updateBlock(block, {
                        props: { checklistTitleKo },
                      })
                    }
                    value={block.props.checklistTitleKo}
                  />
                  <span className="text-muted-foreground">·</span>
                  <EditableBlockText
                    ariaLabel="Judul checklist Inggris"
                    className="text-muted-foreground w-auto text-xs font-semibold tracking-[0.14em] uppercase"
                    editable={editable}
                    onChange={(checklistTitleEn) =>
                      editor.updateBlock(block, {
                        props: { checklistTitleEn },
                      })
                    }
                    value={block.props.checklistTitleEn}
                  />
                </div>
              </div>
            </div>

            <div className="ring-foreground/10 divide-border min-w-0 divide-y overflow-hidden rounded-lg ring-1">
              {checklist.map((item, index) => (
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-3 py-3"
                  key={index}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: scheme.accent }}
                      />
                      <div className="min-w-0 flex-1">
                        <EditableBlockText
                          ariaLabel={`Checklist Korea ${index + 1}`}
                          className="text-foreground w-full text-sm leading-relaxed"
                          editable={editable}
                          onChange={(ko) => {
                            const next = [...checklist];
                            next[index] = { ...item, ko };
                            updateChecklist(next);
                          }}
                          value={item.ko}
                        />
                        <EditableBlockText
                          ariaLabel={`Checklist Inggris ${index + 1}`}
                          className="text-muted-foreground w-full text-xs leading-relaxed"
                          editable={editable}
                          onChange={(en) => {
                            const next = [...checklist];
                            next[index] = { ...item, en };
                            updateChecklist(next);
                          }}
                          value={item.en}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <span className="border-border grid size-5 place-items-center rounded border bg-white">
                      <span className="bg-muted-foreground/40 size-3 rounded-sm opacity-0" />
                    </span>
                    {editable ? (
                      <button
                        aria-label={`Hapus item ${index + 1}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md transition disabled:opacity-30"
                        disabled={checklist.length === 1}
                        onClick={() =>
                          updateChecklist(
                            checklist.filter((_, i) => i !== index),
                          )
                        }
                        type="button"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {editable ? (
                <button
                  className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition disabled:opacity-40"
                  disabled={checklist.length >= 8}
                  onClick={() =>
                    updateChecklist([...checklist, { ko: "", en: "" }])
                  }
                  type="button"
                >
                  <PlusIcon className="size-3.5" /> Tambah item
                </button>
              ) : null}
            </div>
          </section>
        </article>
      );
    },
  },
)();
