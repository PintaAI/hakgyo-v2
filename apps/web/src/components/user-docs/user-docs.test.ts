import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { docPreviewNames } from "~/components/user-doc-previews/names";
import { userDocAudiences } from "~/lib/user-doc-audiences";
import { getDocHeadings } from "~/lib/user-doc-headings";

const fileNamePattern = /^(\d+)-\[([A-Za-z][A-Za-z0-9]*)\]-([a-z0-9-]+)\.md$/;

const docs = userDocAudiences.flatMap(({ id }) => {
  const directory = path.join(import.meta.dir, id);
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => ({
      audience: id,
      fileName,
      content: readFileSync(path.join(directory, fileName), "utf8"),
    }));
});

const slugs = new Set(
  docs.map(
    ({ audience, fileName }) =>
      `${audience}/${fileNamePattern.exec(fileName)?.[3] ?? ""}`,
  ),
);

describe("user guide files", () => {
  test("every audience has pages", () => {
    for (const { id } of userDocAudiences) {
      expect(docs.some((doc) => doc.audience === id)).toBe(true);
    }
  });

  test.each(docs.map((doc) => [`${doc.audience}/${doc.fileName}`, doc]))(
    "%s follows the guide format",
    (_name, doc) => {
      expect(doc.fileName).toMatch(fileNamePattern);
      // One H1 title on the first line, then real content.
      expect(doc.content.split("\n")[0]).toMatch(/^# \S/);
      expect(doc.content.match(/^# /gm)).toHaveLength(1);
      expect(getDocHeadings(doc.content).length).toBeGreaterThanOrEqual(2);
    },
  );

  test("guide links point to existing guide pages", () => {
    for (const doc of docs) {
      for (const [, target] of doc.content.matchAll(
        /\]\(\/docs\/([a-z]+\/[a-z0-9-]+)(?:#[^)]*)?\)/g,
      )) {
        expect({
          from: doc.fileName,
          target,
          exists: slugs.has(target ?? ""),
        }).toEqual({ from: doc.fileName, target, exists: true });
      }
    }
  });

  test("in-page links point to headings on the same page", () => {
    for (const doc of docs) {
      const ids = new Set(getDocHeadings(doc.content).map(({ id }) => id));
      for (const [, anchor] of doc.content.matchAll(/\]\(#([^)]+)\)/g)) {
        expect({
          from: doc.fileName,
          anchor,
          exists: ids.has(anchor ?? ""),
        }).toEqual({ from: doc.fileName, anchor, exists: true });
      }
    }
  });

  test("UI previews are registered and every preview is used", () => {
    const used = new Set<string>();
    for (const doc of docs) {
      for (const [, name] of doc.content.matchAll(
        /<doc-preview\s+[^>]*name="([^"]+)"/g,
      )) {
        expect(docPreviewNames).toContain(
          name as (typeof docPreviewNames)[number],
        );
        used.add(name ?? "");
      }
      // Custom tags must be closed explicitly; HTML has no self-closing custom tags.
      expect(doc.content).not.toMatch(/<doc-preview[^>]*\/>/);
    }
    expect([...used].sort()).toEqual([...docPreviewNames].sort());
  });
});
