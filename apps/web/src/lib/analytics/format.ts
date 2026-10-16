import { relativeChange } from "./period";

const integer = new Intl.NumberFormat("id-ID");
const percent = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 0,
});
const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const compactRupiah = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export const formatCount = (value: number) => integer.format(value);

/** A 0–1 ratio as a whole percentage, or a dash without data. */
export const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : percent.format(value);

export const formatRupiahAmount = (value: number) => rupiah.format(value);

/** Short axis label such as "Rp 1,2 jt". */
export const formatCompactRupiah = (value: number) =>
  value === 0 ? "Rp 0" : `Rp ${compactRupiah.format(value)}`;

export const formatShortDate = (value: Date) => shortDate.format(value);

/** "26 jam" or "3 hari" for review turnaround. */
export function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return "< 1 jam";
  if (hours < 48) return `${Math.round(hours)} jam`;
  return `${Math.round(hours / 24)} hari`;
}

export type Change = {
  /** Display text such as "+12%" or "−4 poin". */
  text: string;
  direction: "up" | "down" | "flat";
};

/** Relative change of a count or amount, or null without a previous figure. */
export function countChange(current: number, previous: number): Change | null {
  const change = relativeChange(current, previous);
  if (change === null) return null;
  // Past tenfold growth a percentage stops being readable.
  if (change >= 9) {
    return { text: `${Math.round(1 + change)}× lipat`, direction: "up" };
  }
  const rounded = Math.round(change * 100);
  if (rounded === 0) return { text: "0%", direction: "flat" };
  return {
    text: `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`,
    direction: rounded > 0 ? "up" : "down",
  };
}

/** Change of a 0–1 ratio in percentage points. */
export function ratioChange(
  current: number | null,
  previous: number | null,
): Change | null {
  if (current === null || previous === null) return null;
  const points = Math.round((current - previous) * 100);
  if (points === 0) return { text: "0 poin", direction: "flat" };
  return {
    text: `${points > 0 ? "+" : "−"}${Math.abs(points)} poin`,
    direction: points > 0 ? "up" : "down",
  };
}
