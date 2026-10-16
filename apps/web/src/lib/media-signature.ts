import { hasImageSignature } from "./image-signature";

function startsWith(bytes: Uint8Array, signature: string, offset = 0) {
  return [...signature].every(
    (char, index) => bytes[offset + index] === char.charCodeAt(0),
  );
}

/**
 * The image or audio type a file's bytes really are. Containers that also
 * hold video (MP4, WebM) count as audio only when the source declared audio.
 */
export function detectMediaContentType(
  bytes: Uint8Array,
  declaredType: string | null,
) {
  for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
    if (hasImageSignature(bytes, type)) return type;
  }
  if (startsWith(bytes, "ID3")) return "audio/mpeg";
  // MPEG audio / ADTS AAC frame sync.
  if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }
  if (startsWith(bytes, "OggS")) return "audio/ogg";
  if (startsWith(bytes, "RIFF") && startsWith(bytes, "WAVE", 8)) {
    return "audio/wav";
  }
  const declaresAudio = declaredType?.startsWith("audio/") ?? false;
  if (startsWith(bytes, "ftyp", 4)) {
    return declaresAudio || startsWith(bytes, "M4A", 8) ? "audio/mp4" : null;
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf) {
    return declaresAudio ? "audio/webm" : null;
  }
  return null;
}
