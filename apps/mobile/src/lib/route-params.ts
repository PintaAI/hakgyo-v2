/** Expo Router search params are `string | string[]`; this returns the first value, or "" when absent. */
export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
