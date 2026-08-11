import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { apiUrl } from "../config";

const nativePlugin = expoClient({
  scheme: "hakgyo",
  storagePrefix: "hakgyo",
  storage: SecureStore,
});

export const authClient = createAuthClient({
  baseURL: apiUrl,
  // Bun gives peer dependencies separate type identities in this monorepo.
  // Keep the runtime plugin while relying on Better Auth's base session types.
  plugins: [nativePlugin] as unknown as [],
});

export const getAuthCookie = () =>
  (authClient as typeof authClient & { getCookie: () => string }).getCookie();
