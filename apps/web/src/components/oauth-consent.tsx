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
      setError(result.error.message ?? "Authorization could not be completed.");
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2efe6] px-6 py-12 text-[#163f35]">
      <section className="w-full max-w-lg rounded-[2rem] border border-emerald-950/10 bg-[#fffaf0] p-8 shadow-[0_24px_80px_rgba(50,65,58,0.14)]">
        <p className="text-xs font-bold tracking-[0.24em] text-[#9b5b3d] uppercase">
          Hakgyo MCP access
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          Connect {clientName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#52665f]">
          This AI client will use Hakgyo according to your current role. Every
          course, cohort, and organization permission is checked again when a
          tool runs.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-950/10 bg-white p-4">
          <p className="text-xs font-bold tracking-wide text-[#718079] uppercase">
            Client
          </p>
          <p className="mt-1 text-sm font-bold break-all">{clientId}</p>
          <p className="mt-4 text-xs font-bold tracking-wide text-[#718079] uppercase">
            Requested access
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {scopes.map((scope) => (
              <li key={scope}>• {scope}</li>
            ))}
          </ul>
          {userInfoClaims.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold tracking-wide text-[#718079] uppercase">
                Requested profile fields
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
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-emerald-950/15 bg-white px-5 py-3 font-bold transition hover:bg-[#f2efe6] disabled:opacity-50"
            disabled={pending}
            onClick={() => void submit(false)}
            type="button"
          >
            Deny
          </button>
          <button
            className="rounded-2xl bg-[#e76f51] px-5 py-3 font-black text-white transition hover:bg-[#d85f42] disabled:opacity-50"
            disabled={pending}
            onClick={() => void submit(true)}
            type="button"
          >
            {pending ? "Please wait..." : "Allow"}
          </button>
        </div>
      </section>
    </main>
  );
}
