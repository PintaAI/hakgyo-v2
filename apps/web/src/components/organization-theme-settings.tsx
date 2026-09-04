"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircleIcon,
  PaletteIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { shadowToCss } from "~/components/ui/shadow-editor";
import { Switch } from "~/components/ui/switch";
import { getReadableForeground } from "~/lib/colors";
import { parseOrganizationTheme } from "~/lib/organization-theme";
import { api } from "~/trpc/react";

const fontLabels = {
  geist: "Geist",
  inter: "Inter",
  poppins: "Poppins",
  merriweather: "Merriweather",
  jetbrains: "JetBrains Mono",
} as const;

const densityLabels = {
  compact: "Padat",
  comfortable: "Nyaman",
  spacious: "Luas",
} as const;

const radiusLabels = {
  none: "Kotak",
  small: "Halus",
  large: "Bulat",
} as const;

const sizeLabels = {
  small: "Kecil",
  default: "Default",
  large: "Besar",
} as const;

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Tema belum berhasil dibuat. Silakan coba lagi.";
}

function ColorValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="size-7 shrink-0 rounded-md border shadow-xs"
        style={{ backgroundColor: value }}
      />
      <span className="min-w-0">
        <span className="text-muted-foreground block text-[0.65rem]">
          {label}
        </span>
        <code className="block text-xs font-medium">{value}</code>
      </span>
    </div>
  );
}

export function OrganizationThemeSettings({
  enabled,
  logoUrl,
  organizationId,
  theme: rawTheme,
}: {
  enabled: boolean;
  logoUrl: string | null;
  organizationId: string;
  theme: unknown;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const generateTheme = api.organization.generateTheme.useMutation();
  const resetTheme = api.organization.resetTheme.useMutation();
  const setThemeEnabled = api.organization.setThemeEnabled.useMutation();
  const theme = parseOrganizationTheme(rawTheme);
  const [themeActive, setThemeActive] = useState(enabled);
  const busy =
    generateTheme.isPending ||
    resetTheme.isPending ||
    setThemeEnabled.isPending;

  async function handleGenerate() {
    try {
      await generateTheme.mutateAsync({ organizationId });
      setThemeActive(true);
      await utils.organization.get.invalidate({ organizationId });
      router.refresh();
      toast.success("Tema organisasi dibuat dan langsung disimpan.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleReset() {
    try {
      await resetTheme.mutateAsync({ organizationId });
      await utils.organization.get.invalidate({ organizationId });
      router.refresh();
      toast.success("Tema organisasi dikembalikan ke default.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleEnabledChange(nextEnabled: boolean) {
    setThemeActive(nextEnabled);
    try {
      await setThemeEnabled.mutateAsync({
        organizationId,
        enabled: nextEnabled,
      });
      await utils.organization.get.invalidate({ organizationId });
      router.refresh();
      toast.success(
        nextEnabled
          ? "Tema organisasi diaktifkan kembali."
          : "Tema organisasi dimatikan. Tema tersimpan tetap aman.",
      );
    } catch (error) {
      setThemeActive(enabled);
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <SparklesIcon className="size-4" />
          </span>
          <div className="grid gap-1">
            <CardTitle>Tema dari logo dengan AI</CardTitle>
            <CardDescription>
              AI membaca logo lalu memilih warna, mode gelap, font, radius,
              density, ukuran, shadow, dan sidebar. Tema berlaku untuk seluruh
              workspace organisasi.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">
        {!logoUrl ? (
          <div className="bg-muted/50 flex items-start gap-3 rounded-xl border p-4">
            <PaletteIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Unggah logo organisasi di atas terlebih dahulu. Logo menjadi
              sumber warna untuk tema.
            </p>
          </div>
        ) : null}

        {theme ? (
          <div className="grid overflow-hidden rounded-xl border lg:grid-cols-[1fr_1.15fr]">
            <div className="col-span-full flex items-center justify-between gap-4 border-b p-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">Gunakan tema organisasi</p>
                <p className="text-muted-foreground text-xs">
                  {themeActive
                    ? "Tema tersimpan sedang diterapkan ke seluruh workspace."
                    : "Tema tersimpan sedang dimatikan, tetapi tidak dihapus."}
                </p>
              </div>
              <Switch
                aria-label="Gunakan tema organisasi"
                checked={themeActive}
                disabled={busy}
                onCheckedChange={(checked) =>
                  void handleEnabledChange(checked)
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 lg:grid-cols-1">
              <ColorValue label="Aksi" value={theme.primary} />
              <ColorValue label="Latar" value={theme.background} />
              <ColorValue label="Teks" value={theme.foreground} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t p-4 text-xs lg:grid-cols-3 lg:border-t-0 lg:border-l">
              <div>
                <span className="text-muted-foreground block">Mode gelap</span>
                <span className="font-medium">{theme.darkBrightness}%</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Font</span>
                <span className="font-medium">{fontLabels[theme.font]}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Radius</span>
                <span className="font-medium">
                  {radiusLabels[theme.radius]}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Spasi</span>
                <span className="font-medium">
                  {densityLabels[theme.density]}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Ukuran</span>
                <span className="font-medium">{sizeLabels[theme.size]}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Shadow</span>
                <span className="font-medium">
                  {theme.shadow.blur}px · {theme.shadow.opacity}%
                </span>
              </div>
            </div>
            <div
              className="col-span-full flex min-h-36 items-center justify-center border-t p-5"
              style={{
                backgroundColor: theme.background,
                color: theme.foreground,
              }}
            >
              <div
                className="w-full max-w-sm border border-current/15 bg-background/10 p-4"
                style={{
                  borderRadius:
                    theme.radius === "none"
                      ? "0"
                      : theme.radius === "small"
                        ? "0.375rem"
                        : "1rem",
                  boxShadow: shadowToCss(theme.shadow),
                }}
              >
                <p className="text-sm font-semibold">Preview tema</p>
                <p className="mt-1 text-xs opacity-70">
                  Warna turunan dibuat otomatis dan tetap dapat disesuaikan per
                  perangkat.
                </p>
                <span
                  className="mt-4 inline-flex rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: theme.primary,
                    color: getReadableForeground(theme.primary),
                  }}
                >
                  Tombol utama
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!logoUrl || busy} onClick={handleGenerate}>
            {generateTheme.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {theme ? "Buat ulang dari logo" : "Buat tema dari logo"}
          </Button>
          {theme ? (
            <Button disabled={busy} onClick={handleReset} variant="outline">
              {resetTheme.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <RotateCcwIcon />
              )}
              Hapus tema tersimpan
            </Button>
          ) : null}
          <p className="text-muted-foreground max-w-lg text-xs">
            Logo dikirim ke OpenAI hanya saat tombol ini ditekan. Membuat tema
            baru akan mengganti tema organisasi yang tersimpan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
