"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export default function ZoomTestPage() {
  const searchParams = useSearchParams();
  const callbackOrganizationId = searchParams.get("organizationId") ?? "";
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    callbackOrganizationId,
  );
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const organizations = api.organization.list.useQuery(undefined, {
    enabled: Boolean(session?.user),
    retry: false,
  });
  const organizationId = selectedOrganizationId
    ? selectedOrganizationId
    : (organizations.data?.[0]?.id ?? "");
  const connection = api.organization.getZoomConnectionStatus.useQuery(
    { organizationId },
    { enabled: Boolean(session?.user && organizationId), retry: false },
  );
  const disconnect = api.organization.disconnectZoom.useMutation({
    onSuccess: () => connection.refetch(),
  });

  const callbackSucceeded = searchParams.get("zoom") === "connected";
  const selectedOrganization = organizations.data?.find(
    (organization) => organization.id === organizationId,
  );

  if (sessionPending) {
    return <TestShell message="Checking your Hakgyo session..." />;
  }

  if (!session?.user) {
    return (
      <TestShell message="Sign in to Hakgyo first, then return to this page.">
        <Link
          className="inline-flex rounded-full bg-[#d8ff53] px-5 py-3 font-black text-[#10251f] transition hover:-translate-y-0.5"
          href="/"
        >
          Go to sign in
        </Link>
      </TestShell>
    );
  }

  return (
    <main className="min-h-screen bg-[#10251f] px-5 py-8 text-[#f6f0df] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-6 border-b border-[#f6f0df]/20 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-[#d8ff53] uppercase">
              Integration workbench
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-6xl">
              Zoom connection test
            </h1>
          </div>
          <div className="rounded-full border border-[#f6f0df]/20 px-4 py-2 text-sm text-[#c7d2cc]">
            Signed in as {session.user.email}
          </div>
        </header>

        {callbackSucceeded && (
          <div className="mt-7 border-l-4 border-[#d8ff53] bg-[#d8ff53]/10 px-5 py-4 text-sm font-bold text-[#eaff9d]">
            Zoom returned successfully. The encrypted connection is now stored.
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[1.75rem] bg-[#f6f0df] p-6 text-[#10251f] sm:p-8">
            <p className="text-xs font-black tracking-[0.2em] text-[#9a4f38] uppercase">
              01 / Organization
            </p>
            <h2 className="mt-3 text-2xl font-black">Choose the tenant</h2>

            {organizations.isPending ? (
              <p className="mt-6 text-sm text-[#56635d]">
                Loading organizations...
              </p>
            ) : organizations.error ? (
              <ErrorMessage message={organizations.error.message} />
            ) : organizations.data?.length ? (
              <select
                className="mt-6 w-full rounded-xl border border-[#10251f]/20 bg-white px-4 py-3 font-bold outline-none focus:border-[#10251f]"
                onChange={(event) =>
                  setSelectedOrganizationId(event.target.value)
                }
                value={organizationId}
              >
                {organizations.data.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.members[0]?.role})
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-6 text-sm leading-6 text-[#56635d]">
                This account is not a member of an organization yet. Create or
                seed one before testing Zoom OAuth.
              </p>
            )}

            {selectedOrganization && (
              <dl className="mt-8 space-y-3 border-t border-[#10251f]/15 pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64716b]">Organization ID</dt>
                  <dd className="text-right font-mono text-xs font-bold break-all">
                    {selectedOrganization.id}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64716b]">Role</dt>
                  <dd className="font-black">
                    {selectedOrganization.members[0]?.role}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="relative overflow-hidden rounded-[1.75rem] border border-[#f6f0df]/20 p-6 sm:p-8">
            <div className="absolute -top-14 -right-14 h-44 w-44 rounded-full border-[28px] border-[#e76f51]/30" />
            <p className="relative text-xs font-black tracking-[0.2em] text-[#e9c46a] uppercase">
              02 / OAuth status
            </p>
            <div className="relative mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black">Zoom General App</h2>
              {connection.data && (
                <span className="rounded-full bg-[#d8ff53] px-3 py-1 text-xs font-black text-[#10251f]">
                  {connection.data.status}
                </span>
              )}
            </div>

            {!organizationId ? (
              <p className="relative mt-8 text-sm text-[#aebbb5]">
                Select an organization to continue.
              </p>
            ) : connection.isPending ? (
              <p className="relative mt-8 text-sm text-[#aebbb5]">
                Reading the encrypted connection record...
              </p>
            ) : connection.error ? (
              <ErrorMessage message={connection.error.message} dark />
            ) : connection.data ? (
              <div className="relative mt-8">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <StatusField
                    label="Zoom account"
                    value={connection.data.zoomAccountId}
                  />
                  <StatusField
                    label="Zoom user"
                    value={connection.data.zoomUserId}
                  />
                  <StatusField
                    label="Token expires"
                    value={connection.data.accessTokenExpiresAt.toLocaleString()}
                  />
                  <StatusField
                    label="Connected by"
                    value={connection.data.connectedBy.user.name}
                  />
                </dl>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    className="rounded-full bg-[#d8ff53] px-5 py-3 font-black text-[#10251f] transition hover:-translate-y-0.5"
                    href={`/api/integrations/zoom/connect?organizationId=${encodeURIComponent(organizationId)}`}
                  >
                    Reconnect Zoom
                  </a>
                  <button
                    className="rounded-full border border-[#f6f0df]/30 px-5 py-3 font-black transition hover:bg-white/10 disabled:opacity-50"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate({ organizationId })}
                    type="button"
                  >
                    {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
                {disconnect.error && (
                  <ErrorMessage message={disconnect.error.message} dark />
                )}
              </div>
            ) : (
              <div className="relative mt-8">
                <p className="max-w-lg text-sm leading-6 text-[#aebbb5]">
                  No Zoom account is attached to this organization. The next
                  step redirects to Zoom and returns here after consent.
                </p>
                <a
                  className="mt-6 inline-flex rounded-full bg-[#d8ff53] px-5 py-3 font-black text-[#10251f] transition hover:-translate-y-0.5"
                  href={`/api/integrations/zoom/connect?organizationId=${encodeURIComponent(organizationId)}`}
                >
                  Connect Zoom
                </a>
              </div>
            )}
          </section>
        </div>

        <p className="mt-8 text-xs leading-5 text-[#82918a]">
          Tokens never appear on this page. Hakgyo stores only encrypted access
          and refresh tokens on the server.
        </p>
      </div>
    </main>
  );
}

function TestShell({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#10251f] px-6 text-[#f6f0df]">
      <section className="max-w-md text-center">
        <p className="text-xs font-black tracking-[0.28em] text-[#d8ff53] uppercase">
          Zoom integration
        </p>
        <p className="mt-5 text-xl font-black">{message}</p>
        {children && <div className="mt-7">{children}</div>}
      </section>
    </main>
  );
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/6 p-4">
      <dt className="text-xs font-bold tracking-wide text-[#899992] uppercase">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-xs break-all text-[#f6f0df]">
        {value}
      </dd>
    </div>
  );
}

function ErrorMessage({
  message,
  dark = false,
}: {
  message: string;
  dark?: boolean;
}) {
  return (
    <p
      className={`mt-6 rounded-xl px-4 py-3 text-sm ${
        dark ? "bg-red-400/10 text-red-200" : "bg-red-100 text-red-800"
      }`}
    >
      {message}
    </p>
  );
}
