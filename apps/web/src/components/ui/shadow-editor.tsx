"use client";

import { useId } from "react";

import { cn } from "~/lib/utils";

type ShadowValue = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  opacity: number;
};

const DEFAULT_SHADOW: ShadowValue = {
  x: 0,
  y: 4,
  blur: 12,
  spread: -2,
  opacity: 14,
};

const shadowPresets = [
  {
    label: "Tanpa bayangan",
    shortLabel: "Tidak ada",
    value: { x: 0, y: 0, blur: 0, spread: 0, opacity: 0 },
  },
  {
    label: "Bayangan halus",
    shortLabel: "Halus",
    value: DEFAULT_SHADOW,
  },
  {
    label: "Bayangan tegas",
    shortLabel: "Tegas",
    value: { x: 4, y: 4, blur: 0, spread: 0, opacity: 22 },
  },
  {
    label: "Bayangan melayang",
    shortLabel: "Melayang",
    value: { x: 0, y: 12, blur: 32, spread: -6, opacity: 20 },
  },
] as const satisfies readonly {
  label: string;
  shortLabel: string;
  value: ShadowValue;
}[];

function isShadowValue(value: unknown): value is ShadowValue {
  if (!value || typeof value !== "object") return false;
  const shadow = value as Record<string, unknown>;
  return (
    typeof shadow.x === "number" &&
    shadow.x >= -12 &&
    shadow.x <= 12 &&
    typeof shadow.y === "number" &&
    shadow.y >= -12 &&
    shadow.y <= 24 &&
    typeof shadow.blur === "number" &&
    shadow.blur >= 0 &&
    shadow.blur <= 48 &&
    typeof shadow.spread === "number" &&
    shadow.spread >= -12 &&
    shadow.spread <= 16 &&
    typeof shadow.opacity === "number" &&
    shadow.opacity >= 0 &&
    shadow.opacity <= 40
  );
}

function shadowToCss(value: ShadowValue, scale = 1) {
  const scaled = (number: number) => Math.round(number * scale * 10) / 10;
  return `${scaled(value.x)}px ${scaled(value.y)}px ${scaled(value.blur)}px ${scaled(value.spread)}px rgb(0 0 0 / ${value.opacity}%)`;
}

function shadowsMatch(first: ShadowValue, second: ShadowValue) {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.blur === second.blur &&
    first.spread === second.spread &&
    first.opacity === second.opacity
  );
}

type RangeControlProps = {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  suffix: "px" | "%";
  onValueChange: (value: number) => void;
};

function RangeControl({
  id,
  label,
  hint,
  value,
  min,
  max,
  suffix,
  onValueChange,
}: RangeControlProps) {
  const formatted =
    suffix === "px" && value > 0 ? `+${value}px` : `${value}${suffix}`;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
            {hint}
          </span>
        </label>
        <output className="bg-muted min-w-12 rounded-md px-1.5 py-0.5 text-center font-mono text-xs">
          {formatted}
        </output>
      </div>
      <input
        aria-valuetext={formatted}
        className="accent-primary h-5 w-full cursor-pointer"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </div>
  );
}

type ShadowEditorProps = {
  value: ShadowValue;
  onValueChange: (value: ShadowValue) => void;
};

function ShadowEditor({ value, onValueChange }: ShadowEditorProps) {
  const id = useId();

  function update<Key extends keyof ShadowValue>(
    key: Key,
    nextValue: ShadowValue[Key],
  ) {
    onValueChange({ ...value, [key]: nextValue });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shadowPresets.map((preset) => {
          const active = shadowsMatch(value, preset.value);
          return (
            <button
              aria-label={preset.label}
              aria-pressed={active}
              className={cn(
                "hover:bg-accent focus-visible:ring-ring grid min-h-20 place-items-center gap-2 rounded-lg border px-2 py-3 text-xs font-medium transition outline-none focus-visible:ring-2",
                active && "border-primary bg-primary/5 ring-primary/20 ring-1",
              )}
              key={preset.shortLabel}
              onClick={() => onValueChange({ ...preset.value })}
              type="button"
            >
              <span
                className="bg-card border-border block size-8 rounded-md border"
                style={{ boxShadow: shadowToCss(preset.value) }}
              />
              {preset.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="bg-muted/30 grid gap-5 rounded-xl border p-4 sm:grid-cols-[8rem_1fr] sm:items-center">
        <div className="grid min-h-32 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--muted)_25%,transparent_25%),linear-gradient(225deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(315deg,var(--muted)_25%,var(--background)_25%)] bg-[length:16px_16px] bg-[position:8px_0,8px_0,0_0,0_0] p-6">
          <div
            className="bg-card text-card-foreground border-border grid size-16 place-items-center rounded-xl border text-xs font-semibold"
            style={{ boxShadow: shadowToCss(value) }}
          >
            Preview
          </div>
        </div>

        <div className="grid gap-4">
          <RangeControl
            hint="kiri / kanan"
            id={`${id}-x`}
            label="Mendatar"
            max={12}
            min={-12}
            onValueChange={(nextValue) => update("x", nextValue)}
            suffix="px"
            value={value.x}
          />
          <RangeControl
            hint="atas / bawah"
            id={`${id}-y`}
            label="Vertikal"
            max={24}
            min={-12}
            onValueChange={(nextValue) => update("y", nextValue)}
            suffix="px"
            value={value.y}
          />
          <RangeControl
            hint="tajam / lembut"
            id={`${id}-blur`}
            label="Kelembutan"
            max={48}
            min={0}
            onValueChange={(nextValue) => update("blur", nextValue)}
            suffix="px"
            value={value.blur}
          />
          <RangeControl
            hint="sempit / lebar"
            id={`${id}-spread`}
            label="Penyebaran"
            max={16}
            min={-12}
            onValueChange={(nextValue) => update("spread", nextValue)}
            suffix="px"
            value={value.spread}
          />
          <RangeControl
            hint="tipis / kuat"
            id={`${id}-opacity`}
            label="Intensitas"
            max={40}
            min={0}
            onValueChange={(nextValue) => update("opacity", nextValue)}
            suffix="%"
            value={value.opacity}
          />
        </div>
      </div>
    </div>
  );
}

export {
  DEFAULT_SHADOW,
  ShadowEditor,
  isShadowValue,
  shadowToCss,
  type ShadowValue,
};
