const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DEFAULT_DARK_BRIGHTNESS = 35;

export type ThemeColorRole = "accent" | "background" | "foreground";
export type ThemeColorPair = { light: string; dark: string };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function brightnessAdjustment(brightness: number) {
  return (clamp(brightness, 0, 100) - DEFAULT_DARK_BRIGHTNESS) / 100;
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

function hexToHsl(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16) / 255;
  const green = Number.parseInt(color.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return { hue, saturation, lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const offset = lightness - chroma / 2;
  let channels: [number, number, number];
  if (hueSection < 1) channels = [chroma, secondary, 0];
  else if (hueSection < 2) channels = [secondary, chroma, 0];
  else if (hueSection < 3) channels = [0, chroma, secondary];
  else if (hueSection < 4) channels = [0, secondary, chroma];
  else if (hueSection < 5) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];
  const toHex = (channel: number) =>
    Math.round((channel + offset) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channels.map(toHex).join("")}`;
}

function shiftLightness(color: string, amount: number) {
  const normalized = normalizeHexColor(color);
  if (!normalized) throw new Error(`Invalid theme color: ${color}`);
  const { hue, saturation, lightness } = hexToHsl(normalized);
  return hslToHex(
    hue,
    Math.min(saturation, 0.65),
    Math.max(0, Math.min(1, lightness + amount)),
  );
}

function mixColor(
  first: string,
  second: "#000000" | "#FFFFFF",
  amount: number,
) {
  const channels = [1, 3, 5].map((start) => {
    const from = Number.parseInt(first.slice(start, start + 2), 16);
    const to = Number.parseInt(second.slice(start, start + 2), 16);
    return Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  });
  return `#${channels.join("")}`;
}

function ensureSurfaceContrast(
  color: string,
  foreground: "#111827" | "#FFFFFF",
  toward: "#000000" | "#FFFFFF",
) {
  let result = color;
  for (
    let amount = 0.04;
    getContrastRatio(result, foreground) < 7;
    amount += 0.04
  ) {
    result = mixColor(color, toward, Math.min(amount, 1));
  }
  return result;
}

export function createThemeColorPair(
  baseColor: string,
  role: ThemeColorRole,
  darkBrightness = DEFAULT_DARK_BRIGHTNESS,
): ThemeColorPair {
  const normalized = normalizeHexColor(baseColor);
  if (!normalized) throw new Error(`Invalid theme color: ${baseColor}`);
  let light = normalized;
  const { hue, saturation, lightness } = hexToHsl(normalized);
  let darkLightness: number;
  let darkSaturation = saturation;
  const adjustment = brightnessAdjustment(darkBrightness);
  if (role === "background") {
    darkLightness = Math.min(
      lightness,
      clamp(0.058 + adjustment * 0.15, 0.018, 0.13),
    );
    darkSaturation = Math.min(saturation, 0.5);
  } else if (role === "foreground") {
    darkLightness = Math.max(
      lightness,
      clamp(0.84 + adjustment * 0.17, 0.76, 0.96),
    );
    darkSaturation = Math.min(saturation, 0.6);
  } else {
    const target = clamp(0.62 + adjustment * 0.16, 0.52, 0.74);
    darkLightness = lightness < 0.58 ? target : Math.min(lightness, 0.76);
    darkSaturation = Math.min(saturation, 0.85);
  }
  let dark = hslToHex(hue, darkSaturation, darkLightness);
  if (role === "accent") {
    light = ensureSurfaceContrast(light, "#111827", "#FFFFFF");
    dark = ensureSurfaceContrast(dark, "#FFFFFF", "#000000");
  }
  return { light, dark };
}

export function createSidebarColorPair(
  background: ThemeColorPair,
  darkBrightness = DEFAULT_DARK_BRIGHTNESS,
): ThemeColorPair {
  const lightBackground = hexToHsl(background.light);
  const lightShift = lightBackground.lightness >= 0.5 ? -0.025 : 0.04;
  return {
    light: shiftLightness(background.light, lightShift),
    dark: shiftLightness(
      background.dark,
      clamp(0.05 + brightnessAdjustment(darkBrightness) * 0.03, 0.039, 0.072),
    ),
  };
}

export function createCardColorPair(
  background: ThemeColorPair,
): ThemeColorPair {
  const lightBackground = hexToHsl(background.light);
  const lightShift = lightBackground.lightness >= 0.98 ? -0.025 : 0.025;
  return {
    light: shiftLightness(background.light, lightShift),
    dark: shiftLightness(background.dark, 0.055),
  };
}

export function createMutedColorPair(card: ThemeColorPair): ThemeColorPair {
  return {
    light: shiftLightness(card.light, -0.035),
    dark: shiftLightness(card.dark, 0.035),
  };
}

export { DEFAULT_DARK_BRIGHTNESS };
