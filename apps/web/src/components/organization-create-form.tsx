"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hanken_Grotesk, Inter } from "next/font/google";
import { ArrowLeftIcon, Building2Icon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { completeOnboarding } from "~/lib/onboarding";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Organization belum berhasil dibuat.";
}

export function OrganizationCreateForm({ userId }: { userId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const create = api.organization.create.useMutation();
  const [name, setName] = useState("");
  const [enrollmentMode, setEnrollmentMode] = useState<"OPEN" | "INVITE_ONLY">("INVITE_ONLY");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const organization = await create.mutateAsync({
        name: name.trim(),
        defaultEnrollmentMode: enrollmentMode,
      });
      const destination = `/workspace/${organization.slug}/dashboard`;
      completeOnboarding(window.localStorage, userId, destination);
      await utils.organization.list.invalidate();
      toast.success(`${organization.name} siap digunakan.`);
      router.replace(destination);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-5xl space-y-8 font-[family-name:var(--font-inter)]",
      )}
    >
      <Link
        href="/onboarding"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground -ml-2")}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Kembali
      </Link>

      <header className="max-w-2xl">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Workspace baru
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
          Buat workspace untuk tim Anda
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Workspace mengelompokkan course, anggota, dan bahan ajar dalam satu organisasi.
          Anda otomatis menjadi owner dan dapat mengundang tim setelah workspace siap.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          onSubmit={submit}
          noValidate
          className="bg-card ring-foreground/10 rounded-lg p-5 ring-1 sm:p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="organization-name">Nama organization</Label>
            <Input
              id="organization-name"
              value={name}
              maxLength={120}
              placeholder="Hakgyo Academy"
              autoFocus
              required
              className="h-11 px-3 text-base md:text-base"
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Nama tampilan yang dilihat anggota dan siswa. Alamat workspace akan dibuat otomatis dari
              nama dan dapat diubah nanti di Settings → General.
            </p>
          </div>

          <fieldset className="mt-8 grid gap-3">
            <legend className="text-sm font-medium">Tipe course default</legend>
            <p className="text-muted-foreground -mt-1 text-xs">
              Pengaturan berlaku untuk course baru. Setiap course dapat menimpa pilihan ini.
            </p>
            {[
              {
                value: "INVITE_ONLY" as const,
                title: "Private course",
                description: "Hanya siswa yang diundang atau ditambahkan manual yang bisa mengakses.",
              },
              {
                value: "OPEN" as const,
                title: "Public course",
                description: "Siapa pun dapat menemukan dan mendaftar sendiri ke course.",
              },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-lg border p-4 transition-colors",
                  enrollmentMode === option.value
                    ? "border-foreground bg-muted/50"
                    : "hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="enrollmentMode"
                  value={option.value}
                  checked={enrollmentMode === option.value}
                  className="sr-only"
                  onChange={() => setEnrollmentMode(option.value)}
                />
                <span className="text-sm font-medium">{option.title}</span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {option.description}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Link href="/onboarding" className={buttonVariants({ variant: "ghost" })}>
              Batal
            </Link>
            <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
              {create.isPending ? (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              ) : (
                <Building2Icon data-icon="inline-start" />
              )}
              {create.isPending ? "Membuat workspace..." : "Buat organization"}
            </Button>
          </div>
        </form>

        <aside className="bg-card ring-foreground/10 h-fit rounded-lg p-5 ring-1">
          <p className="font-[family-name:var(--font-hanken-grotesk)] font-medium">Setelah workspace dibuat</p>
          <ol className="text-muted-foreground mt-5 space-y-5 text-sm">
            {[
              "Anda otomatis menjadi owner",
              "Permission sederhana aktif secara default",
              "Undang admin dan teacher setelah workspace siap",
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-2.5 border-t pt-5 text-xs leading-relaxed">
            <CheckIcon className="text-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground">
              Workspace dapat diubah kapan saja melalui Settings → General: nama, slug, logo, dan mode
              permission.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
