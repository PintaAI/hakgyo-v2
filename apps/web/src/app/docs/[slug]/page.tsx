import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserDocArticle } from "~/components/user-doc-article";
import { Badge } from "~/components/ui/badge";
import { getUserDoc, getUserDocs } from "~/lib/user-docs";

export async function generateStaticParams() {
  return (await getUserDocs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const doc = await getUserDoc((await params).slug);
  return doc
    ? { title: `${doc.title} | Hakgyo Docs` }
    : { title: "Documentation | Hakgyo" };
}

export default async function UserDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const doc = await getUserDoc((await params).slug);
  if (!doc) notFound();

  return (
    <div>
      <div className="mx-auto mb-5 flex w-full max-w-4xl items-center gap-2">
        <Badge variant="secondary">{doc.locale.toUpperCase()}</Badge>
        <span className="text-muted-foreground text-xs">Hakgyo user guide</span>
      </div>
      <UserDocArticle content={doc.content} />
    </div>
  );
}
