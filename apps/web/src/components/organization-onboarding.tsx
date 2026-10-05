"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  type LucideIcon,
} from "lucide-react";

import { FlowShell, surfaceCard } from "~/components/brand/flow-shell";
import { Headline, Kicker, leadText } from "~/components/brand/typography";
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
      <FlowShell className="grid min-h-[60dvh] place-items-center">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Menyiapkan ruang Anda
        </p>
      </FlowShell>
    );
  }

  const skip = (
    <button
      type="button"
      onClick={continueAsLearner}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "text-muted-foreground",
      )}
    >
      Lewati untuk sekarang
    </button>
  );

  return (
    <FlowShell action={skip}>
      <section className="max-w-3xl pt-2 sm:pt-14">
        <Kicker>Mulai dengan Hakgyo</Kicker>
        <Headline
          as="h1"
          title="Mau mulai dari mana?"
          muted="Mengajar, bergabung, atau belajar."
          className="mt-3 sm:mt-5"
        />
        <p className={cn(leadText, "mt-6 hidden sm:block")}>
          Hakgyo memisahkan workspace organization dari ruang belajar. Pilih
          jalur yang sesuai sekarang; Anda tetap dapat membuat organization lain
          nanti.
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-3">
        <PathCard
          number={1}
          icon={Building2Icon}
          audience="Untuk pendiri"
          title="Buat organization"
          description="Siapkan workspace, atur kurikulum sebagai Public atau Private, dan kelola pengajar, Group belajar, serta siswa. Anda otomatis menjadi owner."
          featured
        >
          <Link
            href="/organizations/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-11 w-full",
            )}
          >
            Mulai workspace
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </PathCard>

        <PathCard
          number={2}
          icon={KeyRoundIcon}
          audience="Untuk staff"
          title="Pakai invitation"
          description="Masukkan link atau token dari owner atau admin untuk menerima role Teacher atau Admin."
        >
          <form onSubmit={openInvitation} className="grid gap-2">
            <Input
              name="invitation"
              placeholder="Paste link atau token"
              aria-label="Link atau token invitation"
              className="h-11"
            />
            {inviteError ? (
              <p className="text-destructive text-xs">{inviteError}</p>
            ) : null}
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-11 w-full"
            >
              Buka invitation
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </form>
        </PathCard>

        <PathCard
          number={3}
          icon={BookOpenIcon}
          audience="Untuk siswa"
          title="Jelajahi kurikulum"
          description="Tidak perlu organization untuk mengikuti kurikulum dan melanjutkan progres belajar."
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full"
            onClick={continueAsLearner}
          >
            Buka catalog
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </PathCard>
      </section>

      {organizations.error ? (
        <p className="text-destructive mt-6 text-sm">
          Organization belum dapat diperiksa. Anda tetap dapat memilih salah
          satu jalur di atas.
        </p>
      ) : null}
    </FlowShell>
  );
}

/** One way to start, as a card in the landing page's style. */
function PathCard({
  number,
  icon: Icon,
  audience,
  title,
  description,
  featured = false,
  children,
}: {
  number: number;
  icon: LucideIcon;
  audience: string;
  title: string;
  description: string;
  /** The path for the customers Hakgyo is built for, shown in primary. */
  featured?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex flex-col p-4 sm:p-6",
        featured
          ? "bg-primary text-primary-foreground rounded-2xl"
          : surfaceCard,
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            featured
              ? "bg-primary-foreground text-primary"
              : "bg-primary text-primary-foreground",
          )}
        >
          <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="font-mono text-xs opacity-60">0{number}</span>
      </div>
      <Kicker inverted={featured} className="mt-4 sm:mt-10">
        {audience}
      </Kicker>
      <h2 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">
        {title}
      </h2>
      <p
        className={cn(
          "mt-2 mb-4 flex-1 text-sm leading-6 sm:mb-6",
          featured ? "opacity-80" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
      {children}
    </article>
  );
}
