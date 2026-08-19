import { describe, expect, test } from "bun:test";

import {
  completeOnboarding,
  onboardingStorageKey,
  readOnboardingState,
} from "./onboarding";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as unknown as Storage;
}

describe("onboarding client state", () => {
  test("stores a safe destination separately for each user", () => {
    const storage = memoryStorage();
    completeOnboarding(storage, "user-1", "/workspace/acme/dashboard");

    expect(readOnboardingState(storage, "user-1")?.destination).toBe(
      "/workspace/acme/dashboard",
    );
    expect(readOnboardingState(storage, "user-2")).toBeNull();
    expect(onboardingStorageKey("user-1")).not.toBe(
      onboardingStorageKey("user-2"),
    );
  });

  test("replaces unsafe destinations and ignores malformed state", () => {
    const storage = memoryStorage();
    completeOnboarding(storage, "user-1", "https://evil.example/phishing");
    expect(readOnboardingState(storage, "user-1")?.destination).toBe(
      "/catalog",
    );

    storage.setItem(onboardingStorageKey("user-2"), "not-json");
    expect(readOnboardingState(storage, "user-2")).toBeNull();
  });
});
