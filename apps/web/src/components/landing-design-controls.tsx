"use client";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { LandingDesign } from "~/lib/organization-landing";
import { cn } from "~/lib/utils";

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; visual?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative overflow-hidden rounded-md border p-2 text-left text-[11px] transition-colors",
              value === option.value
                ? "border-foreground bg-muted ring-foreground ring-1"
                : "border-border hover:bg-muted/50",
            )}
          >
            {option.visual}
            {option.label}
            {value === option.value && (
              <Check className="absolute right-1.5 bottom-2 size-3" />
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function LayoutSwatch({ layout }: { layout: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mb-3 flex h-16 gap-1 bg-[#f2eee5] p-2",
        layout === "split" ? "flex-row" : "flex-col",
        layout === "cover" && "relative bg-[#a4b2a4]",
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col justify-center gap-1",
          layout === "cover" && "absolute right-2 bottom-2 left-2",
        )}
      >
        <i className="h-1.5 w-4/5 bg-[#36463b]" />
        <i className="h-1.5 w-3/5 bg-[#36463b]" />
        <i className="mt-1 h-1 w-1/3 bg-[#84907f]" />
      </div>
      {layout !== "cover" && <div className="min-h-5 flex-1 bg-[#a4b2a4]" />}
    </div>
  );
}
export function LandingDesignControls({
  design,
  onChange,
}: {
  design: LandingDesign;
  onChange: (design: LandingDesign) => void;
}) {
  function set<K extends keyof LandingDesign>(key: K, value: LandingDesign[K]) {
    onChange({ ...design, [key]: value });
  }
  return (
    <div className="space-y-7">
      <Choices
        label="Komposisi hero"
        value={design.heroLayout}
        onChange={(v) => set("heroLayout", v)}
        options={[
          {
            value: "editorial",
            label: "Editorial",
            visual: <LayoutSwatch layout="editorial" />,
          },
          {
            value: "split",
            label: "Split",
            visual: <LayoutSwatch layout="split" />,
          },
          {
            value: "cover",
            label: "Cover",
            visual: <LayoutSwatch layout="cover" />,
          },
        ]}
      />
      <p className="text-muted-foreground -mt-4 text-[11px] leading-relaxed">
        Cover menggunakan foto hero. Tanpa foto, halaman memakai komposisi
        tipografi.
      </p>
      <Choices
        label="Warna permukaan"
        value={design.palette}
        onChange={(v) => set("palette", v)}
        options={[
          {
            value: "paper",
            label: "Paper",
            visual: (
              <div className="mb-3 h-8 border border-black/10 bg-[#f5f2eb]" />
            ),
          },
          {
            value: "brand",
            label: "Brand",
            visual: (
              <div className="bg-background mb-3 h-8 border border-black/10" />
            ),
          },
          {
            value: "ink",
            label: "Ink",
            visual: <div className="mb-3 h-8 bg-[#202923]" />,
          },
        ]}
      />
      <Choices
        label="Tipografi judul"
        value={design.headingFont}
        onChange={(v) => set("headingFont", v)}
        options={[
          {
            value: "serif",
            label: "Editorial",
            visual: <span className="mb-3 block font-serif text-3xl">Aa</span>,
          },
          {
            value: "sans",
            label: "Modern",
            visual: <span className="mb-3 block font-sans text-3xl">Aa</span>,
          },
          {
            value: "brand",
            label: "Brand",
            visual: <span className="mb-3 block text-3xl">Aa</span>,
          },
        ]}
      />
      <label className="grid gap-3 text-xs font-medium">
        Ukuran judul{" "}
        <span className="flex items-center gap-3">
          <input
            aria-label="Ukuran judul"
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={design.headingScale}
            onChange={(e) => set("headingScale", Number(e.target.value))}
            className="w-full accent-current"
          />
          <output className="text-muted-foreground w-10 text-right text-[11px]">
            {Math.round(design.headingScale * 100)}%
          </output>
        </span>
      </label>
      <Choices
        label="Jarak antarbagian"
        value={design.spacing}
        onChange={(v) => set("spacing", v)}
        options={[
          { value: "compact", label: "Rapat" },
          { value: "balanced", label: "Seimbang" },
          { value: "airy", label: "Lapang" },
        ]}
      />
      <Choices
        label="Sudut gambar & tombol"
        value={design.corners}
        onChange={(v) => set("corners", v)}
        options={[
          { value: "sharp", label: "Tegas" },
          { value: "soft", label: "Lembut" },
          { value: "round", label: "Bulat" },
        ]}
      />
      <fieldset>
        <legend className="mb-3 text-xs font-medium">Tampilan course</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["grid", "list"] as const).map((layout) => (
            <button
              key={layout}
              aria-pressed={design.courseLayout === layout}
              onClick={() => set("courseLayout", layout)}
              className={cn(
                "rounded-md border p-3 text-left text-xs",
                design.courseLayout === layout &&
                  "border-foreground bg-muted ring-foreground ring-1",
              )}
            >
              <div
                className={cn(
                  "mb-3 grid gap-1",
                  layout === "grid" ? "grid-cols-3" : "grid-cols-1",
                )}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "bg-muted-foreground/30",
                      layout === "grid" ? "h-9" : "h-2.5",
                    )}
                  />
                ))}
              </div>
              {layout === "grid" ? "Grid galeri" : "Daftar editorial"}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-3 text-xs font-medium">
        Posisi foto hero
        <input
          aria-label="Posisi foto hero"
          type="range"
          min="0"
          max="100"
          value={design.imagePosition}
          onChange={(e) => set("imagePosition", Number(e.target.value))}
          className="w-full accent-current"
        />
        <span className="text-muted-foreground flex justify-between text-[10px] font-normal">
          <span>Atas</span>
          <span>Tengah</span>
          <span>Bawah</span>
        </span>
      </label>
    </div>
  );
}
