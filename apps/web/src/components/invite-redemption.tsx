"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileTextIcon,
  KeyRoundIcon,
  LanguagesIcon,
  Layers3Icon,
  LoaderCircleIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { FlowShell, surfaceCard } from "~/components/brand/flow-shell";
import { Headline, Kicker, leadText } from "~/components/brand/typography";
import { Button, buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { appHandoffPath } from "~/lib/mobile-app";
import { formatRupiah } from "~/lib/payments/payment";
import { completeOnboarding } from "~/lib/onboarding";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Invitation belum berhasil diterima. Silakan coba lagi.";
}

/** Intro, then materials; the action card sits beside both on large screens. */
const inviteGrid =
  "grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-14 xl:gap-x-20";

const typeLabels = {
  ORGANIZATION: "Undangan organisasi",
  COURSE: "Undangan course",
  COHORT: "Undangan group belajar",
} as const;

export function InviteRedemption({ token }: { token: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const invite = api.invite.preview.useQuery({ token }, { retry: false });
  const accept = api.invite.accept.useMutation();
  const redirectPath = `/invite/${encodeURIComponent(token)}`;
  const authHref = `/auth?redirectTo=${encodeURIComponent(redirectPath)}`;
  // Most invitees are new to Hakgyo, so start them on account creation.
  const signUpHref = `${authHref}&mode=sign-up`;

  if (invite.isPending || session.isPending) {
    return (
      <FlowShell>
        <div className={inviteGrid}>
          <div className="pt-6 sm:pt-12">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-5 h-10 w-full max-w-md sm:h-14" />
            <Skeleton className="mt-3 h-10 w-2/3 max-w-sm sm:h-14" />
          </div>
          <Skeleton className="h-80 rounded-2xl lg:row-span-2 lg:mt-12" />
        </div>
      </FlowShell>
    );
  }

  if (invite.isError) {
    return (
      <FlowShell>
        <section className="max-w-2xl pt-6 sm:pt-14">
          <Kicker>Undangan</Kicker>
          <Headline
            as="h1"
            title="Undangan tidak ditemukan."
            muted="Link ini sudah tidak berlaku."
            className="mt-3 sm:mt-5"
          />
          <p className={cn(leadText, "mt-4 sm:mt-6")}>
            Periksa kembali link atau minta undangan baru kepada pengirim.
          </p>
        </section>
      </FlowShell>
    );
  }

  const data = invite.data;
  const title =
    data.type === "ORGANIZATION"
      ? data.organization.name
      : data.type === "COHORT"
        ? data.cohort.name
        : data.course.title;
  const description =
    data.type === "ORGANIZATION"
      ? `Bergabung sebagai ${data.role === "ADMIN" ? "Admin" : "Pengajar"}`
      : data.type === "COHORT"
        ? `Group belajar untuk ${data.course.title}`
        : "Akses langsung ke course";
  const unavailable = data.status !== "PENDING";
  const emailMismatch =
    data.type === "ORGANIZATION" && data.emailMatches === false;
  const thumbnailUrl =
    data.type === "ORGANIZATION" ? null : data.course.thumbnailUrl;
  // Paid cohorts are joined through checkout; the invite opens it.
  const paidCohortPrice =
    data.type === "COHORT" && data.cohort.price > 0 ? data.cohort.price : null;
  const checkoutHref =
    data.type === "COHORT"
      ? `/learn/checkout/${encodeURIComponent(data.cohort.id)}?invite=${encodeURIComponent(token)}`
      : null;

  async function acceptInvite() {
    try {
      const result = await accept.mutateAsync({ token });
      if (result.type === "ORGANIZATION" && session.data?.user) {
        completeOnboarding(
          window.localStorage,
          session.data.user.id,
          result.destination,
        );
      }
      toast.success(
        result.type === "ORGANIZATION"
          ? `Berhasil bergabung ke ${result.organization.name}.`
          : result.type === "COHORT"
            ? "Berhasil bergabung ke Group belajar."
            : "Course berhasil ditambahkan ke ruang belajar.",
      );

      // Learning happens in the app, so learners are handed over to it
      // instead of landing on the web course page.
      if (result.type !== "ORGANIZATION") {
        router.replace(appHandoffPath(result.courseId));
        return;
      }

      router.replace(result.destination);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function switchAccount() {
    await authClient.signOut();
    window.location.replace(authHref);
  }

  const statusTitle = unavailable
    ? "Undangan tidak berlaku"
    : session.data?.user
      ? "Konfirmasi undangan"
      : "Masuk untuk melanjutkan";
  const statusText = unavailable
    ? `Status undangan: ${data.status}. Mintalah link baru kepada pengirim.`
    : emailMismatch
      ? `Undangan ini ditujukan ke ${data.emailHint}. Masuklah dengan akun yang menggunakan email tersebut.`
      : !session.data?.user
        ? "Masuk atau buat akun untuk menerima akses. Link undangan ini tetap tersimpan selama proses masuk."
        : paidCohortPrice !== null
          ? "Group belajar ini berbayar. Selesaikan pembayaran untuk mengaktifkan akses belajar."
          : "Akun Anda sudah siap. Terima undangan untuk mengaktifkan akses belajar.";
  const details = [
    ["Organisasi", data.organization.name],
    ...(data.type !== "ORGANIZATION" ? [["Course", data.course.title]] : []),
    ...(paidCohortPrice !== null
      ? [["Biaya", formatRupiah(paidCohortPrice)]]
      : []),
    [
      "Akses",
      data.type === "COHORT"
        ? "Course + group belajar"
        : data.type === "COURSE"
          ? "Course"
          : data.role === "ADMIN"
            ? "Admin"
            : "Pengajar",
    ],
  ] as const;
  const TypeIcon =
    data.type === "ORGANIZATION"
      ? Building2Icon
      : data.type === "COHORT"
        ? UsersIcon
        : BookOpenIcon;
  const action = "h-11 w-full";

  return (
    <FlowShell>
      <div className={inviteGrid}>
        <section className="pt-6 sm:pt-12">
          <Kicker>
            {typeLabels[data.type]} · {data.organization.name}
          </Kicker>
          <Headline
            as="h1"
            title={title}
            muted={description}
            className="mt-3 break-words sm:mt-5"
          />
          {data.type !== "ORGANIZATION" && data.course.description ? (
            <p className={cn(leadText, "mt-4 line-clamp-4 sm:mt-6")}>
              {data.course.description}
            </p>
          ) : null}
          {data.type !== "ORGANIZATION" ? (
            <ul className="mt-5 flex flex-wrap gap-2 sm:mt-8">
              {[
                {
                  icon: UsersIcon,
                  text: `${data.joinedCount} siswa bergabung`,
                },
                // The materials list below already says when nothing is out.
                ...(data.course.itemCount > 0
                  ? [
                      {
                        icon: Layers3Icon,
                        text: `${data.course.moduleCount} bab · ${data.course.itemCount} materi`,
                      },
                    ]
                  : []),
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="border-border bg-card flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums sm:text-sm"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <aside
          className={cn(
            surfaceCard,
            "overflow-hidden lg:sticky lg:top-8 lg:row-span-2 lg:mt-12 lg:self-start",
          )}
        >
          {thumbnailUrl ? (
            <div className="bg-muted relative aspect-[16/9]">
              <Image
                src={thumbnailUrl}
                alt=""
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 384px"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                {unavailable ? (
                  <KeyRoundIcon className="size-5" strokeWidth={1.5} />
                ) : (
                  <TypeIcon className="size-5" strokeWidth={1.5} />
                )}
              </span>
              <h2 className="text-lg font-medium tracking-tight sm:text-xl">
                {statusTitle}
              </h2>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {statusText}
            </p>

            <div className="mt-5">
              {!unavailable && !session.data?.user ? (
                <Link
                  href={data.type === "ORGANIZATION" ? authHref : signUpHref}
                  className={cn(buttonVariants({ size: "lg" }), action)}
                >
                  {data.type === "ORGANIZATION"
                    ? "Masuk atau buat akun"
                    : "Buat akun atau masuk"}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              ) : null}

              {!unavailable &&
              session.data?.user &&
              paidCohortPrice !== null &&
              checkoutHref ? (
                <Link
                  href={checkoutHref}
                  className={cn(buttonVariants({ size: "lg" }), action)}
                >
                  Lanjut ke pembayaran
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              ) : null}

              {!unavailable &&
              session.data?.user &&
              !emailMismatch &&
              paidCohortPrice === null ? (
                <Button
                  size="lg"
                  className={action}
                  disabled={accept.isPending}
                  onClick={() => void acceptInvite()}
                >
                  {accept.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <CheckCircle2Icon data-icon="inline-start" />
                  )}
                  Terima undangan
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              ) : null}

              {emailMismatch && session.data?.user ? (
                <Button
                  variant="outline"
                  size="lg"
                  className={action}
                  onClick={() => void switchAccount()}
                >
                  Gunakan akun lain
                </Button>
              ) : null}
            </div>

            <dl className="divide-border border-border mt-5 divide-y border-t text-sm">
              {details.map(([term, value]) => (
                <div
                  key={term}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        {data.type !== "ORGANIZATION" ? (
          <section className="lg:pt-4">
            <Kicker>Yang akan dipelajari</Kicker>
            <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Materi di course ini
            </h2>
            {data.course.items.length > 0 ? (
              <>
                <ol className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                  {data.course.items.map((item, index) => {
                    const ItemIcon =
                      item.type === "ASSESSMENT"
                        ? ClipboardCheckIcon
                        : item.type === "VOCABULARY_SET"
                          ? LanguagesIcon
                          : FileTextIcon;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          surfaceCard,
                          "min-w-0 items-center gap-3 rounded-xl p-3",
                          index >= 3 ? "hidden sm:flex" : "flex",
                        )}
                      >
                        <span className="bg-secondary grid size-9 shrink-0 place-items-center rounded-lg">
                          <ItemIcon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-muted-foreground block truncate text-xs">
                            {item.moduleTitle}
                          </span>
                          <span className="block truncate text-sm font-medium">
                            {item.title}
                          </span>
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {data.course.itemCount > 3 ? (
                  <p className="text-muted-foreground mt-3 text-xs sm:hidden">
                    +{data.course.itemCount - 3} materi lainnya setelah
                    bergabung.
                  </p>
                ) : null}
                {data.course.itemCount > data.course.items.length ? (
                  <p className="text-muted-foreground mt-3 hidden text-xs sm:block">
                    +{data.course.itemCount - data.course.items.length} materi
                    lainnya setelah bergabung.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="border-border mt-5 rounded-2xl border border-dashed px-4 py-8 text-center">
                <Layers3Icon className="text-muted-foreground mx-auto size-5" />
                <p className="mt-3 text-sm font-medium">
                  Materi belum dipublikasikan
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Daftar materi akan muncul setelah pengajar menerbitkannya.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-10 text-xs leading-relaxed sm:mt-14">
        Dengan melanjutkan, Anda menerima akses sesuai undangan yang diberikan
        oleh {data.organization.name}.
      </p>
    </FlowShell>
  );
}
