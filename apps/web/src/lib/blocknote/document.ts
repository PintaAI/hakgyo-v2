import type { HakgyoPartialBlock } from "~/components/editor/block-note-schema";

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(plainText).filter(Boolean).join(" ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.text !== undefined) return plainText(record.text);
    if (record.content !== undefined) return plainText(record.content);
    return Object.values(record).map(plainText).filter(Boolean).join(" ");
  }
  return "";
}

export function getBlockNotePlainText(value: unknown): string {
  if (!Array.isArray(value)) return plainText(value).trim();

  return value
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      const record = block as Record<string, unknown>;
      return [plainText(record.content), getBlockNotePlainText(record.children)]
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toBlockNoteDocument(value: unknown): HakgyoPartialBlock[] {
  if (
    Array.isArray(value) &&
    value.every(
      (block) =>
        block &&
        typeof block === "object" &&
        typeof (block as { type?: unknown }).type === "string",
    )
  ) {
    return value as HakgyoPartialBlock[];
  }

  return [{ type: "paragraph", content: plainText(value) }];
}

export function hasBlockNoteContent(value: unknown): boolean {
  if (!Array.isArray(value)) return plainText(value).trim().length > 0;
  return value.some((block) => {
    if (!block || typeof block !== "object") return false;
    const record = block as Record<string, unknown>;
    const props = record.props as Record<string, unknown> | undefined;
    if (typeof props?.assetId === "string" && props.assetId) return true;
    return (
      plainText(record.content).trim().length > 0 ||
      hasBlockNoteContent(record.children)
    );
  });
}
