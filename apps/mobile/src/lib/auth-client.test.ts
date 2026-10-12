import { beforeEach, describe, expect, mock, test } from "bun:test";

const secureStore = new Map<string, string>();

void mock.module("expo-secure-store", () => ({
  getItem: (key: string) => secureStore.get(key) ?? null,
  setItem: (key: string, value: string) => void secureStore.set(key, value),
  getItemAsync: async (key: string) => secureStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) =>
    void secureStore.set(key, value),
  deleteItemAsync: async (key: string) => void secureStore.delete(key),
}));
void mock.module("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));
void mock.module("expo-constants", () => ({ default: {} }));
void mock.module("expo-linking", () => ({ createURL: (path: string) => path }));
void mock.module("expo-web-browser", () => ({}));
void mock.module("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: () => undefined }),
}));
void mock.module("../config", () => ({ apiUrl: "https://hakgyo.test" }));

const { authClient, rememberAuthCookies } = await import("./auth-client");

const sessionData =
  "__Secure-better-auth.session_data=fresh-cache; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=lax";
const sessionToken =
  "__Secure-better-auth.session_token=token.signature; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=lax";

describe("rememberAuthCookies", () => {
  beforeEach(() => secureStore.clear());

  test("stores session cookies refreshed by tRPC so later requests send them", async () => {
    await rememberAuthCookies(`${sessionToken}, ${sessionData}`);
    const cookie = await authClient.getCookie();
    expect(cookie).toContain(
      "__Secure-better-auth.session_token=token.signature",
    );
    expect(cookie).toContain("__Secure-better-auth.session_data=fresh-cache");
  });

  test("keeps the session token when only the cache is re-issued", async () => {
    await rememberAuthCookies(sessionToken);
    await rememberAuthCookies(sessionData);
    const cookie = await authClient.getCookie();
    expect(cookie).toContain("session_token=token.signature");
    expect(cookie).toContain("session_data=fresh-cache");
  });

  test("ignores responses without auth cookies", async () => {
    await rememberAuthCookies(null);
    await rememberAuthCookies("theme=dark; Path=/");
    expect(await authClient.getCookie()).toBe("");
  });
});
