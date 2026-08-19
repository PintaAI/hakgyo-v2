"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Building2Icon,
  CheckIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { completeOnboarding } from "~/lib/onboarding";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

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
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<"OPEN" | "INVITE_ONLY">(
    "INVITE_ONLY",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const organization = await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
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
    <main className="min-h-screen bg-[#171915] px-5 py-8 text-[#f5f3e9] sm:px-10 lg:px-14 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/onboarding"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-white/65 hover:bg-white/10 hover:text-white",
          )}
        >
          <ArrowLeftIcon />
          Kembali
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="pt-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-[#d7a83f] text-[#171915] shadow-[5px_5px_0_#f5f3e9]">
              <Building2Icon className="size-7" />
            </div>
            <p className="mt-10 text-xs font-black tracking-[0.2em] text-[#d7a83f] uppercase">
              Workspace baru
            </p>
            <h1 className="mt-4 max-w-lg font-serif text-5xl leading-[0.96] font-semibold tracking-[-0.04em] sm:text-6xl">
              Bangun ruang belajar Anda.
            </h1>
            <ul className="mt-8 grid gap-4 text-sm text-white/65">
              {[
                "Anda otomatis menjadi owner",
                "Permission sederhana aktif secara default",
                "Invite admin dan teacher setelah workspace siap",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full border border-[#d7a83f]/50 text-[#d7a83f]">
                    <CheckIcon className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <form
            onSubmit={submit}
            className="rounded-[2rem] bg-[#f5f3e9] p-6 text-[#191b17] shadow-[10px_10px_0_#d7a83f] sm:p-9"
          >
            <div className="grid gap-2">
              <Label htmlFor="organization-name">Nama organization</Label>
              <Input
                id="organization-name"
                value={name}
                maxLength={120}
                placeholder="Hakgyo Academy"
                autoFocus
                required
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!slugEdited) setSlug(slugify(nextName));
                }}
              />
            </div>

            <div className="mt-6 grid gap-2">
              <Label htmlFor="organization-slug">Alamat workspace</Label>
              <div className="flex items-center rounded-lg border bg-white focus-within:ring-2 focus-within:ring-[#8b6416]">
                <span className="text-muted-foreground pl-3 text-sm">
                  /workspace/
                </span>
                <Input
                  id="organization-slug"
                  value={slug}
                  minLength={2}
                  maxLength={80}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  className="border-0 bg-transparent font-mono shadow-none focus-visible:ring-0"
                  required
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(slugify(event.target.value));
                  }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Huruf kecil, angka, dan tanda hubung. Harus unik.
              </p>
            </div>

            <fieldset className="mt-8 grid gap-3">
              <legend className="text-sm font-medium">
                Enrollment default
              </legend>
              {[
                {
                  value: "INVITE_ONLY" as const,
                  title: "Invitation only",
                  description:
                    "Learner perlu invitation atau enrollment manual.",
                },
                {
                  value: "OPEN" as const,
                  title: "Open enrollment",
                  description:
                    "Learner dapat mendaftar sendiri ke course publik.",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-colors",
                    enrollmentMode === option.value
                      ? "border-[#8b6416] bg-[#d7a83f]/10"
                      : "hover:bg-black/[0.03]",
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
                  <span className="font-semibold">{option.title}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {option.description}
                  </span>
                </label>
              ))}
            </fieldset>

            <Button
              type="submit"
              size="lg"
              className="mt-9 w-full"
              disabled={
                create.isPending || name.trim().length === 0 || slug.length < 2
              }
            >
              {create.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <Building2Icon />
              )}
              Buat organization
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
