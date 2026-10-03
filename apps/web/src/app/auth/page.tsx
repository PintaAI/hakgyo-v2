import type { Metadata } from "next";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthPanel } from "~/components/auth-panel";
import { FlowShell } from "~/components/brand/flow-shell";
import { Headline, Kicker, leadText } from "~/components/brand/typography";
import { ThemeToggle } from "~/components/theme-toggle";
import { getSafeRedirectPath, routeAccess } from "~/lib/access";
import { cn } from "~/lib/utils";
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
  searchParams: Promise<{ redirectTo?: string; mode?: string }>;
}) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const { redirectTo } = query;
  const initialMode = query.mode === "sign-up" ? "sign-up" : "sign-in";

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
    <FlowShell action={<ThemeToggle />}>
      <div className="grid gap-8 pt-4 sm:pt-10 lg:min-h-[calc(100dvh-10rem)] lg:grid-cols-[minmax(0,1fr)_29rem] lg:items-center lg:gap-16 lg:pt-0 xl:gap-24">
        <section>
          <Kicker>Akun Hakgyo</Kicker>
          <Headline
            as="h1"
            title="Masuk ke Hakgyo."
            muted="Kelola kelas atau lanjutkan belajar."
            className="mt-3 sm:mt-5"
          />
          <p className={cn(leadText, "mt-4 hidden sm:mt-6 sm:block")}>
            Satu akun untuk workspace lembaga dan ruang belajar. Progres belajar
            tersimpan di web dan aplikasi.
          </p>
        </section>
        <div>
          <AuthPanel redirectTo={redirectTo} initialMode={initialMode} />
          <p className="text-muted-foreground mt-5 text-center text-xs leading-5">
            Dengan melanjutkan, Anda menyetujui penggunaan akun untuk mengakses
            layanan Hakgyo.
          </p>
        </div>
      </div>
    </FlowShell>
  );
}
