import type { Metadata } from "next";
import Link from "next/link";
import { getSessionCookie } from "better-auth/cookies";
import { ArrowLeftIcon, GraduationCapIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthPanel } from "~/components/auth-panel";
import { ThemeToggle } from "~/components/theme-toggle";
import { getSafeRedirectPath, routeAccess } from "~/lib/access";
import { getSignedInDestination } from "~/server/auth/dal";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
  title: "Masuk atau buat akun",
  description: "Masuk ke Hakgyo atau buat akun untuk mulai belajar bersama.",
  robots: { index: false, follow: false },
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const { redirectTo } = query;

  if (getSessionCookie(requestHeaders)) {
    const session = await getSession();
    if (session?.user) {
      const requestedPath = getSafeRedirectPath(redirectTo, [
        routeAccess.signInPath,
        routeAccess.postSignInPath,
      ]);
      redirect(
        requestedPath ?? (await getSignedInDestination(session.user.id)),
      );
    }
  }

  return (
    <main className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [mask-image:linear-gradient(135deg,black,transparent_72%)] [background-size:42px_42px]" />
      <div className="bg-primary/15 absolute -top-24 -right-20 size-72 rounded-full blur-3xl" />
      <div className="bg-primary/10 absolute -bottom-24 -left-20 size-80 rounded-full blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col px-5 pt-6 pb-12 sm:px-10 sm:pt-8 lg:px-14 lg:py-12">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="group inline-flex w-fit items-center gap-3 font-bold tracking-tight"
              aria-label="Kembali ke beranda Hakgyo"
            >
              <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-[0.9rem] shadow-[3px_3px_0_var(--foreground)] transition-transform group-hover:-rotate-6">
                <GraduationCapIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-xl">hakgyo</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="my-auto hidden max-w-lg py-16 lg:block">
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
              Ruang belajarmu menunggu
            </p>
            <h1 className="mt-6 text-6xl leading-[0.96] font-black tracking-[-0.055em]">
              Lanjutkan perjalanan belajarmu.
            </h1>
            <p className="text-muted-foreground mt-6 text-lg leading-8">
              Masuk untuk mengakses course, mengikuti materi, dan melanjutkan
              progres dari tempat terakhir.
            </p>
            <div className="bg-card/80 border-primary/15 mt-12 rotate-[-2deg] rounded-2xl border p-5 shadow-[6px_6px_0_var(--border)] backdrop-blur-md">
              <p className="font-serif text-lg leading-8 italic">
                “Pendidikan bukan persiapan untuk hidup; pendidikan adalah hidup
                itu sendiri.”
              </p>
              <p className="text-muted-foreground mt-3 text-xs font-bold tracking-[0.12em] uppercase">
                John Dewey
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mt-auto hidden w-fit items-center gap-2 text-sm font-bold transition lg:inline-flex"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </section>

        <section className="lg:bg-primary/95 flex items-center justify-center px-5 pb-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-[29rem]">
            <div className="mb-7 lg:hidden">
              <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                Selamat datang
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Lanjutkan perjalanan belajarmu.
              </h1>
            </div>
            <AuthPanel redirectTo={redirectTo} />
            <p className="text-muted-foreground lg:text-primary-foreground/70 mt-6 text-center text-xs leading-5">
              Dengan melanjutkan, Anda menyetujui penggunaan akun untuk
              mengakses layanan Hakgyo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
