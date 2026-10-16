import {
  expoClient,
  getSetCookie,
  hasBetterAuthCookies,
  storageAdapter,
} from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { apiUrl } from "../config";

const STORAGE_PREFIX = "hakgyo";

const nativePlugin = expoClient({
  scheme: "hakgyo",
  storagePrefix: STORAGE_PREFIX,
  storage: SecureStore,
});

const cookieStorage = storageAdapter(SecureStore);
const COOKIE_STORAGE_KEY = `${STORAGE_PREFIX}_cookie`;

/**
 * Stores session cookies the API refreshed on a non-auth response (tRPC
 * re-issues the 5-minute session cache and extends the session). The Expo
 * plugin only stores cookies from auth endpoints; without this, requests
 * after the cache expires go back to a database session lookup each time.
 */
export async function rememberAuthCookies(setCookie: string | null) {
  if (!setCookie || !hasBetterAuthCookies(setCookie, "better-auth")) return;
  const previous = await cookieStorage.getItemAsync(COOKIE_STORAGE_KEY);
  await cookieStorage.setItemAsync(
    COOKIE_STORAGE_KEY,
    getSetCookie(setCookie, previous ?? undefined),
  );
}

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [nativePlugin],
});

export const getAuthCookie = () => authClient.getCookie();
