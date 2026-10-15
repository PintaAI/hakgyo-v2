import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { userDocAudiences, userDocHref } from "~/lib/user-doc-audiences";
import { getUserDocs } from "~/lib/user-docs";

export const metadata: Metadata = { title: "Panduan Hakgyo" };

export default async function DocsIndexPage() {
  const sections = await Promise.all(
    userDocAudiences.map(async (audience) => ({
      ...audience,
      docs: await getUserDocs(audience.id),
    })),
  );

  return (
    <div className="mx-auto w-full max-w-4xl pb-20">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Panduan Hakgyo
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
        Pilih panduan sesuai peran Anda. Setiap halaman menjelaskan satu
        pekerjaan dari awal sampai selesai.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`panduan-${section.id}`}>
            <h2
              id={`panduan-${section.id}`}
              className="font-heading text-xl font-semibold tracking-tight"
            >
              {section.label}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {section.description}
            </p>
            <ol className="mt-4 divide-y border-y">
              {section.docs.map((doc, index) => (
                <li key={doc.slug}>
                  <Link
                    href={userDocHref(section.id, doc.slug)}
                    className="hover:bg-muted/50 focus-visible:ring-ring/50 flex items-center gap-3 px-1 py-3 text-sm outline-none focus-visible:ring-3"
                  >
                    <span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">
                      {doc.title}
                    </span>
                    <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
