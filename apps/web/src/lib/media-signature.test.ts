import { describe, expect, test } from "bun:test";

import { detectMediaContentType } from "./media-signature";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string"
        ? [...part].map((char) => char.charCodeAt(0))
        : part,
    ),
  );

describe("imported file type detection", () => {
  test("detects images and audio from their bytes, not the declared type", () => {
    expect(
      detectMediaContentType(
        bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a]),
        "audio/mpeg",
      ),
    ).toBe("image/png");
    expect(detectMediaContentType(bytes([0xff, 0xd8, 0xff]), null)).toBe(
      "image/jpeg",
    );
    expect(
      detectMediaContentType(bytes("RIFF", [0, 0, 0, 0], "WEBP"), null),
    ).toBe("image/webp");
    expect(detectMediaContentType(bytes("ID3", [3]), null)).toBe("audio/mpeg");
    expect(detectMediaContentType(bytes([0xff, 0xfb]), null)).toBe(
      "audio/mpeg",
    );
    expect(detectMediaContentType(bytes("OggS"), null)).toBe("audio/ogg");
    expect(
      detectMediaContentType(bytes("RIFF", [0, 0, 0, 0], "WAVE"), null),
    ).toBe("audio/wav");
    expect(
      detectMediaContentType(bytes([0, 0, 0, 0x20], "ftypM4A "), null),
    ).toBe("audio/mp4");
  });

  test("accepts video containers only when audio was declared", () => {
    const mp4 = bytes([0, 0, 0, 0x20], "ftypisom");
    const webm = bytes([0x1a, 0x45, 0xdf, 0xa3]);
    expect(detectMediaContentType(mp4, "video/mp4")).toBeNull();
    expect(detectMediaContentType(mp4, "audio/mp4")).toBe("audio/mp4");
    expect(detectMediaContentType(webm, null)).toBeNull();
    expect(detectMediaContentType(webm, "audio/webm")).toBe("audio/webm");
  });

  test("rejects other files", () => {
    expect(
      detectMediaContentType(bytes("<svg xmlns"), "image/svg+xml"),
    ).toBeNull();
    expect(
      detectMediaContentType(bytes("<!doctype html>"), "audio/mpeg"),
    ).toBeNull();
    expect(detectMediaContentType(bytes("%PDF-1.7"), null)).toBeNull();
  });
});
