/**
 * Normalizes a phone number typed by staff to the digits WhatsApp expects:
 * country code first, no "+" or separators. Local Indonesian numbers
 * ("0812...") get the 62 prefix. Returns null when it cannot be a number.
 */
export function normalizeWhatsappNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8") && !trimmed.startsWith("+")) {
    digits = `62${digits}`;
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** "6281234567890@s.whatsapp.net" -> "6281234567890". */
export function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const digits = jid.split("@")[0]?.split(":")[0] ?? "";
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

/** "6281234567890" -> "+62 812-3456-7890" for display. */
export function formatWhatsappNumber(digits: string): string {
  if (!digits.startsWith("62")) return `+${digits}`;
  const local = digits.slice(2);
  const groups = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(
    Boolean,
  );
  return `+62 ${groups.join("-")}`;
}
