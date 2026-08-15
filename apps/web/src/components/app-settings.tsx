"use client";

import { useEffect, useState } from "react";
import {
  BellIcon,
  CheckIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RotateCcwIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
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
import { cn } from "~/lib/utils";

const STORAGE_KEY = "hakgyo-app-settings";

const defaultPreferences = {
  color: "neutral",
  density: "comfortable",
  font: "geist",
  radius: "default",
  size: "default",
} as const;

type Preferences = {
  color: "neutral" | "blue" | "green" | "orange";
  density: "compact" | "comfortable" | "spacious";
  font: "geist" | "inter" | "poppins" | "merriweather" | "jetbrains";
  radius: "none" | "small" | "default" | "large";
  size: "small" | "default" | "large";
};

type AppSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const colorOptions = [
  { value: "neutral", label: "Neutral", className: "bg-zinc-700" },
  { value: "blue", label: "Ocean", className: "bg-blue-600" },
  { value: "green", label: "Forest", className: "bg-emerald-600" },
  { value: "orange", label: "Ember", className: "bg-orange-600" },
] as const;

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return (
    colorOptions.some((option) => option.value === preferences.color) &&
    ["compact", "comfortable", "spacious"].includes(
      String(preferences.density),
    ) &&
    ["geist", "inter", "poppins", "merriweather", "jetbrains"].includes(
      String(preferences.font),
    ) &&
    ["none", "small", "default", "large"].includes(
      String(preferences.radius),
    ) &&
    ["small", "default", "large"].includes(String(preferences.size))
  );
}

function readPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && "font" in parsed) {
        const legacyFonts: Record<string, Preferences["font"]> = {
          mono: "jetbrains",
          sans: "geist",
          serif: "merriweather",
        };
        const legacyFont = legacyFonts[String(parsed.font)];
        if (legacyFont) parsed.font = legacyFont;
      }
      if (isPreferences(parsed)) return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return defaultPreferences;
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
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appColor = preferences.color;
    root.dataset.appDensity = preferences.density;
    root.dataset.appFont = preferences.font;
    root.dataset.appRadius = preferences.radius;
    root.dataset.appSize = preferences.size;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100svh-2rem))] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="sr-only">
          <DialogTitle>App settings</DialogTitle>
          <DialogDescription>
            Customize how Hakgyo looks and feels on this device.
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
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>
                        <PaletteIcon />
                        <span>Appearance</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <LanguagesIcon />
                        <span>Language</span>
                        <span className="ml-auto text-[0.6rem] uppercase">
                          Soon
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <BellIcon />
                        <span>Notifications</span>
                        <span className="ml-auto text-[0.6rem] uppercase">
                          Soon
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
                Reset to default
              </Button>
            </SidebarFooter>
          </Sidebar>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-6 sm:px-7 sm:pt-7">
              <h2 className="font-heading text-lg font-semibold">Appearance</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Tune Hakgyo for the way you read and work.
              </p>
            </div>

            <div className="grid gap-8 p-5 sm:p-7">
              <section className="grid gap-3">
                <div>
                  <Label>Theme</Label>
                  <p className="text-muted-foreground text-xs">
                    Choose a light, dark, or system-matched interface.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "light", label: "Light", icon: SunIcon },
                    { value: "dark", label: "Dark", icon: MoonIcon },
                    { value: "system", label: "System", icon: MonitorIcon },
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
                <div>
                  <Label>Color scheme</Label>
                  <p className="text-muted-foreground text-xs">
                    Set the accent color used for actions and highlights.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {colorOptions.map((option) => (
                    <ChoiceButton
                      active={preferences.color === option.value}
                      key={option.value}
                      onClick={() => updatePreference("color", option.value)}
                    >
                      <span className="grid justify-items-center gap-2">
                        <span
                          className={cn(
                            "size-5 rounded-full",
                            option.className,
                          )}
                        />
                        {option.label}
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                <div>
                  <Label>Font style</Label>
                  <p className="text-muted-foreground text-xs">
                    Select the typeface personality used across the app.
                  </p>
                </div>
                <Select
                  value={preferences.font}
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
                  <Label>Text size</Label>
                  <p className="text-muted-foreground text-xs">
                    Adjust the base text and interface scale.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "small", label: "Small", sample: "text-xs" },
                    { value: "default", label: "Default", sample: "text-sm" },
                    { value: "large", label: "Large", sample: "text-base" },
                  ].map((option) => (
                    <ChoiceButton
                      active={preferences.size === option.value}
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
                  <Label>Spacing</Label>
                  <p className="text-muted-foreground text-xs">
                    Control how much room interface elements use.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "compact", label: "Compact", bars: "gap-0.5" },
                    {
                      value: "comfortable",
                      label: "Comfortable",
                      bars: "gap-1.5",
                    },
                    { value: "spacious", label: "Spacious", bars: "gap-2.5" },
                  ].map((option) => (
                    <ChoiceButton
                      active={preferences.density === option.value}
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
                  <Label>Corner radius</Label>
                  <p className="text-muted-foreground text-xs">
                    Choose how sharp or soft surfaces should feel.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "none", label: "Square", radius: "rounded-none" },
                    { value: "small", label: "Subtle", radius: "rounded-sm" },
                    { value: "default", label: "Soft", radius: "rounded-lg" },
                    { value: "large", label: "Round", radius: "rounded-2xl" },
                  ].map((option) => (
                    <ChoiceButton
                      active={preferences.radius === option.value}
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
                <p className="font-medium">Live preview</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Changes are applied instantly and saved only on this device.
                  Current mode: {resolvedTheme ?? "system"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm">Primary action</Button>
                  <Button size="sm" variant="outline">
                    Secondary
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
