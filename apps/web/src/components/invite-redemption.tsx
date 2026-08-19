"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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

const typeLabels = {
  ORGANIZATION: "Invitation organization",
  COURSE: "Invitation course",
  COHORT: "Invitation cohort",
} as const;

export function InviteRedemption({ token }: { token: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const invite = api.invite.preview.useQuery({ token }, { retry: false });
  const accept = api.invite.accept.useMutation();
  const redirectPath = `/invite/${encodeURIComponent(token)}`;
  const authHref = `/auth?redirectTo=${encodeURIComponent(redirectPath)}`;

  if (invite.isPending || session.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3efe4] px-5 py-10">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-52 rounded-[1.75rem]" />
          <Skeleton className="h-48 rounded-[1.75rem]" />
        </div>
      </main>
    );
  }

  if (invite.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3efe4] px-5 py-10">
        <Card className="w-full max-w-xl rounded-[1.75rem] text-center">
          <CardContent className="py-14">
            <KeyRoundIcon className="text-muted-foreground mx-auto size-9" />
            <h1 className="font-heading mt-4 text-2xl font-semibold">
              Invitation tidak ditemukan
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Periksa kembali link atau minta invitation baru kepada pengirim.
            </p>
          </CardContent>
        </Card>
      </main>
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
      ? `Bergabung sebagai ${data.role === "ADMIN" ? "Admin" : "Teacher"}`
      : data.type === "COHORT"
        ? `Group belajar untuk ${data.course.title}`
        : "Akses langsung ke course";
  const unavailable = data.status !== "PENDING";
  const emailMismatch =
    data.type === "ORGANIZATION" && data.emailMatches === false;

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
            ? "Berhasil bergabung ke cohort."
            : "Course berhasil ditambahkan ke ruang belajar.",
      );
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3efe4] px-5 py-8 text-[#191b17] sm:px-10 lg:py-14">
      <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl items-center">
        <div className="pointer-events-none absolute -top-32 -right-52 size-[28rem] rounded-full border border-[#191b17]/10" />
        <div className="w-full space-y-4">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-[#171915] px-6 py-9 text-[#f5f3e9] shadow-[7px_7px_0_#d7a83f] sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute top-0 right-0 size-48 translate-x-16 -translate-y-20 rounded-full border border-white/20" />
            <Badge className="border-white/20 bg-white/10 text-white">
              {typeLabels[data.type]}
            </Badge>
            <p className="mt-7 text-xs font-bold tracking-[0.18em] text-white/45 uppercase">
              {data.organization.name}
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-none font-semibold sm:text-6xl">
              {title}
            </h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
              {data.type === "ORGANIZATION" ? (
                <Building2Icon className="size-4" />
              ) : data.type === "COHORT" ? (
                <UsersIcon className="size-4" />
              ) : (
                <BookOpenIcon className="size-4" />
              )}
              {description}
            </p>
          </section>

          <Card className="rounded-[1.75rem] border-[#191b17]/15 bg-white/65 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                {unavailable
                  ? "Invitation sudah tidak berlaku"
                  : session.data?.user
                    ? "Konfirmasi invitation"
                    : "Masuk untuk melanjutkan"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                {unavailable
                  ? `Status invitation: ${data.status}. Mintalah link baru kepada pengirim.`
                  : emailMismatch
                    ? `Invitation ini ditujukan ke ${data.emailHint}. Masuklah dengan akun yang menggunakan email tersebut.`
                    : !session.data?.user
                      ? "Konteks invitation akan tetap tersimpan melalui URL. Anda dapat login, membuat akun baru, atau melanjutkan dengan Google."
                      : "Akun Anda sudah siap. Terima invitation untuk mengaktifkan akses."}
              </p>

              {!unavailable && !session.data?.user ? (
                <Link
                  href={authHref}
                  className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
                >
                  Masuk atau buat akun
                  <ArrowRightIcon />
                </Link>
              ) : null}

              {!unavailable && session.data?.user && !emailMismatch ? (
                <Button
                  size="lg"
                  className="mt-6 w-full"
                  disabled={accept.isPending}
                  onClick={() => void acceptInvite()}
                >
                  {accept.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <CheckCircle2Icon />
                  )}
                  Terima invitation
                  <ArrowRightIcon />
                </Button>
              ) : null}

              {emailMismatch && session.data?.user ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => void switchAccount()}
                >
                  Gunakan akun lain
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
