"use client";

/** Swatch buttons for choosing a custom block's color palette. */
export function ThemePaletteButtons<T extends string>({
  onChange,
  styles,
  themes,
  value,
}: {
  onChange: (theme: T) => void;
  styles: Record<T, { label: string; accent: string }>;
  themes: readonly T[];
  value: T;
}) {
  return themes.map((theme) => {
    const option = styles[theme];
    const selected = value === theme;
    return (
      <button
        aria-label={`Gunakan palet ${option.label}`}
        aria-pressed={selected}
        className={`ring-foreground/10 focus-visible:ring-ring grid size-7 place-items-center rounded-md ring-1 transition focus-visible:ring-2 focus-visible:outline-none ${selected ? "bg-background shadow-xs" : "hover:bg-background/70"}`}
        key={theme}
        onClick={() => onChange(theme)}
        title={option.label}
        type="button"
      >
        <span
          className="size-3.5 rounded-full"
          style={{ backgroundColor: option.accent }}
        />
      </button>
    );
  });
}
