export function getUrlPathname(value: string) {
  if (value.startsWith("/")) {
    return value.split(/[?#]/, 1)[0] ?? null;
  }

  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}
