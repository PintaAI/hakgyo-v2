"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hanken_Grotesk, Inter } from "next/font/google";
import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
} from "lucide-react";

import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getWorkspaceFallback } from "~/lib/access";
import { cn } from "~/lib/utils";
import {
  completeOnboarding,
  onboardingStorageKey,
  readOnboardingState,
} from "~/lib/onboarding";
import { api } from "~/trpc/react";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

function invitationToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = /^\/invite\/([^/]+)$/.exec(url.pathname);
    return match?.[1] ?? null;
  } catch {
    return /^[A-Za-z0-9_-]{20,200}$/.test(trimmed) ? trimmed : null;
  }
}

const checkingSnapshot = "__checking__";
const missingSnapshot = "__missing__";
const subscribeToNothing = () => () => undefined;

export function OrganizationOnboarding({ userId }: { userId: string }) {
  const router = useRouter();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const onboardingSnapshot = useSyncExternalStore(
    subscribeToNothing,
    () =>
      window.localStorage.getItem(onboardingStorageKey(userId)) ??
      missingSnapshot,
    () => checkingSnapshot,
  );
  const storedState =
    onboardingSnapshot !== checkingSnapshot &&
    onboardingSnapshot !== missingSnapshot
      ? readOnboardingState(window.localStorage, userId)
      : null;
  const storedDestination = storedState?.destination ?? null;
  const shouldCheckOrganizations =
    onboardingSnapshot === missingSnapshot ||
    (onboardingSnapshot !== checkingSnapshot && storedState === null);
  const organizations = api.organization.list.useQuery(undefined, {
    enabled: shouldCheckOrganizations,
  });

  useEffect(() => {
    if (storedDestination) router.replace(storedDestination);
  }, [router, storedDestination]);

  useEffect(() => {
    const membership = organizations.data?.[0]?.members[0];
    const organization = organizations.data?.[0];
    if (!organization || !membership) return;
    const destination = getWorkspaceFallback(
      organization.slug,
      membership.role,
    );
    completeOnboarding(window.localStorage, userId, destination);
    router.replace(destination);
  }, [organizations.data, router, userId]);

  function continueAsLearner() {
    completeOnboarding(window.localStorage, userId, "/catalog");
    router.replace("/catalog");
  }

  function openInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("invitation");
    const token = invitationToken(typeof value === "string" ? value : "");
    if (!token) {
      setInviteError("Masukkan link atau token invitation yang valid.");
      return;
    }
    setInviteError(null);
    router.push(`/invite/${token}`);
  }

  if (
    onboardingSnapshot === checkingSnapshot ||
    storedState ||
    organizations.isPending ||
    organizations.data?.length
  ) {
    return (
      <main className="bg-background grid min-h-screen place-items-center px-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Menyiapkan ruang Anda
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        hanken.variable,
        inter.variable,
        "bg-background min-h-screen p-4 font-[family-name:var(--font-inter)] md:p-6 lg:p-8",
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="bg-foreground text-background grid size-8 place-items-center rounded-lg text-sm font-bold">
              H
            </span>
            hakgyo
          </Link>
          <button
            type="button"
            onClick={continueAsLearner}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
          >
            Lewati untuk sekarang
          </button>
        </header>

        <section className="mx-auto mt-12 max-w-2xl text-center sm:mt-16">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Pilih perjalanan Anda
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            Mengajar, bergabung, atau mulai belajar.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Hakgyo memisahkan workspace organization dari ruang belajar. Pilih jalur yang sesuai
            sekarang; Anda tetap dapat membuat organization lain nanti.
          </p>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          <article className="bg-card ring-foreground/10 flex flex-col rounded-lg p-5 ring-1 sm:p-6">
            <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
              <Building2Icon className="size-4" />
            </span>
            <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-[0.14em] uppercase">
              Untuk pendiri
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              Buat organization
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Siapkan workspace, atur course sebagai Public atau Private, dan kelola teacher,
              cohort, serta learner. Anda otomatis menjadi owner.
            </p>
            <Link
              href="/organizations/new"
              className={cn(buttonVariants(), "mt-6 w-full")}
            >
              Mulai workspace
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </article>

          <article className="bg-card ring-foreground/10 flex flex-col rounded-lg p-5 ring-1 sm:p-6">
            <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
              <KeyRoundIcon className="size-4" />
            </span>
            <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-[0.14em] uppercase">
              Untuk staff
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              Pakai invitation
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Masukkan link atau token dari owner/admin untuk menerima role Teacher atau Admin.
            </p>
            <form onSubmit={openInvitation} className="mt-6 grid gap-2">
              <Input
                name="invitation"
                placeholder="Paste link atau token"
                aria-label="Link atau token invitation"
              />
              {inviteError ? (
                <p className="text-destructive text-xs">{inviteError}</p>
              ) : null}
              <Button type="submit" variant="outline" className="w-full">
                Buka invitation
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </form>
          </article>

          <article className="bg-card ring-foreground/10 flex flex-col rounded-lg p-5 ring-1 sm:p-6">
            <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
              <BookOpenIcon className="size-4" />
            </span>
            <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-[0.14em] uppercase">
              Untuk learner
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium">
              Jelajahi course
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Tidak perlu organization untuk mengikuti course dan melanjutkan progres belajar.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={continueAsLearner}
            >
              Buka catalog
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </article>
        </section>

        {organizations.error ? (
          <p className="text-destructive mt-6 text-center text-sm">
            Organization belum dapat diperiksa. Anda tetap dapat memilih salah satu jalur di
            atas.
          </p>
        ) : null}
      </div>
    </main>
  );
}
