import type {
  MaterialLinkSection,
  ResolvedMaterialLink,
} from "@hakgyo/shared/material-links";

export type MaterialLink = ResolvedMaterialLink;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSections(value: unknown): Record<string, MaterialLinkSection> {
  if (!isRecord(value)) return {};
  const sections: Record<string, MaterialLinkSection> = {};
  for (const [blockId, section] of Object.entries(value)) {
    if (
      isRecord(section) &&
      typeof section.title === "string" &&
      typeof section.excerpt === "string"
    ) {
      sections[blockId] = { title: section.title, excerpt: section.excerpt };
    }
  }
  return sections;
}

/**
 * The `materialLinks` of a course item detail, composed from the bundle or
 * returned by `learning.getCourseItem`. Tolerates details without the field
 * (older servers and cached results) and skips malformed entries.
 */
export function itemMaterialLinks(item: unknown): MaterialLink[] {
  const links = isRecord(item) ? item.materialLinks : undefined;
  if (!Array.isArray(links)) return [];
  return links.flatMap((link): MaterialLink[] => {
    if (
      !isRecord(link) ||
      typeof link.materialId !== "string" ||
      typeof link.courseId !== "string" ||
      typeof link.courseItemId !== "string" ||
      typeof link.title !== "string"
    ) {
      return [];
    }
    return [
      {
        materialId: link.materialId,
        courseId: link.courseId,
        courseItemId: link.courseItemId,
        title: link.title,
        description:
          typeof link.description === "string" ? link.description : null,
        sections: readSections(link.sections),
      },
    ];
  });
}

/** The link to `materialId`, the one in the current course first. */
export function findMaterialLink(
  links: MaterialLink[],
  materialId: string,
  currentCourseId?: string,
): MaterialLink | null {
  const matches = links.filter((link) => link.materialId === materialId);
  return (
    matches.find((link) => link.courseId === currentCourseId) ??
    matches[0] ??
    null
  );
}

export type MaterialLinkPreview = {
  /** The section title, or the material title for a whole-material link. */
  title: string;
  /** The material title above a section title. */
  materialTitle: string | null;
  /** The section's excerpt, or the material's description (or its start). */
  excerpt: string | null;
};

/** What the preview sheet shows for a link, with or without a section. */
export function materialLinkPreview(
  link: MaterialLink,
  anchor: string | null | undefined,
): MaterialLinkPreview {
  const section = anchor ? link.sections[anchor] : undefined;
  if (section) {
    return {
      title: section.title || link.title,
      materialTitle: section.title ? link.title : null,
      excerpt: section.excerpt || null,
    };
  }
  return {
    title: link.title,
    materialTitle: null,
    excerpt: link.description?.trim() || null,
  };
}
