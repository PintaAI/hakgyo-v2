import { getSafeRedirectPath } from "~/lib/access";

const onboardingStoragePrefix = "hakgyo:onboarding:v1";

type OnboardingState = {
  completedAt: string;
  destination: string;
};

export function onboardingStorageKey(userId: string) {
  return `${onboardingStoragePrefix}:${userId}`;
}

export function readOnboardingState(storage: Storage, userId: string) {
  try {
    const raw = storage.getItem(onboardingStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    const destination = getSafeRedirectPath(parsed.destination);
    if (!destination || typeof parsed.completedAt !== "string") return null;
    return { completedAt: parsed.completedAt, destination };
  } catch {
    return null;
  }
}

export function completeOnboarding(
  storage: Storage,
  userId: string,
  destination: string,
) {
  const safeDestination = getSafeRedirectPath(destination) ?? "/catalog";
  storage.setItem(
    onboardingStorageKey(userId),
    JSON.stringify({
      completedAt: new Date().toISOString(),
      destination: safeDestination,
    } satisfies OnboardingState),
  );
}
