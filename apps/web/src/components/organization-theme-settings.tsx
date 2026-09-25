"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaletteIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { CenteredImageUpload } from "~/components/ui/centered-image-upload";
import { Switch } from "~/components/ui/switch";
import { createOrganizationThemeTokens } from "@hakgyo/shared";
import { parseOrganizationTheme } from "~/lib/organization-theme";
import { api } from "~/trpc/react";

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Tema belum berhasil diperbarui. Silakan coba lagi.";
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
  accept,
  enabled,
  logoBusy,
  logoName,
  logoUrl,
  onRemoveLogo,
  onUploadLogo,
  organizationId,
  theme: rawTheme,
}: {
  accept: string;
  enabled: boolean;
  logoBusy: boolean;
  logoName: string;
  logoUrl: string | null;
  onRemoveLogo: () => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
  organizationId: string;
  theme: unknown;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const setThemeEnabled = api.organization.setThemeEnabled.useMutation();
  const theme = parseOrganizationTheme(rawTheme);
  const [themeActive, setThemeActive] = useState(enabled);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setThemeActive(enabled);
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
            <CardTitle>Logo &amp; tema</CardTitle>
            <CardDescription>
              Logo tampil di seluruh workspace dan menjadi sumber warna tema
              untuk mode terang dan gelap di web dan mobile.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">
        <CenteredImageUpload
          id="organization-logo"
          value={logoUrl}
          alt={`Logo ${logoName}`}
          accept={accept}
          busy={logoBusy}
          onUpload={onUploadLogo}
          onRemove={onRemoveLogo}
          previewClassName="aspect-square w-20 rounded-xl"
          placeholder={
            <span className="text-xl font-semibold">
              {logoName.charAt(0).toUpperCase()}
            </span>
          }
          uploadLabel="Unggah logo"
          replaceLabel="Ganti logo"
        />

        {!logoUrl ? (
          <div className="bg-muted/50 flex items-start gap-3 rounded-xl border p-4">
            <PaletteIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Unggah logo organisasi terlebih dahulu. Tema akan dibuat otomatis
              dari logo tersebut.
            </p>
          </div>
        ) : null}

        {logoUrl && !theme ? (
          <div className="bg-muted/50 flex items-start gap-3 rounded-xl border p-4">
            <PaletteIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Belum ada tema tersimpan. Unggah ulang logo untuk membuat tema
              secara otomatis.
            </p>
          </div>
        ) : null}

        {theme ? (
          <div className="grid overflow-hidden rounded-xl border lg:grid-cols-[1fr_1.15fr]">
            <div className="col-span-full flex items-center justify-between gap-4 border-b p-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">Aktifkan tema organisasi</p>
                <p className="text-muted-foreground text-xs">
                  {themeActive
                    ? "Tema tersimpan sedang diterapkan ke seluruh workspace."
                    : "Tema tersimpan sedang dimatikan, tetapi tidak dihapus."}
                </p>
              </div>
              <Switch
                aria-label="Aktifkan tema organisasi"
                checked={themeActive}
                disabled={setThemeEnabled.isPending}
                onCheckedChange={(checked) => void handleEnabledChange(checked)}
              />
            </div>
            <div className="col-span-full grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              <ColorValue label="Primer" value={theme.primary} />
              <ColorValue label="Sekunder" value={theme.secondary} />
              <ColorValue label="Aksen" value={theme.accent} />
              <ColorValue label="Bahaya" value={theme.destructive} />
            </div>
            {(["light", "dark"] as const).map((mode) => {
              const colors = createOrganizationThemeTokens(theme, mode);
              return (
                <div
                  key={mode}
                  className="grid gap-3 border-t p-4"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.foreground,
                  }}
                >
                  <p className="text-sm font-semibold">
                    {mode === "light" ? "Mode terang" : "Mode gelap"}
                  </p>
                  <div
                    className="flex overflow-hidden rounded-xl border"
                    style={{ borderColor: colors.border }}
                  >
                    <div
                      className="grid content-start gap-3 p-3 text-xs"
                      style={{
                        backgroundColor: colors.sidebar,
                        color: colors.sidebarForeground,
                      }}
                    >
                      <span>Workspace</span>
                      <span
                        className="rounded-md p-2"
                        style={{
                          backgroundColor: colors.sidebarAccent,
                          color: colors.sidebarAccentForeground,
                        }}
                      >
                        Beranda
                      </span>
                    </div>
                    <div
                      className="grid flex-1 gap-3 p-4"
                      style={{
                        backgroundColor: colors.card,
                        color: colors.cardForeground,
                      }}
                    >
                      <p className="text-sm font-medium">Preview tema</p>
                      <p
                        className="text-xs"
                        style={{ color: colors.mutedForeground }}
                      >
                        Seluruh warna turunan dibuat otomatis.
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className="rounded-md px-3 py-2"
                          style={{
                            backgroundColor: colors.primary,
                            color: colors.primaryForeground,
                          }}
                        >
                          Utama
                        </span>
                        <span
                          className="rounded-md px-3 py-2"
                          style={{
                            backgroundColor: colors.secondary,
                            color: colors.secondaryForeground,
                          }}
                        >
                          Sekunder
                        </span>
                        <span
                          className="rounded-md px-3 py-2"
                          style={{
                            backgroundColor: colors.destructive,
                            color: colors.destructiveForeground,
                          }}
                        >
                          Hapus
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
