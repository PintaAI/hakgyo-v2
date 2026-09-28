import { decryptToken, encryptToken } from "~/server/integrations/token-crypto";

export const encryptZoomTokenValue = encryptToken;
export const decryptZoomTokenValue = decryptToken;
