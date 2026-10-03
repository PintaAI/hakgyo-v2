import {
  defaultTreeAdapter,
  parse,
  serialize,
  type DefaultTreeAdapterTypes,
} from "parse5";

import { MAX_LANDING_FIELD_LENGTH } from "~/lib/organization-landing";

type Node = DefaultTreeAdapterTypes.Node;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;
type Template = DefaultTreeAdapterTypes.Template;
type Document = DefaultTreeAdapterTypes.Document;

export const MAX_LANDING_HTML_BYTES = 500_000;
export const landingSlotNames = ["courses"] as const;
export const landingCourseFields = [
  "title",
  "description",
  "price",
  "image",
  "link",
] as const;

export const FONT_STYLESHEET_ORIGIN = "https://fonts.googleapis.com";
export const FONT_FILE_ORIGIN = "https://fonts.gstatic.com";

const EDIT = "data-hakgyo-edit";
const SLOT = "data-hakgyo-slot";
const FIELD = "data-hakgyo-field";
const editKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

/** What a landing document may link to and load, derived from the organization. */
export type LandingUrlPolicy = {
  appOrigin: string;
  /** Exact Hakgyo URLs (app origin or `hakgyo://`) that links may target. */
  links: readonly string[];
  /** Origins that images, media, and CSS `url()` may load from. */
  assetOrigins: readonly string[];
};

export type LandingIssue = { message: string; line?: number };
export type LandingValidation = {
  errors: LandingIssue[];
  warnings: LandingIssue[];
};
export type LandingField = { key: string; text: string };
export type LandingCourse = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number;
  currency: string;
  url: string;
};

const forbiddenElements = new Map([
  ["form", "Forms are not allowed; link to a Hakgyo URL instead"],
  ["input", "Inputs are not allowed; the page must not collect visitor data"],
  [
    "textarea",
    "Inputs are not allowed; the page must not collect visitor data",
  ],
  ["select", "Inputs are not allowed; the page must not collect visitor data"],
  ["iframe", "Embedded frames are not allowed"],
  ["frame", "Embedded frames are not allowed"],
  ["frameset", "Embedded frames are not allowed"],
  ["object", "Plugins are not allowed"],
  ["embed", "Plugins are not allowed"],
  ["applet", "Plugins are not allowed"],
  ["portal", "Portals are not allowed"],
  ["base", "<base> is managed by Hakgyo"],
]);

const scriptTypes = new Set([
  "",
  "text/javascript",
  "module",
  "application/ld+json",
]);

const forbiddenScriptPatterns: Array<[RegExp, string]> = [
  [/\beval\s*\(/, "eval()"],
  [/\bnew\s+Function\b/, "new Function()"],
  [/\bdocument\.cookie\b/, "document.cookie"],
  [/\bdocument\.write(?:ln)?\s*\(/, "document.write()"],
  [/\b(?:localStorage|sessionStorage|indexedDB)\b/, "browser storage"],
  [
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|\bsendBeacon\b/,
    "network requests",
  ],
  [/\bimport\s*\(/, "dynamic import()"],
  [/(?<![\w$.])(?:window\.)?(?:top|parent|opener)\s*\./, "parent windows"],
  [
    /\blocation\s*(?:\.\s*href\s*)?=(?!=)|\blocation\.(?:assign|replace)\s*\(/,
    "script redirects",
  ],
];

function attr(element: Element, name: string) {
  return element.attrs.find((attribute) => attribute.name === name)?.value;
}

function setAttr(element: Element, name: string, value: string) {
  const existing = element.attrs.find((attribute) => attribute.name === name);
  if (existing) existing.value = value;
  else element.attrs.push({ name, value });
}

function isElement(node: Node): node is Element {
  return defaultTreeAdapter.isElementNode(node);
}

function isTemplate(element: Element): element is Template {
  return element.tagName === "template";
}

function children(node: Node): ChildNode[] {
  if (isElement(node) && isTemplate(node)) return node.content.childNodes;
  return "childNodes" in node ? node.childNodes : [];
}

/** Depth-first walk that also enters `<template>` content. */
function walk(
  node: Node,
  visit: (node: Node, insideTemplate: boolean) => void,
  insideTemplate = false,
) {
  visit(node, insideTemplate);
  const nested = insideTemplate || (isElement(node) && isTemplate(node));
  for (const child of children(node)) walk(child, visit, nested);
}

function elements(root: Node) {
  const found: Array<{ element: Element; insideTemplate: boolean }> = [];
  walk(root, (node, insideTemplate) => {
    if (isElement(node)) found.push({ element: node, insideTemplate });
  });
  return found;
}

function textContent(node: Node): string {
  if (defaultTreeAdapter.isTextNode(node)) return node.value;
  return children(node).map(textContent).join("");
}

function replaceText(element: Element, text: string) {
  for (const child of [...children(element)])
    defaultTreeAdapter.detachNode(child);
  defaultTreeAdapter.insertText(element, text);
}

function lineOf(node: Node) {
  return node.sourceCodeLocation?.startLine;
}

function parseDocument(html: string, withLocations = false): Document {
  return parse(html, { sourceCodeLocationInfo: withLocations });
}

function findElement(root: Node, tagName: string) {
  return elements(root).find(({ element }) => element.tagName === tagName)
    ?.element;
}

function isEditableValueElement(element: Element) {
  return element.tagName === "meta";
}

function fieldValue(element: Element) {
  return isEditableValueElement(element)
    ? (attr(element, "content") ?? "")
    : textContent(element);
}

export function validateLandingHtml(
  html: string,
  policy: LandingUrlPolicy,
): LandingValidation {
  const errors: LandingIssue[] = [];
  const warnings: LandingIssue[] = [];
  const size = new TextEncoder().encode(html).length;
  if (size > MAX_LANDING_HTML_BYTES) {
    return {
      errors: [
        {
          message: `The document is ${size} bytes; the limit is ${MAX_LANDING_HTML_BYTES} bytes`,
        },
      ],
      warnings,
    };
  }

  const document = parseDocument(html, true);
  const all = elements(document);
  const ids = new Set(all.flatMap(({ element }) => attr(element, "id") ?? []));
  const allowedLinks = new Set(policy.links.map(normalizeLink));
  const assetOrigins = new Set(policy.assetOrigins);
  const externalLinks = new Set<string>();
  const editKeys = new Set<string>();

  const error = (message: string, node?: Node) =>
    errors.push({ message, line: node && lineOf(node) });

  if (
    !document.childNodes.some((node) =>
      defaultTreeAdapter.isDocumentTypeNode(node),
    )
  )
    error("Start the document with <!doctype html>");

  function checkAsset(value: string, node: Node, label: string) {
    const url = value.trim();
    if (/^data:image\//i.test(url)) return;
    const parsed = parseAbsoluteUrl(url);
    if (parsed?.protocol !== "https:") {
      error(`${label} "${url}" must be an https:// URL`, node);
      return;
    }
    if (!assetOrigins.has(parsed.origin))
      error(
        `${label} "${url}" is not from an allowed origin (${[...assetOrigins].join(", ")}). Use an uploaded image URL from get_landing_page_context`,
        node,
      );
  }

  function checkCss(css: string, node: Node) {
    const imports = /@import\s+(?:url\()?\s*['"]?([^'")\s;]+)[^;]*;?/gi;
    for (const match of css.matchAll(imports)) {
      if (!match[1]!.startsWith(`${FONT_STYLESHEET_ORIGIN}/`))
        error(`@import is only allowed for ${FONT_STYLESHEET_ORIGIN}`, node);
    }
    const rules = css.replace(imports, "");
    for (const match of rules.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      const url = match[2]!.trim();
      if (!url || url.startsWith("#") || /^data:/i.test(url)) continue;
      if (url.startsWith(`${FONT_FILE_ORIGIN}/`)) continue;
      checkAsset(url, node, "CSS url()");
    }
  }

  function checkLink(value: string, node: Node) {
    const href = value.trim();
    if (!href || href === "#") {
      error('Links need a real destination; use a <button> for "#"', node);
      return;
    }
    if (href.startsWith("#")) {
      if (href !== "#top" && !ids.has(decodeURIComponent(href.slice(1))))
        error(`Link "${href}" points to a missing id`, node);
      return;
    }
    if (/^(?:mailto|tel):/i.test(href)) return;
    const parsed = parseAbsoluteUrl(href);
    if (!parsed) {
      error(
        `Link "${href}" must be an absolute URL from get_landing_page_context`,
        node,
      );
      return;
    }
    const isHakgyo =
      parsed.protocol === "hakgyo:" || parsed.origin === policy.appOrigin;
    if (isHakgyo) {
      if (!allowedLinks.has(normalizeLink(href)))
        error(
          `Link "${href}" is not a Hakgyo URL from get_landing_page_context`,
          node,
        );
      return;
    }
    if (parsed.protocol !== "https:") {
      error(`Link "${href}" must use https://`, node);
      return;
    }
    externalLinks.add(parsed.href);
  }

  for (const { element, insideTemplate } of all) {
    const tag = element.tagName;
    const forbidden = forbiddenElements.get(tag);
    if (forbidden) error(`<${tag}>: ${forbidden}`, element);

    if (tag === "script") {
      const type = (attr(element, "type") ?? "").trim().toLowerCase();
      if (attr(element, "src") !== undefined)
        error("External scripts are not allowed; inline the script", element);
      if (!scriptTypes.has(type))
        error(`Script type "${type}" is not allowed`, element);
      if (type !== "application/ld+json") {
        const source = textContent(element);
        for (const [pattern, label] of forbiddenScriptPatterns)
          if (pattern.test(source))
            error(`Scripts must not use ${label}`, element);
      }
    }
    if (tag === "style") checkCss(textContent(element), element);
    if (tag === "link") {
      const rel = (attr(element, "rel") ?? "").toLowerCase().split(/\s+/);
      const href = attr(element, "href") ?? "";
      if (rel.includes("icon") || rel.includes("apple-touch-icon"))
        checkAsset(href, element, "Icon");
      else if (
        rel.every((value) =>
          ["stylesheet", "preconnect", "dns-prefetch"].includes(value),
        )
      ) {
        const origin = parseAbsoluteUrl(href)?.origin;
        if (origin !== FONT_STYLESHEET_ORIGIN && origin !== FONT_FILE_ORIGIN)
          error(
            `<link> may only load fonts from ${FONT_STYLESHEET_ORIGIN}`,
            element,
          );
      } else error(`<link rel="${rel.join(" ")}"> is not allowed`, element);
    }
    if (tag === "meta") {
      if (attr(element, "http-equiv") !== undefined)
        error("<meta http-equiv> is not allowed", element);
      const key = attr(element, "property") ?? attr(element, "name") ?? "";
      if (key.endsWith(":image"))
        checkAsset(attr(element, "content") ?? "", element, key);
    }

    for (const { name, value } of element.attrs) {
      if (name === "style") checkCss(value, element);
      else if (name === "action" || name === "formaction")
        error(`The ${name} attribute is not allowed`, element);
      else if (name === "href" && (tag === "a" || tag === "area"))
        checkLink(value, element);
      else if ((name === "href" || name === "xlink:href") && tag !== "link") {
        if (!value.trim().startsWith("#"))
          checkAsset(value, element, "SVG reference");
      } else if ((name === "src" && tag !== "script") || name === "poster")
        checkAsset(value, element, `<${tag} ${name}>`);
      else if (name === "srcset")
        for (const candidate of value.split(",")) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) checkAsset(url, element, `<${tag} srcset>`);
        }
    }

    const editKey = attr(element, EDIT);
    if (editKey !== undefined) {
      if (insideTemplate)
        error(`${EDIT} cannot be used inside a slot template`, element);
      else if (!editKeyPattern.test(editKey))
        error(
          `${EDIT}="${editKey}" must be lowercase words joined by "." or "-", e.g. hero.title`,
          element,
        );
      else if (editKeys.has(editKey))
        error(`${EDIT}="${editKey}" is used more than once`, element);
      else {
        editKeys.add(editKey);
        if (
          !isEditableValueElement(element) &&
          children(element).some(isElement)
        )
          error(
            `${EDIT}="${editKey}" must contain only text; move nested elements outside it`,
            element,
          );
        if (fieldValue(element).length > MAX_LANDING_FIELD_LENGTH)
          error(
            `${EDIT}="${editKey}" is longer than ${MAX_LANDING_FIELD_LENGTH} characters`,
            element,
          );
      }
    }

    const slot = attr(element, SLOT);
    if (slot !== undefined) {
      if (!(landingSlotNames as readonly string[]).includes(slot))
        error(
          `Unknown slot "${slot}"; supported: ${landingSlotNames.join(", ")}`,
          element,
        );
      const templates = children(element).filter(
        (child): child is Template => isElement(child) && isTemplate(child),
      );
      if (templates.length !== 1)
        error(
          `Slot "${slot}" must contain exactly one <template> card`,
          element,
        );
      else validateSlotTemplate(templates[0]!, error);
    }

    const field = attr(element, FIELD);
    if (field !== undefined && !insideTemplate)
      error(`${FIELD} is only allowed inside a slot <template>`, element);
  }

  const htmlElement = findElement(document, "html");
  if (!htmlElement || !attr(htmlElement, "lang")?.trim())
    error('Add a lang attribute to <html>, e.g. <html lang="id">');
  const head = htmlElement && findElement(htmlElement, "head");
  const metas = head ? elements(head).map(({ element }) => element) : [];
  if (
    !metas.some(
      (element) =>
        element.tagName === "meta" && attr(element, "name") === "viewport",
    )
  )
    error(
      'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  const title = metas.find((element) => element.tagName === "title");
  if (!title || !textContent(title).trim()) error("Add a non-empty <title>");
  if (
    !metas.some(
      (element) =>
        element.tagName === "meta" &&
        attr(element, "name") === "description" &&
        attr(element, "content")?.trim(),
    )
  )
    error('Add <meta name="description" content="…">');
  if (editKeys.size === 0)
    error(`Mark the page copy with ${EDIT} so the owner can edit it`);

  for (const url of externalLinks)
    warnings.push({
      message: `External link ${url} is not verified by Hakgyo; confirm it with the owner`,
    });

  return { errors, warnings };
}

function validateSlotTemplate(
  template: Template,
  error: (message: string, node?: Node) => void,
) {
  const seen = new Set<string>();
  for (const { element } of elements(template.content)) {
    const field = attr(element, FIELD);
    if (field === undefined) continue;
    if (!(landingCourseFields as readonly string[]).includes(field)) {
      error(
        `Unknown ${FIELD}="${field}"; supported: ${landingCourseFields.join(", ")}`,
        element,
      );
      continue;
    }
    seen.add(field);
    if (field === "image" && element.tagName !== "img")
      error(`${FIELD}="image" must be on an <img>`, element);
    if (field === "link" && element.tagName !== "a")
      error(`${FIELD}="link" must be on an <a>`, element);
  }
  if (!seen.has("title"))
    error(
      `The course card <template> needs a ${FIELD}="title" element`,
      template,
    );
  if (!seen.has("link"))
    error(`The course card <template> needs a ${FIELD}="link" <a>`, template);
}

function parseAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.username || url.password ? null : url;
  } catch {
    return null;
  }
}

/** Allowlisted Hakgyo links match on origin and path; query and hash are ignored. */
function normalizeLink(value: string) {
  const url = parseAbsoluteUrl(value.trim());
  if (!url) return value.trim();
  if (url.protocol === "hakgyo:")
    return `hakgyo:${url.pathname}`.replace(/\/$/, "");
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

/** Owner-editable copy, in document order. */
export function extractLandingFields(html: string): LandingField[] {
  return elements(parseDocument(html)).flatMap(
    ({ element, insideTemplate }) => {
      const key = attr(element, EDIT);
      return key && !insideTemplate ? [{ key, text: fieldValue(element) }] : [];
    },
  );
}

/** Replaces the text of marked elements; the markup itself never changes. */
export function applyLandingCopy(html: string, copy: Record<string, string>) {
  const document = parseDocument(html);
  const remaining = new Set(Object.keys(copy));
  for (const { element, insideTemplate } of elements(document)) {
    const key = attr(element, EDIT);
    if (!key || insideTemplate || !(key in copy)) continue;
    remaining.delete(key);
    const text = copy[key]!;
    if (isEditableValueElement(element)) setAttr(element, "content", text);
    else replaceText(element, text);
  }
  if (remaining.size)
    throw new Error(`Unknown copy fields: ${[...remaining].join(", ")}`);
  return serialize(document);
}

export function extractLandingMetadata(html: string) {
  const head = findElement(parseDocument(html), "head");
  const metas = head ? elements(head).map(({ element }) => element) : [];
  const meta = (key: "name" | "property", value: string) =>
    metas.find(
      (element) => element.tagName === "meta" && attr(element, key) === value,
    );
  const content = (element?: Element) =>
    (element && attr(element, "content")?.trim()) ?? "";
  const title = metas.find((element) => element.tagName === "title");
  return {
    title: title ? textContent(title).trim() : "",
    description: content(meta("name", "description")),
    image: content(meta("property", "og:image")) || null,
  };
}

export function formatLandingPrice(price: number, currency: string) {
  if (!price) return "Gratis";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function cloneNode(node: Node): ChildNode | null {
  if (defaultTreeAdapter.isTextNode(node))
    return defaultTreeAdapter.createTextNode(node.value);
  if (!isElement(node)) return null;
  const copy = defaultTreeAdapter.createElement(
    node.tagName,
    node.namespaceURI,
    node.attrs.map((attribute) => ({ ...attribute })),
  );
  for (const child of children(node)) {
    const cloned = cloneNode(child);
    if (!cloned) continue;
    if (isTemplate(copy)) defaultTreeAdapter.appendChild(copy.content, cloned);
    else defaultTreeAdapter.appendChild(copy, cloned);
  }
  return copy;
}

function renderCourseCard(template: Template, course: LandingCourse) {
  const card: ChildNode[] = template.content.childNodes.flatMap(
    (child) => cloneNode(child) ?? [],
  );
  for (const root of card)
    for (const { element } of elements(root)) {
      const field = attr(element, FIELD);
      if (field === "title") replaceText(element, course.title);
      else if (field === "price")
        replaceText(element, formatLandingPrice(course.price, course.currency));
      else if (field === "description") {
        if (course.description) replaceText(element, course.description);
        else defaultTreeAdapter.detachNode(element);
      } else if (field === "image") {
        if (course.thumbnailUrl) {
          setAttr(element, "src", course.thumbnailUrl);
          if (!attr(element, "alt")) setAttr(element, "alt", course.title);
        } else defaultTreeAdapter.detachNode(element);
      } else if (field === "link") setAttr(element, "href", course.url);
    }
  return card;
}

/**
 * Produces the served document: fills course slots from live data and makes
 * links navigate the top window out of the sandboxed frame.
 */
export function renderLandingDocument(
  html: string,
  { courses }: { courses: readonly LandingCourse[] },
) {
  const document = parseDocument(html);
  for (const { element, insideTemplate } of elements(document)) {
    if (insideTemplate || attr(element, SLOT) !== "courses") continue;
    const template = children(element).find(
      (child): child is Template => isElement(child) && isTemplate(child),
    );
    if (!template) continue;
    for (const child of [...children(element)])
      defaultTreeAdapter.detachNode(child);
    for (const course of courses)
      for (const node of renderCourseCard(template, course))
        defaultTreeAdapter.appendChild(element, node);
    setAttr(element, "data-hakgyo-count", String(courses.length));
  }
  const head = findElement(document, "head");
  if (head) {
    const base = defaultTreeAdapter.createElement("base", head.namespaceURI, [
      { name: "target", value: "_top" },
    ]);
    const first = head.childNodes[0];
    if (first) defaultTreeAdapter.insertBefore(head, base, first);
    else defaultTreeAdapter.appendChild(head, base);
  }
  return serialize(document);
}
