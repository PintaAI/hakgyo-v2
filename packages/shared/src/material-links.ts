/**
 * Links from one material to another. A material link is an ordinary BlockNote
 * `link` inline node whose href is `hakgyo-material:<materialId>`, optionally
 * followed by `#<blockId>` to point at a section (usually a heading) inside the
 * target. Clients that do not know the scheme still show the link text.
 */
export const MATERIAL_LINK_PREFIX = "hakgyo-material:";

export type MaterialLinkTarget = {
  materialId: string;
  /** Block id inside the target material, or null for the whole material. */
  anchor: string | null;
};

/** A link target the viewer can open, resolved by the server or the bundle. */
export type ResolvedMaterialLink = {
  materialId: string;
  courseId: string;
  courseItemId: string;
  title: string;
  description: string | null;
  /** Preview of each linked section of the target, keyed by block id. */
  sections: Record<string, MaterialLinkSection>;
};

export type MaterialLinkSection = {
  title: string;
  excerpt: string;
};

export type MaterialHeading = {
  id: string;
  level: number;
  text: string;
};

const EXCERPT_LIMIT = 320;

export function formatMaterialLinkHref(target: MaterialLinkTarget): string {
  return `${MATERIAL_LINK_PREFIX}${target.materialId}${
    target.anchor ? `#${target.anchor}` : ""
  }`;
}

export function parseMaterialLinkHref(
  href: unknown,
): MaterialLinkTarget | null {
  if (typeof href !== "string" || !href.startsWith(MATERIAL_LINK_PREFIX)) {
    return null;
  }
  const rest = href.slice(MATERIAL_LINK_PREFIX.length);
  const hashIndex = rest.indexOf("#");
  const materialId = hashIndex === -1 ? rest : rest.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : rest.slice(hashIndex + 1);
  if (!materialId) return null;
  return { materialId, anchor: anchor || null };
}

/** Every material link in rich content, in first-seen order, without duplicates. */
export function collectMaterialLinkTargets(
  content: unknown,
): MaterialLinkTarget[] {
  const seen = new Map<string, MaterialLinkTarget>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.type === "link") {
      const target = parseMaterialLinkHref(node.href);
      if (target) seen.set(formatMaterialLinkHref(target), target);
    }
    for (const child of Object.values(node)) {
      if (child && typeof child === "object") visit(child);
    }
  };
  visit(content);
  return [...seen.values()];
}

/** Ids of every material linked from rich content. */
export function collectMaterialLinkIds(content: unknown): string[] {
  return [
    ...new Set(
      collectMaterialLinkTargets(content).map((target) => target.materialId),
    ),
  ];
}

type Block = {
  id?: unknown;
  type?: unknown;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown;
};

function asBlocks(content: unknown): Block[] {
  return Array.isArray(content)
    ? content.filter(
        (block): block is Block => !!block && typeof block === "object",
      )
    : [];
}

function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(inlineText).join("");
  if (!content || typeof content !== "object") return "";
  const node = content as Record<string, unknown>;
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (node.type === "link") return inlineText(node.content);
  if (node.type === "tableContent" && Array.isArray(node.rows)) {
    return node.rows
      .map((row) =>
        row && typeof row === "object" && Array.isArray(row.cells)
          ? (row.cells as unknown[])
              .map((cell) =>
                cell && typeof cell === "object" && "content" in cell
                  ? inlineText((cell as { content: unknown }).content)
                  : inlineText(cell),
              )
              .join(" · ")
          : "",
      )
      .join("\n");
  }
  return "";
}

/** The non-empty strings among `parts`, trimmed. */
function strings(parts: unknown[]): string[] {
  return parts
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The objects of a JSON-array string prop (custom blocks store lists that way). */
function jsonRecords(value: unknown): Record<string, unknown>[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && !Array.isArray(item),
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Readable text of one block. Custom blocks keep their text in props: grammar (title and explanation),
 * conversation (each line as `speaker: Korean — translation`), culture (titles and text paragraphs) and
 * lessonPage (title and subtitle).
 */
function blockText(block: Block): string {
  const props = block.props;
  if (props && block.type === "grammar") {
    return strings([props.title, props.descriptionTranslation]).join(" — ");
  }
  if (props && block.type === "conversation") {
    return jsonRecords(props.lines)
      .map((line) => {
        const speech = strings([line.korean, line.translation]).join(" — ");
        const [speaker] = strings([line.speaker]);
        return speech && speaker ? `${speaker}: ${speech}` : speech;
      })
      .filter(Boolean)
      .join(" ");
  }
  if (props && block.type === "culture") {
    const title = strings([props.titleKo, props.titleEn]).join(" — ");
    const paragraphs = jsonRecords(props.sections).flatMap((section) =>
      section.type === "text" || section.type === "split"
        ? strings([section.ko, section.en])
        : [],
    );
    return [title, ...paragraphs].filter(Boolean).join(" ");
  }
  if (props && block.type === "lessonPage") {
    return strings([props.title, props.subtitle]).join(" — ");
  }
  return inlineText(block.content).trim();
}

function headingLevel(block: Block): number | null {
  if (block.type !== "heading") return null;
  const level = Number(block.props?.level ?? 1);
  return Number.isFinite(level) ? level : 1;
}

/** Top-level headings with their block ids, for picking a link section. */
export function listMaterialHeadings(content: unknown): MaterialHeading[] {
  return asBlocks(content).flatMap((block) => {
    const level = headingLevel(block);
    const text = blockText(block);
    return level !== null && typeof block.id === "string" && text
      ? [{ id: block.id, level, text }]
      : [];
  });
}

function truncate(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > EXCERPT_LIMIT
    ? `${compact.slice(0, EXCERPT_LIMIT - 1).trimEnd()}…`
    : compact;
}

/**
 * The title and a short excerpt of the section that starts at `anchor`: the
 * anchored block, then following blocks up to the next heading of the same or
 * a higher level. Null when no top-level block has that id.
 */
export function materialLinkSection(
  content: unknown,
  anchor: string,
): MaterialLinkSection | null {
  const blocks = asBlocks(content);
  const start = blocks.findIndex((block) => block.id === anchor);
  if (start === -1) return null;
  const anchorBlock = blocks[start]!;
  const level = headingLevel(anchorBlock);
  const parts: string[] = [];
  for (const block of blocks.slice(start + 1)) {
    const nextLevel = headingLevel(block);
    if (level !== null && nextLevel !== null && nextLevel <= level) break;
    const text = blockText(block);
    if (text) parts.push(text);
    if (parts.join(" ").length > EXCERPT_LIMIT) break;
  }
  return {
    title: blockText(anchorBlock),
    excerpt: truncate(parts.join(" ")),
  };
}

/** Section previews for every anchor in `anchors` that exists in `content`. */
export function materialLinkSections(
  content: unknown,
  anchors: Iterable<string>,
): Record<string, MaterialLinkSection> {
  const sections: Record<string, MaterialLinkSection> = {};
  for (const anchor of anchors) {
    const section = materialLinkSection(content, anchor);
    if (section) sections[anchor] = section;
  }
  return sections;
}

/** A plain-text excerpt of the start of a material, for whole-material links. */
export function materialExcerpt(content: unknown): string {
  return truncate(
    asBlocks(content)
      .map(blockText)
      .filter(Boolean)
      .join(" ")
      .slice(0, EXCERPT_LIMIT * 2),
  );
}
