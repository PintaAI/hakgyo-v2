/** A file size for learners, e.g. "850 KB" or "12,4 MB" (Indonesian decimal comma). */
export function formatByteSize(bytes: number) {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value < 10 && unit > 0 ? 1 : 0;
  return `${value.toFixed(digits).replace(".", ",")} ${units[unit]}`;
}

/** Bytes of the finished downloads, given each asset's size (unknown sizes count as 0). */
export function downloadedBytes(
  readyIds: readonly string[],
  sizes: ReadonlyMap<string, number>,
) {
  return readyIds.reduce((total, id) => total + (sizes.get(id) ?? 0), 0);
}
