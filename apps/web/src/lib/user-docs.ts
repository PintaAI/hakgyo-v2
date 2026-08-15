import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const userDocsDirectory = path.join(process.cwd(), "src/components/user-docs");
const userDocFilePattern =
  /^(\d+)-\[([A-Za-z][A-Za-z0-9]*)\]-(.+)-([a-z]{2}(?:-[A-Z]{2})?)\.md$/;

export type UserDocItem = {
  fileName: string;
  order: number;
  iconName: string;
  slug: string;
  title: string;
  locale: string;
};

function titleFromSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const getUserDocs = cache(async (): Promise<UserDocItem[]> => {
  const entries = await readdir(userDocsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .flatMap((entry) => {
      const match = userDocFilePattern.exec(entry.name);
      if (!match) return [];

      const [, order, iconName, titleSegment, locale] = match;
      if (!order || !iconName || !titleSegment || !locale) return [];

      return [
        {
          fileName: entry.name,
          order: Number(order),
          iconName,
          slug: `${titleSegment}-${locale}`,
          title: titleFromSegment(titleSegment),
          locale,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.order - right.order || left.fileName.localeCompare(right.fileName),
    );
});

export const getUserDoc = cache(async (slug: string) => {
  const doc = (await getUserDocs()).find((item) => item.slug === slug);
  if (!doc) return null;

  const content = await readFile(
    path.join(userDocsDirectory, doc.fileName),
    "utf8",
  );
  return { ...doc, content };
});
