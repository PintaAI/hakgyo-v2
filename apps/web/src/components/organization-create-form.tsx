"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Building2Icon,
  CheckIcon,
  GlobeIcon,
  LoaderCircleIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { surfaceCard } from "~/components/brand/flow-shell";
import { Kicker } from "~/components/brand/typography";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { completeOnboarding } from "~/lib/onboarding";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const ENROLLMENT_OPTIONS = [
  {
    value: "INVITE_ONLY" as const,
    icon: LockIcon,
    title: "Kurikulum privat",
    description: "Hanya siswa yang diundang atau ditambahkan.",
  },
  {
    value: "OPEN" as const,
    icon: GlobeIcon,
    title: "Kurikulum publik",
    description: "Siapa pun bisa menemukan dan mendaftar sendiri.",
  },
];

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
  const [enrollmentMode, setEnrollmentMode] = useState<"OPEN" | "INVITE_ONLY">(
    "INVITE_ONLY",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const organization = await create.mutateAsync({
        name: name.trim(),
        defaultEnrollmentMode: enrollmentMode,
      });
      // The workspace is the destination once onboarding is done; the
      // optional first-kurikulum step comes before it.
      completeOnboarding(
        window.localStorage,
        userId,
        `/workspace/${organization.slug}/dashboard`,
      );
      await utils.organization.list.invalidate();
      toast.success(`${organization.name} siap digunakan.`);
      router.replace(`/organizations/${organization.slug}/kurikulum-pertama`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 sm:space-y-8">
      <Link
        href="/onboarding"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Kembali
      </Link>

      <header className="flex items-start gap-4">
        <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <Building2Icon className="size-6" />
        </span>
        <div>
          <Kicker>Langkah 1 dari 2</Kicker>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Buat workspace
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Tempat kurikulum, anggota, dan bahan ajar Anda.
          </p>
        </div>
      </header>

      <form
        onSubmit={submit}
        noValidate
        className={cn(
          surfaceCard,
          "space-y-6 p-4 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none sm:p-7",
        )}
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
            Alamat workspace dibuat otomatis dan bisa diubah nanti.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Tipe kurikulum default
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ENROLLMENT_OPTIONS.map((option) => {
              const selected = enrollmentMode === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "has-focus-visible:ring-ring/50 relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-focus-visible:ring-3",
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60",
                  )}
                >
                  <input
                    type="radio"
                    name="enrollmentMode"
                    value={option.value}
                    checked={selected}
                    className="sr-only"
                    onChange={() => setEnrollmentMode(option.value)}
                  />
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <option.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {option.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                      {option.description}
                    </span>
                  </span>
                  {selected ? (
                    <CheckIcon className="text-primary absolute top-3 right-3 size-4" />
                  ) : null}
                </label>
              );
            })}
          </div>
          <p className="text-muted-foreground pt-1 text-xs">
            Bisa diubah per kurikulum.
          </p>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Link
            href="/onboarding"
            className={cn(buttonVariants({ variant: "ghost" }), "max-sm:h-11")}
          >
            Batal
          </Link>
          <Button
            type="submit"
            size="lg"
            className="h-11"
            disabled={create.isPending || name.trim().length === 0}
          >
            {create.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <Building2Icon data-icon="inline-start" />
            )}
            {create.isPending ? "Membuat workspace..." : "Buat organization"}
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <ShieldCheckIcon className="size-4 shrink-0" />
        Anda otomatis menjadi owner. Berikutnya pilih kurikulum pertama
        (opsional), lalu undang tim.
      </p>
    </div>
  );
}
