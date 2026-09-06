"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  CheckIcon,
  ClipboardCheckIcon,
  CopyIcon,
  ImageIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  PaletteIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import {
  cultureBlockDefaults,
  cultureBlockHeaderAlignments,
  cultureBlockSpacings,
  cultureBlockSurfaces,
  cultureBlockThemes,
  cultureBlockType,
  cultureChecklistItems,
} from "~/lib/blocknote/block-catalog";
import {
  createCultureMedia,
  createCultureSection,
  cultureImageAspects,
  cultureImageFits,
  cultureSectionPresets,
  parseCultureSections,
  type CultureMedia,
  type CultureSection,
  type CultureSectionPreset,
} from "~/lib/blocknote/culture-content";

import { useEditorAssetUpload } from "../asset-upload-context";
import { AssetUrl } from "./asset-media-block";
import { CustomBlockToolbar } from "./custom-block-toolbar";
import { EditableBlockText } from "./editable-block-text";

type ChecklistItem = { ko: string; en: string };

const cultureThemeStyles = {
  teal: {
    label: "Teal",
    accent: "var(--chart-2)",
    translation: "color-mix(in oklab, var(--chart-2) 55%, var(--foreground))",
  },
  rose: {
    label: "Rose",
    accent: "var(--destructive)",
    translation:
      "color-mix(in oklab, var(--destructive) 62%, var(--foreground))",
  },
  ocean: {
    label: "Ocean",
    accent: "var(--chart-1)",
    translation: "color-mix(in oklab, var(--chart-1) 58%, var(--foreground))",
  },
  amber: {
    label: "Amber",
    accent: "var(--chart-5)",
    translation: "color-mix(in oklab, var(--chart-5) 55%, var(--foreground))",
  },
} as const;

const culturePresetLabels: Record<CultureSectionPreset, string> = {
  text: "Bilingual text",
  "media-one": "One image",
  "media-two": "Two images",
  "split-image-left": "Image left",
  "split-image-right": "Image right",
  "split-stack-left": "Stacked images",
};

const cultureBlockProps = {
  theme: { default: "teal", values: [...cultureBlockThemes] },
  headerAlignment: {
    default: "center",
    values: [...cultureBlockHeaderAlignments],
  },
  showBanner: { default: true },
  spacing: { default: "comfortable", values: [...cultureBlockSpacings] },
  surface: { default: "card", values: [...cultureBlockSurfaces] },
  eyebrow: { default: cultureBlockDefaults.eyebrow },
  titleKo: { default: cultureBlockDefaults.titleKo },
  titleEn: { default: cultureBlockDefaults.titleEn },
  sections: { default: cultureBlockDefaults.sections },
  showChecklist: { default: true },
  checklistTitleKo: { default: cultureBlockDefaults.checklistTitleKo },
  checklistTitleEn: { default: cultureBlockDefaults.checklistTitleEn },
  checklistItems: { default: cultureBlockDefaults.checklistItems },
};

const emptyCultureProps = {
  theme: "teal",
  headerAlignment: "center",
  showBanner: true,
  spacing: "comfortable",
  surface: "card",
  eyebrow: "",
  titleKo: "",
  titleEn: "",
  sections: "[]",
  showChecklist: true,
  checklistTitleKo: "",
  checklistTitleEn: "",
  checklistItems: "[]",
} as const;

function createId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

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

function getSectionText(section: CultureSection) {
  return section.type === "media"
    ? { ko: "", en: "" }
    : { ko: section.ko, en: section.en };
}

function getSectionImages(section: CultureSection) {
  return section.type === "text" ? [] : section.images;
}

function getSectionPreset(section: CultureSection): CultureSectionPreset {
  if (section.type === "text") return "text";
  if (section.type === "media") {
    return section.columns === 1 ? "media-one" : "media-two";
  }
  if (section.mediaStack === "column") return "split-stack-left";
  return section.mediaSide === "right"
    ? "split-image-right"
    : "split-image-left";
}

function convertSection(
  section: CultureSection,
  preset: CultureSectionPreset,
): CultureSection {
  const created = createCultureSection(preset, section.id);
  const text = getSectionText(section);
  const existingImages = getSectionImages(section);

  if (created.type === "text") return { ...created, ...text };
  const images = created.images.map(
    (image, index) => existingImages[index] ?? image,
  );
  if (created.type === "media") return { ...created, images };
  return { ...created, ...text, images };
}

function cloneSection(section: CultureSection): CultureSection {
  const id = createId("culture-section");
  if (section.type === "text") return { ...section, id };
  return {
    ...section,
    id,
    images: section.images.map((image) => ({
      ...image,
      id: createId("culture-image"),
    })),
  };
}

function sectionHasContent(section: CultureSection) {
  if (section.type === "text") return Boolean(section.ko || section.en);
  const hasImage = section.images.some((image) => image.assetId);
  return section.type === "media"
    ? hasImage
    : hasImage || Boolean(section.ko || section.en);
}

function TextPair({
  editable,
  en,
  ko,
  onChange,
  translationColor,
}: {
  editable: boolean;
  en: string;
  ko: string;
  onChange: (text: { ko: string; en: string }) => void;
  translationColor: string;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {editable || ko ? (
        <EditableBlockText
          ariaLabel="Korean culture text"
          className="text-foreground w-full text-sm leading-7 font-medium"
          editable={editable}
          onChange={(value) => onChange({ ko: value, en })}
          placeholder="한국어 설명을 입력하세요…"
          value={ko}
        />
      ) : null}
      {editable || en ? (
        <div data-culture-translation style={{ color: translationColor }}>
          <EditableBlockText
            ariaLabel="English culture text"
            className="w-full text-sm leading-relaxed"
            editable={editable}
            onChange={(value) => onChange({ ko, en: value })}
            placeholder="Add the English explanation…"
            value={en}
          />
        </div>
      ) : null}
    </div>
  );
}

const aspectClasses = {
  auto: "min-h-40",
  square: "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:2": "aspect-[3/2]",
} as const;

function CultureImage({
  editable,
  image,
  onChange,
  onClear,
}: {
  editable: boolean;
  image: CultureMedia;
  onChange: (image: CultureMedia) => void;
  onClear: () => void;
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
      const asset = await upload.upload(file, "image");
      onChange({ ...image, ...asset });
      toast.success("Gambar budaya diperbarui.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload gambar gagal.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!editable && !image.assetId) return null;

  return (
    <figure className="min-w-0 space-y-2">
      <div
        className={`group bg-muted ring-foreground/10 relative overflow-hidden rounded-lg ring-1 ${aspectClasses[image.aspect]}`}
      >
        <input
          ref={inputRef}
          accept="image/*"
          className="hidden"
          onChange={(event) => void selectFile(event)}
          type="file"
        />
        {image.assetId ? (
          <AssetUrl assetId={image.assetId}>
            {(url, loading) =>
              loading ? (
                <div className="text-muted-foreground flex min-h-40 w-full items-center justify-center gap-2 text-sm">
                  <LoaderCircleIcon className="size-5 animate-spin" /> Memuat
                  gambar
                </div>
              ) : url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={image.alt}
                  className={`${image.aspect === "auto" ? "block h-auto w-full" : "size-full"} ${image.fit === "contain" ? "object-contain" : "object-cover"}`}
                  src={url}
                />
              ) : (
                <div className="text-muted-foreground flex min-h-40 w-full items-center justify-center text-sm">
                  Gambar tidak tersedia.
                </div>
              )
            }
          </AssetUrl>
        ) : (
          <div className="text-muted-foreground flex size-full min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="bg-background ring-foreground/10 rounded-lg p-3 ring-1">
              <ImageIcon className="size-6" />
            </div>
            <p className="max-w-[14rem] text-xs leading-relaxed">
              Tambahkan foto budaya.
            </p>
          </div>
        )}

        {editable ? (
          <div className="absolute right-2 bottom-2 flex gap-1.5">
            {image.assetId ? (
              <button
                aria-label="Remove image"
                className="bg-background/90 text-muted-foreground hover:text-destructive grid size-7 place-items-center rounded-md shadow-sm backdrop-blur"
                onClick={onClear}
                type="button"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
            {upload ? (
              <button
                className="bg-foreground text-background inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-sm transition hover:opacity-90 disabled:opacity-60"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                {uploading ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                ) : (
                  <UploadIcon className="size-3.5" />
                )}
                {image.assetId ? "Ganti" : "Unggah"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {editable ? (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          <select
            aria-label="Image aspect ratio"
            className="border-border bg-background h-8 rounded-md border px-2 text-xs"
            onChange={(event) =>
              onChange({
                ...image,
                aspect: event.target.value as CultureMedia["aspect"],
              })
            }
            value={image.aspect}
          >
            {cultureImageAspects.map((aspect) => (
              <option key={aspect} value={aspect}>
                Ratio: {aspect}
              </option>
            ))}
          </select>
          <select
            aria-label="Image fit"
            className="border-border bg-background h-8 rounded-md border px-2 text-xs"
            onChange={(event) =>
              onChange({
                ...image,
                fit: event.target.value as CultureMedia["fit"],
              })
            }
            value={image.fit}
          >
            {cultureImageFits.map((fit) => (
              <option key={fit} value={fit}>
                Fit: {fit}
              </option>
            ))}
          </select>
          <EditableBlockText
            ariaLabel="Image alternative text"
            className="text-muted-foreground w-full text-xs sm:col-span-2"
            editable
            onChange={(alt) => onChange({ ...image, alt })}
            placeholder="Alternative text"
            value={image.alt}
          />
          <EditableBlockText
            ariaLabel="Image caption"
            className="text-muted-foreground w-full text-center text-xs italic sm:col-span-2"
            editable
            onChange={(caption) => onChange({ ...image, caption })}
            placeholder="Optional caption"
            value={image.caption}
          />
        </div>
      ) : image.caption ? (
        <figcaption className="text-muted-foreground text-center text-xs italic">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SectionMedia({
  editable,
  images,
  stack,
  onChange,
}: {
  editable: boolean;
  images: CultureMedia[];
  stack: "row" | "column";
  onChange: (images: CultureMedia[]) => void;
}) {
  const visibleImages = editable
    ? images
    : images.filter((image) => image.assetId);
  if (visibleImages.length === 0) return null;

  return (
    <div
      className={`grid min-w-0 gap-4 ${stack === "row" && visibleImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
    >
      {visibleImages.map((image) => {
        const index = images.findIndex((item) => item.id === image.id);
        return (
          <CultureImage
            editable={editable}
            image={image}
            key={image.id}
            onChange={(nextImage) => {
              const next = [...images];
              next[index] = nextImage;
              onChange(next);
            }}
            onClear={() => {
              const next = [...images];
              next[index] = createCultureMedia(image.id);
              onChange(next);
            }}
          />
        );
      })}
    </div>
  );
}

const splitGridClasses = {
  "left-small": "sm:grid-cols-[minmax(10rem,1fr)_minmax(0,2fr)]",
  "left-medium": "sm:grid-cols-2",
  "left-large": "sm:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)]",
  "right-small": "sm:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)]",
  "right-medium": "sm:grid-cols-2",
  "right-large": "sm:grid-cols-[minmax(10rem,1fr)_minmax(0,2fr)]",
} as const;

function CultureSectionBody({
  editable,
  section,
  translationColor,
  onChange,
}: {
  editable: boolean;
  section: CultureSection;
  translationColor: string;
  onChange: (section: CultureSection) => void;
}) {
  if (section.type === "text") {
    return (
      <TextPair
        editable={editable}
        en={section.en}
        ko={section.ko}
        onChange={(text) => onChange({ ...section, ...text })}
        translationColor={translationColor}
      />
    );
  }

  if (section.type === "media") {
    return (
      <SectionMedia
        editable={editable}
        images={section.images}
        onChange={(images) => onChange({ ...section, images })}
        stack="row"
      />
    );
  }

  const gridKey = `${section.mediaSide}-${section.mediaWidth}` as const;
  const media = (
    <SectionMedia
      editable={editable}
      images={section.images}
      onChange={(images) => onChange({ ...section, images })}
      stack={section.mediaStack}
    />
  );
  const text = (
    <TextPair
      editable={editable}
      en={section.en}
      ko={section.ko}
      onChange={(nextText) => onChange({ ...section, ...nextText })}
      translationColor={translationColor}
    />
  );

  return (
    <div
      className={`grid min-w-0 items-start gap-5 sm:gap-6 ${splitGridClasses[gridKey]}`}
    >
      {section.mediaSide === "left" ? media : text}
      {section.mediaSide === "left" ? text : media}
    </div>
  );
}

function EditorSelect({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="border-border bg-background h-8 rounded-md border px-2 text-xs"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
      const sections = parseCultureSections(block.props.sections);
      const checklist = parseChecklist(block.props.checklistItems);
      const compact = block.props.spacing === "compact";

      const updateSections = (items: CultureSection[]) =>
        editor.updateBlock(block, {
          props: { sections: JSON.stringify(items) },
        });
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
            <div className="border-border bg-muted/40 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <PaletteIcon className="size-3.5" /> Culture block
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-1">
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
                <EditorSelect
                  ariaLabel="Header alignment"
                  onChange={(headerAlignment) =>
                    editor.updateBlock(block, {
                      props: {
                        headerAlignment:
                          headerAlignment as (typeof cultureBlockHeaderAlignments)[number],
                      },
                    })
                  }
                  options={cultureBlockHeaderAlignments.map((value) => ({
                    value,
                    label: `Title: ${value}`,
                  }))}
                  value={block.props.headerAlignment}
                />
                <EditorSelect
                  ariaLabel="Content spacing"
                  onChange={(spacing) =>
                    editor.updateBlock(block, {
                      props: {
                        spacing:
                          spacing as (typeof cultureBlockSpacings)[number],
                      },
                    })
                  }
                  options={cultureBlockSpacings.map((value) => ({
                    value,
                    label: `Spacing: ${value}`,
                  }))}
                  value={block.props.spacing}
                />
                <EditorSelect
                  ariaLabel="Content surface"
                  onChange={(surface) =>
                    editor.updateBlock(block, {
                      props: {
                        surface:
                          surface as (typeof cultureBlockSurfaces)[number],
                      },
                    })
                  }
                  options={cultureBlockSurfaces.map((value) => ({
                    value,
                    label: `Surface: ${value}`,
                  }))}
                  value={block.props.surface}
                />
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <input
                    checked={block.props.showBanner}
                    onChange={(event) =>
                      editor.updateBlock(block, {
                        props: { showBanner: event.target.checked },
                      })
                    }
                    type="checkbox"
                  />
                  Banner
                </label>
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <input
                    checked={block.props.showChecklist}
                    onChange={(event) =>
                      editor.updateBlock(block, {
                        props: { showChecklist: event.target.checked },
                      })
                    }
                    type="checkbox"
                  />
                  Assessment
                </label>
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

          {block.props.showBanner ? (
            <div className="mb-3 flex min-w-0 items-stretch">
              <span className="bg-foreground text-background grid min-h-11 w-12 shrink-0 place-items-center rounded-l-lg">
                <Building2Icon className="size-5" />
              </span>
              <div
                className="flex min-w-0 items-center rounded-r-lg px-4 py-2 text-white"
                style={{ backgroundColor: scheme.accent }}
              >
                <EditableBlockText
                  ariaLabel="Culture section label"
                  className="w-full text-sm font-semibold tracking-wide"
                  editable={editable}
                  onChange={(eyebrow) =>
                    editor.updateBlock(block, { props: { eyebrow } })
                  }
                  value={block.props.eyebrow}
                />
              </div>
            </div>
          ) : null}

          <div
            className={`min-w-0 ${block.props.surface === "card" ? "bg-muted/45 ring-foreground/10 overflow-hidden rounded-2xl ring-1" : "bg-transparent"}`}
          >
            <header
              className={`${compact ? "px-4 py-5 sm:px-6" : "px-5 py-8 sm:px-10 sm:py-10"} ${block.props.headerAlignment === "center" ? "text-center" : "text-left"}`}
            >
              {!block.props.showBanner ? (
                <EditableBlockText
                  ariaLabel="Culture section label"
                  className="text-muted-foreground mb-3 w-full text-xs font-semibold tracking-[0.14em] uppercase"
                  editable={editable}
                  onChange={(eyebrow) =>
                    editor.updateBlock(block, { props: { eyebrow } })
                  }
                  value={block.props.eyebrow}
                />
              ) : null}
              <EditableBlockText
                ariaLabel="Korean culture title"
                className="text-foreground w-full text-2xl leading-tight font-bold tracking-tight sm:text-3xl"
                editable={editable}
                onChange={(titleKo) =>
                  editor.updateBlock(block, { props: { titleKo } })
                }
                value={block.props.titleKo}
              />
              <div style={{ color: scheme.accent }}>
                <EditableBlockText
                  ariaLabel="English culture title"
                  className="mt-1 w-full text-sm font-semibold"
                  editable={editable}
                  onChange={(titleEn) =>
                    editor.updateBlock(block, { props: { titleEn } })
                  }
                  value={block.props.titleEn}
                />
              </div>
            </header>

            <div
              className={`grid min-w-0 ${compact ? "gap-4 px-4 pb-5 sm:px-6" : "gap-7 px-5 pb-8 sm:px-10 sm:pb-10"}`}
            >
              {sections.map((section, index) =>
                editable || sectionHasContent(section) ? (
                  <section
                    className={`group/section min-w-0 ${editable ? "ring-foreground/10 ring-dashed relative rounded-xl p-3 ring-1" : ""}`}
                    key={section.id}
                  >
                    {editable ? (
                      <div className="border-border bg-background/90 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-1.5 shadow-xs backdrop-blur">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <EditorSelect
                            ariaLabel={`Layout for section ${index + 1}`}
                            onChange={(preset) => {
                              const next = [...sections];
                              next[index] = convertSection(
                                section,
                                preset as CultureSectionPreset,
                              );
                              updateSections(next);
                            }}
                            options={cultureSectionPresets.map((value) => ({
                              value,
                              label: culturePresetLabels[value],
                            }))}
                            value={getSectionPreset(section)}
                          />
                          {section.type === "split" ? (
                            <>
                              <EditorSelect
                                ariaLabel={`Media side for section ${index + 1}`}
                                onChange={(mediaSide) => {
                                  const next = [...sections];
                                  next[index] = {
                                    ...section,
                                    mediaSide:
                                      mediaSide as typeof section.mediaSide,
                                  };
                                  updateSections(next);
                                }}
                                options={[
                                  { value: "left", label: "Media: left" },
                                  { value: "right", label: "Media: right" },
                                ]}
                                value={section.mediaSide}
                              />
                              <EditorSelect
                                ariaLabel={`Media width for section ${index + 1}`}
                                onChange={(mediaWidth) => {
                                  const next = [...sections];
                                  next[index] = {
                                    ...section,
                                    mediaWidth:
                                      mediaWidth as typeof section.mediaWidth,
                                  };
                                  updateSections(next);
                                }}
                                options={[
                                  { value: "small", label: "Width: small" },
                                  { value: "medium", label: "Width: medium" },
                                  { value: "large", label: "Width: large" },
                                ]}
                                value={section.mediaWidth}
                              />
                            </>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            aria-label={`Move section ${index + 1} up`}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...sections];
                              [next[index - 1], next[index]] = [
                                section,
                                next[index - 1]!,
                              ];
                              updateSections(next);
                            }}
                            type="button"
                          >
                            <ArrowUpIcon className="size-3.5" />
                          </button>
                          <button
                            aria-label={`Move section ${index + 1} down`}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={index === sections.length - 1}
                            onClick={() => {
                              const next = [...sections];
                              [next[index], next[index + 1]] = [
                                next[index + 1]!,
                                section,
                              ];
                              updateSections(next);
                            }}
                            type="button"
                          >
                            <ArrowDownIcon className="size-3.5" />
                          </button>
                          <button
                            aria-label={`Duplicate section ${index + 1}`}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={sections.length >= 20}
                            onClick={() => {
                              const next = [...sections];
                              next.splice(index + 1, 0, cloneSection(section));
                              updateSections(next);
                            }}
                            type="button"
                          >
                            <CopyIcon className="size-3.5" />
                          </button>
                          <button
                            aria-label={`Delete section ${index + 1}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md"
                            onClick={() =>
                              updateSections(
                                sections.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <CultureSectionBody
                      editable={editable}
                      onChange={(nextSection) => {
                        const next = [...sections];
                        next[index] = nextSection;
                        updateSections(next);
                      }}
                      section={section}
                      translationColor={scheme.translation}
                    />
                  </section>
                ) : null,
              )}

              {editable ? (
                <div className="border-border bg-background/50 rounded-xl border border-dashed p-3">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                    <LayoutGridIcon className="size-3.5" /> Add section
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {cultureSectionPresets.map((preset) => (
                      <button
                        className="border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground flex min-h-9 items-center gap-2 rounded-md border px-2.5 text-left text-xs transition disabled:opacity-40"
                        disabled={sections.length >= 20}
                        key={preset}
                        onClick={() =>
                          updateSections([
                            ...sections,
                            createCultureSection(
                              preset,
                              createId("culture-section"),
                            ),
                          ])
                        }
                        type="button"
                      >
                        {preset.startsWith("media") ||
                        preset.startsWith("split") ? (
                          <ImageIcon className="size-3.5" />
                        ) : (
                          <PlusIcon className="size-3.5" />
                        )}
                        {culturePresetLabels[preset]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {block.props.showChecklist ? (
            <section className="border-border mt-5 min-w-0 rounded-2xl border px-4 py-5 sm:px-6">
              <div className="mb-4 flex min-w-0 items-start gap-3">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: scheme.accent }}
                >
                  <ClipboardCheckIcon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <EditableBlockText
                    ariaLabel="Korean checklist title"
                    className="text-foreground w-auto text-sm font-semibold tracking-wide"
                    editable={editable}
                    onChange={(checklistTitleKo) =>
                      editor.updateBlock(block, { props: { checklistTitleKo } })
                    }
                    value={block.props.checklistTitleKo}
                  />
                  <span className="text-muted-foreground">·</span>
                  <EditableBlockText
                    ariaLabel="English checklist title"
                    className="text-muted-foreground w-auto text-xs font-semibold tracking-[0.14em] uppercase"
                    editable={editable}
                    onChange={(checklistTitleEn) =>
                      editor.updateBlock(block, { props: { checklistTitleEn } })
                    }
                    value={block.props.checklistTitleEn}
                  />
                </div>
              </div>

              <div className="ring-foreground/10 divide-border min-w-0 divide-y overflow-hidden rounded-lg ring-1">
                {checklist.map((item, index) => (
                  <div
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-3 py-3"
                    key={index}
                  >
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
                          ariaLabel={`Checklist English ${index + 1}`}
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
                    <div className="flex items-center gap-0.5 pt-1">
                      <span className="border-border bg-background grid size-5 place-items-center rounded border">
                        <CheckIcon className="size-3 opacity-0" />
                      </span>
                      {editable ? (
                        <>
                          <button
                            aria-label={`Move checklist item ${index + 1} up`}
                            className="text-muted-foreground hover:bg-muted grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...checklist];
                              [next[index - 1], next[index]] = [
                                item,
                                next[index - 1]!,
                              ];
                              updateChecklist(next);
                            }}
                            type="button"
                          >
                            <ArrowUpIcon className="size-3.5" />
                          </button>
                          <button
                            aria-label={`Move checklist item ${index + 1} down`}
                            className="text-muted-foreground hover:bg-muted grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={index === checklist.length - 1}
                            onClick={() => {
                              const next = [...checklist];
                              [next[index], next[index + 1]] = [
                                next[index + 1]!,
                                item,
                              ];
                              updateChecklist(next);
                            }}
                            type="button"
                          >
                            <ArrowDownIcon className="size-3.5" />
                          </button>
                          <button
                            aria-label={`Delete checklist item ${index + 1}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-7 place-items-center rounded-md disabled:opacity-30"
                            disabled={checklist.length === 1}
                            onClick={() =>
                              updateChecklist(
                                checklist.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </>
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
          ) : null}
        </article>
      );
    },
  },
)();
