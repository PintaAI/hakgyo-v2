"use client";

import { useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  MoonIcon,
  PipetteIcon,
  RotateCcwIcon,
  SunIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { getReadableForeground, normalizeHexColor } from "~/lib/colors";
import type { ThemeColorPair } from "~/lib/colors";
import { cn } from "~/lib/utils";

type ColorPreset = {
  label: string;
  value: string;
};

type ColorPickerProps = {
  id: string;
  label: string;
  value: string | null;
  defaultValue: string;
  previewColors?: ThemeColorPair;
  presets?: readonly ColorPreset[];
  onValueChange: (value: string | null) => void;
  className?: string;
};

function ColorPicker({
  id,
  label,
  value,
  defaultValue,
  previewColors,
  presets = [],
  onValueChange,
  className,
}: ColorPickerProps) {
  const currentColor = normalizeHexColor(value ?? defaultValue) ?? "#000000";
  const preview = previewColors ?? {
    light: currentColor,
    dark: currentColor,
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);

  function commitDraft() {
    const normalized = normalizeHexColor(
      inputRef.current?.value ?? currentColor,
    );
    if (!normalized) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onValueChange(normalized);
  }

  function selectColor(color: string) {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    setInvalid(false);
    onValueChange(normalized);
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button id={id} type="button" variant="outline" />}
        className={cn("h-11 w-full justify-between px-3", className)}
        aria-label={`${label}: ${value ? currentColor : "default"}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex shrink-0 -space-x-1" aria-hidden="true">
            <span
              className="border-border size-5 rounded-full border shadow-xs"
              style={{ backgroundColor: preview.light }}
            />
            <span
              className="border-border size-5 rounded-full border shadow-xs"
              style={{ backgroundColor: preview.dark }}
            />
          </span>
          <span className="truncate font-mono text-xs">
            {value ? currentColor : `Default · ${currentColor}`}
          </span>
        </span>
        <ChevronDownIcon className="text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 gap-4 p-3">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription>
            Pilih satu warna dasar. Versi gelap dibuat otomatis.
          </PopoverDescription>
        </PopoverHeader>

        <label
          className="focus-within:ring-ring/50 relative grid h-24 cursor-pointer grid-cols-2 overflow-hidden rounded-lg border focus-within:ring-3"
          htmlFor={`${id}-native`}
        >
          <span
            className="grid h-full place-items-center gap-1 px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: preview.light,
              color: getReadableForeground(preview.light),
            }}
          >
            <span className="grid justify-items-center gap-1">
              <SunIcon className="size-4" />
              Terang
            </span>
          </span>
          <span
            className="grid h-full place-items-center gap-1 px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: preview.dark,
              color: getReadableForeground(preview.dark),
            }}
          >
            <span className="grid justify-items-center gap-1">
              <MoonIcon className="size-4" />
              Gelap
            </span>
          </span>
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            id={`${id}-native`}
            type="color"
            value={currentColor}
            onChange={(event) => selectColor(event.target.value)}
          />
          <span className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] whitespace-nowrap text-white backdrop-blur-sm">
            <PipetteIcon className="size-3" />
            Pilih warna dasar
          </span>
        </label>

        {presets.length > 0 ? (
          <div className="grid grid-cols-6 gap-2" aria-label="Preset warna">
            {presets.map((preset) => {
              const presetColor = normalizeHexColor(preset.value);
              if (!presetColor) return null;
              const active = value === presetColor;
              return (
                <button
                  aria-label={preset.label}
                  aria-pressed={active}
                  className="focus-visible:ring-ring relative size-8 rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  key={`${preset.label}-${presetColor}`}
                  onClick={() => selectColor(presetColor)}
                  style={{ backgroundColor: presetColor }}
                  title={preset.label}
                  type="button"
                >
                  {active ? (
                    <CheckIcon className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <div className="flex gap-2">
            <Input
              aria-invalid={invalid}
              aria-label={`Kode HEX ${label}`}
              className="font-mono uppercase"
              defaultValue={currentColor}
              key={currentColor}
              maxLength={7}
              onBlur={commitDraft}
              onChange={() => setInvalid(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraft();
                }
              }}
              ref={inputRef}
              spellCheck={false}
            />
            <Button onClick={commitDraft} size="sm" type="button">
              Terapkan
            </Button>
          </div>
          {invalid ? (
            <p className="text-destructive text-xs" role="alert">
              Gunakan format HEX seperti #2563EB.
            </p>
          ) : null}
        </div>

        <Button
          className="justify-start"
          disabled={value === null}
          onClick={() => onValueChange(null)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RotateCcwIcon />
          Gunakan warna default
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export { ColorPicker, type ColorPreset };
