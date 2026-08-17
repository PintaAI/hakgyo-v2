"use client";

import { useState, type ComponentProps, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  CrownIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  GraduationCapIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  BookMarkedIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "~/components/ui/sidebar";
import { User } from "~/components/user";
import type { OrganizationRole } from "~/lib/access";

type NavigationLink = {
  title: string;
  href: string;
  match?: string;
  icon?: ComponentType<{ className?: string }>;
  items?: NavigationLink[];
};

type NavigationItem = NavigationLink & {
  icon: NonNullable<NavigationLink["icon"]>;
};

export type DocsNavigationItem = {
  title: string;
  href: string;
  iconName: string;
  locale: string;
};

const docsIconMap: Record<string, ComponentType<{ className?: string }>> = {
  BookOpenIcon,
  ClipboardCheckIcon,
  CrownIcon,
  FileTextIcon,
  GraduationCapIcon,
  LanguagesIcon,
  LibraryIcon,
  Settings2Icon,
  UsersIcon,
};

function isRouteActive(pathname: string, item: NavigationLink): boolean {
  const match = item.match ?? item.href;
  return (
    pathname === match ||
    pathname.startsWith(`${match}/`) ||
    item.items?.some((child) => isRouteActive(pathname, child)) === true
  );
}

function CollapsibleNavigationItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isRouteActive(pathname, item);
  const [open, setOpen] = useState(active);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton
        isActive={active}
        tooltip={item.title}
        render={
          <Link
            href={item.href}
            onClick={() => {
              setOpen(true);
              onNavigate();
            }}
          />
        }
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction className="aria-expanded:rotate-90" />}
      >
        <ChevronRightIcon />
        <span className="sr-only">Buka/tutup {item.title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((child) => {
            const childActive = isRouteActive(pathname, child);
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  isActive={childActive}
                  render={
                    <Link
                      href={child.href}
                      aria-current={childActive ? "page" : undefined}
                      onClick={onNavigate}
                    />
                  }
                >
                  {child.icon ? <child.icon /> : null}
                  <span>{child.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar({
  organizationSlug,
  organization,
  role,
  ...props
}: ComponentProps<typeof Sidebar> & {
  organizationSlug: string;
  organization: { name: string; logoUrl: string | null };
  role: OrganizationRole;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const workspaceRoot = `/workspace/${organizationSlug}`;
  const isManager = role === "OWNER" || role === "ADMIN";
  const workspaceHome = `${workspaceRoot}/${isManager ? "dashboard" : "courses"}`;
  const navigation: NavigationItem[] = [
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
    {
      title: "Perpustakaan konten",
      href: `${workspaceRoot}/library/materials`,
      match: `${workspaceRoot}/library`,
      icon: LibraryIcon,
      items: [
        {
          title: "Materi",
          href: `${workspaceRoot}/library/materials`,
          icon: FileTextIcon,
        },
        {
          title: "Kosakata",
          href: `${workspaceRoot}/library/vocabulary`,
          icon: LanguagesIcon,
        },
        {
          title: "Penilaian",
          href: `${workspaceRoot}/library/assessments`,
          icon: ClipboardCheckIcon,
        },
      ],
    },
  ];
  const organizationNavigation: NavigationItem[] = [
    {
      title: "Anggota",
      href: `${workspaceRoot}/members`,
      icon: UsersIcon,
    },
    {
      title: "Settings",
      href: `${workspaceRoot}/settings/general`,
      match: `${workspaceRoot}/settings`,
      icon: Settings2Icon,
    },
  ];

  const closeMobileSidebar = () => setOpenMobile(false);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={organization.name}
              render={
                <Link href={workspaceHome} onClick={closeMobileSidebar} />
              }
            >
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                {organization.logoUrl ? (
                  <AvatarImage
                    src={organization.logoUrl}
                    alt={`Logo ${organization.name}`}
                    className="rounded-lg"
                  />
                ) : null}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground rounded-lg font-semibold">
                  {organization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  {organization.name}
                </span>
                <span className="text-sidebar-foreground/65 truncate text-xs">
                  Workspace Hakgyo
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active = isRouteActive(pathname, item);

                if (!item.items?.length) {
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
                }

                return (
                  <CollapsibleNavigationItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={closeMobileSidebar}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isManager ? (
          <SidebarGroup>
            <SidebarGroupLabel>Organisasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {organizationNavigation.map((item) => {
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
        ) : null}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Pembelajaran saya"
                render={
                  <Link href="/learn/courses" onClick={closeMobileSidebar} />
                }
              >
                <GraduationCapIcon />
                <span>Pembelajaran saya</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/docs" || pathname.startsWith("/docs/")}
                tooltip="Dokumentasi pengguna"
                render={<Link href="/docs" onClick={closeMobileSidebar} />}
              >
                <BookMarkedIcon />
                <span>Dokumentasi pengguna</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <User variant="sidebar" role={role} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function DocsAppSidebar({
  navigation,
  ...props
}: ComponentProps<typeof Sidebar> & {
  navigation: DocsNavigationItem[];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const closeMobileSidebar = () => setOpenMobile(false);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Dokumen Hakgyo"
              render={<Link href="/" onClick={closeMobileSidebar} />}
            >
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <BookMarkedIcon className="size-4" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Dokumen Hakgyo</span>
                <span className="text-sidebar-foreground/65 truncate text-xs">
                  Panduan pengguna
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Konsep utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active = pathname === item.href;
                const Icon = docsIconMap[item.iconName] ?? FileTextIcon;
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
                      <Icon />
                      <span>{item.title}</span>
                      <span className="text-sidebar-foreground/50 ml-auto text-[0.65rem] uppercase group-data-[collapsible=icon]:hidden">
                        {item.locale}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Pembelajaran saya"
                render={
                  <Link href="/learn/courses" onClick={closeMobileSidebar} />
                }
              >
                <GraduationCapIcon />
                <span>Pembelajaran saya</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <User variant="sidebar" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
