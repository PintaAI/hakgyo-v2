import { describe, expect, test } from "bun:test";

import {
  createProfileImageKey,
  getManagedProfileImageKey,
  parseProfileImageKey,
} from "./profile-image";

const objectId = "123e4567-e89b-12d3-a456-426614174000";

describe("profile image keys", () => {
  test("creates and parses an owned key", () => {
    const key = createProfileImageKey("user/1", 1024, "image/webp", objectId);

    expect(key).toBe(
      "profile-images/user%2F1/123e4567-e89b-12d3-a456-426614174000-1024.webp",
    );
    expect(parseProfileImageKey(key, "user/1")).toEqual({
      contentType: "image/webp",
      fileName: "123e4567-e89b-12d3-a456-426614174000-1024.webp",
      size: 1024,
    });
    expect(parseProfileImageKey(key, "another-user")).toBeNull();
  });

  test("rejects malformed and oversized keys", () => {
    expect(
      parseProfileImageKey("profile-images/user/avatar.svg", "user"),
    ).toBeNull();
    expect(
      parseProfileImageKey(
        `profile-images/user/${objectId}-${5 * 1024 * 1024 + 1}.png`,
        "user",
      ),
    ).toBeNull();
  });

  test("extracts only managed image URLs for the same user", () => {
    const fileName = `${objectId}-2048.jpg`;
    expect(
      getManagedProfileImageKey(`/api/profile-images/user/${fileName}`, "user"),
    ).toBe(`profile-images/user/${fileName}`);
    expect(
      getManagedProfileImageKey(
        `https://hakgyo.test/api/profile-images/user/${fileName}`,
        "user",
      ),
    ).toBe(`profile-images/user/${fileName}`);
    expect(
      getManagedProfileImageKey(
        `https://hakgyo.test/api/profile-images/other/${fileName}`,
        "user",
      ),
    ).toBeNull();
    expect(
      getManagedProfileImageKey(
        "https://images.example.com/avatar.jpg",
        "user",
      ),
    ).toBeNull();
  });
});
