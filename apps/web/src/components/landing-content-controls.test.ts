import { describe, expect, test } from "bun:test";

const source = await Bun.file(
  new URL("./landing-content-controls.tsx", import.meta.url),
).text();

describe("landing page image controls", () => {
  test("uses managed uploads instead of asking owners for image URLs", () => {
    expect(source).not.toContain('label="URL gambar hero"');
    expect(source).not.toContain('label="URL gambar berbagi"');
    expect(source.match(/<LandingImageUpload/g)).toHaveLength(2);
  });
});
