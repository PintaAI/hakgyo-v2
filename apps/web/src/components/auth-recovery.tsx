"use client";

import { useState, type FormEvent } from "react";
import { MailCheckIcon } from "lucide-react";

import {
  AuthFormError,
  authFieldClass,
  AuthSubmitLabel,
  authSurface,
} from "~/components/auth-form";
import { Kicker } from "~/components/brand/typography";
import Link from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const target = email.trim();
      const result = await authClient.requestPasswordReset({
        email: target,
        redirectTo: "/auth/reset-password",
      });
      if (result.error) {
        setError(result.error.message ?? "Tidak dapat mengirim email.");
      } else {
        setSentTo(target);
      }
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <section className={authSurface}>
        <MailCheckIcon className="text-primary size-8" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-medium tracking-tight">
          Periksa email Anda
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Jika {sentTo} terdaftar, kami sudah mengirim tautan untuk mengatur
          ulang kata sandi. Tautan berlaku 1 jam. Cek juga folder spam.
        </p>
        <Link
          href="/auth"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-6 h-11 w-full",
          )}
        >
          Kembali ke halaman masuk
        </Link>
      </section>
    );
  }

  return (
    <section className={authSurface}>
      <Kicker>Lupa kata sandi</Kicker>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">
        Atur ulang kata sandi
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Masukkan email akun Anda. Kami akan mengirim tautan untuk memilih kata
        sandi baru.
      </p>
      <form className="mt-6 space-y-4 sm:space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-foreground">
            Alamat email
          </Label>
          <Input
            id="forgot-email"
            autoComplete="email"
            className={authFieldClass}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            required
            type="email"
            value={email}
          />
        </div>
        {error ? <AuthFormError message={error} /> : null}
        <button
          className={cn(buttonVariants({ size: "lg" }), "h-11 w-full sm:h-12")}
          disabled={submitting}
          type="submit"
        >
          <AuthSubmitLabel submitting={submitting}>
            Kirim tautan
          </AuthSubmitLabel>
        </button>
      </form>
      <Link
        href="/auth"
        className="text-muted-foreground hover:text-foreground mt-5 block text-center text-sm"
      >
        Kembali ke halaman masuk
      </Link>
    </section>
  );
}

export function ResetPasswordForm({
  token,
  invalid,
}: {
  token?: string;
  invalid: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(
          result.error.code === "INVALID_TOKEN"
            ? "Tautan sudah kedaluwarsa atau pernah dipakai. Minta tautan baru."
            : (result.error.message ??
                "Tidak dapat mengatur ulang kata sandi."),
        );
      } else {
        setDone(true);
      }
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (invalid || !token) {
    return (
      <section className={authSurface}>
        <h2 className="text-2xl font-medium tracking-tight">
          Tautan tidak berlaku
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Tautan atur ulang kata sandi sudah kedaluwarsa atau pernah dipakai.
          Minta tautan baru untuk melanjutkan.
        </p>
        <Link
          href="/auth/forgot-password"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full")}
        >
          Minta tautan baru
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className={authSurface}>
        <MailCheckIcon className="text-primary size-8" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-medium tracking-tight">
          Kata sandi diperbarui
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Semua perangkat dikeluarkan dari akun Anda. Masuk lagi dengan kata
          sandi yang baru.
        </p>
        <Link
          href="/auth"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full")}
        >
          Masuk
        </Link>
      </section>
    );
  }

  return (
    <section className={authSurface}>
      <Kicker>Kata sandi baru</Kicker>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">
        Pilih kata sandi baru
      </h2>
      <form className="mt-6 space-y-4 sm:space-y-5" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="reset-password" className="text-foreground">
            Kata sandi baru
          </Label>
          <Input
            id="reset-password"
            autoComplete="new-password"
            className={authFieldClass}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            required
            type="password"
            value={password}
          />
        </div>
        {error ? <AuthFormError message={error} /> : null}
        <button
          className={cn(buttonVariants({ size: "lg" }), "h-11 w-full sm:h-12")}
          disabled={submitting}
          type="submit"
        >
          <AuthSubmitLabel submitting={submitting}>
            Simpan kata sandi
          </AuthSubmitLabel>
        </button>
      </form>
    </section>
  );
}
