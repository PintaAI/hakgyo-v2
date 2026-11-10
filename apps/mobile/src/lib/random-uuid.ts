type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

/**
 * A random version 4 UUID, for ids and shuffle seeds made on the device (an
 * attempt started offline). Uses the runtime's `crypto` when it has one; the
 * app ships without a native crypto module, so it falls back to
 * `Math.random`, which is enough for ids the server checks for ownership and
 * for shuffle seeds.
 */
export function randomUuid(): string {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
