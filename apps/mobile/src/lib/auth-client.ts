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
  plugins: [nativePlugin],
});

export const getAuthCookie = () => authClient.getCookie();
