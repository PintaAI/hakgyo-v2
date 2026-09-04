"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellIcon,
  CheckIcon,
  CircleCheckIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RotateCcwIcon,
  SunIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "~/components/ui/button";
import { useOrganizationTheme } from "~/components/organization-theme-provider";
import { ColorPicker, type ColorPreset } from "~/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  ShadowEditor,
  isShadowValue,
  shadowToCss,
  type ShadowValue,
} from "~/components/ui/shadow-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "~/components/ui/sidebar";
import {
  getContrastRatio,
  getReadableForeground,
  isHexColor,
  normalizeHexColor,
  type ThemeColorPair,
} from "~/lib/colors";
import {
  createOrganizationThemePalette,
  DEFAULT_ORGANIZATION_THEME,
  type OrganizationTheme,
} from "~/lib/organization-theme";
import { cn } from "~/lib/utils";

const STORAGE_KEY = "hakgyo-app-settings";

type Preferences = {
  background: string | null;
  color: string | null;
  darkBrightness: number | null;
  density: OrganizationTheme["density"] | null;
  font: OrganizationTheme["font"] | null;
  foreground: string | null;
  radius: OrganizationTheme["radius"] | null;
  shadow: ShadowValue | null;
  size: OrganizationTheme["size"] | null;
};

type ResolvedPreferences = {
  background: string;
  color: string;
  darkBrightness: number;
  density: OrganizationTheme["density"];
  font: OrganizationTheme["font"];
  foreground: string;
  radius: OrganizationTheme["radius"];
  shadow: ShadowValue;
  size: OrganizationTheme["size"];
};

const defaultPreferences: Preferences = {
  background: null,
  color: null,
  darkBrightness: null,
  density: null,
  font: null,
  foreground: null,
  radius: null,
  shadow: null,
  size: null,
};

const defaultColorSeeds = {
  background: DEFAULT_ORGANIZATION_THEME.background,
  color: DEFAULT_ORGANIZATION_THEME.primary,
  foreground: DEFAULT_ORGANIZATION_THEME.foreground,
} as const;

function resolvePreferences(
  preferences: Preferences,
  organizationTheme: OrganizationTheme | null,
): ResolvedPreferences {
  const defaults = organizationTheme ?? DEFAULT_ORGANIZATION_THEME;

  return {
    background: preferences.background ?? defaults.background,
    color: preferences.color ?? defaults.primary,
    darkBrightness: preferences.darkBrightness ?? defaults.darkBrightness,
    density: preferences.density ?? defaults.density,
    font: preferences.font ?? defaults.font,
    foreground: preferences.foreground ?? defaults.foreground,
    radius: preferences.radius ?? defaults.radius,
    shadow: preferences.shadow ?? defaults.shadow,
    size: preferences.size ?? defaults.size,
  };
}

function createPreferencePalette(preferences: ResolvedPreferences) {
  return createOrganizationThemePalette(
    {
      ...DEFAULT_ORGANIZATION_THEME,
      primary: preferences.color,
      background: preferences.background,
      foreground: preferences.foreground,
    },
    preferences.darkBrightness,
  );
}

type AppSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const accentPresets = [
  { value: "#18181B", label: "Neutral" },
  { value: "#2563EB", label: "Ocean" },
  { value: "#059669", label: "Forest" },
  { value: "#EA580C", label: "Ember" },
  { value: "#7C3AED", label: "Violet" },
  { value: "#DB2777", label: "Rose" },
] as const satisfies readonly ColorPreset[];

const backgroundPresets = [
  { value: "#FFFFFF", label: "Putih" },
  { value: "#FFFBEB", label: "Hangat" },
  { value: "#F0F9FF", label: "Sejuk" },
  { value: "#FFF1F2", label: "Rose" },
  { value: "#171717", label: "Arang" },
  { value: "#0F172A", label: "Malam" },
] as const satisfies readonly ColorPreset[];

const foregroundPresets = [
  { value: "#171717", label: "Arang" },
  { value: "#475569", label: "Slate" },
  { value: "#1E3A8A", label: "Biru" },
  { value: "#581C87", label: "Plum" },
  { value: "#E2E8F0", label: "Kabut" },
  { value: "#FFFFFF", label: "Putih" },
] as const satisfies readonly ColorPreset[];

const legacyAccentColors: Record<string, string | null> = {
  neutral: null,
  blue: "#2563EB",
  green: "#059669",
  orange: "#EA580C",
};

const legacyBackgroundColors: Record<string, string | null> = {
  neutral: null,
  warm: "#FFFBEB",
  cool: "#F0F9FF",
  rose: "#FFF1F2",
};

const legacyForegroundColors: Record<string, string | null> = {
  neutral: null,
  soft: "#475569",
  blue: "#1E3A8A",
  plum: "#581C87",
};

function readColorPreference(
  value: unknown,
  legacyColors: Record<string, string | null>,
) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  if (value in legacyColors) return legacyColors[value] ?? null;
  return normalizeHexColor(value);
}

function isOptionalColor(value: unknown) {
  return value === null || isHexColor(value);
}

function readOptionalChoice<T extends string>(
  value: unknown,
  options: readonly T[],
) {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : null;
}

function isOptionalChoice(value: unknown, options: readonly string[]) {
  return (
    value === null || (typeof value === "string" && options.includes(value))
  );
}

function readDarkBrightness(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return (
    isOptionalColor(preferences.background) &&
    isOptionalColor(preferences.color) &&
    (preferences.darkBrightness === null ||
      (typeof preferences.darkBrightness === "number" &&
        Number.isInteger(preferences.darkBrightness) &&
        preferences.darkBrightness >= 0 &&
        preferences.darkBrightness <= 100)) &&
    isOptionalChoice(preferences.density, [
      "compact",
      "comfortable",
      "spacious",
    ]) &&
    isOptionalChoice(preferences.font, [
      "geist",
      "inter",
      "poppins",
      "merriweather",
      "jetbrains",
    ]) &&
    isOptionalColor(preferences.foreground) &&
    isOptionalChoice(preferences.radius, ["none", "small", "large"]) &&
    (preferences.shadow === null || isShadowValue(preferences.shadow)) &&
    isOptionalChoice(preferences.size, ["small", "default", "large"])
  );
}

function readPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        const raw = parsed as Record<string, unknown>;
        const legacyFonts: Record<string, NonNullable<Preferences["font"]>> = {
          mono: "jetbrains",
          sans: "geist",
          serif: "merriweather",
        };
        const normalized = {
          ...defaultPreferences,
          ...raw,
          background: readColorPreference(
            raw.background,
            legacyBackgroundColors,
          ),
          color: readColorPreference(raw.color, legacyAccentColors),
          darkBrightness: readDarkBrightness(raw.darkBrightness),
          density: readOptionalChoice(raw.density, [
            "compact",
            "comfortable",
            "spacious",
          ] as const),
          font:
            legacyFonts[String(raw.font)] ??
            readOptionalChoice(raw.font, [
              "geist",
              "inter",
              "poppins",
              "merriweather",
              "jetbrains",
            ] as const),
          foreground: readColorPreference(
            raw.foreground,
            legacyForegroundColors,
          ),
          radius:
            String(raw.radius) === "default"
              ? "large"
              : readOptionalChoice(raw.radius, [
                  "none",
                  "small",
                  "large",
                ] as const),
          shadow: isShadowValue(raw.shadow) ? raw.shadow : null,
          size: readOptionalChoice(raw.size, [
            "small",
            "default",
            "large",
          ] as const),
        };
        if (isPreferences(normalized)) return normalized;
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return defaultPreferences;
}

function applyColorPreference(
  root: HTMLElement,
  dataKey: string,
  property: string,
  pair: ThemeColorPair,
) {
  root.dataset[dataKey] = "generated";
  root.style.setProperty(`${property}-light`, pair.light);
  root.style.setProperty(`${property}-dark`, pair.dark);
}

function ChoiceButton({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "hover:bg-accent focus-visible:ring-ring relative flex min-h-16 flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
        active && "border-primary bg-primary/5 ring-primary/20 ring-1",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      {active ? (
        <CheckIcon className="absolute top-2 right-2 size-3.5" />
      ) : null}
    </button>
  );
}

export function AppSettings({ open, onOpenChange }: AppSettingsProps) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const organizationTheme = useOrganizationTheme();
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const effectivePreferences = useMemo(
    () => resolvePreferences(preferences, organizationTheme),
    [organizationTheme, preferences],
  );
  const palette = useMemo(
    () => createPreferencePalette(effectivePreferences),
    [effectivePreferences],
  );

  useEffect(() => {
    const root = document.documentElement;
    applyColorPreference(
      root,
      "appBackground",
      "--app-background",
      palette.background,
    );
    root.style.setProperty("--app-sidebar-light", palette.sidebar.light);
    root.style.setProperty("--app-sidebar-dark", palette.sidebar.dark);
    root.style.setProperty("--app-card-light", palette.card.light);
    root.style.setProperty("--app-card-dark", palette.card.dark);
    applyColorPreference(root, "appColor", "--app-primary", palette.primary);
    applyColorPreference(
      root,
      "appForeground",
      "--app-foreground",
      palette.foreground,
    );

    root.style.setProperty(
      "--app-primary-foreground-light",
      getReadableForeground(palette.primary.light),
    );
    root.style.setProperty(
      "--app-primary-foreground-dark",
      getReadableForeground(palette.primary.dark),
    );

    root.dataset.appDensity = effectivePreferences.density;
    root.dataset.appFont = effectivePreferences.font;
    root.dataset.appRadius = effectivePreferences.radius;
    root.dataset.appShadow = "custom";
    root.dataset.appSize = effectivePreferences.size;
    root.style.setProperty(
      "--app-shadow-2xs",
      shadowToCss(effectivePreferences.shadow, 0.2),
    );
    root.style.setProperty(
      "--app-shadow-xs",
      shadowToCss(effectivePreferences.shadow, 0.35),
    );
    root.style.setProperty(
      "--app-shadow-sm",
      shadowToCss(effectivePreferences.shadow, 0.5),
    );
    root.style.setProperty(
      "--app-shadow-md",
      shadowToCss(effectivePreferences.shadow, 0.75),
    );
    root.style.setProperty(
      "--app-shadow-lg",
      shadowToCss(effectivePreferences.shadow),
    );
    root.style.setProperty(
      "--app-shadow-xl",
      shadowToCss(effectivePreferences.shadow, 1.35),
    );
    root.style.setProperty(
      "--app-shadow-2xl",
      shadowToCss(effectivePreferences.shadow, 1.8),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [effectivePreferences, palette, preferences]);

  function updatePreference<Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
    setTheme("system");
  }

  const activeTheme = theme ?? "system";
  const darkMode = resolvedTheme === "dark";
  const effectiveBackground = darkMode
    ? palette.background.dark
    : palette.background.light;
  const effectiveForeground = darkMode
    ? palette.foreground.dark
    : palette.foreground.light;
  const textContrast = getContrastRatio(
    effectiveBackground,
    effectiveForeground,
  );
  const readableContrast = textContrast >= 4.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100svh-2rem))] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Pengaturan aplikasi</DialogTitle>
          <DialogDescription>
            Sesuaikan tampilan dan nuansa Hakgyo di perangkat ini.
          </DialogDescription>
        </DialogHeader>

        <SidebarProvider className="h-full min-h-0 overflow-hidden">
          <Sidebar
            className="hidden w-52 shrink-0 border-r sm:flex"
            collapsible="none"
          >
            <SidebarHeader className="border-b px-4 py-4">
              <p className="font-heading text-base font-semibold">Settings</p>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Aplikasi</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>
                        <PaletteIcon />
                        <span>Tampilan</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <LanguagesIcon />
                        <span>Bahasa</span>
                        <span className="ml-auto text-[0.6rem] uppercase">
                          Segera
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <BellIcon />
                        <span>Notifikasi</span>
                        <span className="ml-auto text-[0.6rem] uppercase">
                          Segera
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-3">
              <Button
                className="w-full justify-start"
                onClick={resetPreferences}
                size="sm"
                variant="ghost"
              >
                <RotateCcwIcon />
                Kembalikan ke default
              </Button>
            </SidebarFooter>
          </Sidebar>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-6 sm:px-7 sm:pt-7">
              <h2 className="font-heading text-lg font-semibold">Tampilan</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Sesuaikan Hakgyo dengan cara Anda membaca dan bekerja.
              </p>
            </div>

            <div className="grid gap-8 p-5 sm:p-7">
              <section className="grid gap-3">
                <div>
                  <Label>Tema</Label>
                  <p className="text-muted-foreground text-xs">
                    Pilih antarmuka terang, gelap, atau mengikuti sistem.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "light", label: "Terang", icon: SunIcon },
                    { value: "dark", label: "Gelap", icon: MoonIcon },
                    { value: "system", label: "Sistem", icon: MonitorIcon },
                  ].map((option) => (
                    <ChoiceButton
                      active={activeTheme === option.value}
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                    >
                      <span className="grid justify-items-center gap-1.5">
                        <option.icon className="size-4" />
                        {option.label}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="dark-mode-brightness">
                      Kecerahan mode gelap
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Atur seluruh palet gelap tanpa mengubah warna terang.
                    </p>
                  </div>
                  <output
                    className="bg-muted min-w-12 rounded-md px-2 py-1 text-center font-mono text-xs"
                    htmlFor="dark-mode-brightness"
                  >
                    {effectivePreferences.darkBrightness}%
                  </output>
                </div>

                <div className="grid gap-3 rounded-xl border p-4">
                  <input
                    aria-valuetext={`${effectivePreferences.darkBrightness}%`}
                    className="accent-primary h-5 w-full cursor-pointer"
                    id="dark-mode-brightness"
                    max={100}
                    min={0}
                    onChange={(event) =>
                      updatePreference(
                        "darkBrightness",
                        Number(event.target.value),
                      )
                    }
                    step={5}
                    type="range"
                    value={effectivePreferences.darkBrightness}
                  />
                  <div className="text-muted-foreground flex justify-between text-[0.7rem]">
                    <span>Lebih gelap</span>
                    <span>Lebih terang</span>
                  </div>

                  <div
                    className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border text-xs"
                    style={{
                      backgroundColor: palette.background.dark,
                      color: palette.foreground.dark,
                    }}
                  >
                    <div
                      className="flex items-center px-3 py-2 font-medium"
                      style={{ backgroundColor: palette.sidebar.dark }}
                    >
                      Sidebar
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span>Teks</span>
                      <span
                        className="rounded-md px-2 py-1 font-medium"
                        style={{
                          backgroundColor: palette.primary.dark,
                          color: getReadableForeground(palette.primary.dark),
                        }}
                      >
                        Aksi
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Warna</Label>
                  <p className="text-muted-foreground text-xs">
                    Pilih warna dasar; pasangan terang dan gelap dibuat
                    otomatis.
                  </p>
                  {organizationTheme ? (
                    <p className="text-primary mt-1 text-xs">
                      Tema organisasi aktif sebagai default workspace.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 rounded-xl border p-4">
                  <div className="grid gap-2 sm:grid-cols-[1fr_15rem] sm:items-center">
                    <div>
                      <Label htmlFor="app-accent-color">Warna aksi</Label>
                      <p className="text-muted-foreground text-xs">
                        Tombol utama, link, fokus, dan sorotan.
                      </p>
                    </div>
                    <ColorPicker
                      defaultValue={
                        organizationTheme?.primary ?? defaultColorSeeds.color
                      }
                      id="app-accent-color"
                      label="Warna aksi"
                      onValueChange={(value) =>
                        updatePreference("color", value)
                      }
                      previewColors={palette.primary}
                      presets={accentPresets}
                      value={preferences.color}
                    />
                  </div>

                  <div className="border-border grid gap-2 border-t pt-4 sm:grid-cols-[1fr_15rem] sm:items-center">
                    <div>
                      <Label htmlFor="app-background-color">Warna latar</Label>
                      <p className="text-muted-foreground text-xs">
                        Halaman, card, dan popover. Sidebar dibuat sedikit lebih
                        kontras secara otomatis.
                      </p>
                    </div>
                    <ColorPicker
                      defaultValue={
                        organizationTheme?.background ??
                        defaultColorSeeds.background
                      }
                      id="app-background-color"
                      label="Warna latar"
                      onValueChange={(value) =>
                        updatePreference("background", value)
                      }
                      previewColors={palette.background}
                      presets={backgroundPresets}
                      value={preferences.background}
                    />
                  </div>

                  <div className="border-border grid gap-2 border-t pt-4 sm:grid-cols-[1fr_15rem] sm:items-center">
                    <div>
                      <Label htmlFor="app-foreground-color">Warna teks</Label>
                      <p className="text-muted-foreground text-xs">
                        Teks utama pada seluruh permukaan.
                      </p>
                    </div>
                    <ColorPicker
                      defaultValue={
                        organizationTheme?.foreground ??
                        defaultColorSeeds.foreground
                      }
                      id="app-foreground-color"
                      label="Warna teks"
                      onValueChange={(value) =>
                        updatePreference("foreground", value)
                      }
                      previewColors={palette.foreground}
                      presets={foregroundPresets}
                      value={preferences.foreground}
                    />
                  </div>

                  <div
                    aria-live="polite"
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                      readableContrast
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-destructive/20 bg-destructive/10 text-destructive",
                    )}
                  >
                    {readableContrast ? (
                      <CircleCheckIcon className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>
                      Kontras teks {textContrast.toFixed(1)}:1 ·{" "}
                      {readableContrast
                        ? "nyaman dibaca."
                        : "rendah; pilih warna latar atau teks yang lebih berbeda."}
                    </span>
                  </div>
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Bayangan</Label>
                  <p className="text-muted-foreground text-xs">
                    Mulai dari preset, lalu atur arah, kelembutan, penyebaran,
                    dan intensitasnya.
                  </p>
                </div>
                <ShadowEditor
                  onValueChange={(value) => updatePreference("shadow", value)}
                  value={effectivePreferences.shadow}
                />
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Gaya font</Label>
                  <p className="text-muted-foreground text-xs">
                    Pilih karakter tipografi yang dipakai di seluruh aplikasi.
                  </p>
                </div>
                <Select
                  value={effectivePreferences.font}
                  onValueChange={(value) => {
                    if (value) updatePreference("font", value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geist">Geist · Modern sans</SelectItem>
                    <SelectItem value="inter">Inter · UI sans</SelectItem>
                    <SelectItem value="poppins">
                      Poppins · Geometric sans
                    </SelectItem>
                    <SelectItem value="merriweather">
                      Merriweather · Reading serif
                    </SelectItem>
                    <SelectItem value="jetbrains">
                      JetBrains Mono · Monospace
                    </SelectItem>
                  </SelectContent>
                </Select>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Ukuran teks</Label>
                  <p className="text-muted-foreground text-xs">
                    Sesuaikan skala teks dan antarmuka dasar.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "small", label: "Kecil", sample: "text-xs" },
                    { value: "default", label: "Default", sample: "text-sm" },
                    { value: "large", label: "Besar", sample: "text-base" },
                  ].map((option) => (
                    <ChoiceButton
                      active={effectivePreferences.size === option.value}
                      key={option.value}
                      onClick={() =>
                        updatePreference(
                          "size",
                          option.value as Preferences["size"],
                        )
                      }
                    >
                      <span className={option.sample}>{option.label}</span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Spasi</Label>
                  <p className="text-muted-foreground text-xs">
                    Atur seberapa banyak ruang antar elemen antarmuka.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "compact", label: "Padat", bars: "gap-0.5" },
                    {
                      value: "comfortable",
                      label: "Nyaman",
                      bars: "gap-1.5",
                    },
                    { value: "spacious", label: "Luas", bars: "gap-2.5" },
                  ].map((option) => (
                    <ChoiceButton
                      active={effectivePreferences.density === option.value}
                      key={option.value}
                      onClick={() =>
                        updatePreference(
                          "density",
                          option.value as Preferences["density"],
                        )
                      }
                    >
                      <span className="grid justify-items-center gap-2">
                        <span className={cn("grid w-8", option.bars)}>
                          <span className="bg-foreground/70 h-0.5 rounded-full" />
                          <span className="bg-foreground/70 h-0.5 rounded-full" />
                          <span className="bg-foreground/70 h-0.5 rounded-full" />
                        </span>
                        {option.label}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Radius sudut</Label>
                  <p className="text-muted-foreground text-xs">
                    Pilih seberapa tajam atau lembut permukaan terasa.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "none", label: "Kotak", radius: "rounded-none" },
                    { value: "small", label: "Halus", radius: "rounded-sm" },
                    { value: "large", label: "Bulat", radius: "rounded-2xl" },
                  ].map((option) => (
                    <ChoiceButton
                      active={effectivePreferences.radius === option.value}
                      key={option.value}
                      onClick={() =>
                        updatePreference(
                          "radius",
                          option.value as Preferences["radius"],
                        )
                      }
                    >
                      <span className="grid justify-items-center gap-2">
                        <span
                          className={cn(
                            "border-foreground/50 size-7 border-2",
                            option.radius,
                          )}
                        />
                        {option.label}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>

              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="font-medium">Pratinjau langsung</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Perubahan diterapkan langsung. Pengaturan yang tidak diubah
                  mengikuti tema organisasi; override personal tersimpan di
                  perangkat ini. Mode saat ini: {resolvedTheme ?? "sistem"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm">Action utama</Button>
                  <Button size="sm" variant="outline">
                    Sekunder
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
