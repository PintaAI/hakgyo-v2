/**
 * Every interactive UI preview a guide page can embed with
 * `<doc-preview name="..."></doc-preview>`. Kept free of component imports so
 * tests and the Markdown loader can check names without loading the app UI.
 */
export const docPreviewNames = [
  "latihan-tryout-daftar",
  "latihan-tryout-buat",
  "review-penilaian",
  "xp-streak",
] as const;

export type DocPreviewName = (typeof docPreviewNames)[number];

export function isDocPreviewName(value: string): value is DocPreviewName {
  return docPreviewNames.some((name) => name === value);
}

export const docPreviewMessageType = "hakgyo:doc-preview-height";

export function docPreviewHref(
  name: DocPreviewName,
  device: "desktop" | "mobile",
) {
  return `/docs/pratinjau/${name}?perangkat=${device}`;
}
