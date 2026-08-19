"use client";

import { useState } from "react";

import { authClient } from "~/server/better-auth/client";

export function OAuthConsent({
  clientName,
  clientId,
  scopes,
  claims,
  userInfoClaims,
}: {
  clientName: string;
  clientId: string;
  scopes: string[];
  claims?: string;
  userInfoClaims: string[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (accept: boolean) => {
    setPending(true);
    setError(null);
    const result = await authClient.oauth2.consent({
      accept,
      scope: scopes.join(" "),
      claims,
    });
    if (result.error) {
      setError(result.error.message ?? "Otorisasi tidak dapat diselesaikan.");
      setPending(false);
    }
  };

  return (
    <main className="bg-background text-foreground relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="bg-primary/10 pointer-events-none absolute -top-24 -right-20 size-72 rounded-full blur-3xl" />
      <div className="bg-primary/5 pointer-events-none absolute -bottom-24 -left-20 size-80 rounded-full blur-3xl" />
      <section className="border-primary/15 bg-card/95 relative w-full max-w-lg rounded-[2rem] border p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-primary text-xs font-bold tracking-[0.24em] uppercase">
          Akses MCP Hakgyo
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          Hubungkan {clientName}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Klien AI ini akan memakai Hakgyo sesuai role Anda saat ini. Setiap
          izin course, Group belajar, dan organisasi diperiksa kembali setiap
          kali sebuah tool dijalankan.
        </p>

        <div className="border-border bg-muted/25 mt-6 rounded-2xl border p-4">
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Klien
          </p>
          <p className="mt-1 text-sm font-bold break-all">{clientId}</p>
          <p className="text-muted-foreground mt-4 text-xs font-bold tracking-wide uppercase">
            Akses yang diminta
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {scopes.map((scope) => (
              <li key={scope}>• {scope}</li>
            ))}
          </ul>
          {userInfoClaims.length > 0 && (
            <>
              <p className="text-muted-foreground mt-4 text-xs font-bold tracking-wide uppercase">
                Bidang profile yang diminta
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {userInfoClaims.map((claim) => (
                  <li key={claim}>• {claim}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {error && (
          <p className="bg-destructive/10 text-destructive mt-4 rounded-xl px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="border-primary/15 bg-primary/5 hover:border-primary/30 hover:bg-primary/10 rounded-2xl border px-5 py-3 font-bold transition disabled:opacity-50"
            disabled={pending}
            onClick={() => void submit(false)}
            type="button"
          >
            Tolak
          </button>
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-5 py-3 font-black transition disabled:opacity-50"
            disabled={pending}
            onClick={() => void submit(true)}
            type="button"
          >
            {pending ? "Mohon tunggu..." : "Izinkan"}
          </button>
        </div>
      </section>
    </main>
  );
}
