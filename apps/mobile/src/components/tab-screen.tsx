import { router, Stack, type Href } from "expo-router";
import { type ComponentProps, type ReactNode } from "react";
import { Platform, View } from "react-native";

import { useUpdatesBadgeCount } from "../lib/sidebar-indicators";
import { useDrawer } from "../providers/DrawerProvider";
import { toolbarIcons } from "../theme/toolbar-icons";
import { DoodleBackground } from "./doodle-background";
import { MaintenanceBanner } from "./maintenance-banner";
import { PageTitle, StudyScreen } from "./learning-ui";
import type { PageTitleIcon } from "./ui/page-title";
import { OrganizationSwitcherTrigger } from "./organization-switcher";
import {
  AndroidTabActions,
  TabActionButton,
} from "./sidebar/AndroidTabActions";
import { SidebarToolbarButton } from "./sidebar/SidebarToolbarButton";
import { SyncSnackbar } from "./sync-activity/sync-snackbar";
import { TourTarget } from "../tour/tour-target";

const ios = Platform.OS === "ios";

function openOrganizationSwitcher() {
  router.push("/organization-switcher" as Href);
}

function openSettings() {
  router.push({ pathname: "/profile", params: { segment: "settings" } });
}

function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

/**
 * The updates bell as a toolbar item. A plain function, not a component:
 * `Stack.Toolbar` keeps only `Stack.Toolbar.*` elements among its direct
 * children and drops anything wrapped in another component.
 */
function updatesToolbarItem(unreadCount: number, openUpdates: () => void) {
  return (
    <Stack.Toolbar.Button
      icon={toolbarIcons.notifications}
      accessibilityLabel="Buka pembaruan belajar"
      onPress={openUpdates}
    >
      {unreadCount > 0 ? (
        <Stack.Toolbar.Badge>{formatBadge(unreadCount)}</Stack.Toolbar.Badge>
      ) : null}
    </Stack.Toolbar.Button>
  );
}

function UpdatesToolbarButton() {
  const { openUpdates } = useDrawer();
  const unreadCount = useUpdatesBadgeCount();
  return (
    <Stack.Toolbar placement="right">
      {updatesToolbarItem(unreadCount, openUpdates)}
    </Stack.Toolbar>
  );
}

function UpdatesActionButton() {
  const { openUpdates } = useDrawer();
  const unreadCount = useUpdatesBadgeCount();
  return (
    <TabActionButton
      icon="notifications"
      accessibilityLabel="Buka pembaruan belajar"
      badgeCount={unreadCount}
      onPress={openUpdates}
    />
  );
}

/**
 * Settings, with the updates bell beside it while there are unread updates,
 * so new updates are not missed and settings stay one tap away. Both buttons
 * sit in one toolbar: a screen has one toolbar per side. Android shows the
 * same pair in the content, bell first, gear at the edge.
 */
function SettingsToolbarButton() {
  const { openUpdates } = useDrawer();
  const unreadCount = useUpdatesBadgeCount();
  return (
    // UIKit lays out right bar items from the edge inwards, so the gear
    // stays in the corner and the bell appears to its left.
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={toolbarIcons.settings}
        accessibilityLabel="Buka pengaturan"
        onPress={openSettings}
      />
      {unreadCount > 0 ? updatesToolbarItem(unreadCount, openUpdates) : null}
    </Stack.Toolbar>
  );
}

function SettingsActionButton() {
  const unreadCount = useUpdatesBadgeCount();
  return (
    <View className="flex-row items-center">
      {unreadCount > 0 ? <UpdatesActionButton /> : null}
      <TabActionButton
        icon="settings"
        accessibilityLabel="Buka pengaturan"
        onPress={openSettings}
      />
    </View>
  );
}

/**
 * The header actions every tab root shares: the sidebar button on the left,
 * followed by the organization switcher with the settings button on the right,
 * or only the updates button on the right. iOS puts them in the native header;
 * Android has no header, so they render in the content instead.
 */
function TabToolbar({ right }: { right: "organization" | "updates" }) {
  if (!ios) return null;
  if (right === "updates") {
    return (
      <>
        <SidebarToolbarButton />
        <UpdatesToolbarButton />
      </>
    );
  }
  return (
    <>
      <SidebarToolbarButton
        trailing={
          <TourTarget id="header.organization">
            <OrganizationSwitcherTrigger
              compact
              align="start"
              onPress={openOrganizationSwitcher}
            />
          </TourTarget>
        }
      />
      <SettingsToolbarButton />
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
  return right === "updates" ? (
    <AndroidTabActions floating={floating} right={<UpdatesActionButton />} />
  ) : (
    <AndroidTabActions
      floating={floating}
      right={<SettingsActionButton />}
      left={
        <TourTarget id="header.organization" className="min-w-0 flex-1">
          <OrganizationSwitcherTrigger
            align="start"
            onPress={openOrganizationSwitcher}
          />
        </TourTarget>
      }
    />
  );
}

/**
 * The scaffold of a tab root: the header actions and a `StudyScreen`, with an
 * optional in-content title and doodle background. Every other prop goes to
 * `StudyScreen`.
 */
export function TabScreen({
  title,
  titleIcon,
  right = "organization",
  doodle = false,
  overlay,
  children,
  ...screenProps
}: Omit<ComponentProps<typeof StudyScreen>, "title" | "headerShown"> & {
  /** The in-content page title. */
  title?: string;
  /** Icon shown beside the title, matching the tab's icon. */
  titleIcon?: PageTitleIcon;
  /**
   * The header's actions besides the sidebar button: the organization switcher
   * and settings (with the updates bell beside it while there are unread
   * updates), or the updates button alone.
   */
  right?: "organization" | "updates";
  /** Draw the doodle pattern behind the content (only Hari Ini does). */
  doodle?: boolean;
  /** Stays in place over the content while it scrolls, below the actions. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  // Full-bleed screens run under the status bar, so Android's actions float.
  const floating = Boolean(screenProps.bleedTop);
  return (
    <>
      {doodle ? <DoodleBackground /> : null}
      <TabToolbar right={right} />
      <StudyScreen {...screenProps} title="" headerShown={ios}>
        {floating ? null : <TabActions right={right} floating={false} />}
        {title ? <PageTitle icon={titleIcon}>{title}</PageTitle> : null}
        {/* Full-bleed content starts under the header, where the notice
            would hide; there it follows the content instead. */}
        {floating ? null : <MaintenanceBanner />}
        {children}
        {floating ? <MaintenanceBanner /> : null}
      </StudyScreen>
      {overlay}
      {floating ? <TabActions right={right} floating /> : null}
      <SyncSnackbar />
    </>
  );
}
