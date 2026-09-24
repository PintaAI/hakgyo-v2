import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { OrganizationSwitcherContent } from "../src/components/organization-switcher";
import { toolbarIcons } from "../src/theme/toolbar-icons";

export default function OrganizationSwitcherScreen() {
  const close = () => router.back();

  return (
    <>
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Close organization switcher"
            icon={toolbarIcons.close}
            onPress={close}
          />
        </Stack.Toolbar>
      ) : null}
      <OrganizationSwitcherContent onClose={close} />
    </>
  );
}
