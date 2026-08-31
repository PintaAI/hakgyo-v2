import type {
  ContentBlock,
  InlineLinkNode,
  InlineNode,
  InlineTextNode,
} from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringProp(
  props: Record<string, unknown>,
  name: string,
  fallback = "",
) {
  return typeof props[name] === "string" ? props[name] : fallback;
}

export function booleanProp(
  props: Record<string, unknown>,
  name: string,
  fallback = false,
) {
  return typeof props[name] === "boolean" ? props[name] : fallback;
}

function normalizeStyles(value: unknown): Record<string, boolean | string> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean | string] =>
        typeof entry[1] === "boolean" || typeof entry[1] === "string",
    ),
  );
}

function normalizeTextNode(value: unknown): InlineTextNode | null {
  if (!isRecord(value) || value.type !== "text") return null;

  return {
    type: "text",
    text: typeof value.text === "string" ? value.text : "",
    styles: normalizeStyles(value.styles),
  };
}

function normalizeLinkNode(value: unknown): InlineLinkNode | null {
  if (!isRecord(value) || value.type !== "link") return null;

  return {
    type: "link",
    href: typeof value.href === "string" ? value.href : "",
    content: Array.isArray(value.content)
      ? value.content
          .map(normalizeTextNode)
          .filter((node): node is InlineTextNode => node !== null)
      : [],
  };
}

export function normalizeInlineContent(value: unknown): InlineNode[] {
  if (typeof value === "string") {
    return [{ type: "text", text: value, styles: {} }];
  }
  if (!Array.isArray(value)) return [];

  const nodes: InlineNode[] = [];
  for (const node of value) {
    const text = normalizeTextNode(node);
    if (text) {
      nodes.push(text);
      continue;
    }
    const link = normalizeLinkNode(node);
    if (link) nodes.push(link);
  }

  return nodes;
}

function normalizeBlock(value: unknown): ContentBlock | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  return {
    type: value.type,
    ...(typeof value.id === "string" ? { id: value.id } : {}),
    props: isRecord(value.props) ? value.props : {},
    content: value.content,
    children: Array.isArray(value.children)
      ? value.children
          .map(normalizeBlock)
          .filter((child): child is ContentBlock => child !== null)
      : [],
  };
}

export function normalizeContent(value: unknown): ContentBlock[] {
  if (Array.isArray(value)) {
    return value
      .map(normalizeBlock)
      .filter((block): block is ContentBlock => block !== null);
  }

  if (typeof value === "string" && value.trim()) {
    return [{ type: "paragraph", props: {}, content: value, children: [] }];
  }

  return [];
}

export function parseJsonArray<T>(
  value: unknown,
  mapItem: (value: Record<string, unknown>) => T,
): T[] {
  if (typeof value !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecord).map(mapItem).slice(0, 100);
  } catch {
    return [];
  }
}

export function inlinePlainText(value: unknown) {
  return normalizeInlineContent(value)
    .map((node) =>
      node.type === "text"
        ? node.text
        : node.content.map((child) => child.text).join(""),
    )
    .join("");
}
