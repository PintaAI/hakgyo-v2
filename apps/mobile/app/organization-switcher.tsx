import { router } from "expo-router";

import { OrganizationSwitcherContent } from "../src/components/organization-switcher";

export default function OrganizationSwitcherScreen() {
  return <OrganizationSwitcherContent onClose={() => router.back()} />;
}
