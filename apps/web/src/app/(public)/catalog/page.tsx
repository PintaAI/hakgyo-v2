import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { buttonVariants } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/ui/page-header";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Katalog kursus | Hakgyo",
  description: "Jelajahi semua kursus yang dipublikasikan di Hakgyo.",
};

const pageSize = 24;

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Gratis";

  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString("id-ID")}`;
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const page = await api.course.listPublished({
    limit: pageSize + 1,
    cursor: cursor?.slice(0, 200),
  });
  const hasNextPage = page.length > pageSize;
  const courses = page.slice(0, pageSize);
  const nextCursor = hasNextPage ? courses.at(-1)?.id : undefined;

  return (
    <section>
      <PageHeader
        className="mb-6"
        eyebrow="Katalog"
        title="Katalog kursus"
        description="Jelajahi semua kursus yang dipublikasikan di Hakgyo."
        actions={
          <p className="text-muted-foreground text-sm">
            Menampilkan {courses.length} kursus
          </p>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="Belum ada kursus tersedia"
          description="Kursus yang dipublikasikan akan muncul di sini."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="bg-card overflow-hidden rounded-xl border shadow-sm"
            >
              <CourseCover
                title={course.title}
                thumbnailUrl={course.thumbnailUrl}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                className="aspect-video w-full"
              />

              <div className="p-5">
                <p className="text-muted-foreground truncate text-xs font-medium">
                  {course.organization.name}
                </p>
                <h2 className="mt-1 line-clamp-2 text-lg font-semibold">
                  {course.title}
                </h2>
                <p className="text-muted-foreground mt-2 line-clamp-2 min-h-10 text-sm">
                  {course.description ?? "Belum ada deskripsi."}
                </p>

                <dl className="text-muted-foreground mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt>Harga</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {formatPrice(course.price, course.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt>Pendaftaran</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {(course.enrollmentMode ??
                        course.organization.defaultEnrollmentMode) === "OPEN"
                        ? "Daftar sendiri"
                        : "Lewat undangan"}
                    </dd>
                  </div>
                  <div>
                    <dt>Bab</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {course._count.modules}
                    </dd>
                  </div>
                  <div>
                    <dt>Group belajar</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {course._count.cohorts}
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/catalog/${course.id}`}
                  className="mt-5 inline-flex text-sm font-medium underline-offset-4 hover:underline"
                >
                  Lihat kursus
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {nextCursor ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/catalog?cursor=${encodeURIComponent(nextCursor)}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Kursus berikutnya
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
