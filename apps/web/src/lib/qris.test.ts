import { describe, expect, test } from "bun:test";

import {
  buildQris,
  crc16,
  normalizeQris,
  toDynamicQris,
  validateQris,
} from "./qris";

const staticQris = buildQris([
  ["00", "01"],
  ["01", "11"],
  ["26", "0016ID.CO.QRIS.WWW0118936008990000000102150000000000000000303UMI"],
  ["51", "0014ID.CO.QRIS.WWW0215ID10200000000010303UMI"],
  ["52", "8299"],
  ["53", "360"],
  ["58", "ID"],
  ["59", "HAKGYO KOREAN CLASS"],
  ["60", "JAKARTA"],
  ["61", "12345"],
  ["62", "0703A01"],
]);

describe("crc16", () => {
  test("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("validateQris", () => {
  test("accepts a static QRIS and reads the merchant", () => {
    expect(validateQris(staticQris)).toEqual({
      valid: true,
      info: {
        merchantName: "HAKGYO KOREAN CLASS",
        merchantCity: "JAKARTA",
        isDynamic: false,
        amount: null,
      },
    });
  });

  test("rejects a wrong checksum", () => {
    const tampered = `${staticQris.slice(0, -4)}0000`;
    expect(validateQris(tampered)).toEqual({
      valid: false,
      error: "Checksum QRIS tidak sesuai",
    });
  });

  test("rejects non-QRIS text", () => {
    expect(validateQris("https://example.com").valid).toBe(false);
    expect(validateQris("").valid).toBe(false);
  });

  test("rejects foreign currency", () => {
    const usd = buildQris([
      ["00", "01"],
      ["01", "11"],
      ["52", "8299"],
      ["53", "840"],
      ["58", "ID"],
      ["59", "A"],
      ["60", "B"],
    ]);
    expect(validateQris(usd)).toEqual({
      valid: false,
      error: "Mata uang QRIS harus Rupiah",
    });
  });
});

describe("normalizeQris", () => {
  test("drops scanner noise before the payload", () => {
    expect(normalizeQris(`﻿  xx${staticQris}\n`)).toBe(staticQris);
  });
});

describe("toDynamicQris", () => {
  test("embeds the amount in tag order with a valid checksum", () => {
    const dynamic = toDynamicQris(staticQris, 350000);
    const validation = validateQris(dynamic);

    expect(validation).toEqual({
      valid: true,
      info: {
        merchantName: "HAKGYO KOREAN CLASS",
        merchantCity: "JAKARTA",
        isDynamic: true,
        amount: "350000",
      },
    });
    expect(dynamic).toContain("010212");
    expect(dynamic).toContain("5303360540635000058");
  });

  test("replaces an existing amount and fee fields", () => {
    const withFee = toDynamicQris(staticQris, 1000);
    const again = toDynamicQris(withFee, 2500);
    expect(validateQris(again)).toMatchObject({
      valid: true,
      info: { amount: "2500" },
    });
    expect(again).not.toContain("54041000");
  });

  test("refuses non-positive or fractional amounts", () => {
    expect(() => toDynamicQris(staticQris, 0)).toThrow();
    expect(() => toDynamicQris(staticQris, 10.5)).toThrow();
  });
});
