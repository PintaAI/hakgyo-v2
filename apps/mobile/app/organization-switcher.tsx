import { router, Stack } from "expo-router";

import { OrganizationSwitcherContent } from "../src/components/organization-switcher";

export default function OrganizationSwitcherScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OrganizationSwitcherContent onClose={() => router.back()} />
    </>
  );
}
