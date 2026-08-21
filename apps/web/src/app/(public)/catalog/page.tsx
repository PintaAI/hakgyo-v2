import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Katalog course | Hakgyo",
  description: "Jelajahi semua course terbit yang tersedia di Hakgyo.",
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
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Katalog course</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Jelajahi semua course terbit yang tersedia di Hakgyo.
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-sm">
          Menampilkan {courses.length} course
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card rounded-xl border p-10 text-center">
          <h2 className="font-semibold">Belum ada course tersedia</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Course yang diterbitkan akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="bg-card overflow-hidden rounded-xl border shadow-sm"
            >
              <div className="bg-muted relative aspect-video">
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">
                    Tanpa thumbnail
                  </div>
                )}
              </div>

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
                    <dt>Tipe</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {(course.enrollmentMode ??
                        course.organization.defaultEnrollmentMode) === "OPEN"
                        ? "Terbuka"
                        : "Undangan"}
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
                  Lihat course
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
            Course berikutnya
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
