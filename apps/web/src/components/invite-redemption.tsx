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
  ORGANIZATION: "Undangan organisasi",
  COURSE: "Undangan course",
  COHORT: "Undangan group belajar",
} as const;

function InviteBrand() {
  return (
    <header className="mb-5 flex items-center gap-2.5 sm:mb-8 sm:gap-3">
      <span className="bg-foreground text-background grid size-8 place-items-center rounded-lg sm:size-9">
        <BookOpenIcon className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block font-[family-name:var(--font-hanken-grotesk)] text-base font-medium tracking-tight">
          Hakgyo
        </span>
        <span className="text-muted-foreground block text-xs">
          Ruang belajar
        </span>
      </span>
    </header>
  );
}

export function InviteRedemption({ token }: { token: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const invite = api.invite.preview.useQuery({ token }, { retry: false });
  const accept = api.invite.accept.useMutation();
  const redirectPath = `/invite/${encodeURIComponent(token)}`;
  const authHref = `/auth?redirectTo=${encodeURIComponent(redirectPath)}`;

  if (invite.isPending || session.isPending) {
    return (
      <main className="bg-background text-foreground min-h-screen px-3 py-4 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <InviteBrand />
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
            <Skeleton className="min-h-[18rem] rounded-xl sm:min-h-[24rem]" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (invite.isError) {
    return (
      <main className="bg-background text-foreground min-h-screen px-3 py-4 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <InviteBrand />
          <Card className="mx-auto max-w-lg rounded-xl">
            <CardContent className="py-10 text-center sm:py-12">
              <span className="bg-muted mx-auto grid size-10 place-items-center rounded-lg">
                <KeyRoundIcon className="text-muted-foreground size-5" />
              </span>
              <h1 className="mt-4 font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
                Undangan tidak ditemukan
              </h1>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
                Periksa kembali link atau minta undangan baru kepada pengirim.
              </p>
            </CardContent>
          </Card>
        </div>
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
  const thumbnailUrl =
    data.type === "ORGANIZATION" ? null : data.course.thumbnailUrl;

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

      if (result.type !== "ORGANIZATION") {
        const fallback = window.setTimeout(() => {
          document.removeEventListener("visibilitychange", handleVisibility);
          if (document.visibilityState === "visible") {
            router.replace(result.destination);
            router.refresh();
          }
        }, 1800);
        function handleVisibility() {
          if (document.visibilityState === "hidden") {
            window.clearTimeout(fallback);
            document.removeEventListener("visibilitychange", handleVisibility);
          }
        }
        document.addEventListener("visibilitychange", handleVisibility);
        window.location.assign(
          `hakgyo://courses/${encodeURIComponent(result.courseId)}`,
        );
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

  return (
    <main className="bg-background text-foreground min-h-screen px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <InviteBrand />

        <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <section className="relative flex min-h-[18rem] items-end overflow-hidden rounded-xl bg-[#171915] p-4 text-[#f5f3e9] sm:min-h-[28rem] sm:p-8">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt=""
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-black/65" />
            <div className="pointer-events-none absolute top-0 right-0 size-52 translate-x-16 -translate-y-20 rounded-full border border-current opacity-10" />
            <div className="pointer-events-none absolute top-0 right-0 size-36 translate-x-10 -translate-y-12 rounded-full border border-current opacity-10" />
            <div className="relative max-w-2xl">
              <Badge className="border-white/20 bg-white/10 text-[#f5f3e9]">
                {typeLabels[data.type]}
              </Badge>
              <p className="mt-4 text-[10px] font-semibold tracking-[0.18em] text-[#aaa99f] uppercase sm:mt-6 sm:text-[11px]">
                {data.organization.name}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-2xl leading-tight font-medium tracking-tight sm:mt-3 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-xs leading-relaxed text-[#aaa99f] sm:mt-4 sm:text-sm">
                {data.type === "ORGANIZATION" ? (
                  <Building2Icon className="size-4" data-icon="inline-start" />
                ) : data.type === "COHORT" ? (
                  <UsersIcon className="size-4" data-icon="inline-start" />
                ) : (
                  <BookOpenIcon className="size-4" data-icon="inline-start" />
                )}
                {description}
              </p>
              {data.type !== "ORGANIZATION" && data.course.description ? (
                <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-relaxed text-[#aaa99f] sm:mt-4 sm:line-clamp-3 sm:text-sm">
                  {data.course.description}
                </p>
              ) : null}
            </div>
          </section>

          <Card className="rounded-xl">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                  {unavailable ? (
                    <KeyRoundIcon className="size-4" />
                  ) : (
                    <CheckCircle2Icon className="size-4" />
                  )}
                </span>
                <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium tracking-tight sm:text-xl">
                  {unavailable
                    ? "Undangan tidak berlaku"
                    : session.data?.user
                      ? "Konfirmasi undangan"
                      : "Masuk untuk melanjutkan"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:gap-5">
              <p className="text-muted-foreground order-1 text-sm leading-relaxed">
                {unavailable
                  ? `Status undangan: ${data.status}. Mintalah link baru kepada pengirim.`
                  : emailMismatch
                    ? `Undangan ini ditujukan ke ${data.emailHint}. Masuklah dengan akun yang menggunakan email tersebut.`
                    : !session.data?.user
                      ? "Masuk atau buat akun untuk menerima akses. Link undangan ini tetap tersimpan selama proses masuk."
                      : "Akun Anda sudah siap. Terima undangan untuk mengaktifkan akses belajar."}
              </p>

              <dl className="divide-border order-3 overflow-hidden rounded-lg border lg:order-2">
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="text-muted-foreground text-xs">Organisasi</dt>
                  <dd className="truncate text-xs font-medium">
                    {data.organization.name}
                  </dd>
                </div>
                {data.type !== "ORGANIZATION" ? (
                  <div className="border-border flex items-center justify-between gap-4 border-t px-3 py-2.5">
                    <dt className="text-muted-foreground text-xs">Course</dt>
                    <dd className="truncate text-xs font-medium">
                      {data.course.title}
                    </dd>
                  </div>
                ) : null}
                <div className="border-border flex items-center justify-between gap-4 border-t px-3 py-2.5">
                  <dt className="text-muted-foreground text-xs">Akses</dt>
                  <dd className="text-xs font-medium">
                    {data.type === "COHORT"
                      ? "Course + group belajar"
                      : data.type === "COURSE"
                        ? "Course"
                        : data.role === "ADMIN"
                          ? "Admin"
                          : "Pengajar"}
                  </dd>
                </div>
                {data.type !== "ORGANIZATION" ? (
                  <>
                    <div className="border-border flex items-center justify-between gap-4 border-t px-3 py-2.5">
                      <dt className="text-muted-foreground text-xs">
                        Sudah bergabung
                      </dt>
                      <dd className="text-xs font-medium tabular-nums">
                        {data.joinedCount} siswa
                      </dd>
                    </div>
                    <div className="border-border flex items-center justify-between gap-4 border-t px-3 py-2.5">
                      <dt className="text-muted-foreground text-xs">
                        Kurikulum
                      </dt>
                      <dd className="text-xs font-medium tabular-nums">
                        {data.course.moduleCount} bab · {data.course.itemCount}{" "}
                        materi
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>

              {!unavailable && !session.data?.user ? (
                <Link
                  href={authHref}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "order-2 h-11 w-full lg:order-3 lg:h-10",
                  )}
                >
                  Masuk atau buat akun
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              ) : null}

              {!unavailable && session.data?.user && !emailMismatch ? (
                <Button
                  size="lg"
                  className="order-2 h-11 w-full lg:order-3 lg:h-10"
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
                  className="order-2 h-11 w-full lg:order-3 lg:h-10"
                  onClick={() => void switchAccount()}
                >
                  Gunakan akun lain
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {data.type !== "ORGANIZATION" ? (
          <Card className="mt-3 rounded-xl sm:mt-4">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                  <Layers3Icon className="size-4" />
                </span>
                <div>
                  <CardTitle className="font-[family-name:var(--font-hanken-grotesk)] text-lg font-medium tracking-tight">
                    List materi Tersedia!
                  </CardTitle>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Materi terpublikasi yang akan dipelajari dalam course ini.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.course.items.length > 0 ? (
                <>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.course.items.map((item, index) => (
                      <li
                        key={item.id}
                        className={cn(
                          "border-border min-w-0 items-center gap-3 rounded-lg border p-3",
                          index >= 3 ? "hidden sm:flex" : "flex",
                        )}
                      >
                        <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
                          {item.type === "ASSESSMENT" ? (
                            <ClipboardCheckIcon className="size-4" />
                          ) : item.type === "VOCABULARY_SET" ? (
                            <LanguagesIcon className="size-4" />
                          ) : (
                            <FileTextIcon className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {item.moduleTitle}
                          </span>
                          <span className="text-foreground block truncate text-sm font-medium">
                            {item.title}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
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
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <Layers3Icon className="text-muted-foreground mx-auto size-5" />
                  <p className="text-foreground mt-3 text-sm font-medium">
                    Materi belum dipublikasikan
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Daftar materi akan muncul setelah pengajar menerbitkannya.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <p className="text-muted-foreground mt-6 px-3 text-center text-[11px] leading-relaxed sm:mt-8 sm:text-xs">
          Dengan melanjutkan, Anda menerima akses sesuai undangan yang diberikan
          oleh {data.organization.name}.
        </p>
      </div>
    </main>
  );
}
