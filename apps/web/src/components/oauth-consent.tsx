"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

import { FlowShell, surfaceCard } from "~/components/brand/flow-shell";
import { Headline, Kicker } from "~/components/brand/typography";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
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

  const label =
    "text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase";

  return (
    <FlowShell className="grid place-items-center pt-2 sm:pt-12">
      <section className={cn(surfaceCard, "w-full max-w-lg p-5 sm:p-8")}>
        <Kicker>Akses MCP Hakgyo</Kicker>
        <Headline
          as="h1"
          title={`Hubungkan ${clientName}`}
          className="mt-3 text-2xl sm:mt-4 sm:text-4xl xl:text-4xl"
        />
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Klien AI ini akan memakai Hakgyo sesuai role Anda saat ini. Setiap
          izin kursus, Group belajar, dan organisasi diperiksa kembali setiap
          kali sebuah tool dijalankan.
        </p>

        <div className="bg-muted/60 mt-6 rounded-xl p-4">
          <p className={label}>Klien</p>
          <p className="mt-1 text-sm font-medium break-all">{clientId}</p>
          <p className={cn(label, "mt-4")}>Akses yang diminta</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {scopes.map((scope) => (
              <li key={scope} className="flex items-start gap-2">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {scope}
              </li>
            ))}
          </ul>
          {userInfoClaims.length > 0 && (
            <>
              <p className={cn(label, "mt-4")}>Bidang profile yang diminta</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {userInfoClaims.map((claim) => (
                  <li key={claim} className="flex items-start gap-2">
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {claim}
                  </li>
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
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={() => void submit(false)}
          >
            Tolak
          </Button>
          <Button
            size="lg"
            className="h-11"
            disabled={pending}
            onClick={() => void submit(true)}
          >
            {pending ? "Mohon tunggu..." : "Izinkan"}
          </Button>
        </div>
      </section>
    </FlowShell>
  );
}
