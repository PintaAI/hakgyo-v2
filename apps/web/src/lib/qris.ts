/**
 * QRIS payloads are EMVCo merchant-presented QR strings: a flat list of
 * `<tag:2><length:2><value>` fields ending with a CRC16 checksum in tag 63.
 * An organization uploads its static QRIS once; each payment turns it into a
 * dynamic QRIS carrying the amount so the learner's app pre-fills it.
 */

type Field = { tag: string; value: string };

export type QrisInfo = {
  merchantName: string;
  merchantCity: string;
  isDynamic: boolean;
  amount: string | null;
};

export type QrisValidation =
  { valid: true; info: QrisInfo } | { valid: false; error: string };

/** CRC-16/CCITT-FALSE as required by QRIS, as four uppercase hex digits. */
export function crc16(input: string) {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Strips scanner noise around the payload, which starts with tag 00. */
export function normalizeQris(input: string) {
  const payload = input.replace(/[\u0000-\u001F\u007F﻿]/g, "").trim();
  const start = payload.indexOf("000201");
  return start === -1 ? payload : payload.slice(start);
}

function parseFields(payload: string): Field[] {
  const fields: Field[] = [];
  let index = 0;
  while (index < payload.length) {
    const tag = payload.slice(index, index + 2);
    const lengthText = payload.slice(index + 2, index + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) {
      throw new Error("Format QRIS tidak valid");
    }
    const end = index + 4 + Number(lengthText);
    if (end > payload.length) {
      throw new Error(`Tag ${tag} melebihi panjang QRIS`);
    }
    fields.push({ tag, value: payload.slice(index + 4, end) });
    index = end;
  }
  return fields;
}

function buildFields(fields: Field[]) {
  return fields
    .map(
      ({ tag, value }) =>
        `${tag}${String(value.length).padStart(2, "0")}${value}`,
    )
    .join("");
}

function withChecksum(fieldsWithoutCrc: Field[]) {
  const body = `${buildFields(fieldsWithoutCrc)}6304`;
  return `${body}${crc16(body)}`;
}

export function validateQris(input: string): QrisValidation {
  const payload = normalizeQris(input);
  if (!payload) return { valid: false, error: "QRIS kosong" };

  let fields: Field[];
  try {
    fields = parseFields(payload);
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "QRIS tidak valid",
    };
  }
  const value = (tag: string) =>
    fields.find((field) => field.tag === tag)?.value;

  const checks: Array<[boolean, string]> = [
    [value("00") === "01", "Bukan kode QRIS yang valid"],
    [
      value("01") === "11" || value("01") === "12",
      "Metode QRIS harus statis atau dinamis",
    ],
    [Boolean(value("52")), "Kategori merchant (MCC) tidak ditemukan"],
    [value("53") === "360", "Mata uang QRIS harus Rupiah"],
    [value("58") === "ID", "Negara QRIS harus Indonesia"],
    [Boolean(value("59")), "Nama merchant tidak ditemukan"],
    [Boolean(value("60")), "Kota merchant tidak ditemukan"],
    [
      fields.at(-1)?.tag === "63" &&
        value("63")?.toUpperCase() === crc16(payload.slice(0, -4)),
      "Checksum QRIS tidak sesuai",
    ],
  ];
  const failed = checks.find(([ok]) => !ok);
  if (failed) return { valid: false, error: failed[1] };

  return {
    valid: true,
    info: {
      merchantName: value("59") ?? "",
      merchantCity: value("60") ?? "",
      isDynamic: value("01") === "12",
      amount: value("54") ?? null,
    },
  };
}

/**
 * Converts a static QRIS into a dynamic one for `amount` rupiah: the
 * initiation method becomes 12, any amount, tip or fee fields are replaced
 * by the amount (tag 54, kept in tag order), and the checksum is recomputed.
 */
export function toDynamicQris(staticPayload: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Nominal QRIS harus bilangan bulat lebih dari 0");
  }
  const payload = normalizeQris(staticPayload);
  const validation = validateQris(payload);
  if (!validation.valid) throw new Error(validation.error);

  const fields = parseFields(payload)
    .filter(({ tag }) => !["54", "55", "56", "57", "63"].includes(tag))
    .map((field) => (field.tag === "01" ? { ...field, value: "12" } : field));
  const insertAt = fields.findIndex(({ tag }) => Number(tag) > 54);
  fields.splice(insertAt === -1 ? fields.length : insertAt, 0, {
    tag: "54",
    value: String(amount),
  });
  return withChecksum(fields);
}

/** Builds a payload from fields, for tests and fixtures. */
export function buildQris(fields: Array<[tag: string, value: string]>) {
  return withChecksum(fields.map(([tag, value]) => ({ tag, value })));
}
