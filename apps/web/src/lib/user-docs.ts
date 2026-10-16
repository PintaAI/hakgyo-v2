import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getDocHeadings } from "~/lib/user-doc-headings";
import {
  isUserDocAudience,
  userDocAudiences,
  type UserDocAudience,
} from "~/lib/user-doc-audiences";

const userDocsDirectory = path.join(process.cwd(), "src/components/user-docs");
const userDocFilePattern =
  /^(\d+)-\[([A-Za-z][A-Za-z0-9]*)\]-([a-z0-9-]+)\.md$/;
const titlePattern = /^#\s+(.+?)\s*$/m;

export type UserDocItem = {
  audience: UserDocAudience;
  fileName: string;
  order: number;
  iconName: string;
  slug: string;
  title: string;
};

function titleFromSlug(slug: string) {
  const title = slug.split("-").filter(Boolean).join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function docPath(doc: Pick<UserDocItem, "audience" | "fileName">) {
  return path.join(userDocsDirectory, doc.audience, doc.fileName);
}

async function readAudienceDocs(
  audience: UserDocAudience,
): Promise<UserDocItem[]> {
  const entries = await readdir(path.join(userDocsDirectory, audience), {
    withFileTypes: true,
  });

  const docs = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const match = userDocFilePattern.exec(entry.name);
        if (!match?.[1] || !match[2] || !match[3]) return null;

        const content = await readFile(
          docPath({ audience, fileName: entry.name }),
          "utf8",
        );
        return {
          audience,
          fileName: entry.name,
          order: Number(match[1]),
          iconName: match[2],
          slug: match[3],
          title: titlePattern.exec(content)?.[1] ?? titleFromSlug(match[3]),
        };
      }),
  );

  return docs
    .filter((doc) => doc !== null)
    .sort(
      (left, right) =>
        left.order - right.order || left.fileName.localeCompare(right.fileName),
    );
}

export const getUserDocs = cache(async (audience: UserDocAudience) =>
  readAudienceDocs(audience),
);

export const getAllUserDocs = cache(async () =>
  (await Promise.all(userDocAudiences.map(({ id }) => getUserDocs(id)))).flat(),
);

export const getUserDoc = cache(async (audience: string, slug: string) => {
  if (!isUserDocAudience(audience)) return null;

  const docs = await getUserDocs(audience);
  const index = docs.findIndex((item) => item.slug === slug);
  const doc = docs[index];
  if (!doc) return null;

  const content = await readFile(docPath(doc), "utf8");
  return {
    ...doc,
    content,
    headings: getDocHeadings(content),
    previous: docs[index - 1] ?? null,
    next: docs[index + 1] ?? null,
  };
});
