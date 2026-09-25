"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircleIcon,
  PaletteIcon,
  SparklesIcon,
  WandSparklesIcon,
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
import { CenteredImageUpload } from "~/components/ui/centered-image-upload";
import { ColorPicker } from "~/components/ui/color-picker";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { createOrganizationThemeTokens } from "@hakgyo/shared";
import {
  parseOrganizationTheme,
  type OrganizationTheme,
} from "~/lib/organization-theme";
import { normalizeHexColor } from "~/lib/colors";
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

type ThemeSeeds = Pick<
  OrganizationTheme,
  "primary" | "secondary" | "accent" | "destructive"
>;

function seedsOf(theme: OrganizationTheme): ThemeSeeds {
  return {
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    destructive: theme.destructive,
  };
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
  const updateTheme = api.organization.updateTheme.useMutation();
  const generateTheme = api.organization.generateTheme.useMutation();
  const savedTheme = parseOrganizationTheme(rawTheme);
  const [themeActive, setThemeActive] = useState(enabled);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setThemeActive(enabled);
  }

  const [draft, setDraft] = useState<ThemeSeeds | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const savedKey = savedTheme ? JSON.stringify(seedsOf(savedTheme)) : null;
  if (savedKey !== draftKey) {
    setDraftKey(savedKey);
    setDraft(savedTheme ? seedsOf(savedTheme) : null);
  }
  // Preview merges edited seeds over the saved theme so layout tokens keep
  // their database defaults while colors update live.
  const effectiveTheme: OrganizationTheme | null = useMemo(
    () => (savedTheme && draft ? { ...savedTheme, ...draft } : savedTheme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedKey, draft],
  );

  const preview = useMemo(() => {
    if (!effectiveTheme) return null;
    return {
      light: createOrganizationThemeTokens(effectiveTheme, "light"),
      dark: createOrganizationThemeTokens(effectiveTheme, "dark"),
    };
  }, [effectiveTheme]);

  const isDirty =
    !!draft &&
    !!savedTheme &&
    JSON.stringify(draft) !== JSON.stringify(seedsOf(savedTheme));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save seed edits shortly after the user stops changing colors.
  useEffect(() => {
    if (!isDirty || !draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = { ...draft };
    saveTimer.current = setTimeout(() => {
      setSaveState("saving");
      void (async () => {
        try {
          await updateTheme.mutateAsync({
            organizationId,
            theme: snapshot,
          });
          await refreshOrganization();
          setSaveState("idle");
        } catch (error) {
          setSaveState("error");
          toast.error(errorMessage(error));
        }
      })();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, savedKey]);

  function handleSeedChange(
    key: keyof ThemeSeeds,
    value: string | null,
  ) {
    if (!value) return;
    const normalized = normalizeHexColor(value);
    if (!normalized) {
      toast.error("Gunakan format HEX seperti #2563EB.");
      return;
    }
    setDraft((current) => (current ? { ...current, [key]: normalized } : current));
  }

  async function refreshOrganization() {
    await utils.organization.get.invalidate({ organizationId });
    router.refresh();
  }

  async function handleEnabledChange(nextEnabled: boolean) {
    setThemeActive(nextEnabled);
    try {
      await setThemeEnabled.mutateAsync({
        organizationId,
        enabled: nextEnabled,
      });
      await refreshOrganization();
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

  async function handleRegenerate() {
    try {
      await generateTheme.mutateAsync({ organizationId });
      await refreshOrganization();
      toast.success("Tema dibuat ulang dari logo.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <SparklesIcon className="size-4" />
            </span>
            <div className="grid gap-1">
              <CardTitle>Logo &amp; tema</CardTitle>
              <CardDescription>
                Logo dan warna tema workspace.
                {effectiveTheme
                  ? themeActive
                    ? " Tema aktif."
                    : " Tema nonaktif."
                  : null}
              </CardDescription>
            </div>
          </div>
          {effectiveTheme ? (
            <Switch
              aria-label="Aktifkan tema organisasi"
              checked={themeActive}
              disabled={setThemeEnabled.isPending}
              onCheckedChange={(checked) => void handleEnabledChange(checked)}
              className="mt-1 shrink-0"
            />
          ) : null}
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

        {logoUrl && !effectiveTheme ? (
          <div className="bg-muted/50 flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <PaletteIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground text-sm">
                Belum ada tema tersimpan. Buat tema otomatis dari logo, lalu
                sesuaikan warnanya di bawah.
              </p>
            </div>
            <div>
              <Button
                disabled={generateTheme.isPending}
                onClick={() => void handleRegenerate()}
                size="sm"
                variant="outline"
              >
                {generateTheme.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <WandSparklesIcon />
                )}
                Buat tema dari logo
              </Button>
            </div>
          </div>
        ) : null}

        {effectiveTheme && draft && preview ? (
          <div className="grid gap-5">
            <section className="grid gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label>Warna dasar</Label>
                  <Button
                    disabled={generateTheme.isPending || !logoUrl}
                    onClick={() => void handleRegenerate()}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground h-6 gap-1 px-1.5 text-xs font-normal"
                  >
                    {generateTheme.isPending ? (
                      <LoaderCircleIcon className="size-3 animate-spin" />
                    ) : (
                      <WandSparklesIcon className="size-3" />
                    )}
                    Regenerate warna
                  </Button>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Ubah warna benih, pratinjau di bawah ikut berubah langsung.
                  Simpan untuk menerapkannya ke database.
                </p>
              </div>
              <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                {(
                  [
                    { key: "primary", label: "Primer" },
                    { key: "secondary", label: "Sekunder" },
                    { key: "accent", label: "Aksen" },
                    { key: "destructive", label: "Bahaya" },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} className="grid gap-2">
                    <Label htmlFor={`org-theme-${key}`}>{label}</Label>
                    <ColorPicker
                      id={`org-theme-${key}`}
                      label={`Warna ${label.toLowerCase()} organisasi`}
                      value={draft[key]}
                      defaultValue={draft[key]}
                      fallbackLabel="Tersimpan"
                      previewColors={{
                        light: preview.light[key],
                        dark: preview.dark[key],
                      }}
                      onValueChange={(value) => handleSeedChange(key, value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="grid overflow-hidden rounded-xl border lg:grid-cols-[1fr_1.15fr]">
              <div className="col-span-full border-b p-4">
                <p className="text-sm font-medium">Pratinjau langsung</p>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                  {saveState === "saving" ? (
                    <>
                      <LoaderCircleIcon className="size-3 animate-spin" />
                      Menyimpan perubahan warna…
                    </>
                  ) : saveState === "error" ? (
                    <span className="text-destructive">
                      Gagal menyimpan otomatis. Ubah warna lagi untuk mencoba
                      ulang.
                    </span>
                  ) : isDirty ? (
                    "Perubahan warna akan disimpan otomatis."
                  ) : (
                    "Pratinjau memakai tema tersimpan di database."
                  )}
                </p>
              </div>
              {(["light", "dark"] as const).map((mode) => {
                const colors =
                  mode === "light" ? preview.light : preview.dark;
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
