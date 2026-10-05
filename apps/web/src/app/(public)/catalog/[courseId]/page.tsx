import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Layers3Icon,
  LockKeyholeIcon,
  UsersIcon,
} from "lucide-react";

import { CourseCover } from "~/components/course-cover";
import { CatalogEnrollmentButton } from "~/components/catalog-enrollment-button";
import { buttonVariants } from "~/components/ui/button";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

const getCourse = cache(async (courseId: string) => {
  try {
    return await api.course.getPublished({ courseId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

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

const cohortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
});

function formatCohortPeriod(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt) {
    return `${cohortDateFormatter.format(startsAt)} – ${cohortDateFormatter.format(endsAt)}`;
  }
  if (startsAt) return `Mulai ${cohortDateFormatter.format(startsAt)}`;
  return "Jadwal menyusul";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCourse(courseId);
  return {
    title: course.title,
    description:
      course.description ?? `Pelajari ${course.title} bersama Hakgyo.`,
    alternates: { canonical: `/catalog/${course.id}` },
    openGraph: {
      title: course.title,
      description: course.description ?? undefined,
      images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
    },
  };
}

export default async function CatalogCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, session] = await Promise.all([
    getCourse(courseId),
    getSession(),
  ]);
  const enrollmentMode =
    course.enrollmentMode ?? course.organization.defaultEnrollmentMode;
  const canEnroll = enrollmentMode === "OPEN" && course.price === 0;
  const itemCount = course.modules.reduce(
    (total, module) => total + module.items.length,
    0,
  );
  const signInPath = `/auth?redirectTo=${encodeURIComponent(`/catalog/${course.id}`)}`;

  return (
    <div className="space-y-8 pb-10">
      <Link
        href="/catalog"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Kembali ke katalog
      </Link>

      <section className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <p className="text-primary text-sm font-semibold">
              {course.organization.name}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {course.title}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              {course.description ??
                "Kurikulum ini siap membantu kamu belajar secara terarah, langkah demi langkah."}
            </p>

            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Harga</dt>
                <dd className="mt-1 font-semibold">
                  {formatPrice(course.price, course.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Akses</dt>
                <dd className="mt-1 font-semibold">
                  {enrollmentMode === "OPEN" ? "Terbuka" : "Undangan"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Isi kurikulum</dt>
                <dd className="mt-1 font-semibold">
                  {course.modules.length} bab, {itemCount} aktivitas
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {canEnroll ? (
                session?.user ? (
                  <CatalogEnrollmentButton courseId={course.id} />
                ) : (
                  <Link
                    href={signInPath}
                    className={buttonVariants({ size: "lg" })}
                  >
                    Masuk untuk mulai
                  </Link>
                )
              ) : (
                <p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
                  <LockKeyholeIcon
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {course.cohorts.length > 0
                    ? "Pilih Group belajar di bawah untuk mendaftar."
                    : course.price > 0
                      ? "Belum ada Group belajar yang dibuka untuk kurikulum ini."
                      : "Kurikulum ini hanya dapat diakses melalui undangan."}
                </p>
              )}
            </div>
          </div>

          <CourseCover
            title={course.title}
            thumbnailUrl={course.thumbnailUrl}
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="min-h-64 lg:min-h-full"
          />
        </div>
      </section>

      {course.cohorts.length > 0 ? (
        <section aria-labelledby="cohorts-heading" className="max-w-4xl">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
              <UsersIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="cohorts-heading" className="text-xl font-bold">
                Group belajar
              </h2>
              <p className="text-muted-foreground text-sm">
                Belajar bersama pengajar dan teman sekelas.
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {course.cohorts.map((cohort) => {
              const checkoutPath = `/learn/checkout/${cohort.id}`;
              const full = cohort.seatsLeft === 0;
              return (
                <li
                  key={cohort.id}
                  className="bg-card flex flex-col gap-4 rounded-xl border p-5"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{cohort.name}</h3>
                    {cohort.description ? (
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-6">
                        {cohort.description}
                      </p>
                    ) : null}
                    <dl className="text-muted-foreground mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <dt className="sr-only">Periode</dt>
                        <dd>
                          {formatCohortPeriod(cohort.startsAt, cohort.endsAt)}
                        </dd>
                      </div>
                      {cohort.seatsLeft !== null ? (
                        <div className="flex items-center gap-2">
                          <UsersIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <dt className="sr-only">Kuota</dt>
                          <dd>
                            {full
                              ? "Kuota penuh"
                              : `Sisa ${cohort.seatsLeft} kursi`}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {formatPrice(cohort.price, "IDR")}
                    </p>
                    {full ? null : (
                      <Link
                        href={
                          session?.user
                            ? checkoutPath
                            : `/auth?redirectTo=${encodeURIComponent(checkoutPath)}`
                        }
                        className={buttonVariants()}
                      >
                        Daftar
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="curriculum-heading" className="max-w-4xl">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
            <Layers3Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="curriculum-heading" className="text-xl font-bold">
              Materi kurikulum
            </h2>
            <p className="text-muted-foreground text-sm">
              Materi yang akan kamu pelajari.
            </p>
          </div>
        </div>

        {course.modules.length === 0 ? (
          <div className="bg-card text-muted-foreground mt-5 rounded-xl border p-6 text-sm">
            Materi kurikulum belum dipublikasikan.
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {course.modules.map((module, index) => (
              <li key={module.id} className="bg-card rounded-xl border p-5">
                <div className="flex gap-4">
                  <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{module.title}</h3>
                    {module.description ? (
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {module.description}
                      </p>
                    ) : null}
                    {module.items.length > 0 ? (
                      <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                        {module.items.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <CheckCircle2Icon
                              className="text-primary mt-0.5 size-4 shrink-0"
                              aria-hidden="true"
                            />
                            {item.material?.title ??
                              item.assessment?.title ??
                              item.vocabularySet?.title ??
                              "Aktivitas belajar"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-sm">
                        Aktivitas akan segera ditambahkan.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
