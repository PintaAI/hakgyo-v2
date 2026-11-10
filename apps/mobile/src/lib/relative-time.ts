/**
 * How long ago something happened, in short Indonesian ("baru saja",
 * "5 menit lalu", "2 jam lalu", "3 hari lalu"), for "Diperbarui …" notes.
 */
export function agoLabel(then: Date | number, now: Date | number = Date.now()) {
  const seconds = Math.max(0, Math.floor((Number(now) - Number(then)) / 1000));
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
