"use client";

import { PlusIcon, XIcon } from "lucide-react";
import {
  formatScore,
  MAX_SCORE_BANDS,
  parseScoreInput,
  readScoreBands,
  scoreBandSchema,
  type ScoreBand,
} from "@hakgyo/shared";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

/** One editable row; `minPercent` is the raw text so "6" on the way to "60" is allowed. */
export type ScoreBandRow = { key: number; label: string; minPercent: string };

let rowKey = 0;

export function scoreBandRowsOf(value: unknown): ScoreBandRow[] {
  return readScoreBands(value).map((band) => ({
    key: rowKey++,
    label: band.label,
    minPercent: formatScore(band.minPercent),
  }));
}

/** A row with only a name or only a percentage is still being typed and is not saved yet. */
export function isIncompleteScoreBandRow(row: ScoreBandRow) {
  return !row.label.trim() || !row.minPercent.trim();
}

/**
 * The complete bands typed in the rows, highest threshold first, or undefined when a complete row
 * is invalid (for example 120 %). Incomplete rows are skipped until both fields are filled.
 */
export function parseScoreBandRows(
  rows: ScoreBandRow[],
): ScoreBand[] | undefined {
  const bands: ScoreBand[] = [];
  for (const row of rows) {
    if (isIncompleteScoreBandRow(row)) continue;
    const parsed = scoreBandSchema.safeParse({
      label: row.label,
      minPercent: parseScoreInput(row.minPercent),
    });
    if (!parsed.success) return undefined;
    bands.push(parsed.data);
  }
  if (bands.length > MAX_SCORE_BANDS) return undefined;
  return bands.sort((left, right) => right.minPercent - left.minPercent);
}

/** Named thresholds ("Manufaktur" 60 %, "Sektor lain" 45 %) shown with each result. */
export function ScoreBandsField({
  rows,
  disabled,
  onChange,
}: {
  rows: ScoreBandRow[];
  disabled?: boolean;
  onChange: (rows: ScoreBandRow[]) => void;
}) {
  const update = (key: number, patch: Partial<ScoreBandRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  return (
    <div className="grid gap-2">
      <div>
        <Label>Batas nilai bernama</Label>
        <p className="text-muted-foreground text-xs">
          Opsional. Misalnya &ldquo;Manufaktur&rdquo; 60% dan &ldquo;Sektor
          lain&rdquo; 45%. Murid melihat batas mana yang sudah tercapai.
        </p>
      </div>
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-2">
          <Input
            aria-label={`Nama batas ${index + 1}`}
            className="min-w-0 flex-1"
            disabled={disabled}
            maxLength={60}
            onChange={(event) => update(row.key, { label: event.target.value })}
            placeholder="Nama, mis. Manufaktur"
            value={row.label}
          />
          <div className="flex shrink-0 items-center gap-1">
            <Input
              aria-label={`Nilai minimal batas ${index + 1} (%)`}
              className="w-16"
              disabled={disabled}
              inputMode="decimal"
              onChange={(event) =>
                update(row.key, { minPercent: event.target.value })
              }
              placeholder="60"
              value={row.minPercent}
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
          <Button
            aria-label={`Hapus batas ${index + 1}`}
            disabled={disabled}
            onClick={() =>
              onChange(rows.filter((item) => item.key !== row.key))
            }
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      {rows.some(
        (row) =>
          isIncompleteScoreBandRow(row) &&
          (row.label.trim() || row.minPercent.trim()),
      ) ? (
        <p className="text-muted-foreground text-xs">
          Lengkapi nama dan nilai minimal agar batas tersimpan.
        </p>
      ) : null}
      {rows.length < MAX_SCORE_BANDS ? (
        <Button
          className="justify-self-start"
          disabled={disabled}
          onClick={() =>
            onChange([...rows, { key: rowKey++, label: "", minPercent: "" }])
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon />
          Tambah batas
        </Button>
      ) : null}
    </div>
  );
}
