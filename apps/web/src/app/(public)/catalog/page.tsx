import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Course catalog | Hakgyo",
  description: "Explore every published course available on Hakgyo.",
};

const pageSize = 100;

async function getAllPublishedCourses() {
  let page = await api.course.listPublished({ limit: pageSize });
  const courses = [...page];

  while (page.length === pageSize) {
    const cursor = page.at(-1)?.id;
    if (!cursor) break;

    page = await api.course.listPublished({ limit: pageSize, cursor });
    courses.push(...page);
  }

  return courses;
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString("en")}`;
  }
}

export default async function CatalogPage() {
  const courses = await getAllPublishedCourses();

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Course catalog</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Browse all published courses available on Hakgyo.
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-sm">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card rounded-xl border p-10 text-center">
          <h2 className="font-semibold">No courses available</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Published courses will appear here.
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
                    No thumbnail
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
                  {course.description ?? "No description available."}
                </p>

                <dl className="text-muted-foreground mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt>Price</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {formatPrice(course.price, course.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt>Enrollment</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {course.enrollmentMode === "OPEN"
                        ? "Open"
                        : "Invite only"}
                    </dd>
                  </div>
                  <div>
                    <dt>Modules</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {course._count.modules}
                    </dd>
                  </div>
                  <div>
                    <dt>Cohorts</dt>
                    <dd className="text-foreground mt-0.5 font-medium">
                      {course._count.cohorts}
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/catalog/${course.id}`}
                  className="mt-5 inline-flex text-sm font-medium underline-offset-4 hover:underline"
                >
                  View course
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
