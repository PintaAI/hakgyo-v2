import { describe, expect, test } from "bun:test";

import { hasImageSignature } from "./image-signature";

describe("image signatures", () => {
  test("accepts supported image headers", () => {
    expect(
      hasImageSignature(
        Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      hasImageSignature(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe(true);
    expect(
      hasImageSignature(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
        "image/webp",
      ),
    ).toBe(true);
    expect(
      hasImageSignature(
        Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
        "image/gif",
      ),
    ).toBe(true);
  });

  test("rejects mismatched and unsupported content", () => {
    expect(
      hasImageSignature(Uint8Array.from([0x47, 0x49, 0x46, 0x38]), "image/png"),
    ).toBe(false);
    expect(
      hasImageSignature(
        Uint8Array.from([0x3c, 0x73, 0x76, 0x67]),
        "image/svg+xml",
      ),
    ).toBe(false);
  });
});
