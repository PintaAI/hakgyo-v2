import { env } from "~/env";
import { decryptToken, encryptToken } from "~/server/integrations/token-crypto";

export type WhatsappConfig = {
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
  encryptionKey: string;
};

/** The Evolution API settings, or null while any of them is missing. */
export function whatsappConfig(): WhatsappConfig | null {
  const apiUrl = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const webhookSecret = env.WHATSAPP_WEBHOOK_SECRET;
  const encryptionKey = env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!apiUrl || !apiKey || !webhookSecret || !encryptionKey) return null;
  return { apiUrl, apiKey, webhookSecret, encryptionKey };
}

export function isWhatsappEnabled() {
  return whatsappConfig() !== null;
}

export function requireWhatsappConfig(): WhatsappConfig {
  const config = whatsappConfig();
  if (!config) throw new Error("WhatsApp integration is not configured");
  return config;
}

export function encryptInstanceToken(value: string) {
  return encryptToken(value, requireWhatsappConfig().encryptionKey);
}

export function decryptInstanceToken(value: string) {
  return decryptToken(value, requireWhatsappConfig().encryptionKey);
}

/** Header Evolution API sends with every webhook (set when the instance is created). */
export const WEBHOOK_SECRET_HEADER = "x-hakgyo-webhook-secret";

/** One instance per organization on the shared server. */
export function instanceNameFor(organizationId: string) {
  return `hakgyo-${organizationId}`;
}
