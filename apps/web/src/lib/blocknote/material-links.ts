import {
  MATERIAL_LINK_PREFIX,
  parseMaterialLinkHref,
} from "@hakgyo/shared/material-links";

// BlockNote's default link allowlist (`isAllowedUri`, not exported by the
// package): known protocols, relative URLs and bare hosts.
const allowedUriPattern =
  /^(?:(?:http|https|ftp|ftps|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z0-9+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * BlockNote `links.isValidLink`: the default allowlist plus material links.
 * Without it BlockNote renders `hakgyo-material:` links with an empty href.
 */
export function isValidEditorLink(href: string) {
  return (
    !href ||
    href.startsWith(MATERIAL_LINK_PREFIX) ||
    allowedUriPattern.test(href.replace(/\s/g, ""))
  );
}

/** Whether a rendered `<a>` is a material link (its raw href, not the resolved URL). */
export function isMaterialLinkElement(element: Element) {
  return (
    element.getAttribute("href")?.startsWith(MATERIAL_LINK_PREFIX) ?? false
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns a copy of a document in which material links (`hakgyo-material:`
 * hrefs) whose target is not in `validMaterialIds` become their plain text.
 * Web links and every other node are kept as they are.
 */
export function unlinkInvalidMaterialLinks<T>(
  document: T,
  validMaterialIds: ReadonlySet<string>,
): T {
  const isInvalidLink = (value: unknown): value is Record<string, unknown> => {
    if (!isRecord(value) || value.type !== "link") return false;
    const target = parseMaterialLinkHref(value.href);
    return !!target && !validMaterialIds.has(target.materialId);
  };

  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.flatMap((entry) => {
        if (!isInvalidLink(entry)) return [visit(entry)];
        // A link holds styled text; keep that text in the link's place.
        if (typeof entry.content === "string") {
          return [{ type: "text", text: entry.content, styles: {} }];
        }
        return Array.isArray(entry.content) ? entry.content.map(visit) : [];
      });
    }
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, visit(entry)]),
      );
    }
    return value;
  };

  return visit(document) as T;
}
