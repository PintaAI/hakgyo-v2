"use client";

import { useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon, LoaderCircleIcon } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getPostSignInPath } from "~/lib/access";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export function AuthPanel({ redirectTo }: { redirectTo?: string }) {
  const postSignInPath = getPostSignInPath(redirectTo);
  const {
    data: session,
    isPending: sessionPending,
    refetch,
  } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const account = api.account.me.useQuery(undefined, {
    enabled: Boolean(session?.user),
    retry: false,
  });

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({
              email: email.trim(),
              name: name.trim(),
              password,
            });

      if (result.error) {
        setError(result.error.message ?? "Autentikasi gagal.");
        setSubmitting(false);
        return;
      }

      window.location.replace(postSignInPath);
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.");
      setSubmitting(false);
    }
  };

  if (sessionPending) {
    return (
      <div className="border-border bg-card h-[35rem] animate-pulse rounded-[2rem] border" />
    );
  }

  if (session?.user) {
    return (
      <section className="bg-primary text-primary-foreground border-primary-foreground/10 rounded-[2rem] border p-7 shadow-2xl sm:p-9">
        <p className="text-primary-foreground/70 text-xs font-bold tracking-[0.24em] uppercase">
          Sesi terhubung
        </p>
        <h2 className="mt-5 text-3xl font-black tracking-tight">
          Selamat datang, {session.user.name}.
        </h2>
        <div className="bg-card text-card-foreground mt-8 rounded-2xl p-5">
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Respons tRPC terproteksi
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
              <p className="font-black">{account.data?.name}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {account.data?.email}
              </p>
            </div>
          )}
        </div>
        <button
          className="border-primary-foreground/40 hover:bg-primary-foreground/10 mt-7 w-full rounded-full border px-5 py-3 font-bold transition"
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

  return (
    <section className="bg-card/95 border-primary/15 rounded-[2rem] border p-6 shadow-2xl backdrop-blur-xl sm:p-9">
      <div>
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
          {mode === "sign-in"
            ? "Selamat datang kembali"
            : "Mulai bersama Hakgyo"}
        </p>
        <h2 className="text-card-foreground mt-3 text-3xl font-black tracking-[-0.03em]">
          {mode === "sign-in" ? "Masuk ke akun" : "Buat akun baru"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {mode === "sign-in"
            ? "Lanjutkan course dan progres belajarmu."
            : "Siapkan ruang belajarmu dalam beberapa langkah."}
        </p>
      </div>

      <div
        className="bg-muted/70 border-border my-7 flex rounded-full border p-1"
        role="group"
        aria-label="Pilih mode autentikasi"
      >
        {(["sign-in", "sign-up"] as const).map((value) => (
          <button
            aria-pressed={mode === value}
            className={`focus-visible:outline-ring flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
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

      <form className="space-y-5" onSubmit={submitEmail}>
        {mode === "sign-up" && (
          <div className="space-y-2">
            <Label htmlFor="auth-name" className="text-foreground">
              Nama lengkap
            </Label>
            <Input
              id="auth-name"
              autoComplete="name"
              className="border-input bg-muted/25 hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/15 h-12 rounded-xl px-4 text-base transition-colors md:text-sm"
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
            className="border-input bg-muted/25 hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/15 h-12 rounded-xl px-4 text-base transition-colors md:text-sm"
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
              className="border-input bg-muted/25 hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/15 h-12 rounded-xl px-4 pr-12 text-base transition-colors md:text-sm"
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
          ) : null}
        </div>

        {error && (
          <p
            className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm leading-5"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-black shadow-[3px_3px_0_var(--foreground)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <>
              <LoaderCircleIcon
                className="size-4 animate-spin"
                aria-hidden="true"
              />{" "}
              Mohon tunggu...
            </>
          ) : mode === "sign-in" ? (
            "Masuk dengan email"
          ) : (
            "Buat akun"
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs font-bold uppercase">
          atau
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      <button
        className="border-primary/15 bg-primary/5 text-foreground hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-ring flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-5 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50"
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
