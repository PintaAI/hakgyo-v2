const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(withHash)) return null;
  const digits = withHash.slice(1);
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : digits;
  return `#${expanded.toUpperCase()}`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && normalizeHexColor(value) !== null;
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string) {
  const normalized = normalizeHexColor(color);
  if (!normalized) return 0;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function getContrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableForeground(background: string) {
  const dark = "#111827";
  const light = "#FFFFFF";
  return getContrastRatio(background, dark) >=
    getContrastRatio(background, light)
    ? dark
    : light;
}

export function mixHexColors(
  first: string,
  second: string,
  amount: number,
): string | null {
  const from = normalizeHexColor(first);
  const to = normalizeHexColor(second);
  if (!from || !to) return null;
  const clamped = clamp(amount, 0, 1);
  const channels = [1, 3, 5].map((start) => {
    const fromChannel = Number.parseInt(from.slice(start, start + 2), 16);
    const toChannel = Number.parseInt(to.slice(start, start + 2), 16);
    return Math.round(fromChannel + (toChannel - fromChannel) * clamped)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  });
  return `#${channels.join("")}`;
}
