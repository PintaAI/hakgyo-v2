"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <main className="min-h-screen overflow-hidden bg-[#f3efe4] text-[#191b17]">
      <div className="relative mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-10 lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute top-[-12rem] right-[-9rem] size-[32rem] rounded-full border border-[#191b17]/15" />
        <div className="pointer-events-none absolute top-[-7rem] right-[-4rem] size-[20rem] rounded-full bg-[#d7a83f]/20" />

        <header className="relative flex items-center justify-between border-b border-[#191b17]/20 pb-6">
          <Link href="/" className="flex items-center gap-3 font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-[#191b17] text-[#f3efe4] shadow-[3px_3px_0_#d7a83f]">
              H
            </span>
            hakgyo
          </Link>
          <button
            type="button"
            className="text-sm font-semibold underline decoration-[#d7a83f] decoration-2 underline-offset-4"
            onClick={continueAsLearner}
          >
            Lewati untuk sekarang
          </button>
        </header>

        <section className="relative pt-16 lg:pt-24">
          <p className="text-xs font-black tracking-[0.22em] text-[#8b6416] uppercase">
            Pilih perjalanan Anda
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.95] font-semibold tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            Mengajar, bergabung, atau mulai belajar.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#55584f] sm:text-lg">
            Hakgyo memisahkan workspace organization dari ruang belajar. Pilih
            jalur yang sesuai sekarang; Anda tetap dapat membuat organization
            lain nanti.
          </p>
        </section>

        <section className="relative mt-14 grid gap-4 lg:grid-cols-[1.15fr_1fr_0.85fr]">
          <article className="group flex min-h-80 flex-col rounded-[1.75rem] bg-[#191b17] p-7 text-[#f7f3e7] shadow-[8px_8px_0_#d7a83f] sm:p-9">
            <Building2Icon className="size-8 text-[#e2b74f]" />
            <p className="mt-10 text-xs font-bold tracking-[0.18em] text-white/50 uppercase">
              Untuk pendiri
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-none font-semibold">
              Buat organization
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
              Siapkan workspace, course, teacher, cohort, dan learner. Anda
              otomatis menjadi owner.
            </p>
            <Link
              href="/organizations/new"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "mt-auto w-fit bg-[#f7f3e7] text-[#191b17]",
              )}
            >
              Mulai workspace
              <ArrowRightIcon />
            </Link>
          </article>

          <article className="flex min-h-80 flex-col rounded-[1.75rem] border border-[#191b17]/20 bg-white/55 p-7 backdrop-blur sm:p-9">
            <KeyRoundIcon className="size-8 text-[#8b6416]" />
            <p className="mt-10 text-xs font-bold tracking-[0.18em] text-[#77796f] uppercase">
              Untuk staff
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-none font-semibold">
              Pakai invitation
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#65685f]">
              Masukkan link atau token dari owner/admin untuk menerima role
              Teacher atau Admin.
            </p>
            <form onSubmit={openInvitation} className="mt-auto grid gap-2">
              <Input
                name="invitation"
                placeholder="Paste link atau token"
                aria-label="Link atau token invitation"
                className="border-[#191b17]/25 bg-[#f9f6ed]"
              />
              {inviteError ? (
                <p className="text-xs text-red-700">{inviteError}</p>
              ) : null}
              <Button type="submit" variant="outline" className="w-full">
                Buka invitation
                <ArrowRightIcon />
              </Button>
            </form>
          </article>

          <article className="flex min-h-80 flex-col rounded-[1.75rem] border border-[#191b17]/20 bg-[#d9e1cd] p-7 sm:p-9">
            <BookOpenIcon className="size-8 text-[#405135]" />
            <p className="mt-10 text-xs font-bold tracking-[0.18em] text-[#5c6853] uppercase">
              Untuk learner
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-none font-semibold">
              Jelajahi course
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#526049]">
              Tidak perlu organization untuk mengikuti course dan melanjutkan
              progres belajar.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-auto border-[#405135]/30 bg-transparent"
              onClick={continueAsLearner}
            >
              Buka catalog
              <ArrowRightIcon />
            </Button>
          </article>
        </section>

        {organizations.error ? (
          <p className="relative mt-8 text-sm text-red-700">
            Organization belum dapat diperiksa. Anda tetap dapat memilih salah
            satu jalur di atas.
          </p>
        ) : null}
      </div>
    </main>
  );
}
