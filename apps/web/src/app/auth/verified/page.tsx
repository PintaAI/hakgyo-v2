import type { Metadata } from "next";
import { getSessionCookie } from "better-auth/cookies";
import { CircleAlertIcon, MailCheckIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authSurface } from "~/components/auth-form";
import { FlowShell } from "~/components/brand/flow-shell";
import Link from "~/components/link";
import { ThemeToggle } from "~/components/theme-toggle";
import { buttonVariants } from "~/components/ui/button";
import { getSafeRedirectPath, routeAccess } from "~/lib/access";
import { cn } from "~/lib/utils";
import { getSignedInDestination } from "~/server/auth/dal";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
  title: "Verifikasi email",
  robots: { index: false, follow: false },
};

/** Opens the learner app's sign-in screen. */
const appSignInUrl = "hakgyo://auth";

/**
 * Where every verification link lands (see `routeVerificationLink`). A
 * verified web user is forwarded to where they were heading; an expired link
 * or a user from the app gets a page that says what to do next.
 */
export default async function EmailVerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string; app?: string }>;
}) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const fromApp = query.app === "1";
  const redirectTo = getSafeRedirectPath(query.redirectTo, [
    routeAccess.signInPath,
  ]);

  if (!query.error && !fromApp && getSessionCookie(requestHeaders)) {
    const session = await getSession();
    if (session?.user) {
      redirect(redirectTo ?? (await getSignedInDestination(session.user.id)));
    }
  }

  const signInHref = redirectTo
    ? `${routeAccess.signInPath}?redirectTo=${encodeURIComponent(redirectTo)}`
    : routeAccess.signInPath;
  const primaryAction = fromApp ? (
    // A custom scheme, so a plain anchor rather than a Next.js Link.
    <a
      href={appSignInUrl}
      className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full")}
    >
      Buka aplikasi Hakgyo
    </a>
  ) : (
    <Link
      href={signInHref}
      className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full")}
    >
      Masuk
    </Link>
  );

  return (
    <FlowShell action={<ThemeToggle />}>
      <div className="mx-auto w-full max-w-[29rem] pt-2 sm:pt-10">
        <section className={authSurface}>
          {query.error ? (
            <>
              <CircleAlertIcon
                className="text-destructive size-8"
                aria-hidden="true"
              />
              <h1 className="mt-4 text-2xl font-medium tracking-tight">
                Tautan verifikasi tidak berlaku
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Tautan ini sudah kedaluwarsa atau tidak lengkap. Masuk dengan
                email dan kata sandi Anda
                {fromApp ? " di aplikasi Hakgyo" : ""}, dan kami akan mengirim
                tautan verifikasi yang baru.
              </p>
            </>
          ) : (
            <>
              <MailCheckIcon
                className="text-primary size-8"
                aria-hidden="true"
              />
              <h1 className="mt-4 text-2xl font-medium tracking-tight">
                Email terverifikasi
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {fromApp
                  ? "Akun Anda sudah aktif. Kembali ke aplikasi Hakgyo dan masuk dengan email dan kata sandi Anda."
                  : "Akun Anda sudah aktif. Masuk untuk melanjutkan."}
              </p>
            </>
          )}
          {primaryAction}
        </section>
      </div>
    </FlowShell>
  );
}
