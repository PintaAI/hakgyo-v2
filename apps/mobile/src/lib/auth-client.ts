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

// What the Expo plugin keeps in SecureStore. Long values are split into
// `${key}.0`, `${key}.1`, … with "ba-chunks:<count>" stored under the key.
const AUTH_STORAGE_KEYS = [
  COOKIE_STORAGE_KEY,
  `${STORAGE_PREFIX}_session_data`,
  `${STORAGE_PREFIX}_last_login_method`,
];
const CHUNK_MARKER = "ba-chunks:";

/** Deletes the stored session, as on a fresh install. */
export async function forgetAuthStorage() {
  for (const key of AUTH_STORAGE_KEYS) {
    const stored = await SecureStore.getItemAsync(key);
    // NaN for a malformed marker, which deletes no chunks.
    const chunks = stored?.startsWith(CHUNK_MARKER)
      ? Number(stored.slice(CHUNK_MARKER.length))
      : 0;
    for (let index = 0; index < chunks; index++) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
    }
    await SecureStore.deleteItemAsync(key);
  }
}

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
