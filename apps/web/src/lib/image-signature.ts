export type SupportedImageContentType =
  "image/gif" | "image/jpeg" | "image/png" | "image/webp";

const signatures: Partial<Record<SupportedImageContentType, number[]>> = {
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function hasImageSignature(
  bytes: Uint8Array,
  contentType: string,
): contentType is SupportedImageContentType {
  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
    );
  }

  const signature = signatures[contentType as SupportedImageContentType];
  return signature ? startsWith(bytes, signature) : false;
}
