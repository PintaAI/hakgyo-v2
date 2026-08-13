import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { decryptZoomTokenValue, encryptZoomTokenValue } from "./zoom-token";

const key = randomBytes(32).toString("base64");

describe("Zoom token encryption", () => {
  test("round-trips a token without storing plaintext", () => {
    const token = "zoom-access-token";
    const encrypted = encryptZoomTokenValue(token, key);

    expect(encrypted).not.toContain(token);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptZoomTokenValue(encrypted, key)).toBe(token);
  });

  test("uses a unique nonce for every encryption", () => {
    expect(encryptZoomTokenValue("same-token", key)).not.toBe(
      encryptZoomTokenValue("same-token", key),
    );
  });

  test("rejects tampered ciphertext", () => {
    const encrypted = encryptZoomTokenValue("token", key);
    const [iv, tag, ciphertext] = encrypted.split(".");

    expect(() =>
      decryptZoomTokenValue(`${iv}.${tag}.${ciphertext}A`, key),
    ).toThrow();
  });

  test("rejects malformed payloads and invalid keys", () => {
    expect(() => decryptZoomTokenValue("invalid", key)).toThrow(
      "Invalid encrypted Zoom token",
    );
    expect(() => encryptZoomTokenValue("token", "dG9vLXNob3J0")).toThrow(
      "must decode to 32 bytes",
    );
  });
});
