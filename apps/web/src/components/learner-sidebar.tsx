"use client";

import type { ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarkedIcon,
  BookOpenIcon,
  CompassIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
} from "lucide-react";

import { User } from "~/components/user";
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
  useSidebar,
} from "~/components/ui/sidebar";

type LearnerCourse = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  organization: { name: string };
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LearnerSidebar({
  courses,
  ...props
}: ComponentProps<typeof Sidebar> & { courses: LearnerCourse[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Hakgyo Learn"
              render={<Link href="/learn/courses" onClick={closeMobile} />}
            >
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <GraduationCapIcon className="size-4.5" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Hakgyo Learn</span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  Ruang belajar kamu
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Belajar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/learn/courses"}
                  tooltip="Dashboard"
                  render={<Link href="/learn/courses" onClick={closeMobile} />}
                >
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive(pathname, "/catalog")}
                  tooltip="Jelajahi course"
                  render={<Link href="/catalog" onClick={closeMobile} />}
                >
                  <CompassIcon />
                  <span>Jelajahi course</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {courses.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Course saya</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {courses.map((course) => {
                  const href = `/learn/${course.id}`;
                  const active = isActive(pathname, href);
                  return (
                    <SidebarMenuItem key={course.id}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={course.title}
                        render={
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            onClick={closeMobile}
                          />
                        }
                      >
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            className="size-6 rounded-md object-cover"
                          />
                        ) : (
                          <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-6 items-center justify-center rounded-md">
                            <BookOpenIcon className="size-3.5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate">{course.title}</span>
                          <span className="text-sidebar-foreground/50 block truncate text-[0.65rem] group-data-[collapsible=icon]:hidden">
                            {course.organization.name}
                          </span>
                        </span>
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
                tooltip="Panduan belajar"
                render={<Link href="/docs" onClick={closeMobile} />}
              >
                <BookMarkedIcon />
                <span>Panduan belajar</span>
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
