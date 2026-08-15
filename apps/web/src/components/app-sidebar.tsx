"use client";

import type { ComponentProps, ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  Building2Icon,
  ClipboardCheckIcon,
  FileTextIcon,
  GraduationCapIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  Settings2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "~/components/ui/sidebar";
import type { OrganizationRole } from "~/routing/access";

type NavigationItem = {
  title: string;
  href: string;
  match?: string;
  icon: ComponentType<{ className?: string }>;
};

function isRouteActive(pathname: string, item: NavigationItem) {
  const match = item.match ?? item.href;
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function AppSidebar({
  organizationId,
  role,
  ...props
}: ComponentProps<typeof Sidebar> & {
  organizationId: string;
  role: OrganizationRole;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const workspaceRoot = `/workspace/${organizationId}`;
  const isManager = role === "OWNER" || role === "ADMIN";
  const workspaceHome = `${workspaceRoot}/${isManager ? "dashboard" : "courses"}`;
  const navigation: Array<{ label: string; items: NavigationItem[] }> = [
    {
      label: "Workspace",
      items: [
        ...(isManager
          ? [
              {
                title: "Dashboard",
                href: `${workspaceRoot}/dashboard`,
                icon: LayoutDashboardIcon,
              },
            ]
          : []),
        {
          title: "Courses",
          href: `${workspaceRoot}/courses`,
          icon: BookOpenIcon,
        },
        ...(isManager
          ? [
              {
                title: "Reviews",
                href: `${workspaceRoot}/reviews`,
                icon: ClipboardCheckIcon,
              },
            ]
          : []),
      ],
    },
    {
      label: "Content library",
      items: [
        {
          title: "Materials",
          href: `${workspaceRoot}/library/materials`,
          icon: FileTextIcon,
        },
        {
          title: "Vocabulary",
          href: `${workspaceRoot}/library/vocabulary`,
          icon: LanguagesIcon,
        },
        {
          title: "Assessments",
          href: `${workspaceRoot}/library/assessments`,
          icon: LibraryIcon,
        },
      ],
    },
    ...(isManager
      ? [
          {
            label: "Organization",
            items: [
              {
                title: "Members",
                href: `${workspaceRoot}/members`,
                icon: UsersIcon,
              },
              {
                title: "Settings",
                href: `${workspaceRoot}/settings/general`,
                match: `${workspaceRoot}/settings`,
                icon: Settings2Icon,
              },
            ],
          },
        ]
      : []),
  ];

  const closeMobileSidebar = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Hakgyo workspace"
              render={
                <Link href={workspaceHome} onClick={closeMobileSidebar} />
              }
            >
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GraduationCapIcon className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Hakgyo</span>
                <span className="text-sidebar-foreground/65 truncate text-xs">
                  {organizationId}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isRouteActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.title}
                        render={
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={closeMobileSidebar}
                          />
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="My learning"
              render={
                <Link href="/learn/courses" onClick={closeMobileSidebar} />
              }
            >
              <Building2Icon />
              <span>My learning</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Account"
              render={<Link href="/account" onClick={closeMobileSidebar} />}
            >
              <UserRoundIcon />
              <span>Account</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
