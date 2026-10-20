import { describe, expect, test } from "bun:test";

import {
  formatWhatsappNumber,
  normalizeWhatsappNumber,
  phoneFromJid,
} from "~/lib/whatsapp";

describe("normalizeWhatsappNumber", () => {
  test("adds the Indonesian country code to local numbers", () => {
    expect(normalizeWhatsappNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsappNumber("812 3456 7890")).toBe("6281234567890");
  });

  test("keeps international numbers", () => {
    expect(normalizeWhatsappNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsappNumber("0065 9123 4567")).toBe("6591234567");
    expect(normalizeWhatsappNumber("+82 10 1234 5678")).toBe("821012345678");
  });

  test("rejects text and wrong lengths", () => {
    expect(normalizeWhatsappNumber("budi")).toBeNull();
    expect(normalizeWhatsappNumber("0812")).toBeNull();
    expect(normalizeWhatsappNumber("62812345678901234")).toBeNull();
  });
});

describe("phoneFromJid", () => {
  test("reads the number from user JIDs", () => {
    expect(phoneFromJid("6281234567890@s.whatsapp.net")).toBe("6281234567890");
    expect(phoneFromJid("6281234567890:12@s.whatsapp.net")).toBe(
      "6281234567890",
    );
    expect(phoneFromJid(null)).toBeNull();
    expect(phoneFromJid("abc@g.us")).toBeNull();
  });
});

test("formatWhatsappNumber groups Indonesian numbers", () => {
  expect(formatWhatsappNumber("6281234567890")).toBe("+62 812-3456-7890");
  expect(formatWhatsappNumber("821012345678")).toBe("+821012345678");
});
