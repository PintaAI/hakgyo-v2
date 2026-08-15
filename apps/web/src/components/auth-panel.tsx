"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export function AuthPanel() {
  const router = useRouter();
  const {
    data: session,
    isPending: sessionPending,
    refetch,
  } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({
            email: email.trim(),
            name: name.trim(),
            password,
          });

    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Authentication failed.");
      return;
    }

    await refetch();
    router.refresh();
  };

  if (sessionPending) {
    return (
      <div className="h-72 animate-pulse rounded-[2rem] border border-emerald-950/10 bg-white/60" />
    );
  }

  if (session?.user) {
    return (
      <section className="rounded-[2rem] bg-[#163f35] p-7 text-[#fffaf0] shadow-[0_24px_80px_rgba(22,63,53,0.2)] sm:p-9">
        <p className="text-xs font-bold tracking-[0.24em] text-[#e9c46a] uppercase">
          Session connected
        </p>
        <h2 className="mt-5 text-3xl font-black tracking-tight">
          Welcome, {session.user.name}.
        </h2>
        <div className="mt-8 rounded-2xl bg-[#fffaf0] p-5 text-[#163f35]">
          <p className="text-xs font-bold tracking-[0.18em] text-[#9b5b3d] uppercase">
            Protected tRPC response
          </p>
          {account.isPending ? (
            <p className="mt-4 text-sm text-[#52665f]">Checking the API...</p>
          ) : account.error ? (
            <p className="mt-4 text-sm text-red-700">{account.error.message}</p>
          ) : (
            <div className="mt-4">
              <p className="font-black">{account.data?.name}</p>
              <p className="mt-1 text-sm text-[#52665f]">
                {account.data?.email}
              </p>
            </div>
          )}
        </div>
        <button
          className="mt-7 w-full rounded-full border border-[#fffaf0]/40 px-5 py-3 font-bold transition hover:bg-white/10"
          onClick={async () => {
            await authClient.signOut();
            await refetch();
          }}
          type="button"
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-emerald-950/10 bg-[#fffaf0] p-7 shadow-[0_24px_80px_rgba(50,65,58,0.12)] sm:p-9">
      <div className="mb-7 flex rounded-full bg-[#e8e4da] p-1">
        {(["sign-in", "sign-up"] as const).map((value) => (
          <button
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mode === value
                ? "bg-[#163f35] text-[#fffaf0]"
                : "text-[#52665f] hover:text-[#163f35]"
            }`}
            key={value}
            onClick={() => {
              setError(null);
              setMode(value);
            }}
            type="button"
          >
            {value === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={submitEmail}>
        {mode === "sign-up" && (
          <input
            autoComplete="name"
            className="w-full rounded-2xl border border-emerald-950/15 bg-white px-4 py-3.5 transition outline-none focus:border-[#163f35] focus:ring-2 focus:ring-[#163f35]/10"
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
            value={name}
          />
        )}
        <input
          autoComplete="email"
          className="w-full rounded-2xl border border-emerald-950/15 bg-white px-4 py-3.5 transition outline-none focus:border-[#163f35] focus:ring-2 focus:ring-[#163f35]/10"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          required
          type="email"
          value={email}
        />
        <input
          autoComplete={
            mode === "sign-in" ? "current-password" : "new-password"
          }
          className="w-full rounded-2xl border border-emerald-950/15 bg-white px-4 py-3.5 transition outline-none focus:border-[#163f35] focus:ring-2 focus:ring-[#163f35]/10"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          type="password"
          value={password}
        />

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-2xl bg-[#e76f51] px-5 py-3.5 font-black text-white transition hover:bg-[#d85f42] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? "Please wait..."
            : mode === "sign-in"
              ? "Sign in with email"
              : "Create account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-emerald-950/10" />
        <span className="text-xs font-bold text-[#718079] uppercase">or</span>
        <span className="h-px flex-1 bg-emerald-950/10" />
      </div>

      <button
        className="w-full rounded-2xl border border-emerald-950/15 bg-white px-5 py-3.5 font-black text-[#163f35] transition hover:border-emerald-950/30 hover:bg-[#faf9f5] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitting}
        onClick={async () => {
          setError(null);
          const result = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
          });
          if (result.error) {
            setError(result.error.message ?? "Google sign-in failed.");
          }
        }}
        type="button"
      >
        Continue with Google
      </button>
    </section>
  );
}
