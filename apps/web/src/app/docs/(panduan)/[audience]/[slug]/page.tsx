import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import Link from "~/components/link";
import { UserDocArticle } from "~/components/user-doc-article";
import { UserDocIntroVideo } from "~/components/user-doc-intro-video";
import { UserDocToc } from "~/components/user-doc-toc";
import { userDocAudiences, userDocHref } from "~/lib/user-doc-audiences";
import { getUserDocVideo } from "~/lib/user-doc-videos";
import { getAllUserDocs, getUserDoc } from "~/lib/user-docs";

type Params = Promise<{ audience: string; slug: string }>;

// Every page is prerendered; anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllUserDocs()).map(({ audience, slug }) => ({
    audience,
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { audience, slug } = await params;
  const doc = await getUserDoc(audience, slug);
  return { title: doc ? `${doc.title} | Panduan Hakgyo` : "Panduan Hakgyo" };
}

export default async function UserDocPage({ params }: { params: Params }) {
  const { audience, slug } = await params;
  const doc = await getUserDoc(audience, slug);
  if (!doc) notFound();

  const audienceLabel =
    userDocAudiences.find(({ id }) => id === doc.audience)?.label ?? "";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="mx-auto w-full max-w-3xl min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={userDocHref(doc.audience)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {audienceLabel}
          </Link>
          <UserDocToc headings={doc.headings} variant="sheet" />
        </div>

        <UserDocArticle
          content={doc.content}
          headings={doc.headings}
          afterTitle={
            <UserDocIntroVideo
              title={doc.title}
              video={getUserDocVideo(doc.audience, doc.slug)}
            />
          }
        />

        <nav
          aria-label="Halaman lain"
          className="grid gap-3 border-t pt-6 pb-16 sm:grid-cols-2"
        >
          {doc.previous ? (
            <Link
              href={userDocHref(doc.audience, doc.previous.slug)}
              className="hover:bg-muted/50 rounded-lg px-3 py-2"
            >
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <ArrowLeftIcon className="size-3.5" /> Sebelumnya
              </span>
              <span className="mt-0.5 block font-medium">
                {doc.previous.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {doc.next ? (
            <Link
              href={userDocHref(doc.audience, doc.next.slug)}
              className="hover:bg-muted/50 rounded-lg px-3 py-2 sm:text-right"
            >
              <span className="text-muted-foreground flex items-center gap-1 text-xs sm:justify-end">
                Berikutnya <ArrowRightIcon className="size-3.5" />
              </span>
              <span className="mt-0.5 block font-medium">{doc.next.title}</span>
            </Link>
          ) : null}
        </nav>
      </div>
      <aside className="hidden xl:block">
        <UserDocToc headings={doc.headings} variant="aside" />
      </aside>
    </div>
  );
}
