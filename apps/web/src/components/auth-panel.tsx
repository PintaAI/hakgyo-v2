"use client";

import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon, MailCheckIcon } from "lucide-react";

import {
  AuthFormError,
  authFieldClass,
  AuthSubmitLabel,
  authSurface,
} from "~/components/auth-form";
import { surfaceCard } from "~/components/brand/flow-shell";
import { Kicker } from "~/components/brand/typography";
import Link from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getPostSignInPath } from "~/lib/access";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

const signedOAuthParams = ["sig", "exp", "ba_iat", "ba_pl", "ba_param"];

/**
 * During an OAuth authorization (an MCP client connecting), the sign-in page
 * carries the signed authorize query. A new account has no session until its
 * email is verified, so the verification link has to restart the
 * authorization itself; the signed query would have expired by then.
 */
function authorizationResumePath() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("sig") || !params.has("client_id")) return null;
  for (const key of signedOAuthParams) params.delete(key);
  // The user has just signed in; asking again would loop back here.
  if (
    ["login", "create", "select_account"].includes(params.get("prompt") ?? "")
  ) {
    params.delete("prompt");
  }
  return `/api/auth/oauth2/authorize?${params.toString()}`;
}

function resumesAuthorization(data: unknown) {
  return (
    typeof data === "object" &&
    data !== null &&
    "redirect" in data &&
    data.redirect === true &&
    "url" in data &&
    typeof data.url === "string"
  );
}

export function AuthPanel({
  redirectTo,
  initialMode = "sign-in",
}: {
  redirectTo?: string;
  initialMode?: "sign-in" | "sign-up";
}) {
  const postSignInPath = getPostSignInPath(redirectTo);
  const {
    data: session,
    isPending: sessionPending,
    refetch,
  } = authClient.useSession();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set once a verification email is on its way; replaces the form.
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(
    null,
  );
  const account = api.account.me.useQuery(undefined, {
    enabled: Boolean(session?.user),
    retry: false,
  });

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    // Also the destination of the verification link the server sends.
    const callbackURL = authorizationResumePath() ?? postSignInPath;

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL,
            })
          : await authClient.signUp.email({
              email: email.trim(),
              name: name.trim(),
              password,
              callbackURL,
            });

      // The server resends the verification link on a blocked sign-in.
      if (result.error?.code === "EMAIL_NOT_VERIFIED") {
        setVerificationSentTo(email.trim());
        setSubmitting(false);
        return;
      }

      if (result.error) {
        setError(result.error.message ?? "Autentikasi gagal.");
        setSubmitting(false);
        return;
      }

      // Sign-up only creates a session once the email is verified.
      if (mode === "sign-up" && !result.data?.token) {
        setVerificationSentTo(email.trim());
        setSubmitting(false);
        return;
      }

      // Sign-in returns a URL (the callback, or a resumed OAuth authorization
      // for an MCP client) that Better Auth's client already navigates to.
      if (resumesAuthorization(result.data)) return;
      window.location.replace(postSignInPath);
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.");
      setSubmitting(false);
    }
  };

  if (sessionPending) {
    return <div className={cn(surfaceCard, "h-[32rem] animate-pulse")} />;
  }

  if (session?.user) {
    return (
      <section className={authSurface}>
        <Kicker>Sesi terhubung</Kicker>
        <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
          Selamat datang, {session.user.name}.
        </h2>
        <div className="bg-muted/60 mt-6 rounded-xl p-4">
          <p className="text-muted-foreground text-xs font-medium">
            Akun yang terhubung
          </p>
          {account.isPending ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Memeriksa API...
            </p>
          ) : account.error ? (
            <p className="text-destructive mt-4 text-sm">
              {account.error.message}
            </p>
          ) : (
            <div className="mt-4">
              <p className="font-medium">{account.data?.name}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {account.data?.email}
              </p>
            </div>
          )}
        </div>
        <button
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-6 h-11 w-full",
          )}
          onClick={async () => {
            await authClient.signOut();
            await refetch();
          }}
          type="button"
        >
          Keluar
        </button>
      </section>
    );
  }

  if (verificationSentTo) {
    return (
      <section className={authSurface}>
        <MailCheckIcon className="text-primary size-8" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-medium tracking-tight">
          Verifikasi email Anda
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Kami mengirim tautan verifikasi ke {verificationSentTo}. Buka tautan
          itu untuk mengaktifkan akun, lalu kembali ke sini untuk masuk. Cek
          juga folder spam.
        </p>
        <button
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-6 h-11 w-full",
          )}
          onClick={() => {
            setVerificationSentTo(null);
            setMode("sign-in");
          }}
          type="button"
        >
          Kembali ke halaman masuk
        </button>
      </section>
    );
  }

  return (
    <section className={authSurface}>
      <div>
        <Kicker>
          {mode === "sign-in"
            ? "Selamat datang kembali"
            : "Mulai bersama Hakgyo"}
        </Kicker>
        <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">
          {mode === "sign-in" ? "Masuk ke akun" : "Buat akun baru"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {mode === "sign-in"
            ? "Lanjutkan kurikulum dan progres belajarmu."
            : "Siapkan ruang belajarmu dalam beberapa langkah."}
        </p>
      </div>

      <div
        className="bg-muted/70 border-border my-5 flex rounded-full border p-1 sm:my-6"
        role="group"
        aria-label="Pilih mode autentikasi"
      >
        {(["sign-in", "sign-up"] as const).map((value) => (
          <button
            aria-pressed={mode === value}
            className={`focus-visible:outline-ring flex-1 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
              mode === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={value}
            onClick={() => {
              setError(null);
              setMode(value);
            }}
            type="button"
          >
            {value === "sign-in" ? "Masuk" : "Buat akun"}
          </button>
        ))}
      </div>

      <form className="space-y-4 sm:space-y-5" onSubmit={submitEmail}>
        {mode === "sign-up" && (
          <div className="space-y-2">
            <Label htmlFor="auth-name" className="text-foreground">
              Nama lengkap
            </Label>
            <Input
              id="auth-name"
              autoComplete="name"
              className={authFieldClass}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama Anda"
              required
              value={name}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="auth-email" className="text-foreground">
            Alamat email
          </Label>
          <Input
            id="auth-email"
            autoComplete="email"
            className={authFieldClass}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-password" className="text-foreground">
            Kata sandi
          </Label>
          <div className="relative">
            <Input
              id="auth-password"
              aria-describedby={
                mode === "sign-up" ? "password-help" : undefined
              }
              aria-invalid={Boolean(error)}
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              className={cn(authFieldClass, "pr-12")}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl transition focus-visible:outline-2"
              aria-label={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
          {mode === "sign-up" ? (
            <p id="password-help" className="text-muted-foreground text-xs">
              Gunakan minimal 8 karakter.
            </p>
          ) : (
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground hover:text-foreground -my-1 inline-block py-2 text-sm"
            >
              Lupa kata sandi?
            </Link>
          )}
        </div>

        {error ? <AuthFormError message={error} /> : null}

        <button
          className={cn(buttonVariants({ size: "lg" }), "h-11 w-full sm:h-12")}
          disabled={submitting}
          type="submit"
        >
          <AuthSubmitLabel submitting={submitting}>
            {mode === "sign-in" ? "Masuk dengan email" : "Buat akun"}
          </AuthSubmitLabel>
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 sm:my-5">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          atau
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      <button
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "h-11 w-full gap-3 sm:h-12",
        )}
        disabled={submitting}
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            const result = await authClient.signIn.social({
              provider: "google",
              callbackURL: postSignInPath,
            });
            if (result.error) {
              setError(result.error.message ?? "Masuk dengan Google gagal.");
              setSubmitting(false);
            }
          } catch {
            setError("Tidak dapat terhubung ke Google. Coba lagi.");
            setSubmitting(false);
          }
        }}
        type="button"
      >
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
          />
        </svg>
        Lanjutkan dengan Google
      </button>
    </section>
  );
}
