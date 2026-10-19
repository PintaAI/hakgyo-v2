import { router, Stack, type Href } from "expo-router";
import { type ComponentProps, type ReactNode } from "react";
import { Platform } from "react-native";

import { useUpdatesBadgeCount } from "../lib/sidebar-indicators";
import { useDrawer } from "../providers/DrawerProvider";
import { toolbarIcons } from "../theme/toolbar-icons";
import { DoodleBackground } from "./doodle-background";
import { PageTitle, StudyScreen } from "./learning-ui";
import { OrganizationSwitcherTrigger } from "./organization-switcher";
import {
  AndroidTabActions,
  TabActionButton,
} from "./sidebar/AndroidTabActions";
import { SidebarToolbarButton } from "./sidebar/SidebarToolbarButton";

const ios = Platform.OS === "ios";

function openOrganizationSwitcher() {
  router.push("/organization-switcher" as Href);
}

function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

function UpdatesToolbarButton() {
  const { openUpdates } = useDrawer();
  const unreadCount = useUpdatesBadgeCount();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={toolbarIcons.notifications}
        accessibilityLabel="Buka pembaruan belajar"
        onPress={openUpdates}
      >
        {unreadCount > 0 ? (
          <Stack.Toolbar.Badge>{formatBadge(unreadCount)}</Stack.Toolbar.Badge>
        ) : null}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function UpdatesActionButton() {
  const { openUpdates } = useDrawer();
  const unreadCount = useUpdatesBadgeCount();
  return (
    <TabActionButton
      symbol={{ ios: "bell", android: "notifications" }}
      accessibilityLabel="Buka pembaruan belajar"
      badgeCount={unreadCount}
      onPress={openUpdates}
    />
  );
}

/**
 * The header actions every tab root shares: the sidebar button on the left and
 * the organization switcher (or the updates button) on the right. iOS puts
 * them in the native header; Android has no header, so they render in the
 * content instead.
 */
function TabToolbar({ right }: { right: "organization" | "updates" }) {
  if (!ios) return null;
  return (
    <>
      <SidebarToolbarButton />
      {right === "updates" ? (
        <UpdatesToolbarButton />
      ) : (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View hidesSharedBackground>
            <OrganizationSwitcherTrigger
              compact
              onPress={openOrganizationSwitcher}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      )}
    </>
  );
}

function TabActions({
  right,
  floating,
}: {
  right: "organization" | "updates";
  floating: boolean;
}) {
  if (ios) return null;
  return (
    <AndroidTabActions
      floating={floating}
      right={
        right === "updates" ? (
          <UpdatesActionButton />
        ) : (
          <OrganizationSwitcherTrigger onPress={openOrganizationSwitcher} />
        )
      }
    />
  );
}

/**
 * The scaffold of a tab root: doodle background, the header actions and a
 * `StudyScreen`, with an optional in-content title. Every other prop goes to
 * `StudyScreen`.
 */
export function TabScreen({
  title,
  right = "organization",
  children,
  ...screenProps
}: Omit<ComponentProps<typeof StudyScreen>, "title" | "headerShown"> & {
  /** The in-content page title. */
  title?: string;
  /** Which action sits on the right of the header. */
  right?: "organization" | "updates";
  children: ReactNode;
}) {
  // Full-bleed screens run under the status bar, so Android's actions float.
  const floating = Boolean(screenProps.bleedTop);
  return (
    <>
      <DoodleBackground />
      <TabToolbar right={right} />
      <StudyScreen {...screenProps} title="" headerShown={ios}>
        {floating ? null : <TabActions right={right} floating={false} />}
        {title ? <PageTitle>{title}</PageTitle> : null}
        {children}
      </StudyScreen>
      {floating ? <TabActions right={right} floating /> : null}
    </>
  );
}
